import React, { useState, Fragment } from 'react';
import Modal from '@/Components/Modal';
import Button from '@/Components/Button';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import { router } from '@inertiajs/react';
import { Listbox, Transition } from '@headlessui/react';
import { PlatformIcon } from '@/Components/PlatformIcons';
import Icon from '@/Components/Icon';
export default function ChannelDetailModal({
    show,
    onClose,
    channel,
    watchlists,
    onAddToWatchlist,
    onCreateWatchlist,
}) {
    const [selectedWatchlistId, setSelectedWatchlistId] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [newWatchlistName, setNewWatchlistName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Reset state when modal is closed
    React.useEffect(() => {
        if (!show) {
            setSelectedWatchlistId('');
            setIsCreating(false);
            setNewWatchlistName('');
            setIsProcessing(false);
            setError('');
        }
    }, [show]);

    if (!channel) return null;

    const selectedWatchlist = watchlists.find(w => w.id.toString() === selectedWatchlistId.toString());

    const showSuccessAndClose = () => {
        setIsProcessing(false);
        onClose();
    };

    const handleAction = async () => {
        setIsProcessing(true);
        setError('');
        if (isCreating) {
            const trimmedName = newWatchlistName.trim();
            if (trimmedName) {
                if (watchlists.some(w => w.name.toLowerCase() === trimmedName.toLowerCase())) {
                    setError('A watchlist with this name already exists');
                    setIsProcessing(false);
                    return;
                }
                const wasCreated = await Promise.resolve(onCreateWatchlist(trimmedName, showSuccessAndClose));
                if (wasCreated) {
                    setIsCreating(false);
                    setNewWatchlistName('');
                } else {
                    setIsProcessing(false);
                }
            } else {
                setError('Please enter a name for the watchlist');
                setIsProcessing(false);
            }
        } else {
            if (selectedWatchlistId) {
                onAddToWatchlist(selectedWatchlistId, showSuccessAndClose);
            } else {
                setIsProcessing(false);
            }
        }
    };

    const isSubmitDisabled = !isCreating && !selectedWatchlistId;

    const handleExploreVideos = () => {
        router.visit(route('videos', { creator: channel.handle || channel.name }));
        onClose();
    };

    const getChannelUrl = () => {
        const handle = (channel.handle || channel.name || '').replace(/^@/, '');
        switch (channel.platform?.toLowerCase()) {
            case 'instagram': return `https://instagram.com/${handle}`;
            case 'youtube': return `https://youtube.com/@${handle}`;
            case 'tiktok': return `https://tiktok.com/@${handle}`;
            case 'linkedin': return `https://linkedin.com/in/${handle}`;
            case 'facebook': return `https://facebook.com/${handle}`;
            default: return channel.url || '#';
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg" zIndexClass="z-[400]">
            <div className="p-8 pb-24">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-slate-100 shadow-sm">
                                <img src={channel.profile_image_url || channel.imageUrl} alt={channel.handle || channel.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="absolute -bottom-1 -right-1">
                                <PlatformIcon
                                    platform={channel.platform}
                                    className="w-4 h-4"
                                    padding="p-1 border border-white shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-bold text-slate-900">{channel.handle || channel.name}</h3>
                                <a href={getChannelUrl()} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 font-bold hover:text-primary-700 transition-colors">
                                    <Icon name="externalLink" className="w-4 h-4 text-slate-400" />
                                </a>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{channel.platform}</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black text-slate-900 leading-tight text-center">
                            {channel.followers_count ? channel.followers_count.toLocaleString() : (channel.followers || '0')}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{channel.platform === 'youtube' ? 'subscribers' : 'followers'}</p>
                    </div>
                </div>

                {channel.bio && (
                    <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">{channel.bio}</p>
                    </div>
                )}

                <div className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <InputLabel className="text-slate-500 font-bold ml-1">Add to Watchlist</InputLabel>
                            {watchlists.length > 0 && !isCreating && (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="text-xs text-primary-600 font-bold hover:text-primary-700 transition-colors"
                                >
                                    + New Watchlist
                                </button>
                            )}
                        </div>

                        {watchlists.length === 0 || isCreating ? (
                            <div className="space-y-3">
                                <div>
                                    <TextInput
                                        className="w-full"
                                        placeholder="Enter new watchlist name"
                                        value={newWatchlistName}
                                        onChange={(e) => {
                                            setNewWatchlistName(e.target.value);
                                            if (error) setError('');
                                        }}
                                        autoFocus
                                    />
                                    {error && <p className="mt-1.5 text-xs font-bold text-red-500 ml-1">{error}</p>}
                                </div>
                                {watchlists.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setIsCreating(false);
                                            setError('');
                                        }}
                                        className="text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors ml-1"
                                    >
                                        Cancel and select existing
                                    </button>
                                )}
                            </div>
                        ) : (
                            <Listbox value={selectedWatchlistId} onChange={setSelectedWatchlistId}>
                                {({ open }) => (
                                    <div className="relative">
                                        <Listbox.Button className="relative w-full cursor-default rounded-xl bg-slate-50 py-3 pl-4 pr-10 text-left border border-slate-100 hover:border-slate-200 transition-all focus:outline-hidden sm:text-sm">
                                            <span className={`block truncate font-bold ${selectedWatchlist ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {selectedWatchlist ? selectedWatchlist.name : 'Select a watchlist'}
                                            </span>
                                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </span>
                                        </Listbox.Button>
                                        <Transition
                                            as={Fragment}
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100"
                                            leaveTo="opacity-0"
                                        >
                                            <Listbox.Options className="absolute z-10 mt-1 max-h-80 w-full overflow-auto rounded-xl bg-white p-1 text-base shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-hidden sm:text-sm border border-slate-100">
                                                {watchlists.map((w) => {
                                                    const alreadyIn = (w.channels || []).some((watchlistChannel) => watchlistChannel.id === channel.id);
                                                    return (
                                                        <Listbox.Option
                                                            key={w.id}
                                                            className={({ active }) =>
                                                                `relative cursor-default select-none rounded-lg py-2.5 pl-4 pr-4 transition-colors ${alreadyIn ? 'opacity-50' : active ? 'bg-primary-600 text-white' : 'text-slate-900'
                                                                }`
                                                            }
                                                            value={w.id}
                                                            disabled={alreadyIn}
                                                        >
                                                            {({ selected }) => (
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className={`block truncate ${selected ? 'font-black' : 'font-bold'}`}>
                                                                        {w.name}
                                                                    </span>
                                                                    {alreadyIn && (
                                                                        <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-100">
                                                                            Already in
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Listbox.Option>
                                                    );
                                                })}
                                            </Listbox.Options>
                                        </Transition>
                                    </div>
                                )}
                            </Listbox>
                        )}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                        <button
                            onClick={handleExploreVideos}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all hover:border-slate-300"
                        >
                            <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            Explore videos
                        </button>

                        <div className="flex items-center gap-4">
                            <Button
                                variant="primary"
                                className={`px-10 shadow-lg shadow-primary-100 ${isSubmitDisabled || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                onClick={handleAction}
                                disabled={isSubmitDisabled || isProcessing}
                                isLoading={isProcessing}
                            >
                                {isCreating ? 'Create & Add' : 'Add to Watchlist'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
