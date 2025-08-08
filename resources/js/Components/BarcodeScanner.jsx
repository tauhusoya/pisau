import { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Quagga from 'quagga';

export default function BarcodeScanner({
    isOpen,
    onClose,
    onScan,
    title = "Scan Barcode"
}) {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Auto-start camera when modal opens
    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
    }, [isOpen]);

    // Validate EAN barcode
    const validateEAN = (code) => {
        // EAN-13 should be exactly 13 digits
        if (code.length === 13 && /^\d{13}$/.test(code)) {
            return validateEAN13(code);
        }
        // EAN-8 should be exactly 8 digits
        if (code.length === 8 && /^\d{8}$/.test(code)) {
            return validateEAN8(code);
        }
        return false;
    };

    // Validate EAN-13 checksum
    const validateEAN13 = (code) => {
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return parseInt(code[12]) === checksum;
    };

    // Validate EAN-8 checksum
    const validateEAN8 = (code) => {
        let sum = 0;
        for (let i = 0; i < 7; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 3 : 1);
        }
        const checksum = (10 - (sum % 10)) % 10;
        return parseInt(code[7]) === checksum;
    };

    const startCamera = async () => {
        try {
            setScanning(true);
            setError('');

            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera API not supported in this browser');
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // Wait for video to load
                videoRef.current.onloadedmetadata = () => {
                    setScanning(true);
                    startBarcodeDetection();
                };

                videoRef.current.onerror = (e) => {
                    setError('Video playback error');
                };
            } else {
                setError('Video element not found');
            }
        } catch (error) {
            setError(`Camera error: ${error.message}`);
            setScanning(false);
        }
    };

    const startBarcodeDetection = () => {
        try {
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: videoRef.current,
                    constraints: {
                        width: 640,
                        height: 480,
                        facingMode: "environment"
                    },
                },
                decoder: {
                    readers: [
                        "ean_reader",
                        "ean_8_reader"
                    ],
                    multiple: false
                },
                locate: true,
                frequency: 10
            }, (err) => {
                if (err) {
                    setError('Failed to initialize barcode detection');
                    return;
                }
                Quagga.start();
            });

            // Handle successful barcode detection
            Quagga.onDetected((result) => {
                const code = result.codeResult.code;

                // Validate the detected code
                if (validateEAN(code)) {
                    handleScan(code);
                }
            });

        } catch (error) {
            setError('Failed to start barcode detection');
        }
    };

    const stopCamera = () => {
        // Stop Quagga
        try {
            Quagga.stop();
        } catch (error) {
            // Quagga already stopped or not started
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            streamRef.current = null;
        }
        setScanning(false);
        setError('');
    };

    const handleScan = (barcode) => {
        onScan(barcode);
        onClose();
        stopCamera();
    };

    const handleClose = () => {
        stopCamera();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Camera View */}
                <div className="mb-4">
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-48 object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-blue-500 border-dashed w-48 h-32 rounded-lg flex items-center justify-center">
                                <span className="text-blue-500 text-sm">Position EAN barcode here</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2 text-center">
                        Position the EAN barcode within the frame
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                    <p>• Use a physical barcode scanner for quick scanning</p>
                    <p>• Camera automatically opens for scanning</p>
                    <p>• Only accepts valid EAN-13 and EAN-8 barcodes</p>
                </div>
            </div>
        </div>
    );
}
