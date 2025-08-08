import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import PrimaryButton from '@/Components/PrimaryButton';

export default function DebugFirestore() {
    const [currentUser, setCurrentUser] = useState(null);
    const [firestoreData, setFirestoreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updateResult, setUpdateResult] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            console.log('Current user from Firebase Auth:', user);
            setCurrentUser(user);

            if (user) {
                fetchFirestoreData(user.uid);
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchFirestoreData = async (uid) => {
        try {
            console.log('Fetching Firestore data for UID:', uid);
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                console.log('Firestore document exists, data:', userDoc.data());
                setFirestoreData(userDoc.data());
            } else {
                console.log('No document found in Firestore for UID:', uid);
            }
        } catch (error) {
            console.error('Error fetching Firestore data:', error);
        } finally {
            setLoading(false);
        }
    };

    const makeAdmin = async () => {
        if (!currentUser) return;

        try {
            setUpdateResult({ status: 'loading', message: 'Updating role to admin...' });

            const userDocRef = doc(db, 'users', currentUser.uid);
            await updateDoc(userDocRef, {
                role: 'admin'
            });

            setUpdateResult({ status: 'success', message: 'Role updated to admin successfully!' });
            fetchFirestoreData(currentUser.uid); // Refresh data
        } catch (error) {
            console.error('Error updating role:', error);
            setUpdateResult({ status: 'error', message: `Error: ${error.message}` });
        }
    };

    return (
        <GuestLayout>
            <Head title="Debug Firestore" />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Firebase Auth & Firestore Debug</h1>
                <p className="mt-2 text-sm text-gray-600">
                    This page helps debug Firebase Auth and Firestore issues.
                </p>
            </div>

            {loading ? (
                <div className="bg-gray-100 p-4 rounded">Loading...</div>
            ) : (
                <>
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold">Firebase Auth User:</h2>
                        <div className="bg-gray-100 p-4 mt-2 rounded overflow-auto">
                            <pre className="text-xs">
                                {currentUser ? JSON.stringify(currentUser, null, 2) : 'No authenticated user'}
                            </pre>
                            {currentUser && (
                                <div className="mt-2 text-sm">
                                    <p><strong>UID:</strong> {currentUser.uid}</p>
                                    <p><strong>Email:</strong> {currentUser.email}</p>
                                    <p><strong>Display Name:</strong> {currentUser.displayName || 'Not set'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-lg font-semibold">Firestore User Data:</h2>
                        <div className="bg-gray-100 p-4 mt-2 rounded overflow-auto">
                            <pre className="text-xs">
                                {firestoreData ? JSON.stringify(firestoreData, null, 2) : 'No Firestore data found'}
                            </pre>
                            {firestoreData && (
                                <div className="mt-2 text-sm">
                                    <p><strong>First Name:</strong> {firestoreData.firstName || 'Not set'}</p>
                                    <p><strong>Last Name:</strong> {firestoreData.lastName || 'Not set'}</p>
                                    <p><strong>Email:</strong> {firestoreData.email || 'Not set'}</p>
                                    <p><strong>Role:</strong> {firestoreData.role || 'Not set'}</p>
                                    <p><strong>Status:</strong> {firestoreData.status || 'Not set'}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {currentUser && (
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold">Actions:</h2>
                            <div className="bg-gray-100 p-4 mt-2 rounded">
                                <PrimaryButton onClick={makeAdmin} className="mr-2">
                                    Make Admin
                                </PrimaryButton>
                                <PrimaryButton onClick={() => fetchFirestoreData(currentUser.uid)}>
                                    Refresh Data
                                </PrimaryButton>

                                {updateResult && (
                                    <div className={`mt-4 p-2 rounded ${
                                        updateResult.status === 'success' ? 'bg-green-100 text-green-800' :
                                        updateResult.status === 'error' ? 'bg-red-100 text-red-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {updateResult.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 border-t pt-4">
                        <h3 className="text-md font-semibold">Debug Instructions:</h3>
                        <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
                            <li>Check if your UID in Firebase Auth matches the document ID in Firestore</li>
                            <li>Verify that the role field is exactly "admin" (case-sensitive)</li>
                            <li>Use the "Make Admin" button to set your role to admin</li>
                            <li>After making changes, use "Refresh Data" to see the updated values</li>
                            <li>Reload the application after making changes to see if admin access works</li>
                        </ul>
                    </div>
                </>
            )}
        </GuestLayout>
    );
}
