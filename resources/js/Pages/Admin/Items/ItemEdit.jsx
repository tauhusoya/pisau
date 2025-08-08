import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { collection, doc, getDoc, updateDoc, serverTimestamp, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db, auth } from '../../../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';

import BarcodeScanner from '../../../Components/BarcodeScanner';
import { QrCodeIcon } from '@heroicons/react/24/outline';
import Breadcrumb from '../../../Components/Breadcrumb';

export default function ItemEdit({ itemId }) {
    const [userLoading, setUserLoading] = useState(true);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [scannerBuffer, setScannerBuffer] = useState('');
    const barcodeInputRef = useRef(null);
    const itemCodeInputRef = useRef(null);

    // Actions dropdown state
    const [showActions, setShowActions] = useState(false);
    const actionsRef = useRef(null);

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

    const { data, setData, processing, errors } = useForm({
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

    // Handle brand change
    const handleBrandChange = (brand) => {
        setData('brand', brand);
        setData('model', ''); // Clear model when brand changes
        setData('color', ''); // Clear color when brand changes
        setDynamicColors([]); // Clear colors
        fetchModelsByBrand(brand); // Fetch models for the selected brand
    };

    // Handle model change
    const handleModelChange = (model) => {
        const currentBrand = data.brand;
        setData('model', model);
        setData('color', ''); // Clear color when model changes
        if (currentBrand && model) {
            fetchColorsByBrandModel(currentBrand, model);
        } else {
            setDynamicColors([]);
        }
    };

    // Handle color change
    const handleColorChange = (color) => {
        setData('color', color);
    };

    // Handle adding new color
    const handleAddNewColor = async (colorName) => {
        if (!colorName.trim() || !data.brand || !data.model) return;

        try {
            // Add to Firestore colorVariations collection
            await addDoc(collection(db, 'colorVariations'), {
                brand: data.brand,
                model: data.model,
                color: colorName.trim(),
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicColors(prev => [...prev, colorName.trim()].sort());
            setData('color', colorName.trim());
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
    const handleAddNewBrand = async (brandName) => {
        if (!brandName.trim()) return;

        try {
            // Add to Firestore
            await addDoc(collection(db, 'brands'), {
                name: brandName.trim(),
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicBrands(prev => [...prev, brandName.trim()].sort());
            setData('brand', brandName.trim());
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
    const handleAddNewModel = async (modelName) => {
        if (!modelName.trim() || !data.brand) return;

        try {
            // Add to Firestore
            await addDoc(collection(db, 'models'), {
                name: modelName.trim(),
                brand: data.brand, // Associate model with brand
                createdAt: serverTimestamp()
            });

            // Update local state
            setDynamicModels(prev => [...prev, modelName.trim()].sort());
            setData('model', modelName.trim());
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

    // Handle barcode scan
    const handleBarcodeScan = (barcode) => {
        setData('barcode', barcode);
        setShowBarcodeScanner(false);
    };

    // Handle physical scanner input
    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Enter' && scannerBuffer.trim()) {
                setData('barcode', scannerBuffer.trim());
                setScannerBuffer('');
                if (barcodeInputRef.current) {
                    barcodeInputRef.current.focus();
                }
            } else if (event.key.length === 1) {
                setScannerBuffer(prev => prev + event.key);
            }
        };

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

    // Fetch item data
    const fetchItem = async () => {
        try {
            const itemDoc = await getDoc(doc(db, 'items', itemId));
            if (itemDoc.exists()) {
                const itemData = itemDoc.data();
                setItem(itemData);
                setData({
                    itemCode: itemData.itemCode || '',
                    barcode: itemData.barcode || '',
                    skuId: itemData.skuId || '',
                    itemName: itemData.itemName || '',
                    description: itemData.description || '',
                    color: itemData.color || '',
                    brand: itemData.brand || '',
                    model: itemData.model || '',
                    length: itemData.length || '',
                    costPrice: itemData.costPrice || '',
                    retailPrice: itemData.retailPrice || '',
                    quantity: itemData.quantity || ''
                });

                // Load colors based on brand and model if they exist
                if (itemData.brand && itemData.model) {
                    await fetchColorsByBrandModel(itemData.brand, itemData.model);
                }
            } else {
                setMessage('Item not found');
            }
        } catch (error) {
            console.error('Error fetching item:', error);
            setMessage('Error fetching item data');
        } finally {
            setLoading(false);
        }
    };

    // Combined useEffect for auth state, fetching options, and item data
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

        // Fetch item data
        fetchItem();

        return () => unsubscribe();
    }, [itemId]);

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

    const handleInputChange = (field, value) => {
        setData(field, value);
    };

    const calculateProfitMargin = () => {
        const cost = parseFloat(data.costPrice) || 0;
        const retail = parseFloat(data.retailPrice) || 0;
        if (cost > 0 && retail > 0) {
            return ((retail - cost) / retail * 100).toFixed(2);
        }
        return '0.00';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setMessage('');

        try {
            // Validate required fields
            if (!data.itemCode || !data.itemName || !data.barcode || !data.skuId || !data.costPrice || !data.retailPrice) {
                setMessage('Error: Please fill in all required fields.');
                setSubmitting(false);
                return;
            }

            const itemData = {
                ...data,
                costPrice: parseFloat(data.costPrice),
                retailPrice: parseFloat(data.retailPrice),
                quantity: 0,
                length: parseFloat(data.length),
                updatedAt: serverTimestamp()
            };

            await updateDoc(doc(db, 'items', itemId), itemData);

            setMessage('Item updated successfully!');

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = route('admin.items.index');
            }, 1500);

        } catch (error) {
            console.error('Error updating item:', error);
            setMessage('Error updating item. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (userLoading || loading) {
        return (
            <AuthenticatedLayout user={loggedInUser}>
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </AuthenticatedLayout>
        );
    }

    if (!item) {
        return (
            <AuthenticatedLayout user={loggedInUser}>
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <p className="text-gray-600">Item not found</p>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout user={loggedInUser}>
            <Head title="Edit Item" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <div className="mb-6">
                                <Breadcrumb items={[
                                    { label: 'Manage Items', route: route('admin.items.index') },
                                    { label: 'Edit Item', route: null }
                                ]} />
                            </div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-semibold text-gray-900">Edit Item</h2>

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

                            {message && (
                                <div className={`mb-4 p-4 rounded-md ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {message}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Information */}
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-1">
                                            <label htmlFor="itemCode" className="block text-sm font-medium text-gray-700 mb-1">
                                                Item Code *
                                            </label>
                                            <input
                                                ref={itemCodeInputRef}
                                                type="text"
                                                id="itemCode"
                                                value={data.itemCode}
                                                onChange={(e) => handleInputChange('itemCode', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                required
                                            />
                                            {errors.itemCode && <p className="mt-1 text-sm text-red-600">{errors.itemCode}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-1">
                                                Item Name *
                                            </label>
                                            <input
                                                type="text"
                                                id="itemName"
                                                value={data.itemName}
                                                onChange={(e) => handleInputChange('itemName', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                required
                                            />
                                            {errors.itemName && <p className="mt-1 text-sm text-red-600">{errors.itemName}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
                                                Barcode *
                                            </label>
                                            <div className="flex">
                                                <input
                                                    ref={barcodeInputRef}
                                                    type="text"
                                                    id="barcode"
                                                    value={data.barcode}
                                                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                                                    className="block w-full border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowBarcodeScanner(true)}
                                                    className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <QrCodeIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {errors.barcode && <p className="mt-1 text-sm text-red-600">{errors.barcode}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="skuId" className="block text-sm font-medium text-gray-700 mb-1">
                                                SKU ID *
                                            </label>
                                            <input
                                                type="text"
                                                id="skuId"
                                                value={data.skuId}
                                                onChange={(e) => handleInputChange('skuId', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Enter SKU ID manually"
                                                required
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                id="description"
                                                rows={3}
                                                value={data.description}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Product Details */}
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="col-span-1">
                                            <label htmlFor="brand" className="block text-sm font-medium text-gray-700 mb-1">
                                                Brand
                                            </label>
                                            {addingNewBrand ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={newBrandValue}
                                                        onChange={(e) => setNewBrandValue(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleAddNewBrand(newBrandValue);
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
                                                        id="brand"
                                                        value={data.brand}
                                                        onChange={(e) => handleBrandChange(e.target.value)}
                                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    >
                                                        <option value="">Select Brand</option>
                                                        {dynamicBrands.map(brand => (
                                                            <option key={brand} value={brand}>{brand}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddingNewBrand(true)}
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                    >
                                                        + Add New Brand
                                                    </button>
                                                </div>
                                            )}
                                            {errors.brand && <p className="mt-1 text-sm text-red-600">{errors.brand}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                                                Model
                                            </label>
                                            {addingNewModel ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={newModelValue}
                                                        onChange={(e) => setNewModelValue(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleAddNewModel(newModelValue);
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
                                                        id="model"
                                                        value={data.model}
                                                        onChange={(e) => handleModelChange(e.target.value)}
                                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        disabled={!data.brand}
                                                    >
                                                        <option value="">Select Model</option>
                                                        {dynamicModels.map(model => (
                                                            <option key={model} value={model}>{model}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddingNewModel(true)}
                                                        disabled={!data.brand}
                                                        className={`text-sm ${data.brand
                                                            ? 'text-blue-600 hover:text-blue-800'
                                                            : 'text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        + Add New Model
                                                    </button>
                                                </div>
                                            )}
                                            {errors.model && <p className="mt-1 text-sm text-red-600">{errors.model}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                                                Color
                                            </label>
                                            {addingNewColor ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={newColorValue}
                                                        onChange={(e) => setNewColorValue(e.target.value)}
                                                        onKeyPress={(e) => {
                                                            if (e.key === 'Enter') {
                                                                handleAddNewColor(newColorValue);
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
                                                        id="color"
                                                        value={data.color}
                                                        onChange={(e) => handleColorChange(e.target.value)}
                                                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                        disabled={!data.brand || !data.model}
                                                    >
                                                        <option value="">Select Color</option>
                                                        {dynamicColors.map(color => (
                                                            <option key={color} value={color}>{color}</option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAddingNewColor(true)}
                                                        disabled={!data.brand || !data.model}
                                                        className={`text-sm ${data.brand && data.model
                                                            ? 'text-blue-600 hover:text-blue-800'
                                                            : 'text-gray-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        + Add New Color
                                                    </button>
                                                </div>
                                            )}
                                            {errors.color && <p className="mt-1 text-sm text-red-600">{errors.color}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="length" className="block text-sm font-medium text-gray-700 mb-1">
                                                Length (cm)
                                            </label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                id="length"
                                                value={data.length}
                                                onChange={(e) => handleInputChange('length', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                            {errors.length && <p className="mt-1 text-sm text-red-600">{errors.length}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Pricing Information */}
                                <div className="bg-gray-50 p-6 rounded-lg">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing Information</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="col-span-1">
                                            <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                                Cost Price (RM) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                id="costPrice"
                                                value={data.costPrice}
                                                onChange={(e) => handleInputChange('costPrice', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                required
                                            />
                                            {errors.costPrice && <p className="mt-1 text-sm text-red-600">{errors.costPrice}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label htmlFor="retailPrice" className="block text-sm font-medium text-gray-700 mb-1">
                                                Retail Price (RM) *
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                id="retailPrice"
                                                value={data.retailPrice}
                                                onChange={(e) => handleInputChange('retailPrice', e.target.value)}
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                required
                                            />
                                            {errors.retailPrice && <p className="mt-1 text-sm text-red-600">{errors.retailPrice}</p>}
                                        </div>

                                        <div className="col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Profit Margin (%)
                                            </label>
                                            <input
                                                type="text"
                                                value={`${calculateProfitMargin()}%`}
                                                className="block w-full border-gray-300 rounded-md shadow-sm bg-gray-50 sm:text-sm"
                                                readOnly
                                            />
                                        </div>
                                    </div>
                                </div>



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
                                        {processing || submitting ? 'Updating...' : 'Update Item'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barcode Scanner Modal */}
            {showBarcodeScanner && (
                <BarcodeScanner
                    isOpen={showBarcodeScanner}
                    onClose={() => setShowBarcodeScanner(false)}
                    onScan={handleBarcodeScan}
                />
            )}
        </AuthenticatedLayout>
    );
}

