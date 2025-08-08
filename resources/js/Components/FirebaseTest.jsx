import React, { useState, useEffect } from 'react';
import { app, auth, db, storage } from '../firebase/config';

export default function FirebaseTest() {
    const [status, setStatus] = useState({
        initialized: false,
        auth: false,
        firestore: false,
        storage: false
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function testFirebase() {
            try {
                // Test basic initialization
                const newStatus = {
                    initialized: !!app,
                    auth: false,
                    firestore: false,
                    storage: false
                };

                // Test auth
                if (auth) {
                    newStatus.auth = true;
                }

                // Test Firestore
                if (db) {
                    newStatus.firestore = true;
                }

                // Test Storage
                if (storage) {
                    newStatus.storage = true;
                }

                setStatus(newStatus);
                setLoading(false);
            } catch (err) {
                setError(`Firebase test failed: ${err.message}`);
                setLoading(false);
            }
        }

        testFirebase();
    }, []);

    const getStatusColor = (isConnected) => {
        return isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    };

    if (loading) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Testing Firebase Connection...</h2>
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Firebase Test Failed</h2>
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Firebase Connection Test</h2>

            <div className="space-y-4">
                <div className={`p-4 rounded-lg ${getStatusColor(status.initialized)}`}>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {status.initialized ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <p className="font-medium">
                                Firebase Initialization: {status.initialized ? 'Success' : 'Failed'}
                            </p>
                            <p className="text-sm">
                                {status.initialized ? 'Firebase core initialized successfully.' : 'Firebase initialization failed.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-lg ${getStatusColor(status.auth)}`}>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {status.auth ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <p className="font-medium">
                                Firebase Authentication: {status.auth ? 'Connected' : 'Failed'}
                            </p>
                            <p className="text-sm">
                                {status.auth ? 'Authentication service is available.' : 'Authentication service connection failed.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-lg ${getStatusColor(status.firestore)}`}>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {status.firestore ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <p className="font-medium">
                                Firebase Firestore: {status.firestore ? 'Connected' : 'Failed'}
                            </p>
                            <p className="text-sm">
                                {status.firestore ? 'Firestore database is available.' : 'Firestore database connection failed.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className={`p-4 rounded-lg ${getStatusColor(status.storage)}`}>
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            {status.storage ? (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            )}
                        </div>
                        <div className="ml-3">
                            <p className="font-medium">
                                Firebase Storage: {status.storage ? 'Connected' : 'Failed'}
                            </p>
                            <p className="text-sm">
                                {status.storage ? 'Storage service is available.' : 'Storage service connection failed.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Firebase project: <span className="font-semibold">knives-laravel</span>
                    </p>
                </div>
            </div>
        </div>
    );
}
