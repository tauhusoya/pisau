import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function AdminGuard({ children }) {
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdminStatus = async (user) => {
            if (!user || !user.uid) {
                setLoading(false);
                router.visit(route('dashboard'));
                return;
            }

            try {
                const userDocRef = doc(db, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();

                    if (userData.role === 'admin') {
                        setIsAdmin(true);
                    } else {
                        router.visit(route('dashboard'));
                    }
                } else {
                    router.visit(route('dashboard'));
                }
            } catch (error) {
                console.error('Error checking admin status:', error);
                router.visit(route('dashboard'));
            } finally {
                setLoading(false);
            }
        };

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                checkAdminStatus(user);
            } else {
                router.visit(route('login'));
            }
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Checking permissions...</p>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Will redirect in the useEffect
    }

    return children;
}
