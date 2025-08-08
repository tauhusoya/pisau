import React, { useState } from 'react';
import { auth } from '../firebase/config';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

export default function FirebaseAuthExample() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [user, setUser] = useState(null);
    const [error, setError] = useState('');

    // Listen for auth state changes when component mounts
    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setEmail('');
            setPassword('');
        } catch (err) {
            setError(err.message);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Firebase Authentication Example</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {user ? (
                <div>
                    <p className="mb-4">Logged in as: <span className="font-semibold">{user.email}</span></p>
                    <button
                        onClick={handleSignOut}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
                    >
                        Sign Out
                    </button>
                </div>
            ) : (
                <form className="space-y-4">
                    <div>
                        <label className="block text-gray-700 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="your@email.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="********"
                            required
                        />
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={handleSignIn}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                            type="button"
                        >
                            Sign In
                        </button>
                        <button
                            onClick={handleSignUp}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded"
                            type="button"
                        >
                            Sign Up
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
