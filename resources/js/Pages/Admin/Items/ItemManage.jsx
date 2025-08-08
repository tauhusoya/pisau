import React from 'react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '../../../Layouts/AuthenticatedLayout';
import Breadcrumb from '../../../Components/Breadcrumb';
import {
    ListBulletIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    ArrowUpTrayIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export default function ItemManage() {

    const cards = [
        {
            title: 'List of Items',
            description: 'View and manage all items in your inventory',
            icon: ListBulletIcon,
            route: route('admin.items.list'),
            color: 'bg-blue-500'
        },
        {
            title: 'Item Status',
            description: 'Monitor out of stock and low stock items',
            icon: ExclamationTriangleIcon,
            route: route('admin.items.status'),
            color: 'bg-orange-500'
        },
        {
            title: 'Add New Item',
            description: 'Add a single item to your inventory',
            icon: PlusIcon,
            route: route('admin.items.create'),
            color: 'bg-green-500'
        },
        {
            title: 'Bulk Import',
            description: 'Import multiple items at once',
            icon: ArrowUpTrayIcon,
            route: route('admin.items.import'),
            color: 'bg-purple-500'
        },
        {
            title: 'Export Items',
            description: 'Export items to PDF format',
            icon: ArrowDownTrayIcon,
            route: route('admin.items.export'),
            color: 'bg-indigo-500'
        }
    ];

    return (
        <AuthenticatedLayout>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <div className="mb-6">
                                <Breadcrumb items={[
                                    { label: 'Manage Items', route: null }
                                ]} />
                            </div>

                            <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl font-semibold text-gray-900">Manage Items</h1>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {cards.map((card, index) => (
                                    <div
                                        key={index}
                                        onClick={() => router.visit(card.route)}
                                        className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-gray-300"
                                    >
                                        <div className="flex items-center mb-4">
                                            <div className={`p-3 rounded-lg ${card.color}`}>
                                                <card.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <h3 className="ml-4 text-xl font-semibold text-gray-900">
                                                {card.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-600">
                                            {card.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
