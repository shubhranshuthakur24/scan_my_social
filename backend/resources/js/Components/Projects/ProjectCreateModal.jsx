import React, { useEffect, useState } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

export default function ProjectCreateModal({
    show,
    onClose,
    onCreate,
    colorOptions = [],
    colorMap = {},
}) {

    const defaultColor = colorOptions[0] ?? 'slate';
    const [name, setName] = useState('');
    const [selectedColor, setSelectedColor] = useState(defaultColor);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (show) {
            setSelectedColor(defaultColor);
            setName('');
            setError('');
            setIsSubmitting(false);
        }
    }, [show, defaultColor]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) {
            return;
        }

        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a project name');
            return;
        }

        setIsSubmitting(true);
        try {
            const wasCreated = await Promise.resolve(onCreate({
                name: trimmedName,
                color: selectedColor,
            }));

            if (wasCreated) {
                onClose();
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Create New Project</h3>
                </div>

                <div className="space-y-5 mb-8">
                    <div>
                        <InputLabel htmlFor="project_name" className="text-slate-700 font-bold mb-1.5 ml-1">
                            Project Name
                        </InputLabel>
                        <TextInput
                            id="project_name"
                            className="w-full"
                            placeholder="e.g. motivational"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) {
                                    setError('');
                                }
                            }}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{error}</p>
                        )}
                    </div>

                    <div>
                        <InputLabel className="text-slate-700 font-bold mb-2 ml-1">
                            Folder Color
                        </InputLabel>
                        <div className="flex flex-wrap gap-2">
                            {colorOptions.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    aria-label={`Select ${color} color`}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${colorMap[color]?.swatch ?? 'bg-slate-400'} ${selectedColor === color
                                        ? 'border-slate-800 scale-110 shadow-md ring-2 ring-offset-2 ring-slate-400'
                                        : 'border-transparent hover:scale-105'
                                        }`}
                                />
                            ))}
                        </div>
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
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
