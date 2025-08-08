import React, { useState, useEffect } from 'react';
import { storage } from '../firebase/config';
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
    listAll,
    deleteObject
} from 'firebase/storage';

export default function FirebaseStorage() {
    const [file, setFile] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchFiles();
    }, []);

    const fetchFiles = async () => {
        try {
            const storageRef = ref(storage, 'uploads');
            const result = await listAll(storageRef);

            const urlPromises = result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    url: url,
                    ref: itemRef
                };
            });

            const files = await Promise.all(urlPromises);
            setFileList(files);
        } catch (err) {
            setError(`Error fetching files: ${err.message}`);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setUploading(true);
        setProgress(0);
        setError('');
        setSuccess('');

        try {
            const storageRef = ref(storage, `uploads/${file.name}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    // Get upload progress
                    const progress = Math.round(
                        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                    );
                    setProgress(progress);
                },
                (error) => {
                    setError(`Upload failed: ${error.message}`);
                    setUploading(false);
                },
                async () => {
                    // Upload completed successfully
                    setSuccess('File uploaded successfully!');
                    setUploading(false);
                    setFile(null);
                    // Reset file input
                    document.getElementById('file-upload').value = '';
                    // Refresh file list
                    await fetchFiles();
                }
            );
        } catch (err) {
            setError(`Error during upload: ${err.message}`);
            setUploading(false);
        }
    };

    const handleDelete = async (fileRef) => {
        try {
            await deleteObject(fileRef);
            setSuccess('File deleted successfully!');
            // Refresh file list
            await fetchFiles();
        } catch (err) {
            setError(`Error deleting file: ${err.message}`);
        }
    };

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Firebase Storage Example</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {success}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-gray-700 mb-2">Select File to Upload</label>
                <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-gray-700 mb-2"
                />
                <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className={`bg-blue-500 text-white font-bold py-2 px-4 rounded ${
                        !file || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                    }`}
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>

                {uploading && (
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{progress}% Uploaded</p>
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-xl font-semibold mb-3">Uploaded Files</h3>

                {fileList.length === 0 ? (
                    <p className="text-gray-500">No files uploaded yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {fileList.map((file, index) => (
                            <li key={index} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{file.name}</p>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-500 hover:underline text-sm"
                                    >
                                        View File
                                    </a>
                                </div>
                                <button
                                    onClick={() => handleDelete(file.ref)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
