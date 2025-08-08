import { useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { auth, db } from '@/firebase/config';
import { onAuthStateChanged, updateEmail, updatePassword, deleteUser } from 'firebase/auth';
import { doc, updateDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import Breadcrumb from '@/Components/Breadcrumb';

export default function Edit() {
    const [user, setUser] = useState(null);
    const [firestoreUser, setFirestoreUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        currentPassword: '',
        newPassword: '',
        newPasswordConfirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // User is signed in
                setUser(currentUser);

                // Fetch user data from Firestore
                try {
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);

                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setFirestoreUser(userData);

                        // Initialize form data with current user values
                        setFormData({
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            email: currentUser.email || '',
                            currentPassword: '',
                            newPassword: '',
                            newPasswordConfirmation: '',
                        });
                    }
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            } else {
                // User is signed out, redirect to login
                router.visit(route('login'));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateProfileForm = () => {
        const newErrors = {};

        // First Name validation
        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        } else if (formData.firstName.trim().length < 2) {
            newErrors.firstName = 'First name must be at least 2 characters';
        } else if (formData.firstName.trim().length > 50) {
            newErrors.firstName = 'First name must be less than 50 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName.trim())) {
            newErrors.firstName = 'First name can only contain letters and spaces';
        }

        // Last Name validation
        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        } else if (formData.lastName.trim().length < 2) {
            newErrors.lastName = 'Last name must be at least 2 characters';
        } else if (formData.lastName.trim().length > 50) {
            newErrors.lastName = 'Last name must be less than 50 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName.trim())) {
            newErrors.lastName = 'Last name can only contain letters and spaces';
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            newErrors.email = 'Please enter a valid email address';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateProfile = async (e) => {
        e.preventDefault();

        // Validate form before submission
        if (!validateProfileForm()) {
            return;
        }

        setProcessing(true);
        setErrors({});
        setSuccessMessage('');

        try {
            if (!user) throw new Error('User not authenticated');

            // Combine first and last name for the full name (for Auth display only)
            const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();

            // Update Firestore user document - only store firstName and lastName
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim()
                // No combined name field in Firestore
            });

            // Update display name in Firebase Auth
            await updateProfile(user, {
                displayName: fullName
            });

            setSuccessMessage('Profile updated successfully!');
        } catch (error) {
            console.error('Error updating profile:', error);
            setErrors({ profile: error.message });
        } finally {
            setProcessing(false);
        }
    };

    const updateUserEmail = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            setErrors({ email: 'Email is required' });
            return;
        }

        setProcessing(true);
        setErrors({});
        setSuccessMessage('');

        try {
            if (!user) throw new Error('User not authenticated');

            // Update email in Firebase Auth
            await updateEmail(user, formData.email);

            // Update email in Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
                email: formData.email
            });

            setSuccessMessage('Email updated successfully!');
        } catch (error) {
            console.error('Error updating email:', error);

            if (error.code === 'auth/requires-recent-login') {
                setErrors({ email: 'This operation is sensitive and requires recent authentication. Please log in again before retrying.' });
            } else {
                setErrors({ email: error.message });
            }
        } finally {
            setProcessing(false);
        }
    };

    const validatePasswordForm = () => {
        const newErrors = {};

        // Current password validation
        if (!formData.currentPassword) {
            newErrors.currentPassword = 'Current password is required';
        }

        // New password validation
        if (!formData.newPassword) {
            newErrors.newPassword = 'New password is required';
        } else if (formData.newPassword.length < 8) {
            newErrors.newPassword = 'Password must be at least 8 characters';
        } else if (formData.newPassword.length > 128) {
            newErrors.newPassword = 'Password must be less than 128 characters';
        } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one number';
        } else if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(formData.newPassword)) {
            newErrors.newPassword = 'Password must contain at least one special character';
        }

        // Password confirmation validation
        if (!formData.newPasswordConfirmation) {
            newErrors.newPasswordConfirmation = 'Password confirmation is required';
        } else if (formData.newPassword !== formData.newPasswordConfirmation) {
            newErrors.newPasswordConfirmation = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const updateUserPassword = async (e) => {
        e.preventDefault();

        // Validate password form
        if (!validatePasswordForm()) {
            return;
        }

        setProcessing(true);
        setErrors({});
        setSuccessMessage('');

        try {
            if (!user) throw new Error('User not authenticated');

            // Update password in Firebase Auth
            await updatePassword(user, formData.newPassword);

            setSuccessMessage('Password updated successfully!');
            setFormData(prev => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                newPasswordConfirmation: ''
            }));
        } catch (error) {
            console.error('Error updating password:', error);

            if (error.code === 'auth/requires-recent-login') {
                setErrors({ password: 'This operation is sensitive and requires recent authentication. Please log in again before retrying.' });
            } else {
                setErrors({ password: error.message });
            }
        } finally {
            setProcessing(false);
        }
    };

    const deleteUserAccount = async () => {
        if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        setProcessing(true);
        setErrors({});

        try {
            if (!user) throw new Error('User not authenticated');

            // Delete user document from Firestore
            const userDocRef = doc(db, 'users', user.uid);
            await deleteDoc(userDocRef);

            // Delete user from Firebase Authentication
            await deleteUser(user);

            // Redirect to home page
            router.visit('/');
        } catch (error) {
            console.error('Error deleting account:', error);

            if (error.code === 'auth/requires-recent-login') {
                setErrors({ general: 'This operation is sensitive and requires recent authentication. Please log in again before retrying.' });
            } else {
                setErrors({ general: error.message });
            }
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    const safeUser = user || { displayName: 'User', email: '' };

    // Create a proper user object for the layout
    const layoutUser = firestoreUser ? {
        name: `${firestoreUser.firstName} ${firestoreUser.lastName}`,
        firstName: firestoreUser.firstName,
        lastName: firestoreUser.lastName,
        email: firestoreUser.email,
        role: firestoreUser.role,
        status: firestoreUser.status,
        ...firestoreUser
    } : {
        name: safeUser?.displayName || 'User',
        email: safeUser?.email || ''
    };

    return (
        <AuthenticatedLayout
            user={layoutUser}
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="mb-6">
                        <Breadcrumb items={[
                            { label: 'Profile', route: null }
                        ]} />
                    </div>
                    {successMessage && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
                            <p>{successMessage}</p>
                        </div>
                    )}

                    {errors.general && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                            <p>{errors.general}</p>
                        </div>
                    )}

                    {/* Profile Information */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <div className="max-w-xl">
                            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Update your account's profile information.
                            </p>

                            <form onSubmit={updateProfile} className="mt-6 space-y-6">
                                <div className="flex space-x-4">
                                    <div className="flex-1">
                                        <InputLabel htmlFor="firstName" value="First Name" />
                                        <TextInput
                                            id="firstName"
                                            name="firstName"
                                            value={formData.firstName}
                                            className="mt-1 block w-full"
                                            onChange={handleChange}
                                            required
                                        />
                                        <InputError message={errors.firstName} className="mt-2" />
                                    </div>

                                    <div className="flex-1">
                                        <InputLabel htmlFor="lastName" value="Last Name" />
                                        <TextInput
                                            id="lastName"
                                            name="lastName"
                                            value={formData.lastName}
                                            className="mt-1 block w-full"
                                            onChange={handleChange}
                                            required
                                        />
                                        <InputError message={errors.lastName} className="mt-2" />
                                    </div>
                                </div>

                                {/* No additional fields needed */}

                                <div className="flex items-center gap-4">
                                    <PrimaryButton disabled={processing}>Save</PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Update Email */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <div className="max-w-xl">
                            <h2 className="text-lg font-medium text-gray-900">Email Address</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Update your email address. You may need to log in again after changing your email.
                            </p>

                            <form onSubmit={updateUserEmail} className="mt-6 space-y-6">
                                <div>
                                    <InputLabel htmlFor="email" value="Email" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        className="mt-1 block w-full"
                                        onChange={handleChange}
                                        required
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                <div className="flex items-center gap-4">
                                    <PrimaryButton disabled={processing}>Save</PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Update Password */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <div className="max-w-xl">
                            <h2 className="text-lg font-medium text-gray-900">Update Password</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Ensure your account is using a long, random password to stay secure.
                            </p>

                            <form onSubmit={updateUserPassword} className="mt-6 space-y-6">
                                <div>
                                    <InputLabel htmlFor="newPassword" value="New Password" />
                                    <TextInput
                                        id="newPassword"
                                        type="password"
                                        name="newPassword"
                                        value={formData.newPassword}
                                        className="mt-1 block w-full"
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                    />
                                    <InputError message={errors.password} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="newPasswordConfirmation" value="Confirm Password" />
                                    <TextInput
                                        id="newPasswordConfirmation"
                                        type="password"
                                        name="newPasswordConfirmation"
                                        value={formData.newPasswordConfirmation}
                                        className="mt-1 block w-full"
                                        onChange={handleChange}
                                        autoComplete="new-password"
                                    />
                                    <InputError message={errors.passwordConfirmation} className="mt-2" />
                                </div>

                                <div className="flex items-center gap-4">
                                    <PrimaryButton disabled={processing}>Save</PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Delete Account */}
                    <div className="p-4 sm:p-8 bg-white shadow sm:rounded-lg">
                        <div className="max-w-xl">
                            <h2 className="text-lg font-medium text-gray-900">Delete Account</h2>
                            <p className="mt-1 text-sm text-gray-600">
                                Once your account is deleted, all of its resources and data will be permanently deleted.
                            </p>

                            <div className="mt-6">
                                <PrimaryButton
                                    onClick={deleteUserAccount}
                                    disabled={processing}
                                    className="bg-red-600 hover:bg-red-700"
                                >
                                    Delete Account
                                </PrimaryButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
