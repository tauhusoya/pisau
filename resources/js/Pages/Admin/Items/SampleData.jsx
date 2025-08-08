import { useState } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { auth, db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';


export default function SampleData() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const sampleItems = [
        {
            barcode: '1234567890123',
            skuId: 'SKU001',
            itemName: 'iPhone 14 Pro',
            description: 'Latest iPhone model with advanced camera system',
            color: 'Space Black',
            brand: 'Apple',
            model: 'iPhone 14 Pro',
            category: 'Smartphones',
            costPrice: 3500.00,
            retailPrice: 4299.00,
            quantity: 25,
            status: 'active'
        },
        {
            barcode: '1234567890124',
            skuId: 'SKU002',
            itemName: 'Samsung Galaxy S23',
            description: 'Premium Android smartphone with excellent performance',
            color: 'Phantom Black',
            brand: 'Samsung',
            model: 'Galaxy S23',
            category: 'Smartphones',
            costPrice: 2800.00,
            retailPrice: 3499.00,
            quantity: 30,
            status: 'active'
        },
        {
            barcode: '1234567890125',
            skuId: 'SKU003',
            itemName: 'MacBook Pro 14"',
            description: 'Professional laptop for developers and creatives',
            color: 'Space Gray',
            brand: 'Apple',
            model: 'MacBook Pro 14"',
            category: 'Laptops',
            costPrice: 6500.00,
            retailPrice: 7999.00,
            quantity: 15,
            status: 'active'
        },
        {
            barcode: '1234567890126',
            skuId: 'SKU004',
            itemName: 'Dell XPS 13',
            description: 'Ultrabook with premium design and performance',
            color: 'Platinum Silver',
            brand: 'Dell',
            model: 'XPS 13',
            category: 'Laptops',
            costPrice: 3200.00,
            retailPrice: 3999.00,
            quantity: 20,
            status: 'active'
        },
        {
            barcode: '1234567890127',
            skuId: 'SKU005',
            itemName: 'AirPods Pro',
            description: 'Wireless earbuds with active noise cancellation',
            color: 'White',
            brand: 'Apple',
            model: 'AirPods Pro',
            category: 'Audio',
            costPrice: 180.00,
            retailPrice: 249.00,
            quantity: 50,
            status: 'active'
        }
    ];

    const addSampleData = async () => {
        setLoading(true);
        setMessage('');

        try {
            // Add sample items
            for (const item of sampleItems) {
                await addDoc(collection(db, 'items'), {
                    ...item,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Add sample brands
            const sampleBrands = ['PiRGE', 'Atasan Bicak', 'Victorinox'];
            for (const brand of sampleBrands) {
                await addDoc(collection(db, 'brands'), {
                    name: brand,
                    createdAt: serverTimestamp()
                });
            }

            // Add sample models
            const sampleModels = [
                { name: 'Superior', brand: 'PiRGE' },
                { name: 'Gastro', brand: 'PiRGE' },
                { name: 'Pureline', brand: 'PiRGE' },
                { name: 'Classic', brand: 'Atasan Bicak' },
                { name: 'Professional', brand: 'Atasan Bicak' },
                { name: 'Swiss Army', brand: 'Victorinox' },
                { name: 'Huntsman', brand: 'Victorinox' }
            ];
            for (const model of sampleModels) {
                await addDoc(collection(db, 'models'), {
                    name: model.name,
                    brand: model.brand,
                    createdAt: serverTimestamp()
                });
            }

            // Add sample color variations
            const sampleColorVariations = [
                { brand: 'PiRGE', model: 'Superior', color: 'Black' },
                { brand: 'PiRGE', model: 'Superior', color: 'Red' },
                { brand: 'PiRGE', model: 'Superior', color: 'Blue' },
                { brand: 'PiRGE', model: 'Gastro', color: 'Black' },
                { brand: 'PiRGE', model: 'Gastro', color: 'Yellow' },
                { brand: 'PiRGE', model: 'Gastro', color: 'Green' },
                { brand: 'PiRGE', model: 'Pureline', color: 'Black' },
                { brand: 'PiRGE', model: 'Pureline', color: 'Red' },
                { brand: 'Atasan Bicak', model: 'Classic', color: 'Black' },
                { brand: 'Atasan Bicak', model: 'Classic', color: 'Red' },
                { brand: 'Atasan Bicak', model: 'Professional', color: 'Black' },
                { brand: 'Atasan Bicak', model: 'Professional', color: 'Blue' },
                { brand: 'Victorinox', model: 'Swiss Army', color: 'Red' },
                { brand: 'Victorinox', model: 'Swiss Army', color: 'Black' },
                { brand: 'Victorinox', model: 'Huntsman', color: 'Red' },
                { brand: 'Victorinox', model: 'Huntsman', color: 'Black' }
            ];
            for (const colorVar of sampleColorVariations) {
                await addDoc(collection(db, 'colorVariations'), {
                    brand: colorVar.brand,
                    model: colorVar.model,
                    color: colorVar.color,
                    createdAt: serverTimestamp()
                });
            }

            setMessage('Sample data added successfully!');
        } catch (error) {
            console.error('Error adding sample data:', error);
            setMessage('Error adding sample data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Sample Data</h2>}
        >
            <Head title="Sample Data" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h1 className="text-2xl font-semibold text-gray-900 mb-4">Add Sample Items</h1>

                            <p className="text-gray-600 mb-6">
                                This will add 5 sample items to your Firestore database for testing the item management system.
                            </p>

                            <button
                                onClick={addSampleData}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:bg-blue-600 transition disabled:opacity-50"
                            >
                                {loading ? 'Adding...' : 'Add Sample Data'}
                            </button>

                            {message && (
                                <div className={`mt-4 p-4 rounded-md ${message.includes('Error')
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-green-100 text-green-700'
                                    }`}>
                                    {message}
                                </div>
                            )}

                            <div className="mt-8">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Sample Items:</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sampleItems.map((item, index) => (
                                        <div key={index} className="border rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                                            <p className="text-sm text-gray-600">{item.brand} {item.model}</p>
                                            <p className="text-sm text-gray-600">Barcode: {item.barcode}</p>
                                            <p className="text-sm text-gray-600">SKU: {item.skuId}</p>
                                            <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                                            <p className="text-sm text-gray-600">Cost: RM{item.costPrice}</p>
                                            <p className="text-sm text-gray-600">Retail: RM{item.retailPrice}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
