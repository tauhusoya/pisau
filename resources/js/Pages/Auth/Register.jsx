import { useState } from 'react';
import GuestLayout from '@/Layouts/GuestLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Head, Link, router } from '@inertiajs/react';
import { auth, db } from '@/firebase/config';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Register() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [processing, setProcessing] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.firstName) newErrors.firstName = 'First name is required';
        if (!formData.lastName) newErrors.lastName = 'Last name is required';
        if (!formData.email) newErrors.email = 'Email is required';
        if (!formData.password) newErrors.password = 'Password is required';
        if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
        if (formData.password !== formData.password_confirmation) newErrors.password_confirmation = 'Passwords do not match';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const saveUserToFirestore = async (user) => {
        console.log('Starting to save user to Firestore with UID:', user.uid);

        // Get full name from first and last name
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();

        // Create the user data object
        const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            // Remove the combined name field, we'll only use firstName and lastName
            email: user.email,
            role: 'user', // Default role
            status: 'active', // Default status is active
            createdAt: serverTimestamp(),
        };

        console.log('User data to be saved:', userData);

        try {
            // Create a reference to the user document
            const userDocRef = doc(db, 'users', user.uid);
            console.log('User document reference created');

            // Set the document data
            await setDoc(userDocRef, userData);
            console.log('User successfully saved to Firestore with fields:', Object.keys(userData));

            // Verify the document was created by reading it back
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                console.log('Verification: User document exists in Firestore with data:', docSnap.data());
            } else {
                console.error('Verification failed: User document does not exist after saving');
            }
        } catch (error) {
            console.error('Error saving user to Firestore:', error);
            console.error('Error details:', JSON.stringify(error));
            throw error; // Re-throw to handle in the main try-catch
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        console.log('Submit button clicked');
        console.log('Current form data:', formData);

        const isValid = validateForm();
        console.log('Form validation result:', isValid);
        if (!isValid) {
            console.log('Validation errors:', errors);
            return;
        }

        setProcessing(true);

        try {
            console.log('Starting registration process');

            // Step 1: Create user with Firebase Authentication
            console.log('Creating user in Firebase Authentication');
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            console.log('User created in Firebase Authentication:', userCredential.user.uid);

            // Step 2: Update the user profile with the full name
            console.log('Updating user profile with displayName');
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            await updateProfile(userCredential.user, {
                displayName: fullName
            });
            console.log('User profile updated successfully');

            // Step 3: Save user data to Firestore
            console.log('Saving user data to Firestore');
            await saveUserToFirestore(userCredential.user);

            // Step 4: After successful registration, navigate to dashboard
            console.log('Registration successful, redirecting to dashboard');
            router.visit(route('dashboard'));

        } catch (error) {
            console.error('Firebase registration error:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);

            // Handle Firebase authentication errors
            if (error.code === 'auth/email-already-in-use') {
                setErrors({ email: 'This email is already in use' });
            } else if (error.code === 'auth/invalid-email') {
                setErrors({ email: 'Invalid email address' });
            } else if (error.code === 'auth/weak-password') {
                setErrors({ password: 'Password is too weak' });
            } else {
                setErrors({ general: `Registration failed: ${error.message}` });
            }

            setProcessing(false);
        }
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            {errors.general && (
                <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
                    <p>{errors.general}</p>
                </div>
            )}

            {/* Debug info in development */}
            {process.env.NODE_ENV !== 'production' && Object.keys(errors).length > 0 && (
                <div className="mb-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4">
                    <p className="font-semibold">Form validation errors:</p>
                    <pre className="mt-2 text-xs">
                        {JSON.stringify(errors, null, 2)}
                    </pre>
                </div>
            )}

            <form onSubmit={submit}>
                <div className="flex space-x-4">
                    <div className="flex-1">
                        <InputLabel htmlFor="firstName" value="First Name" />

                        <TextInput
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            className="mt-1 block w-full"
                            autoComplete="given-name"
                            isFocused={true}
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
                            autoComplete="family-name"
                            onChange={handleChange}
                            required
                        />

                        <InputError message={errors.lastName} className="mt-2" />
                    </div>
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        className="mt-1 block w-full"
                        autoComplete="username"
                        onChange={handleChange}
                        required
                    />

                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password" value="Password" />

                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={formData.password}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={handleChange}
                        required
                    />

                    <InputError message={errors.password} className="mt-2" />
                </div>

                <div className="mt-4">
                    <InputLabel htmlFor="password_confirmation" value="Confirm Password" />

                    <TextInput
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        value={formData.password_confirmation}
                        className="mt-1 block w-full"
                        autoComplete="new-password"
                        onChange={handleChange}
                        required
                    />

                    <InputError message={errors.password_confirmation} className="mt-2" />
                </div>

                <div className="flex items-center justify-end mt-4">
                    <Link
                        href={route('login')}
                        className="underline text-sm text-gray-600 hover:text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Already registered?
                    </Link>

                    <PrimaryButton className="ms-4" disabled={processing}>
                        {processing ? 'Registering...' : 'Register'}
                    </PrimaryButton>

                    {/* Debug button for testing - only in development */}
                    {process.env.NODE_ENV !== 'production' && (
                        <button
                            type="button"
                            className="ms-4 px-4 py-2 bg-gray-800 text-white text-xs rounded"
                            onClick={() => {
                                console.log('Debug button clicked');
                                console.log('Current form data:', formData);
                                console.log('Current errors:', errors);
                            }}
                        >
                            Debug
                        </button>
                    )}
                </div>
            </form>
        </GuestLayout>
    );
}
