import React from 'react';
import { Link } from '@inertiajs/react';

export default function ItemManagementLink() {
    return (
        <Link
            href={route('admin.items.index')}
            className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ${route().current('admin.items.*')
                    ? 'border-indigo-400 text-gray-900 focus:border-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:text-gray-700 focus:border-gray-300'
                }`}
        >
            Manage Items
        </Link>
    );
}
