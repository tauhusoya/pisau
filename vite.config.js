import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    build: {
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    firebase: ['firebase'],
                    icons: ['@heroicons/react'],
                    barcode: ['@zxing/library', 'quagga'],
                    pdf: ['jspdf', 'jspdf-autotable'],
                },
            },
        },
    },
});
