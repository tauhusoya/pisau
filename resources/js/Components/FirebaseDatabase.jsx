import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import {
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';

export default function FirebaseDatabase() {
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Listen for realtime updates
    useEffect(() => {
        const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const itemsArray = [];
            querySnapshot.forEach((doc) => {
                itemsArray.push({ id: doc.id, ...doc.data() });
            });
            setItems(itemsArray);
            setLoading(false);
        }, (err) => {
            setError(`Error fetching data: ${err.message}`);
            setLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        try {
            await addDoc(collection(db, 'items'), {
                name: newItem,
                createdAt: new Date()
            });
            setNewItem('');
        } catch (err) {
            setError(`Error adding item: ${err.message}`);
        }
    };

    const handleDeleteItem = async (id) => {
        try {
            await deleteDoc(doc(db, 'items', id));
        } catch (err) {
            setError(`Error deleting item: ${err.message}`);
        }
    };

    const handleUpdateItem = async (id, newName) => {
        try {
            await updateDoc(doc(db, 'items', id), {
                name: newName
            });
        } catch (err) {
            setError(`Error updating item: ${err.message}`);
        }
    };

    if (loading) {
        return <div className="p-6">Loading items...</div>;
    }

    return (
        <div className="p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6">Firebase Firestore Example</h2>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleAddItem} className="mb-6">
                <div className="flex">
                    <input
                        type="text"
                        value={newItem}
                        onChange={(e) => setNewItem(e.target.value)}
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Add new item"
                    />
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-r-md"
                    >
                        Add
                    </button>
                </div>
            </form>

            <ul className="space-y-2">
                {items.length === 0 ? (
                    <li className="text-gray-500">No items yet. Add one above!</li>
                ) : (
                    items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                            <span>{item.name}</span>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        const newName = prompt('Update item name:', item.name);
                                        if (newName && newName !== item.name) {
                                            handleUpdateItem(item.id, newName);
                                        }
                                    }}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-sm"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-sm"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}
