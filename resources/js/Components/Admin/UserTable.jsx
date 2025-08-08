import React from 'react';

export default function UserTable({
    users,
    loading,
    onEdit,
    onDelete
}) {

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="bg-gray-50 p-10 text-center rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filter to find what you're looking for.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6">Email</th>
                        <th scope="col" className="py-3 px-6">Role</th>
                        <th scope="col" className="py-3 px-6">Status</th>
                        <th scope="col" className="py-3 px-6">Created At</th>
                        <th scope="col" className="py-3 px-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user) => (
                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">
                                {user.firstName} {user.lastName}
                            </td>
                            <td className="py-4 px-6">{user.email}</td>
                            <td className="py-4 px-6">
                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-blue-100 text-blue-800'
                                    }`}>
                                    {user.role}
                                </span>
                            </td>
                            <td className="py-4 px-6">
                                <span className={`px-2 py-1 rounded-full text-xs ${user.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {user.status}
                                </span>
                            </td>
                            <td className="py-4 px-6">{user.createdAt}</td>
                            <td className="py-4 px-6 flex items-center space-x-2">
                                <button
                                    onClick={() => onEdit(user)}
                                    className="font-medium text-blue-600 hover:text-blue-900"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => onDelete(user.id)}
                                    className="font-medium text-red-600 hover:text-red-900"
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
