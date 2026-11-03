import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';

export default function WatchlistEditModal({ show, onClose, onEdit, watchlist, existingWatchlists = [] }) {
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (watchlist) {
            setName(watchlist.name);
        }
    }, [watchlist, show]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Please enter a watchlist name');
            return;
        }
        if (existingWatchlists.some(w => w.id !== watchlist?.id && w.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('A watchlist with this name already exists');
            return;
        }
        onEdit(watchlist.id, trimmedName);
        setError('');
        onClose();
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={handleSubmit} className="p-8">
                <div className="mb-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Edit watchlist</h3>
                    <p className="text-sm text-slate-500">
                        Update the name of your watchlist.
                    </p>
                </div>

                <div className="space-y-4 mb-8">
                    <div>
                        <InputLabel htmlFor="watchlist_edit_name" className="text-slate-700 font-bold mb-1.5 ml-1">
                            Watchlist Name
                        </InputLabel>
                        <TextInput
                            id="watchlist_edit_name"
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
                    >
                        Save Changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
