import React, { useEffect } from 'react';
import { auth } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { router } from '@inertiajs/react';

export default function AppLayout({ children }) {
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                const token = await user.getIdToken();
                // Update token on server
                await axios.post(route('auth.state'), { token });
            } else {
                // User is signed out
                if (window.location.pathname !== route('login')) {
                    router.visit(route('login'));
                }
            }
        });

        return () => unsubscribe();
    }, []);

    return <>{children}</>;
}
