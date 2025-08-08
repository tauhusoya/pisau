import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Dashboard({ auth: pageAuth }) {
    const [user, setUser] = useState(null);
    const [firestoreUser, setFirestoreUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // User is signed in to Firebase Auth
                const basicUserInfo = {
                    name: currentUser.displayName || 'Firebase User',
                    email: currentUser.email,
                    uid: currentUser.uid,
                };
                setUser(basicUserInfo);

                // Fetch additional user data from Firestore
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        setFirestoreUser(userDoc.data());
                    } else {
                        console.log('No Firestore data found for this user');
                    }
                } catch (error) {
                    console.error('Error fetching user data from Firestore:', error);
                }
            } else {
                // User is signed out, redirect to login
                router.visit(route('login'));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // Render with a default user object if user is somehow null to prevent errors
    const safeUser = user || { name: 'Firebase User', email: 'Unknown' };

    // Create a proper user object for the layout
    const layoutUser = firestoreUser ? {
        name: `${firestoreUser.firstName} ${firestoreUser.lastName}`,
        firstName: firestoreUser.firstName,
        lastName: firestoreUser.lastName,
        email: firestoreUser.email,
        role: firestoreUser.role,
        status: firestoreUser.status,
        ...firestoreUser
    } : safeUser;

    return (
        <AuthenticatedLayout
            user={layoutUser}
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <p className="mb-4">You're logged in with Firebase!</p>

                            {/* Admin panel section removed since we now have it in the navbar */}
                            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                                <h3 className="font-semibold text-lg mb-2">Firebase Auth User Info:</h3>
                                <p><span className="font-medium">Name:</span> {safeUser.name || 'Not provided'}</p>
                                <p><span className="font-medium">Email:</span> {safeUser.email}</p>
                                {safeUser.uid && <p><span className="font-medium">UID:</span> {safeUser.uid}</p>}
                            </div>

                            {firestoreUser && (
                                <div className="mt-4 p-4 bg-blue-100 rounded-lg">
                                    <h3 className="font-semibold text-lg mb-2">Firestore User Data:</h3>
                                    <p><span className="font-medium">First Name:</span> {firestoreUser.firstName}</p>
                                    <p><span className="font-medium">Last Name:</span> {firestoreUser.lastName}</p>
                                    <p><span className="font-medium">Full Name:</span> {`${firestoreUser.firstName} ${firestoreUser.lastName}`.trim()}</p>
                                    <p><span className="font-medium">Email:</span> {firestoreUser.email}</p>
                                    <p><span className="font-medium">Role:</span> {firestoreUser.role}</p>
                                    <p>
                                        <span className="font-medium">Status:</span>{' '}
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${firestoreUser.status === 'active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {firestoreUser.status || 'active'}
                                        </span>
                                    </p>
                                    <p><span className="font-medium">Created at:</span> {firestoreUser.createdAt?.toDate().toLocaleString() || 'N/A'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
