import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { auth, db } from '@/firebase/config';
import { createUserWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    query,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    where,
    orderBy,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';
import UserTable from '@/Components/Admin/UserTable';
import UserModal from '@/Components/Admin/UserModal';
import AdminGuard from '@/Components/Admin/AdminGuard';
import Breadcrumb from '@/Components/Breadcrumb';
import Pagination from '@/Components/Pagination';

export default function UserManagement() {
    // State for users list and management
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userLoading, setUserLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // State for filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [roleFilter, setRoleFilter] = useState('all');

    // State for pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    // State for logged in user
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [errors, setErrors] = useState({});

    // Fetch all users from Firestore
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const usersQuery = query(
                collection(db, 'users'),
                orderBy('createdAt', 'desc')
            );
            const querySnapshot = await getDocs(usersQuery);

            const usersList = [];
            querySnapshot.forEach((doc) => {
                const userData = doc.data();
                const createdDate = userData.createdAt?.toDate ? userData.createdAt.toDate() : null;
                const createdAtStr = createdDate ? createdDate.toLocaleString() : 'N/A';
                const createdAtTime = createdDate ? createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                usersList.push({
                    id: doc.id,
                    ...userData,
                    createdAt: createdAtStr,
                    createdAtTime
                });
            });

            setUsers(usersList);
            setTotalItems(usersList.length);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and paginate users
    const getFilteredAndPaginatedUsers = () => {
        let filteredUsers = users;

        // Apply search filter
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user =>
                user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.status === statusFilter);
        }

        // Apply role filter
        if (roleFilter !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === roleFilter);
        }

        // Calculate pagination
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

        return {
            users: paginatedUsers,
            totalFiltered: filteredUsers.length,
            totalPages: Math.ceil(filteredUsers.length / itemsPerPage)
        };
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
    };



    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, roleFilter]);

    // Combined effect to handle authentication and fetch user data
    useEffect(() => {
        const handleAuthStateChange = async (currentUser) => {
            if (currentUser) {
                try {
                    // Fetch logged-in user data from Firestore
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setLoggedInUser({
                            name: `${userData.firstName} ${userData.lastName}`,
                            firstName: userData.firstName,
                            lastName: userData.lastName,
                            email: userData.email,
                            role: userData.role,
                            status: userData.status,
                            ...userData
                        });
                    } else {
                        console.error('User document not found in Firestore');
                        router.visit(route('login'));
                    }

                    // Fetch all users for the table
                    fetchUsers();
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    router.visit(route('login'));
                } finally {
                    setUserLoading(false);
                }
            } else {
                // No user authenticated, redirect to login
                router.visit(route('login'));
            }
        };

        // Set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, handleAuthStateChange);

        return () => unsubscribe();
    }, []);

    // Edit user
    const handleEditUser = (user) => {
        setSelectedUser(user);
        setIsEditing(true);
        setModalOpen(true);
    };

    // Save user changes
    const handleSaveUser = async (userData) => {
        try {
            if (userData.id) {
                // Update existing user
                const userRef = doc(db, 'users', userData.id);
                await updateDoc(userRef, {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    role: userData.role,
                    status: userData.status,
                    updatedAt: serverTimestamp()
                });
            } else {
                // Create new user with Firebase Auth
                const authResult = await createUserWithEmailAndPassword(
                    auth,
                    userData.email,
                    userData.password // Make sure to add password field to form
                );

                // Create user document in Firestore
                await setDoc(doc(db, 'users', authResult.user.uid), {
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    role: userData.role || 'user',
                    status: userData.status || 'active',
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            // Refresh user list
            fetchUsers();
            setModalOpen(false);
            setSelectedUser(null);
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving user:', error);
            setErrors({ submit: error.message });
        }
    };

    // Delete user
    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await deleteDoc(doc(db, 'users', userId));
            // Refresh user list
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
        }
    };

    // Get filtered and paginated users
    const { users: filteredUsers, totalFiltered, totalPages } = getFilteredAndPaginatedUsers();

    // Show loading state while user data is being fetched
    if (userLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading user data...</p>
                </div>
            </div>
        );
    }

    return (
        <AdminGuard>
            <AuthenticatedLayout
                user={loggedInUser || { name: 'Loading...', firstName: 'Loading', lastName: '', email: '' }}
            >
                <Head title="User Management" />

                <div className="py-12">
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                            <div className="p-6">
                                <div className="mb-6">
                                    <Breadcrumb items={[
                                        { label: 'User Management', route: null }
                                    ]} />
                                </div>
                                <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                                    <h1 className="text-2xl font-semibold text-gray-900">Manage Users</h1>

                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => setModalOpen(true)}
                                            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:bg-green-600 transition"
                                        >
                                            <span className="flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                </svg>
                                                Add User
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="col-span-1">
                                        <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                        <input
                                            type="text"
                                            id="search"
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            placeholder="Search by name or email"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-span-1">
                                        <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            id="statusFilter"
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>

                                    <div className="col-span-1">
                                        <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            id="roleFilter"
                                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value)}
                                        >
                                            <option value="all">All Roles</option>
                                            <option value="admin">Admin</option>
                                            <option value="user">User</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Desktop table */}
                                <div className="hidden md:block">
                                    <UserTable
                                        users={filteredUsers}
                                        loading={loading}
                                        onEdit={handleEditUser}
                                        onDelete={handleDeleteUser}
                                    />
                                </div>

                                {/* Mobile card list */}
                                <div className="md:hidden space-y-3">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-10">
                                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                                        </div>
                                    ) : (
                                        filteredUsers.length === 0 ? (
                                            <div className="bg-gray-50 p-10 text-center rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                                                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter.</p>
                                            </div>
                                        ) : (
                                            filteredUsers.map((u) => (
                                                <div key={u.id} className="bg-white rounded-lg border p-4 shadow-sm">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {u.firstName} {u.lastName}
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                                {u.role}
                                                            </span>
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {u.status}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-2 items-center gap-2">
                                                        <div className="text-xs text-gray-700">
                                                            <span className="text-gray-500">Created:</span> {u.createdAtTime}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => handleEditUser(u)}
                                                                className="px-2 py-1 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteUser(u.id)}
                                                                className="px-2 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )
                                    )}
                                </div>

                                {/* Pagination - fixed position below table/cards */}
                                {totalFiltered > 0 && (
                                    <div className="mt-4">
                                        <Pagination
                                            currentPage={currentPage}
                                            totalPages={totalPages}
                                            onPageChange={handlePageChange}
                                            totalItems={totalFiltered}
                                            itemsPerPage={itemsPerPage}
                                            showingFrom={(currentPage - 1) * itemsPerPage + 1}
                                            showingTo={Math.min(currentPage * itemsPerPage, totalFiltered)}
                                        />
                                    </div>
                                )}

                                {modalOpen && (
                                    <UserModal
                                        isOpen={modalOpen}
                                        isEditing={isEditing}
                                        user={selectedUser}
                                        onClose={() => {
                                            setModalOpen(false);
                                            setSelectedUser(null);
                                            setIsEditing(false);
                                        }}
                                        onSave={handleSaveUser}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        </AdminGuard>
    );
}
