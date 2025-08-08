import { useState, useEffect, useRef } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    query,
    getDocs,
    doc,
    getDoc,
    orderBy
} from 'firebase/firestore';

import Pagination from '@/Components/Pagination';
import ItemDetailModal from '@/Components/Admin/Items/ItemDetailModal';
import ItemTable from '@/Components/Admin/Items/ItemTable';
import BarcodeScanner from '@/Components/BarcodeScanner';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import Breadcrumb from '@/Components/Breadcrumb';

export default function ItemStatus() {
    // State for items list and management
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [brandFilter, setBrandFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showActions, setShowActions] = useState(false);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // Refs
    const actionsRef = useRef(null);
    const searchInputRef = useRef(null);

    // Physical scanner input handling
    const [scannerBuffer, setScannerBuffer] = useState('');

    // Handle physical scanner input
    useEffect(() => {
        const handleKeyPress = (event) => {
            // Physical barcode scanners typically send data as rapid keypresses
            // followed by Enter key. We'll collect characters and submit on Enter
            if (event.key === 'Enter' && scannerBuffer.trim()) {
                setSearchTerm(scannerBuffer.trim());
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
        if (!showBarcodeScanner && !detailModalOpen) {
            document.addEventListener('keypress', handleKeyPress);
            return () => {
                document.removeEventListener('keypress', handleKeyPress);
            };
        }
    }, [scannerBuffer, showBarcodeScanner, detailModalOpen]);

    // Clear scanner buffer when modal opens
    useEffect(() => {
        if (showBarcodeScanner || detailModalOpen) {
            setScannerBuffer('');
        }
    }, [showBarcodeScanner, detailModalOpen]);

    // Fetch all items from Firestore
    const fetchItems = async () => {
        setLoading(true);
        try {
            const itemsQuery = query(
                collection(db, 'items'),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(itemsQuery);

            const itemsList = [];
            querySnapshot.forEach((doc) => {
                const itemData = doc.data();
                itemsList.push({
                    id: doc.id,
                    ...itemData,
                    createdAt: itemData.createdAt?.toDate().toLocaleString() || 'N/A',
                    updatedAt: itemData.updatedAt?.toDate().toLocaleString() || 'N/A'
                });
            });

            setItems(itemsList);
        } catch (error) {
            console.error('Error fetching items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Combined effect to handle authentication and fetch user data
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

                    // Fetch all items for the table
                    fetchItems();
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

    // Handle click outside actions dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target)) {
                setShowActions(false);
            }
        };

        if (showActions) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showActions]);

    // Handle item selection for detail view
    const handleItemClick = (item) => {
        setSelectedItem(item);
        setDetailModalOpen(true);
    };

    // Edit item
    const handleEditItem = (item) => {
        router.visit(route('admin.items.edit', item.id));
    };

    // Handle barcode scan
    const handleBarcodeScan = (barcode) => {
        setSearchTerm(barcode);
        setShowBarcodeScanner(false);
    };

    // Get stock status type
    const getStockStatus = (quantity) => {
        const qty = parseInt(quantity) || 0;
        if (qty === 0) return 'Out of Stock';
        if (qty >= 1 && qty <= 9) return 'Low Stock';
        return 'In Stock';
    };

    // Get stock status color
    const getStockStatusColor = (status) => {
        switch (status) {
            case 'Out of Stock':
                return 'text-red-600 bg-red-100';
            case 'Low Stock':
                return 'text-orange-600 bg-orange-100';
            default:
                return 'text-green-600 bg-green-100';
        }
    };

    // Filter items based on search term and filters
    const filteredItems = items.filter(item => {
        const matchesSearch =
            item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.skuId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.model?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesBrand = brandFilter === 'all' || item.brand === brandFilter;

        const itemStatus = getStockStatus(item.quantity);
        const matchesStatus = statusFilter === 'all' || itemStatus === statusFilter;

        // Only show items with stock issues (Out of Stock or Low Stock)
        const hasStockIssue = itemStatus === 'Out of Stock' || itemStatus === 'Low Stock';

        return matchesSearch && matchesBrand && matchesStatus && hasStockIssue;
    });

    // Pagination calculations
    const totalItems = filteredItems.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, endIndex);

    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, brandFilter, statusFilter]);

    // Get unique brands for filter
    const uniqueBrands = [...new Set(items.map(item => item.brand).filter(Boolean))];

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
            <Head title="Item Status" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="mb-6">
                                <Breadcrumb items={[
                                    { label: 'Manage Items', route: route('admin.items.index') },
                                    { label: 'Item Status', route: null }
                                ]} />
                            </div>
                            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl font-semibold text-gray-900">Item Status</h1>

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

                                                <button
                                                    onClick={() => {
                                                        router.visit(route('admin.items.export'));
                                                        setShowActions(false);
                                                    }}
                                                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
                                                    role="menuitem"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    Export Items
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                    <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            id="search"
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
                                            placeholder="Search by name, barcode, SKU, brand, or model"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            ref={searchInputRef}
                                        />
                                        <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                                            <button
                                                onClick={() => setShowBarcodeScanner(true)}
                                                className="p-2 text-gray-600 hover:text-gray-900"
                                                title="Scan Barcode"
                                            >
                                                <QrCodeIcon className="h-5 w-5" />
                                            </button>
                                        </span>
                                    </div>
                                </div>

                                <div className="col-span-1">
                                    <label htmlFor="brandFilter" className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                    <select
                                        id="brandFilter"
                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={brandFilter}
                                        onChange={(e) => setBrandFilter(e.target.value)}
                                    >
                                        <option value="all">All Brands</option>
                                        {uniqueBrands.map(brand => (
                                            <option key={brand} value={brand}>{brand}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-1">
                                    <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        id="statusFilter"
                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="Out of Stock">Out of Stock</option>
                                        <option value="Low Stock">Low Stock</option>
                                    </select>
                                </div>
                            </div>

                            {/* Desktop table */}
                            <div className="hidden md:block">
                                <ItemTable
                                    items={currentItems}
                                    loading={loading}
                                    onItemClick={handleItemClick}
                                    showStatus={true}
                                />
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
                                            <div
                                                key={item.id}
                                                className="bg-white rounded-lg border p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200"
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-900">
                                                            {item.itemName}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {item.barcode || 'No Barcode'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.quantity === 0 ? 'bg-red-100 text-red-800' : item.quantity <= 9 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                            {item.quantity === 0 ? 'Out of Stock' : item.quantity <= 9 ? 'Low Stock' : 'In Stock'}
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
                                                </div>

                                                
                                            </div>
                                        ))
                                    )
                                )}
                            </div>

                            {/* Pagination */}
                            {totalItems > 0 && (
                                <div className="mt-4">
                                    <Pagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        totalItems={totalItems}
                                        itemsPerPage={itemsPerPage}
                                        showingFrom={startIndex + 1}
                                        showingTo={Math.min(endIndex, totalItems)}
                                    />
                                </div>
                            )}

                            {detailModalOpen && selectedItem && (
                                <ItemDetailModal
                                    item={selectedItem}
                                    isOpen={detailModalOpen}
                                    onClose={() => {
                                        setDetailModalOpen(false);
                                        setSelectedItem(null);
                                    }}
                                    onEdit={() => {
                                        setDetailModalOpen(false);
                                        handleEditItem(selectedItem);
                                    }}
                                    onDelete={() => {
                                        setDetailModalOpen(false);
                                        // Handle delete if needed
                                    }}
                                    showActions={false}
                                />
                            )}

                            {/* Barcode Scanner Modal */}
                            <BarcodeScanner
                                isOpen={showBarcodeScanner}
                                onClose={() => setShowBarcodeScanner(false)}
                                onScan={handleBarcodeScan}
                                title="Scan Barcode"
                                placeholder="Scan or enter barcode to search"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
