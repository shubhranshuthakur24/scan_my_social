import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

export default function WatchlistCreateModal({ show, onClose, onCreate, existingWatchlists = [] }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a watchlist name');
            return;
        }
        if (existingWatchlists.some(w => w.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('A watchlist with this name already exists');
            return;
        }

        setIsSubmitting(true);
        try {
            const wasCreated = await Promise.resolve(onCreate(trimmedName));
            if (wasCreated) {
                setName('');
                setError('');
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
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Create new watchlist</h3>
                    <p className="text-sm text-slate-500">
                        Give your watchlist a name to group and track your favorite channels.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <InputLabel htmlFor="watchlist_name" className="text-slate-700 font-bold mb-1.5 ml-1">
                            Watchlist Name
                        </InputLabel>
                        <TextInput
                            id="watchlist_name"
                            className="w-full"
                            placeholder="e.g. My Favorites, Competitors, Fashion"
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
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Watchlist'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
