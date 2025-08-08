import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, getDoc, where } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import Breadcrumb from '../../../Components/Breadcrumb';
import BarcodeScanner from '../../../Components/BarcodeScanner';
import { QrCodeIcon } from '@heroicons/react/24/outline';


export default function ItemImport() {
    const [userLoading, setUserLoading] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [importMode, setImportMode] = useState('manual'); // 'manual' or 'csv'
    const [csvFile, setCsvFile] = useState(null);
    const [csvData, setCsvData] = useState([]);
    const [csvErrors, setCsvErrors] = useState([]);

    // Dynamic options from Firestore
    const [dynamicColors, setDynamicColors] = useState([]);
    const [dynamicBrands, setDynamicBrands] = useState([]);
    const [dynamicModels, setDynamicModels] = useState([]);

    // Add new states
    const [addingNewColor, setAddingNewColor] = useState(false);
    const [addingNewBrand, setAddingNewBrand] = useState(false);
    const [addingNewModel, setAddingNewModel] = useState(false);
    const [newColorValue, setNewColorValue] = useState('');
    const [newBrandValue, setNewBrandValue] = useState('');
    const [newModelValue, setNewModelValue] = useState('');
    const itemCodeInputRef = useRef(null);

    // Barcode scanner states
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [scannerBuffer, setScannerBuffer] = useState('');
    const [currentScanningItemIndex, setCurrentScanningItemIndex] = useState(0);
    const barcodeInputRefs = useRef({});

    // Actions dropdown state
    const [showActions, setShowActions] = useState(false);
    const actionsRef = useRef(null);

    const { data, setData, processing, errors } = useForm({
        items: [{
            itemCode: '',
            barcode: '',
            skuId: '',
            itemName: '',
            description: '',
            color: '',
            brand: '',
            model: '',
            length: '',
            costPrice: '',
            retailPrice: ''
        }]
    });

    // Fetch options from Firestore
    const fetchOptions = async () => {
        try {
            // Fetch brands
            const brandsQuery = query(collection(db, 'brands'));
            const brandsSnapshot = await getDocs(brandsQuery);
            const brands = brandsSnapshot.docs.map(doc => doc.data().name).sort();
            setDynamicBrands(brands);

            // Don't fetch all models initially - they will be fetched when brand is selected
            setDynamicModels([]);
        } catch (error) {
            console.error('Error fetching options:', error);
        }
    };

    // Fetch models for a specific brand
    const fetchModelsByBrand = async (brand) => {
        if (!brand) {
            setDynamicModels([]);
            return;
        }

        try {
            const modelsQuery = query(
                collection(db, 'models'),
                where('brand', '==', brand)
            );
            const modelsSnapshot = await getDocs(modelsQuery);
            const models = modelsSnapshot.docs.map(doc => doc.data().name).sort();
            setDynamicModels(models);
        } catch (error) {
            console.error('Error fetching models:', error);
            setDynamicModels([]);
        }
    };

    // Fetch colors based on brand and model
    const fetchColorsByBrandModel = async (brand, model) => {
        if (!brand || !model) {
            setDynamicColors([]);
            return;
        }

        try {
            const colorsQuery = query(
                collection(db, 'colorVariations'),
                where('brand', '==', brand),
                where('model', '==', model)
            );
            const colorsSnapshot = await getDocs(colorsQuery);
            const colors = colorsSnapshot.docs.map(doc => doc.data().color).sort();
            setDynamicColors(colors);
        } catch (error) {
            console.error('Error fetching colors:', error);
            setDynamicColors([]);
        }
    };

    // Handle brand change for a specific item
    const handleBrandChange = (brand, itemIndex = 0) => {
        const updatedItems = [...data.items];
        updatedItems[itemIndex].brand = brand;
        updatedItems[itemIndex].model = ''; // Clear model when brand changes
        updatedItems[itemIndex].color = ''; // Clear color when brand changes
        setData('items', updatedItems);
        setDynamicColors([]); // Clear colors
        fetchModelsByBrand(brand); // Fetch models for the selected brand
    };

    // Handle model change for a specific item
    const handleModelChange = (model, itemIndex = 0) => {
        const updatedItems = [...data.items];
        updatedItems[itemIndex].model = model;
        updatedItems[itemIndex].color = ''; // Clear color when model changes
        setData('items', updatedItems);

        if (updatedItems[itemIndex].brand && model) {
            fetchColorsByBrandModel(updatedItems[itemIndex].brand, model);
        } else {
            setDynamicColors([]);
        }
    };

    // Handle color change for a specific item
    const handleColorChange = (color, itemIndex = 0) => {
        const updatedItems = [...data.items];
        updatedItems[itemIndex].color = color;
        setData('items', updatedItems);
    };

    // Handle adding new color
    const handleAddNewColor = async (colorName, itemIndex = 0) => {
        if (!colorName.trim() || !data.items[itemIndex].brand || !data.items[itemIndex].model) return;

        try {
            // Add to Firestore colorVariations collection
            await addDoc(collection(db, 'colorVariations'), {
                brand: data.items[itemIndex].brand,
                model: data.items[itemIndex].model,
                color: colorName.trim(),
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicColors(prev => [...prev, colorName.trim()].sort());

            // Update form data
            const updatedItems = [...data.items];
            updatedItems[itemIndex].color = colorName.trim();
            setData('items', updatedItems);

            setAddingNewColor(false);
            setNewColorValue('');

            // Focus on item code field
            setTimeout(() => {
                if (itemCodeInputRef.current) {
                    itemCodeInputRef.current.focus();
                }
            }, 100);
        } catch (error) {
            console.error('Error adding color:', error);
        }
    };

    // Handle adding new brand
    const handleAddNewBrand = async (brandName, itemIndex = 0) => {
        if (!brandName.trim()) return;

        try {
            // Add to Firestore
            await addDoc(collection(db, 'brands'), {
                name: brandName.trim(),
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicBrands(prev => [...prev, brandName.trim()].sort());

            // Update form data
            const updatedItems = [...data.items];
            updatedItems[itemIndex].brand = brandName.trim();
            setData('items', updatedItems);

            setAddingNewBrand(false);
            setNewBrandValue('');

            // Focus on item code field
            setTimeout(() => {
                if (itemCodeInputRef.current) {
                    itemCodeInputRef.current.focus();
                }
            }, 100);
        } catch (error) {
            console.error('Error adding brand:', error);
        }
    };

    // Handle adding new model
    const handleAddNewModel = async (modelName, itemIndex = 0) => {
        if (!modelName.trim() || !data.items[itemIndex].brand) return;

        try {
            // Add to Firestore
            await addDoc(collection(db, 'models'), {
                name: modelName.trim(),
                brand: data.items[itemIndex].brand, // Associate model with brand
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicModels(prev => [...prev, modelName.trim()].sort());

            // Update form data
            const updatedItems = [...data.items];
            updatedItems[itemIndex].model = modelName.trim();
            setData('items', updatedItems);

            setAddingNewModel(false);
            setNewModelValue('');

            // Focus on item code field
            setTimeout(() => {
                if (itemCodeInputRef.current) {
                    itemCodeInputRef.current.focus();
                }
            }, 100);
        } catch (error) {
            console.error('Error adding model:', error);
        }
    };

    // Combined useEffect for auth state and fetching options
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setLoggedInUser({
                            uid: user.uid,
                            email: user.email,
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            role: userData.role || 'user',
                            status: userData.status || 'active'
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
            setUserLoading(false);
        });

        // Fetch options from Firestore
        fetchOptions();

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
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [showActions]);

    // Handle barcode scan
    const handleBarcodeScan = (barcode, itemIndex) => {
        const updatedItems = [...data.items];
        updatedItems[itemIndex].barcode = barcode;
        setData('items', updatedItems);
        setShowBarcodeScanner(false);
    };

    // Handle physical scanner input
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (showBarcodeScanner) return; // Don't process if scanner modal is open

            // Buffer the characters
            setScannerBuffer(prev => prev + event.key);

            // If Enter is pressed, process the barcode
            if (event.key === 'Enter') {
                const scannedBarcode = scannerBuffer.trim();
                if (scannedBarcode) {
                    // Find which barcode input is focused
                    const activeElement = document.activeElement;
                    if (activeElement && activeElement.name === 'barcode') {
                        const itemIndex = parseInt(activeElement.dataset.itemIndex);
                        const updatedItems = [...data.items];
                        updatedItems[itemIndex].barcode = scannedBarcode;
                        setData('items', updatedItems);
                    }
                }
                setScannerBuffer('');
            }
        };

        document.addEventListener('keypress', handleKeyPress);
        return () => document.removeEventListener('keypress', handleKeyPress);
    }, [scannerBuffer, showBarcodeScanner, data.items]);

    // Clear scanner buffer when modal opens
    useEffect(() => {
        if (showBarcodeScanner) {
            setScannerBuffer('');
        }
    }, [showBarcodeScanner]);

    const handleInputChange = (itemIndex, field, value) => {
        const updatedItems = [...data.items];
        updatedItems[itemIndex][field] = value;

        // Reset model when brand changes
        if (field === 'brand') {
            updatedItems[itemIndex].model = '';
        }

        setData('items', updatedItems);
    };

    const addItem = () => {
        setData('items', [...data.items, {
            itemCode: '',
            barcode: '',
            skuId: '',
            itemName: '',
            description: '',
            color: '',
            brand: '',
            model: '',
            length: '',
            costPrice: '',
            retailPrice: ''
        }]);
    };

    const removeItem = (index) => {
        if (data.items.length > 1) {
            const updatedItems = data.items.filter((_, i) => i !== index);
            setData('items', updatedItems);
        }
    };

    const calculateProfitMargin = (costPrice, retailPrice) => {
        const cost = parseFloat(costPrice) || 0;
        const retail = parseFloat(retailPrice) || 0;
        if (cost > 0 && retail > 0) {
            return ((retail - cost) / retail * 100).toFixed(2);
        }
        return '0.00';
    };

    const handleCsvUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            setCsvFile(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());
                const csvItems = lines.slice(1).filter(line => line.trim()).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const item = {};
                    headers.forEach((header, index) => {
                        item[header] = values[index] || '';
                    });
                    return item;
                });
                setCsvData(csvItems);
                setImportMode('csv');
            };
            reader.readAsText(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage('');

        try {
            const itemsToImport = importMode === 'csv' ? csvData : data.items;
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 0; i < itemsToImport.length; i++) {
                const item = itemsToImport[i];

                // Validate required fields
                if (!item.itemCode || !item.itemName || !item.barcode || !item.skuId || !item.costPrice || !item.retailPrice) {
                    errors.push(`Item ${i + 1}: Missing required fields`);
                    errorCount++;
                    continue;
                }

                try {
                    const itemData = {
                        itemCode: item.itemCode,
                        barcode: item.barcode || '',
                        skuId: item.skuId || '',
                        itemName: item.itemName,
                        description: item.description || '',
                        color: item.color || '',
                        brand: item.brand || '',
                        model: item.model || '',
                        length: parseFloat(item.length) || 0,
                        costPrice: parseFloat(item.costPrice),
                        retailPrice: parseFloat(item.retailPrice),
                        quantity: 0,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    };

                    await addDoc(collection(db, 'items'), itemData);
                    successCount++;
                } catch (error) {
                    errors.push(`Item ${i + 1}: ${error.message}`);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                setMessage(`Successfully imported ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
                if (errorCount === 0) {
                    setTimeout(() => {
                        window.location.href = route('admin.items.index');
                    }, 1500);
                }
            } else {
                setMessage('No items were imported. Please check your data.');
            }

            if (errors.length > 0) {
                setCsvErrors(errors);
            }

        } catch (error) {
            console.error('Error importing items:', error);
            setMessage('Error importing items. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (userLoading) {
        return (
            <AuthenticatedLayout user={loggedInUser}>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout user={loggedInUser}>
            <Head title="Bulk Import Items" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6">
                                <Breadcrumb items={[
                                    { label: 'Manage Items', route: route('admin.items.index') },
                                    { label: 'Bulk Import', route: null }
                                ]} />
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">Bulk Import Items</h2>

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

                            {message && (
                                <div className={`mb-4 p-4 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {message}
                                </div>
                            )}

                            {/* Import Mode Selection */}
                            <div className="mb-6">
                                <div className="flex space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setImportMode('manual')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${importMode === 'manual'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        Manual Entry
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setImportMode('csv')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium ${importMode === 'csv'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                    >
                                        CSV Upload
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {importMode === 'manual' ? (
                                    /* Manual Entry Mode */
                                    <div className="space-y-6">
                                        {data.items.map((item, index) => (
                                            <div key={index} className="bg-gray-50 p-6 rounded-lg">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h3 className="text-lg font-medium text-gray-900">Item {index + 1}</h3>
                                                    {data.items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(index)}
                                                            className="text-red-600 hover:text-red-800 text-sm"
                                                        >
                                                            Remove Item
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Basic Information */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Item Code *
                                                        </label>
                                                        <input
                                                            ref={index === 0 ? itemCodeInputRef : null}
                                                            type="text"
                                                            value={item.itemCode}
                                                            onChange={(e) => handleInputChange(index, 'itemCode', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Item Name *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.itemName}
                                                            onChange={(e) => handleInputChange(index, 'itemName', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Barcode *
                                                        </label>
                                                        <div className="flex">
                                                            <input
                                                                ref={el => barcodeInputRefs.current[index] = el}
                                                                type="text"
                                                                name="barcode"
                                                                data-item-index={index}
                                                                value={item.barcode}
                                                                onChange={(e) => handleInputChange(index, 'barcode', e.target.value)}
                                                                className="block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                required
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setCurrentScanningItemIndex(index);
                                                                    setShowBarcodeScanner(true);
                                                                }}
                                                                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            >
                                                                <QrCodeIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            SKU ID *
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={item.skuId}
                                                            onChange={(e) => handleInputChange(index, 'skuId', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            placeholder="Enter SKU ID manually"
                                                            required
                                                        />
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            rows={3}
                                                            value={item.description}
                                                            onChange={(e) => handleInputChange(index, 'description', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Product Details */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Brand
                                                        </label>
                                                        {addingNewBrand && index === 0 ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={newBrandValue}
                                                                    onChange={(e) => setNewBrandValue(e.target.value)}
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddNewBrand(newBrandValue, index);
                                                                        }
                                                                    }}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                    placeholder="Type new brand and press Enter"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAddingNewBrand(false)}
                                                                    className="text-sm text-gray-500 hover:text-gray-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <select
                                                                    value={item.brand}
                                                                    onChange={(e) => handleBrandChange(e.target.value, index)}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                >
                                                                    <option value="">Select Brand</option>
                                                                    {dynamicBrands.map(brand => (
                                                                        <option key={brand} value={brand}>{brand}</option>
                                                                    ))}
                                                                </select>
                                                                {index === 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAddingNewBrand(true)}
                                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        + Add New Brand
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Model
                                                        </label>
                                                        {addingNewModel && index === 0 ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={newModelValue}
                                                                    onChange={(e) => setNewModelValue(e.target.value)}
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddNewModel(newModelValue, index);
                                                                        }
                                                                    }}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                    placeholder="Type new model and press Enter"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAddingNewModel(false)}
                                                                    className="text-sm text-gray-500 hover:text-gray-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <select
                                                                    value={item.model}
                                                                    onChange={(e) => handleModelChange(e.target.value, index)}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                    disabled={!item.brand}
                                                                >
                                                                    <option value="">Select Model</option>
                                                                    {dynamicModels.map(model => (
                                                                        <option key={model} value={model}>{model}</option>
                                                                    ))}
                                                                </select>
                                                                {index === 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAddingNewModel(true)}
                                                                        disabled={!item.brand}
                                                                        className={`text-sm ${item.brand
                                                                            ? 'text-blue-600 hover:text-blue-800'
                                                                            : 'text-gray-400 cursor-not-allowed'
                                                                            }`}
                                                                    >
                                                                        + Add New Model
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Color
                                                        </label>
                                                        {addingNewColor && index === 0 ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    value={newColorValue}
                                                                    onChange={(e) => setNewColorValue(e.target.value)}
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter') {
                                                                            handleAddNewColor(newColorValue, index);
                                                                        }
                                                                    }}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                    placeholder="Type new color and press Enter"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAddingNewColor(false)}
                                                                    className="text-sm text-gray-500 hover:text-gray-700"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                <select
                                                                    value={item.color}
                                                                    onChange={(e) => handleColorChange(e.target.value, index)}
                                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                                    disabled={!item.brand || !item.model}
                                                                >
                                                                    <option value="">Select Color</option>
                                                                    {dynamicColors.map(color => (
                                                                        <option key={color} value={color}>{color}</option>
                                                                    ))}
                                                                </select>
                                                                {index === 0 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAddingNewColor(true)}
                                                                        disabled={!item.brand || !item.model}
                                                                        className={`text-sm ${item.brand && item.model
                                                                            ? 'text-blue-600 hover:text-blue-800'
                                                                            : 'text-gray-400 cursor-not-allowed'
                                                                            }`}
                                                                    >
                                                                        + Add New Color
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Length (cm)
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            value={item.length}
                                                            onChange={(e) => handleInputChange(index, 'length', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Pricing Information */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Cost Price (RM) *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.costPrice}
                                                            onChange={(e) => handleInputChange(index, 'costPrice', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Retail Price (RM) *
                                                        </label>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={item.retailPrice}
                                                            onChange={(e) => handleInputChange(index, 'retailPrice', e.target.value)}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                            required
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Profit Margin (%)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={`${calculateProfitMargin(item.costPrice, item.retailPrice)}%`}
                                                            className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                                                            readOnly
                                                        />
                                                    </div>


                                                </div>
                                            </div>
                                        ))}

                                        <div className="flex justify-start">
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Add Another Item
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* CSV Upload Mode */
                                    <div className="space-y-6">
                                        <div className="bg-gray-50 p-6 rounded-lg">
                                            <h3 className="text-lg font-medium text-gray-900 mb-4">Upload CSV File</h3>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-center w-full">
                                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                            <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                                                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                                                            </svg>
                                                            <p className="mb-2 text-sm text-gray-500">
                                                                <span className="font-semibold">Click to upload</span> or drag and drop
                                                            </p>
                                                            <p className="text-xs text-gray-500">CSV file</p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept=".csv"
                                                            onChange={handleCsvUpload}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>

                                        {csvData.length > 0 && (
                                            <div className="bg-gray-50 p-6 rounded-lg">
                                                <h3 className="text-lg font-medium text-gray-900 mb-4">CSV Preview</h3>
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                {Object.keys(csvData[0] || {}).map((header, index) => (
                                                                    <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                                        {header}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {csvData.slice(0, 5).map((row, rowIndex) => (
                                                                <tr key={rowIndex}>
                                                                    {Object.values(row).map((value, colIndex) => (
                                                                        <td key={colIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                            {value}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                    {csvData.length > 5 && (
                                                        <p className="mt-2 text-sm text-gray-500">
                                                            Showing first 5 rows of {csvData.length} total rows
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {csvErrors.length > 0 && (
                                            <div className="bg-red-50 p-4 rounded-md">
                                                <h4 className="text-sm font-medium text-red-800 mb-2">Import Errors:</h4>
                                                <ul className="text-sm text-red-700 space-y-1">
                                                    {csvErrors.map((error, index) => (
                                                        <li key={index}>• {error}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Form Actions */}
                                <div className="flex justify-end space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => window.history.back()}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing || submitting}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        {processing || submitting ? 'Importing...' : 'Import Items'}
                                    </button>
                                </div>
                            </form>

                            {/* Barcode Scanner Modal */}
                            {showBarcodeScanner && (
                                <BarcodeScanner
                                    isOpen={showBarcodeScanner}
                                    onClose={() => setShowBarcodeScanner(false)}
                                    onScan={(barcode) => handleBarcodeScan(barcode, currentScanningItemIndex)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
