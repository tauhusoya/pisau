import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import { auth } from '@/firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function DebugLogin() {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [logs, setLogs] = useState([]);
    const [loggedInUser, setLoggedInUser] = useState(null);

    const addLog = (message, type = 'info') => {
        setLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        addLog(`Attempting to login with email: ${formData.email}`, 'info');

        try {
            // Attempt login without redirecting
            addLog('Calling Firebase signInWithEmailAndPassword...', 'info');
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            addLog(`Login successful! User ID: ${userCredential.user.uid}`, 'success');
            setLoggedInUser(userCredential.user);

            // Fetch token for verification
            const token = await userCredential.user.getIdToken();
            addLog(`Got ID token (first 10 chars): ${token.substring(0, 10)}...`, 'success');

            // Check persistence
            addLog('Checking Firebase Auth persistence...', 'info');
            addLog(`Auth persistence: ${auth.persistenceManager ? 'Working' : 'Not available'}`, 'info');

            // Don't redirect, just stay on this page

        } catch (error) {
            addLog(`Login error: ${error.code} - ${error.message}`, 'error');
            console.error('Login error:', error);
        }
    };

    const checkAuthState = () => {
        const user = auth.currentUser;
        if (user) {
            addLog(`Currently logged in as: ${user.email} (${user.uid})`, 'success');
            setLoggedInUser(user);
        } else {
            addLog('Not currently logged in with Firebase Auth', 'warning');
            setLoggedInUser(null);
        }
    };

    const handleLogout = async () => {
        try {
            addLog('Attempting to sign out...', 'info');
            await auth.signOut();
            addLog('Sign out successful', 'success');
            setLoggedInUser(null);
        } catch (error) {
            addLog(`Logout error: ${error.message}`, 'error');
        }
    };

    return (
        <GuestLayout>
            <Head title="Debug Login" />

            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Firebase Auth Login Debugger</h1>
                <p className="mt-2 text-sm text-gray-600">
                    This page helps debug login issues with Firebase Authentication without redirecting.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold mb-4">Login Form</h2>

                        <form onSubmit={handleLogin}>
                            <div className="mb-4">
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
                            </div>

                            <div className="mb-6">
                                <InputLabel htmlFor="password" value="Password" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    className="mt-1 block w-full"
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-4">
                                <PrimaryButton type="submit">
                                    Login (Without Redirect)
                                </PrimaryButton>

                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700"
                                    onClick={checkAuthState}
                                >
                                    Check Current Auth
                                </button>

                                {loggedInUser && (
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                                        onClick={handleLogout}
                                    >
                                        Sign Out
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {loggedInUser && (
                        <div className="mt-6 bg-green-50 p-6 rounded-lg shadow-md border border-green-200">
                            <h2 className="text-xl font-semibold mb-4 text-green-800">
                                Currently Logged In
                            </h2>

                            <div className="text-sm text-green-800">
                                <p><strong>Email:</strong> {loggedInUser.email}</p>
                                <p><strong>UID:</strong> {loggedInUser.uid}</p>
                                <p><strong>Display Name:</strong> {loggedInUser.displayName || 'Not set'}</p>
                                <p><strong>Email Verified:</strong> {loggedInUser.emailVerified ? 'Yes' : 'No'}</p>
                            </div>

                            <div className="mt-4">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                                    onClick={async () => {
                                        try {
                                            const token = await loggedInUser.getIdToken(true);
                                            addLog(`Refreshed token (first 10 chars): ${token.substring(0, 10)}...`, 'success');
                                        } catch (error) {
                                            addLog(`Token refresh error: ${error.message}`, 'error');
                                        }
                                    }}
                                >
                                    Refresh Token
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 p-6 rounded-lg shadow-md h-[500px] overflow-y-auto">
                    <h2 className="text-xl font-semibold mb-4">Debug Logs</h2>

                    <div className="space-y-2">
                        {logs.length === 0 ? (
                            <p className="text-gray-500 italic">No logs yet. Actions will be logged here.</p>
                        ) : (
                            logs.map((log, index) => (
                                <div
                                    key={index}
                                    className={`p-2 rounded text-sm ${
                                        log.type === 'error' ? 'bg-red-100 text-red-800' :
                                        log.type === 'success' ? 'bg-green-100 text-green-800' :
                                        log.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-blue-100 text-blue-800'
                                    }`}
                                >
                                    <div className="text-xs opacity-75">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                    {log.message}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-semibold">Troubleshooting Steps:</h3>
                <ol className="list-decimal list-inside mt-2 space-y-2 text-sm text-gray-700">
                    <li>Try logging in with the form above (it won't redirect)</li>
                    <li>Check if the login is successful in the logs</li>
                    <li>Use "Check Current Auth" to verify if you're still logged in after refreshing the page</li>
                    <li>If login works here but not in the main app, the issue is likely with the redirection or session handling</li>
                    <li>Check your browser console for any errors during the normal login flow</li>
                    <li>Make sure your Firebase configuration is correct in all environments</li>
                </ol>
            </div>
        </GuestLayout>
    );
}
