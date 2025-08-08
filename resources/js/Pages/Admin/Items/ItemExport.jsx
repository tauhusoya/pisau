import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    orderBy,
    where,
    serverTimestamp
} from 'firebase/firestore';
import Breadcrumb from '@/Components/Breadcrumb';
import BarcodeScanner from '@/Components/BarcodeScanner';
import { QrCodeIcon } from '@heroicons/react/24/outline';

import Pagination from '@/Components/Pagination';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function ItemExport() {
    const [userLoading, setUserLoading] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const exportDropdownRef = useRef(null);

    // Actions dropdown state
    const [showActions, setShowActions] = useState(false);
    const actionsRef = useRef(null);

    // Barcode scanner state
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const searchInputRef = useRef(null);

    // Physical scanner input handling
    const [scannerBuffer, setScannerBuffer] = useState('');

    // Filter states
    const [filters, setFilters] = useState({
        searchTerm: '',
        brandFilter: '',
        stockFilter: 'all', // 'all', 'outOfStock', 'lowStock'
        dateFrom: '',
        dateTo: ''
    });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Predefined options
    const brandOptions = ['PiRGE', 'Atasan Bicak', 'Victorinox'];
    const stockFilterOptions = [
        { value: 'all', label: 'All Items' },
        { value: 'outOfStock', label: 'Out of Stock' },
        { value: 'lowStock', label: 'Low Stock' }
    ];

    // Combined effect to handle authentication and fetch items
    useEffect(() => {
        const handleAuthStateChange = async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch logged-in user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setLoggedInUser({
                            name: `${userData.firstName} ${userData.lastName}`,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email,
                            role: userData.role,
                            status: userData.status,
                            ...userData
                        });
                    } else {
                        console.error('User document not found in Firestore');
                        router.visit(route('login'));
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    router.visit(route('login'));
                } finally {
                    setUserLoading(false);
                }
            } else {
                // No user authenticated, redirect to login
                router.visit(route('login'));
            }
        };

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

        return () => unsubscribe();
    }, []);

    // Fetch items when component mounts or filters change
    useEffect(() => {
        if (!userLoading) {
            fetchItems();
        }
    }, [userLoading, filters]);

    // Handle click outside export dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setShowExportDropdown(false);
            }
        };

        if (showExportDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showExportDropdown]);

    // Handle click outside actions dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target)) {
                setShowActions(false);
            }
        };

        if (showActions) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showActions]);

    // Handle physical scanner input
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Physical barcode scanners typically send data as rapid keypresses
            // followed by Enter key. We'll collect characters and submit on Enter
            if (event.key === 'Enter' && scannerBuffer.trim()) {
                handleFilterChange('searchTerm', scannerBuffer.trim());
                setScannerBuffer('');
                // Focus on search input to show the scanned barcode
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            } else if (event.key.length === 1) {
                // Add character to buffer
                setScannerBuffer(prev => prev + event.key);
            }
        };

        // Only listen for keypress events when not in a modal
        if (!showBarcodeScanner) {
            document.addEventListener('keypress', handleKeyPress);
            return () => {
                document.removeEventListener('keypress', handleKeyPress);
            };
        }
    }, [scannerBuffer, showBarcodeScanner]);

    // Clear scanner buffer when modal opens
    useEffect(() => {
        if (showBarcodeScanner) {
            setScannerBuffer('');
        }
    }, [showBarcodeScanner]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            let q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));

            // Apply brand filter
            if (filters.brandFilter) {
                q = query(q, where('brand', '==', filters.brandFilter));
            }

            const querySnapshot = await getDocs(q);
            let fetchedItems = [];

            querySnapshot.forEach((doc) => {
                const itemData = doc.data();
                fetchedItems.push({
                    id: doc.id,
                    ...itemData,
                    createdAt: itemData.createdAt?.toDate?.() || new Date(),
                    updatedAt: itemData.updatedAt?.toDate?.() || new Date()
                });
            });

            // Apply stock filter
            if (filters.stockFilter === 'outOfStock') {
                fetchedItems = fetchedItems.filter(item => item.quantity === 0);
            } else if (filters.stockFilter === 'lowStock') {
                fetchedItems = fetchedItems.filter(item => item.quantity > 0 && item.quantity <= 9);
            }

            // Apply date filter
            if (filters.dateFrom || filters.dateTo) {
                fetchedItems = fetchedItems.filter(item => {
                    const itemDate = new Date(item.createdAt);
                    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
                    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

                    if (fromDate && toDate) {
                        return itemDate >= fromDate && itemDate <= toDate;
                    } else if (fromDate) {
                        return itemDate >= fromDate;
                    } else if (toDate) {
                        return itemDate <= toDate;
                    }
                    return true;
                });
            }

            // Apply search filter
            if (filters.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                fetchedItems = fetchedItems.filter(item =>
                    item.itemName?.toLowerCase().includes(searchLower) ||
                    item.itemCode?.toLowerCase().includes(searchLower) ||
                    item.barcode?.toLowerCase().includes(searchLower) ||
                    item.brand?.toLowerCase().includes(searchLower) ||
                    item.model?.toLowerCase().includes(searchLower)
                );
            }

            setItems(fetchedItems);
            setCurrentPage(1); // Reset to first page when filters change
        } catch (error) {
            console.error('Error fetching items:', error);
            setMessage({ type: 'error', text: 'Error fetching items: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked) => {
        setSelectAll(checked);
        if (checked) {
            const allItemIds = currentItems.map(item => item.id);
            setSelectedItems(new Set(allItemIds));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelectItem = (itemId, checked) => {
        const newSelectedItems = new Set(selectedItems);
        if (checked) {
            newSelectedItems.add(itemId);
        } else {
            newSelectedItems.delete(itemId);
        }
        setSelectedItems(newSelectedItems);

        // Update select all state
        const allItemIds = currentItems.map(item => item.id);
        setSelectAll(allItemIds.every(id => newSelectedItems.has(id)));
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value
        }));
    };

    // Handle barcode scan
    const handleBarcodeScan = (barcode) => {
        handleFilterChange('searchTerm', barcode);
        setShowBarcodeScanner(false);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    const toggleExportDropdown = () => {
        setShowExportDropdown(!showExportDropdown);
    };

    const getStockStatus = (quantity) => {
        if (quantity === 0) return 'Out of Stock';
        if (quantity <= 9) return 'Low Stock';
        return 'Ready Stock';
    };

    const getStockStatusColor = (quantity) => {
        if (quantity === 0) return 'text-red-600';
        if (quantity <= 9) return 'text-yellow-600';
        return 'text-green-600';
    };

    const exportItems = async (exportType) => {
        setExporting(true);
        setMessage({ type: '', text: '' });

        try {
            let itemsToExport = [];

            switch (exportType) {
                case 'all':
                    itemsToExport = items;
                    break;
                case 'selected':
                    itemsToExport = items.filter(item => selectedItems.has(item.id));
                    break;
                case 'filtered':
                    itemsToExport = currentItems;
                    break;
                default:
                    throw new Error('Invalid export type');
            }

            if (itemsToExport.length === 0) {
                setMessage({ type: 'error', text: 'No items to export.' });
                return;
            }

            exportToPDF(itemsToExport, exportType);

            setMessage({
                type: 'success',
                text: `Successfully exported ${itemsToExport.length} items to PDF!`
            });

        } catch (error) {
            console.error('Error exporting items:', error);
            setMessage({ type: 'error', text: 'Error exporting items: ' + error.message });
        } finally {
            setExporting(false);
        }
    };



    const exportToPDF = (itemsToExport, exportType) => {
        const doc = new jsPDF();

        // Add title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Items Export Report', 14, 22);

        // Add subtitle with export type and date
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const exportTypeText = exportType === 'all' ? 'All Items' :
            exportType === 'selected' ? 'Selected Items' : 'Filtered Items';
        doc.text(`${exportTypeText} - Generated on ${new Date().toLocaleDateString()}`, 14, 32);

        // Add summary
        doc.setFontSize(10);
        doc.text(`Total Items: ${itemsToExport.length}`, 14, 42);

        // Calculate stock summary
        const outOfStock = itemsToExport.filter(item => item.quantity === 0).length;
        const lowStock = itemsToExport.filter(item => item.quantity > 0 && item.quantity <= 9).length;
        const readyStock = itemsToExport.filter(item => item.quantity > 9).length;

        doc.text(`Out of Stock: ${outOfStock} | Low Stock: ${lowStock} | Ready Stock: ${readyStock}`, 14, 50);

        // Prepare table data
        const tableData = itemsToExport.map(item => [
            item.barcode || '-',
            item.itemCode || '-',
            item.itemName || '-',
            item.brand || '-',
            item.model || '-',
            item.costPrice ? `RM ${parseFloat(item.costPrice).toFixed(2)}` : '-',
            item.retailPrice ? `RM ${parseFloat(item.retailPrice).toFixed(2)}` : '-',
            item.quantity || 0,
            getStockStatus(item.quantity)
        ]);

        // Create table
        autoTable(doc, {
            startY: 60,
            head: [['Barcode', 'Item Code', 'Item Name', 'Brand', 'Model', 'Cost (RM)', 'Retail (RM)', 'Qty', 'Status']],
            body: tableData,
            styles: {
                fontSize: 8,
                cellPadding: 2
            },
            headStyles: {
                fillColor: [59, 130, 246], // Blue color
                textColor: 255,
                fontStyle: 'bold'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Light gray
            },
            columnStyles: {
                0: { cellWidth: 25 }, // Barcode
                1: { cellWidth: 25 }, // Item Code
                2: { cellWidth: 35 }, // Item Name
                3: { cellWidth: 20 }, // Brand
                4: { cellWidth: 20 }, // Model
                5: { cellWidth: 20 }, // Cost
                6: { cellWidth: 20 }, // Retail
                7: { cellWidth: 15 }, // Quantity
                8: { cellWidth: 20 }  // Status
            },
            didParseCell: function (data) {
                // Color code status column
                if (data.column.index === 8) { // Status column
                    const status = data.cell.text[0];
                    if (status === 'Out of Stock') {
                        data.cell.styles.textColor = [220, 38, 38]; // Red
                    } else if (status === 'Low Stock') {
                        data.cell.styles.textColor = [217, 119, 6]; // Orange
                    } else {
                        data.cell.styles.textColor = [34, 197, 94]; // Green
                    }
                }
            }
        });

        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount}`, 14, doc.internal.pageSize.height - 10);
        }

        // Save the PDF
        const fileName = `items_export_${exportType}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    // Pagination calculations
    const totalItems = items.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = items.slice(startIndex, endIndex);

    // Show loading state while user data is being fetched
    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading user data...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthenticatedLayout
            user={loggedInUser || { name: 'Loading...', firstName: 'Loading', lastName: '', email: '' }}
        >
            <Head title="Export Items" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="mb-6">
                                <Breadcrumb items={[
                                    { label: 'Manage Items', route: route('admin.items.index') },
                                    { label: 'Export Items', route: null }
                                ]} />
                            </div>
                            <div className="mb-6 flex justify-between items-center">
                                <h1 className="text-2xl font-semibold text-gray-900">Export Items</h1>
                                <div className="relative" ref={actionsRef}>
                                    <button
                                        onClick={() => setShowActions(!showActions)}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600 transition flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                        </svg>
                                        Actions
                                        <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {showActions && (
                                        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                            <div className="py-1" role="menu">
                                                <button
                                                    onClick={() => {
                                                        router.visit(route('admin.items.index'));
                                                        setShowActions(false);
                                                    }}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                                                    role="menuitem"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                                    </svg>
                                                    List of Items
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.visit(route('admin.items.status'));
                                                        setShowActions(false);
                                                    }}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                                                    role="menuitem"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                    Item Status
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.visit(route('admin.items.create'));
                                                        setShowActions(false);
                                                    }}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                                                    role="menuitem"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                    Add New Item
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        router.visit(route('admin.items.import'));
                                                        setShowActions(false);
                                                    }}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                                                    role="menuitem"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                                    </svg>
                                                    Bulk Import
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {message.text && (
                                <div className={`mb-6 p-4 rounded-md ${message.type === 'error'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-green-100 text-green-700 border border-green-200'
                                    }`}>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                            )}

                            {/* Filters */}
                            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Search
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={filters.searchTerm}
                                                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                                                className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Search items..."
                                                ref={searchInputRef}
                                            />
                                            <button
                                                onClick={() => setShowBarcodeScanner(true)}
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                                title="Scan Barcode"
                                            >
                                                <QrCodeIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Brand
                                        </label>
                                        <select
                                            value={filters.brandFilter}
                                            onChange={(e) => handleFilterChange('brandFilter', e.target.value)}
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            <option value="">All Brands</option>
                                            {brandOptions.map(brand => (
                                                <option key={brand} value={brand}>{brand}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Stock Status
                                        </label>
                                        <select
                                            value={filters.stockFilter}
                                            onChange={(e) => handleFilterChange('stockFilter', e.target.value)}
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        >
                                            {stockFilterOptions.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date From
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateFrom}
                                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date To
                                        </label>
                                        <input
                                            type="date"
                                            value={filters.dateTo}
                                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Export Actions */}
                            <div className="mb-6">
                                <div className="relative" ref={exportDropdownRef}>
                                    <button
                                        onClick={toggleExportDropdown}
                                        disabled={exporting}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {exporting ? 'Exporting...' : 'Export Items'}
                                        <ChevronDownIcon className="w-4 h-4" />
                                    </button>

                                    {showExportDropdown && (
                                        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                            <div className="py-1">
                                                <button
                                                    onClick={() => {
                                                        exportItems('all');
                                                        setShowExportDropdown(false);
                                                    }}
                                                    disabled={exporting || items.length === 0}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                                >
                                                    Export All Items ({items.length})
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        exportItems('selected');
                                                        setShowExportDropdown(false);
                                                    }}
                                                    disabled={exporting || selectedItems.size === 0}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                                >
                                                    Export Selected Items ({selectedItems.size})
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        exportItems('filtered');
                                                        setShowExportDropdown(false);
                                                    }}
                                                    disabled={exporting || currentItems.length === 0}
                                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:text-gray-400"
                                                >
                                                    Export Filtered Items ({currentItems.length})
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden">
                                {loading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                                        <span className="ml-2 text-gray-600">Loading items...</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectAll}
                                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Barcode
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Item Name
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Brand
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Model
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Cost Price (RM)
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Retail Price (RM)
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Quantity
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Status
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {currentItems.map((item) => (
                                                        <tr key={item.id} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedItems.has(item.id)}
                                                                    onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.barcode || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.itemName}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.brand || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.model || '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.costPrice ? `RM ${parseFloat(item.costPrice).toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.retailPrice ? `RM ${parseFloat(item.retailPrice).toFixed(2)}` : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {item.quantity || 0}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity === 0
                                                                    ? 'bg-red-100 text-red-800'
                                                                    : item.quantity <= 9
                                                                        ? 'bg-yellow-100 text-yellow-800'
                                                                        : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                    {getStockStatus(item.quantity)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {currentItems.length === 0 && (
                                            <div className="text-center py-8">
                                                <p className="text-gray-500">No items found matching the current filters.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Mobile card list */}
                            <div className="md:hidden space-y-3">
                                {loading ? (
                                    <div className="flex items-center justify-center py-10">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                                    </div>
                                ) : (
                                    currentItems.length === 0 ? (
                                        <div className="bg-gray-50 p-10 text-center rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4m8 4v10M4 7v10l8 4" />
                                            </svg>
                                            <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                                            <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
                                        </div>
                                    ) : (
                                        currentItems.map((item) => (
                                            <div key={item.id} className="bg-white rounded-lg border p-4 shadow-sm">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(item.id)}
                                                            onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {item.itemName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {item.barcode || 'No Barcode'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.quantity === 0 ? 'bg-red-100 text-red-800' : item.quantity <= 9 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                            {getStockStatus(item.quantity)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                    <div className="text-gray-700">
                                                        <span className="text-gray-500">Brand:</span> {item.brand || '-'}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="text-gray-500">Model:</span> {item.model || '-'}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="text-gray-500">Cost:</span> {item.costPrice ? `RM ${parseFloat(item.costPrice).toFixed(2)}` : '-'}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="text-gray-500">Retail:</span> {item.retailPrice ? `RM ${parseFloat(item.retailPrice).toFixed(2)}` : '-'}
                                                    </div>
                                                    <div className="text-gray-700">
                                                        <span className="text-gray-500">Qty:</span> {item.quantity || 0}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )
                                )}
                            </div>

                            {/* Pagination */}
                            {totalItems > 0 && (
                                <div className="mt-6">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}


                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            <BarcodeScanner
                isOpen={showBarcodeScanner}
                onClose={() => setShowBarcodeScanner(false)}
                onScan={handleBarcodeScan}
                title="Scan Barcode"
                placeholder="Scan or enter barcode to search"
            />
        </AuthenticatedLayout>
    );
}
