import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';

export default function UserModal({ isOpen, isEditing, user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        id: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'user',
        status: 'active'
    });

    const [errors, setErrors] = useState({});

    // Add password field to form
    const renderPasswordField = () => {
        if (!isEditing) {
            return (
                <div className="mb-4">
                    <InputLabel htmlFor="password" value="Password" />
                    <TextInput
                        id="password"
                        type="password"
                        name="password"
                        value={formData.password}
                        className="mt-1 block w-full"
                        onChange={handleChange}
                        required={!isEditing}
                    />
                    <InputError message={errors.password} className="mt-2" />
                </div>
            );
        }
        return null;
    };

    useEffect(() => {
        if (user) {
            setFormData({
                id: user.id || '',
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                role: user.role || 'user',
                status: user.status || 'active'
            });
        } else {
            // Reset form for new user
            setFormData({
                id: '',
                firstName: '',
                lastName: '',
                email: '',
                password: '',
                role: 'user',
                status: 'active'
            });
        }
        // Clear errors when modal opens
        setErrors({});
    }, [user, isOpen]);

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
        if (!formData.role) newErrors.role = 'Role is required';
        if (!formData.status) newErrors.status = 'Status is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            onSave(formData);
        } catch (error) {
            console.error('Error in form submission:', error);
            setErrors({ submit: error.message });
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title
                                    as="h3"
                                    className="text-lg font-medium leading-6 text-gray-900"
                                >
                                    {isEditing ? 'Edit User' : 'Add User'}
                                </Dialog.Title>

                                <form onSubmit={handleSubmit} className="mt-4">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <InputLabel htmlFor="firstName" value="First Name" />
                                            <TextInput
                                                id="firstName"
                                                name="firstName"
                                                value={formData.firstName}
                                                className="mt-1 block w-full"
                                                onChange={handleChange}
                                            />
                                            <InputError message={errors.firstName} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="lastName" value="Last Name" />
                                            <TextInput
                                                id="lastName"
                                                name="lastName"
                                                value={formData.lastName}
                                                className="mt-1 block w-full"
                                                onChange={handleChange}
                                            />
                                            <InputError message={errors.lastName} className="mt-2" />
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <InputLabel htmlFor="email" value="Email" />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            className="mt-1 block w-full"
                                            onChange={handleChange}
                                            disabled={isEditing} // Email cannot be changed once set
                                        />
                                        <InputError message={errors.email} className="mt-2" />
                                        {isEditing && (
                                            <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Users must update their own email.</p>
                                        )}
                                    </div>

                                    {renderPasswordField()}

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <InputLabel htmlFor="role" value="Role" />
                                            <select
                                                id="role"
                                                name="role"
                                                value={formData.role}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                onChange={handleChange}
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <InputError message={errors.role} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="status" value="Status" />
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                                onChange={handleChange}
                                            >
                                                <option value="active">Active</option>
                                                <option value="inactive">Inactive</option>
                                            </select>
                                            <InputError message={errors.status} className="mt-2" />
                                        </div>
                                    </div>

                                    {errors.submit && (
                                        <div className="mt-4">
                                            <InputError message={errors.submit} className="mt-2" />
                                        </div>
                                    )}

                                    <div className="mt-6 flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={onClose}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                        >
                                            {isEditing ? 'Save Changes' : 'Add User'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
