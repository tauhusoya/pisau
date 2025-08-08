import React from 'react';
import { router } from '@inertiajs/react';
import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';

export default function Breadcrumb({ items = [] }) {
    const handleBreadcrumbClick = (route) => {
        if (route) {
            router.visit(route);
        }
    };

    return (
        <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
                <li>
                    <button
                        onClick={() => handleBreadcrumbClick(route('dashboard'))}
                        className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-150"
                    >
                        <HomeIcon className="h-4 w-4" />
                        <span className="sr-only">Home</span>
                    </button>
                </li>

                {items.map((item, index) => (
                    <li key={index} className="flex items-center">
                        <ChevronRightIcon className="h-4 w-4 text-gray-400 mx-2" />
                        {index === items.length - 1 ? (
                            // Last item (current page) - not clickable
                            <span className="text-gray-900 font-medium">
                                {item.label}
                            </span>
                        ) : (
                            // Clickable breadcrumb item
                            <button
                                onClick={() => handleBreadcrumbClick(item.route)}
                                className="text-gray-500 hover:text-gray-700 transition-colors duration-150"
                            >
                                {item.label}
                            </button>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
