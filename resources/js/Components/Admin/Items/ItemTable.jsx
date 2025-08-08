import React from 'react';

export default function ItemTable({ items, loading, onItemClick, showStatus = false }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="bg-gray-50 p-10 text-center rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No items found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
            </div>
        );
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR'
        }).format(amount || 0);
    };

    const getStockStatus = (quantity) => {
        const qty = parseInt(quantity) || 0;
        if (qty === 0) return 'Out of Stock';
        if (qty >= 1 && qty <= 9) return 'Low Stock';
        return 'In Stock';
    };

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

    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="py-3 px-6">Barcode</th>
                        <th scope="col" className="py-3 px-6">Item Name</th>
                        <th scope="col" className="py-3 px-6">Brand</th>
                        <th scope="col" className="py-3 px-6">Model</th>
                        {!showStatus && (
                            <>
                                <th scope="col" className="py-3 px-6">Cost Price</th>
                                <th scope="col" className="py-3 px-6">Retail Price</th>
                            </>
                        )}
                        {showStatus && (
                            <>
                                <th scope="col" className="py-3 px-6">Quantity</th>
                                <th scope="col" className="py-3 px-6">Status</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <tr
                            key={item.id}
                            className="bg-white border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => onItemClick(item)}
                        >
                            <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                                {item.barcode || 'N/A'}
                            </td>
                            <td className="py-4 px-6">
                                <div>
                                    <div className="font-medium text-gray-900">{item.itemName}</div>
                                    {item.skuId && (
                                        <div className="text-xs text-gray-500">SKU: {item.skuId}</div>
                                    )}
                                </div>
                            </td>
                            <td className="py-4 px-6">{item.brand || 'N/A'}</td>
                            <td className="py-4 px-6">{item.model || 'N/A'}</td>
                            {!showStatus && (
                                <>
                                    <td className="py-4 px-6 font-medium text-gray-900">
                                        {formatCurrency(item.costPrice)}
                                    </td>
                                    <td className="py-4 px-6 font-medium text-gray-900">
                                        {formatCurrency(item.retailPrice)}
                                    </td>
                                </>
                            )}
                            {showStatus && (
                                <>
                                    <td className="py-4 px-6 font-medium text-gray-900">
                                        {item.quantity || 0}
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(getStockStatus(item.quantity))}`}>
                                            {getStockStatus(item.quantity)}
                                        </span>
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
