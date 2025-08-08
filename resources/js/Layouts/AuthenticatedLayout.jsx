import { useState, useEffect } from 'react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import ItemManagementLink from '@/Components/Admin/ItemManagementDropdown';
import { Link, router } from '@inertiajs/react';
import { auth, db, sessionManager } from '@/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function Authenticated({ user, header, children }) {
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [firebaseUser, setFirebaseUser] = useState(null);
    const [firestoreUser, setFirestoreUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user data from Firestore by uid
    const fetchUserFromFirestore = async (uid) => {
        try {
            const userDocRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                setFirestoreUser(userData);
                setUserRole(userData.role || '');
            } else {
                setFirestoreUser(null);
            }
        } catch (error) {
            console.error('AuthLayout: Error fetching user data from Firestore:', error);
            setFirestoreUser(null);
        }
    };

    // Rely only on Firebase auth listener to avoid duplicate fetches/logs
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setFirebaseUser(currentUser);
                fetchUserFromFirestore(currentUser.uid);
            } else {
                // Optional fallback to stored session
                const stored = sessionManager.getStoredUser?.();
                if (stored?.uid) {
                    fetchUserFromFirestore(stored.uid);
                } else {
                    setFirebaseUser(null);
                    setFirestoreUser(null);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Create user object from Firestore data if available, otherwise use Firebase Auth data
    const safeUser = firestoreUser ? {
        name: `${firestoreUser.firstName} ${firestoreUser.lastName}`.trim(),
        firstName: firestoreUser.firstName,
        lastName: firestoreUser.lastName,
        email: firestoreUser.email,
        role: firestoreUser.role
    } : {
        name: firebaseUser?.displayName || 'Guest',
        firstName: firebaseUser?.displayName?.split(' ')[0] || 'Guest',
        lastName: firebaseUser?.displayName?.split(' ').slice(1).join(' ') || '',
        email: firebaseUser?.email || '',
        role: userRole
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex">
                            <div className="shrink-0 flex items-center">
                                <Link href="/">
                                    <ApplicationLogo className="block h-9 w-auto fill-current text-gray-800" />
                                </Link>
                            </div>

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink href={route('dashboard')} active={route().current('dashboard')}>
                                    Dashboard
                                </NavLink>

                                {/* Item Management link - visible to all users */}
                                <ItemManagementLink />

                                {/* User Management link - only visible to admins */}
                                {safeUser.role === 'admin' && (
                                    <NavLink href={route('admin.users')} active={route().current('admin.users')}>
                                        User Management
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:flex sm:items-center sm:ms-6">
                            <div className="ms-3 relative">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-white hover:text-gray-700 focus:outline-none transition ease-in-out duration-150"
                                            >
                                                {safeUser.firstName && safeUser.lastName
                                                    ? `${safeUser.firstName} ${safeUser.lastName}`
                                                    : safeUser.name || 'Guest'}

                                                <svg
                                                    className="ms-2 -me-0.5 h-4 w-4"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content>
                                        <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                        <Dropdown.Link
                                            href="#"
                                            onClick={async (e) => {
                                                e.preventDefault();
                                                try {
                                                    await auth.signOut();
                                                    router.visit(route('login'));
                                                } catch (error) {
                                                    console.error('Logout error:', error);
                                                }
                                            }}
                                            as="button"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() => setShowingNavigationDropdown((previousState) => !previousState)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 focus:text-gray-500 transition duration-150 ease-in-out"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden'}>
                    <div className="pt-2 pb-3 space-y-1">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                            Dashboard
                        </ResponsiveNavLink>

                        {/* Item Management link in mobile menu - visible to all users */}
                        <ResponsiveNavLink href={route('admin.items.index')} active={route().current('admin.items.*')}>
                            Manage Items
                        </ResponsiveNavLink>

                        {/* User Management link in mobile menu - only visible to admins */}
                        {safeUser.role === 'admin' && (
                            <ResponsiveNavLink href={route('admin.users')} active={route().current('admin.users')}>
                                User Management
                            </ResponsiveNavLink>
                        )}
                    </div>

                    <div className="pt-4 pb-1 border-t border-gray-200">
                        <div className="px-4">
                            <div className="font-medium text-base text-gray-800">
                                {loading ? (
                                    <span className="text-gray-400">Loading...</span>
                                ) : (
                                    safeUser.firstName && safeUser.lastName
                                        ? `${safeUser.firstName} ${safeUser.lastName}`
                                        : safeUser.name || 'Guest'
                                )}
                            </div>
                            <div className="font-medium text-sm text-gray-500">
                                {loading ? (
                                    <span className="text-gray-400">Loading...</span>
                                ) : (
                                    safeUser.email
                                )}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')}>Profile</ResponsiveNavLink>
                            <ResponsiveNavLink
                                href="#"
                                onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                        await auth.signOut();
                                        router.visit(route('login'));
                                    } catch (error) {
                                        console.error('Logout error:', error);
                                    }
                                }}
                                as="button"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {header && (
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">{header}</div>
                </header>
            )}

            <main>{children}</main>
        </div>
    );
}
