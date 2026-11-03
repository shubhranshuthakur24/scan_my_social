import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

export default function ProjectEditModal({ show, onClose, onEdit, project }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (project) {
            setName(project.name);
        }
    }, [project, show]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Please enter a project name');
            return;
        }
        onEdit(name.trim());
        setError('');
        onClose();
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Edit project</h3>
                    <p className="text-sm text-slate-500">
                        Update the name of your project.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <InputLabel htmlFor="project_edit_name" className="text-slate-700 font-bold mb-1.5 ml-1">
                            Project Name
                        </InputLabel>
                        <TextInput
                            id="project_edit_name"
                            className="w-full"
                            placeholder="e.g. Motivational, Fitness, Coding"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError('');
                            }}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{error}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <Button
                        variant="primary"
                        className="px-8 shadow-lg shadow-primary-100"
                        type="submit"
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
