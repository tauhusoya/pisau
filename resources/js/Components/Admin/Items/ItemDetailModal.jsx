import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';

export default function ItemDetailModal({ item, isOpen, onClose, onEdit, onDelete, showActions = true }) {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-MY', {
            style: 'currency',
            currency: 'MYR'
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === 'N/A') return 'N/A';
        return new Date(dateString).toLocaleString('en-MY');
    };

    const getStockStatus = (quantity) => {
        const qty = parseInt(quantity) || 0;
        if (qty === 0) return 'Out of Stock';
        if (qty >= 1 && qty <= 9) return 'Low Stock';
        return 'Ready Stock';
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
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-medium leading-6 text-gray-900"
                                    >
                                        Item Details
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="rounded-md bg-gray-100 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors duration-200"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Basic Information */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">Basic Information</h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Barcode</label>
                                                <p className="mt-1 text-sm text-gray-900 font-mono">{item.barcode || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Item Code</label>
                                                <p className="mt-1 text-sm text-gray-900 font-mono">{item.itemCode || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">SKU ID</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.skuId || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Item Name</label>
                                                <p className="mt-1 text-sm text-gray-900 font-medium">{item.itemName}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <p className="mt-1 text-sm text-gray-900">{item.description || 'No description available'}</p>
                                        </div>
                                    </div>

                                    {/* Product Details */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">Product Details</h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Color</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.color || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Brand</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.brand || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Model</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.model || 'N/A'}</p>
                                            </div>

                                        </div>
                                    </div>

                                    {/* Pricing Information */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">Pricing Information</h4>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Cost Price</label>
                                                <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(item.costPrice)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Retail Price</label>
                                                <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(item.retailPrice)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Profit Margin</label>
                                                <p className="mt-1 text-sm text-gray-900">
                                                    {item.costPrice && item.retailPrice
                                                        ? `${(((item.retailPrice - item.costPrice) / item.costPrice) * 100).toFixed(2)}%`
                                                        : 'N/A'
                                                    }
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.quantity || 0}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Product Status</label>
                                                <p className="mt-1 text-sm">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(getStockStatus(item.quantity))}`}>
                                                        {getStockStatus(item.quantity)}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* System Information */}
                                    <div className="space-y-4">
                                        <h4 className="font-semibold text-gray-900 border-b pb-2">System Information</h4>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                                <p className="mt-1 text-sm text-gray-900">{item.status || 'inactive'}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Created At</label>
                                                <p className="mt-1 text-sm text-gray-900">{formatDate(item.createdAt)}</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                                                <p className="mt-1 text-sm text-gray-900">{formatDate(item.updatedAt)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {showActions && (
                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                            onClick={onEdit}
                                        >
                                            Edit Item
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={onDelete}
                                        >
                                            Delete Item
                                        </button>
                                    </div>
                                )}

                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
