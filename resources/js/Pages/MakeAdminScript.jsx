import { useState } from 'react';
import { Head } from '@inertiajs/react';
import { db } from '@/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import GuestLayout from '@/Layouts/GuestLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function MakeAdminScript() {
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState({ success: false, message: '' });

    const makeUserAdmin = async (e) => {
        e.preventDefault();

        if (!userId) {
            setResult({
                success: false,
                message: 'Please enter a user ID'
            });
            return;
        }

        setLoading(true);
        setResult({ success: false, message: '' });

        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                role: 'admin'
            });

            setResult({
                success: true,
                message: `User ${userId} has been made an admin successfully.`
            });
        } catch (error) {
            console.error('Error making user admin:', error);
            setResult({
                success: false,
                message: `Error: ${error.message}`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <GuestLayout>
            <Head title="Make Admin" />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Make User Admin</h1>
                <p className="mt-2 text-sm text-gray-600">
                    This utility allows you to make a user an admin by providing their Firebase user ID.
                    Use this carefully as admin users have access to all user management features.
                </p>
            </div>

            <form onSubmit={makeUserAdmin}>
                <div className="mb-4">
                    <InputLabel htmlFor="userId" value="Firebase User ID" />
                    <TextInput
                        id="userId"
                        type="text"
                        name="userId"
                        value={userId}
                        className="mt-1 block w-full"
                        onChange={(e) => setUserId(e.target.value)}
                        required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        You can find your user ID in the Firebase Authentication console or in the Firestore database.
                    </p>
                </div>

                <div className="flex items-center justify-end">
                    <PrimaryButton disabled={loading}>
                        {loading ? 'Processing...' : 'Make Admin'}
                    </PrimaryButton>
                </div>
            </form>

            {result.message && (
                <div className={`mt-6 p-4 rounded-md ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {result.message}
                </div>
            )}

            <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Instructions:</h2>
                <ol className="mt-2 list-decimal list-inside text-sm text-gray-600 space-y-2">
                    <li>Find your user ID in Firebase Authentication or Firestore</li>
                    <li>Enter the ID in the field above</li>
                    <li>Click "Make Admin"</li>
                    <li>After successful update, you'll be able to access the admin features</li>
                    <li>Go to Dashboard to see the admin panel</li>
                </ol>
            </div>
        </GuestLayout>
    );
}
