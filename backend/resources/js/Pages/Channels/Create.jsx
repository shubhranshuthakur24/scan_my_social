import React, { useState, useRef, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import PlatformSelector from '@/Components/PlatformSelector';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { useToast } from '@/Contexts/ToastContext';
import Icon from '@/Components/Icon';

export default function Create() {
    const { url } = usePage();
    const queryParams = new URLSearchParams(url.split('?')[1]);
    const initialHandle = queryParams.get('handle') || '';

    // Single channel form
    const [platform, setPlatform] = useState('instagram');
    const [channel, setChannel] = useState(initialHandle);
    const [errors, setErrors] = useState({ platform: false, channel: false, message: '' });
    const [processing, setProcessing] = useState(false);

    // Bulk form
    const [bulkPlatform, setBulkPlatform] = useState('instagram');
    const [bulkChips, setBulkChips] = useState([]); // { text, key, isValid }
    const [bulkInputValue, setBulkInputValue] = useState('');
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const chipInputRef = useRef(null);
    const { addToast } = useToast();

    const PLATFORM_HOSTS = {
        instagram: ['instagram.com'],
        youtube: ['youtube.com', 'youtu.be'],
        linkedin: ['linkedin.com'],
    };

    const IG_RESERVED_SEGMENTS = new Set([
        'p', 'reel', 'reels', 'stories', 'explore', 'tv', 'accounts', 'about', 'developer'
    ]);

    const normalizeKnownUrl = (value) => {
        if (/^(www\.)?(instagram\.com|youtube\.com|youtu\.be|linkedin\.com)/i.test(value)) {
            return `https://${value}`;
        }
        return value;
    };

    const normalizeHost = (host = '') => host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '');
    const sanitizeHandle = (value = '') => value.replace(/^@+/, '').trim();
    const isValidHandleToken = (value) => Boolean(value) && !(/[\/\s?&#=]/.test(value));

    const isAllowedHost = (host, plat) => {
        const normalizedHost = normalizeHost(host);
        const allowed = PLATFORM_HOSTS[plat] || [];
        return allowed.some((domain) => normalizedHost === domain || normalizedHost.endsWith(`.${domain}`));
    };

    const extractHandleFromUrl = (urlObj, plat) => {
        const segments = (urlObj.pathname || '')
            .split('/')
            .map((segment) => segment.trim())
            .filter(Boolean);

        if (segments.length === 0) return '';

        if (plat === 'instagram') {
            const first = sanitizeHandle(segments[0]);
            if (!isValidHandleToken(first)) return '';
            if (IG_RESERVED_SEGMENTS.has(first.toLowerCase())) return '';
            return first;
        }

        if (plat === 'youtube') {
            const [first, second] = segments;
            if (!first) return '';

            if (first.startsWith('@')) {
                const handle = sanitizeHandle(first);
                return isValidHandleToken(handle) ? handle : '';
            }

            const firstLower = first.toLowerCase();
            if (['channel', 'c', 'user'].includes(firstLower) && second) {
                const handle = sanitizeHandle(second);
                return isValidHandleToken(handle) ? handle : '';
            }

            return '';
        }

        if (plat === 'linkedin') {
            const [first, second] = segments;
            if (!first) return '';

            const firstLower = first.toLowerCase();
            if (['in', 'company', 'school'].includes(firstLower) && second) {
                const handle = sanitizeHandle(second);
                return isValidHandleToken(handle) ? handle : '';
            }

            const direct = sanitizeHandle(first);
            return isValidHandleToken(direct) ? direct : '';
        }

        return '';
    };

    const extractNormalizedHandle = (input, plat) => {
        let value = String(input || '').trim();
        if (!value) return '';
        value = normalizeKnownUrl(value);

        try {
            const urlObj = new URL(value);
            if (!isAllowedHost(urlObj.hostname, plat)) return '';
            return extractHandleFromUrl(urlObj, plat);
        } catch (_) {
            if (!value) return '';
            const handle = sanitizeHandle(value);
            return isValidHandleToken(handle) ? handle : '';
        }
    };

    const chipKeyForInput = (input, plat) => {
        const normalizedHandle = extractNormalizedHandle(input, plat);
        if (normalizedHandle) {
            return `${plat}:${normalizedHandle.toLowerCase()}`;
        }

        return `${plat}:${String(input || '').trim().toLowerCase()}`;
    };

    const isValidProfile = (input, plat) => Boolean(extractNormalizedHandle(input, plat));

    // ----- SINGLE SUBMIT -----
    const handleSingleSubmit = async () => {
        if (processing) return;

        const platformErr = !platform;
        const channelErr = !channel.trim();
        const invalidFormat = !channelErr && !isValidProfile(channel, platform);

        if (platformErr || channelErr || invalidFormat) {
            setErrors({
                platform: platformErr,
                channel: channelErr || invalidFormat,
                message: invalidFormat ? `Invalid profile handle or link for ${platform}` : ''
            });
            return;
        }

        setProcessing(true);
        try {
            const response = await axios.post('/api/channels', {
                channels: [{ platform, channel: channel.trim() }]
            });

            const createdCount = Number(response?.data?.created_count ?? 0);
            if (createdCount > 0) {
                addToast(response?.data?.message || 'Channel added successfully!', 'success');
                router.visit(route('channels'));
                return;
            }

            let errorMsg = response?.data?.message || 'Failed to add channel.';
            const apiErrors = response?.data?.errors?.channels;
            if (apiErrors && Object.values(apiErrors).length > 0) {
                errorMsg = Object.values(apiErrors)[0].message || errorMsg;
            }
            addToast(errorMsg, 'warning');
            setProcessing(false);
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to add channel.';
            addToast(msg, 'error');
            setProcessing(false);
        }
    };

    // ----- BULK CHIP LOGIC -----

    // Process raw text into chips
    const processBulkInputString = (text) => {
        if (!text.trim()) return;
        const spacedData = text.replace(/(?<!^)(https?:\/\/)/gi, ' $1');
        const items = spacedData.split(/[\n,\s]+/).map(h => h.trim()).filter(Boolean);

        if (items.length === 0) return;

        setBulkChips(prev => {
            const newChips = [...prev];
            const existingKeys = new Set(
                newChips.map((chip) => chip.key || chipKeyForInput(chip.text, bulkPlatform))
            );

            items.forEach(item => {
                let processedItem = item;
                // If it's not a link and doesn't have @, prepend it
                if (!/^https?:\/\//i.test(processedItem) && !processedItem.startsWith('@')) {
                    processedItem = '@' + processedItem;
                }

                const key = chipKeyForInput(processedItem, bulkPlatform);
                if (!existingKeys.has(key)) {
                    existingKeys.add(key);
                    newChips.push({ text: processedItem, key, isValid: isValidProfile(processedItem, bulkPlatform) });
                }
            });
            return newChips;
        });
        setBulkInputValue('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
            e.preventDefault();
            processBulkInputString(bulkInputValue);
        } else if (e.key === 'Backspace' && bulkInputValue === '' && bulkChips.length > 0) {
            // Delete last chip if input is empty
            setBulkChips(prev => prev.slice(0, -1));
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        processBulkInputString(paste);
    };

    const removeChip = (indexToRemove) => {
        setBulkChips(prev => prev.filter((_, idx) => idx !== indexToRemove));
        chipInputRef.current?.focus();
    };

    // Re-evaluate chips when platform changes
    useEffect(() => {
        setBulkChips(prev => {
            const deduped = [];
            const seen = new Set();

            prev.forEach((chip) => {
                const key = chipKeyForInput(chip.text, bulkPlatform);
                if (seen.has(key)) {
                    return;
                }

                seen.add(key);
                deduped.push({
                    ...chip,
                    key,
                    isValid: isValidProfile(chip.text, bulkPlatform),
                });
            });

            return deduped;
        });
    }, [bulkPlatform]);


    const validItems = bulkChips.filter(c => c.isValid);
    const invalidItems = bulkChips.filter(c => !c.isValid);

    const handleBulkSubmit = async () => {
        if (bulkProcessing || !bulkPlatform || validItems.length === 0) return;

        setBulkProcessing(true);
        try {
            const response = await axios.post('/api/channels', {
                channels: validItems.map(i => ({ platform: bulkPlatform, channel: i.text }))
            });

            const createdCount = Number(response?.data?.created_count ?? 0);
            if (createdCount > 0) {
                addToast(response?.data?.message || `${createdCount} channel(s) added successfully!`, 'success');
                router.visit(route('channels'));
                return;
            }

            let errorMsg = response?.data?.message || 'No channels were added.';
            const apiErrors = response?.data?.errors?.channels;
            if (apiErrors && Object.values(apiErrors).length > 0) {
                errorMsg = Object.values(apiErrors)[0].message || errorMsg;
            }
            addToast(errorMsg, 'warning');
            setBulkProcessing(false);
        } catch (e) {
            const msg = e.response?.data?.message || 'Failed to add channels.';
            addToast(msg, 'error');
            setBulkProcessing(false);
        }
    };

    return (
        <AuthenticatedLayout 
            topbarTitle={"Add Competitor Channels"}
            topbarDescription={"Add a channel link, handle, or bulk list to start tracking creator activity."}
             moduleTabsAction={(
                <button
                    type="button"
                    onClick={() => router.visit(route('channels'))}
                                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white shadow-sm shadow-primary-600/20 transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-not-allowed disabled:opacity-60"

                >    
                    <Icon name="arrowLeft" />
                    Back to channels
                </button>
            )}
            >
            <Head title="Add Channels" />

            <div className="space-y-8 pb-20">
             



                {/* Single channel */}
                <div className="space-y-5 rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Add a Channel</h2>
                        <p className="text-sm text-slate-400 mt-0.5">Enter a single channel link or an @handle to start tracking.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Platform</label>
                            <PlatformSelector
                                value={platform}
                                onChange={(val) => {
                                    setPlatform(val);
                                    setErrors(e => ({ ...e, platform: false }));
                                    if (channel) {
                                        setErrors(e => ({ ...e, channel: false, message: '' }));
                                    }
                                }}
                                error={errors.platform}
                            />
                            {errors.platform && <p className="text-xs text-red-500 font-medium">Select a platform</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Profile Link or @Handle</label>
                            <input
                                type="text"
                                placeholder="e.g. @mrbeast or https://instagram.com/mrbeast"
                                className={`w-full bg-white border rounded-xl px-4 h-11 text-sm font-bold placeholder:text-slate-300 transition-all
                                    ${errors.channel ? 'border-red-400 focus:ring-red-50 focus:border-red-500' : 'border-slate-300 hover:border-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'}`}
                                value={channel}
                                onChange={(e) => {
                                    let val = e.target.value;
                                    // If typing and not a link and doesn't start with @/http, prepend @
                                    if (val && !val.startsWith('@') && !val.startsWith('http')) {
                                        val = '@' + val;
                                    }
                                    setChannel(val);
                                    setErrors(err => ({ ...err, channel: false, message: '' }));
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSingleSubmit();
                                    }
                                }}
                            />
                            {errors.channel && (
                                <p className="text-xs text-red-500 font-medium">
                                    {errors.message || 'Channel field is required'}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSingleSubmit}
                            disabled={processing}
                            className="px-6 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                        >
                            {processing ? 'Adding...' : 'Add Channel'}
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">or bulk import</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                {/* Bulk add */}
                <div className="space-y-5 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Bulk Add Channels</h2>
                            <p className="text-sm text-slate-400 mt-0.5">
                                Type handles (with @) or paste links, then press Space or Enter.
                            </p>
                        </div>
                        {bulkChips.length > 0 && (
                            <div className="flex gap-2">
                                <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-100 shadow-sm block">
                                    {validItems.length} Valid
                                </span>
                                {invalidItems.length > 0 && (
                                    <span className="text-xs font-bold bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-100 shadow-sm block">
                                        {invalidItems.length} Invalid
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Platform</label>
                            <PlatformSelector value={bulkPlatform} onChange={setBulkPlatform} />
                        </div>

                        <div className="col-span-1 md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 block">Handles & Links</label>

                            {/* Chip Input Container */}
                            <div
                                className="w-full min-h-[120px] bg-slate-50 border border-slate-300 rounded-xl p-2.5 flex flex-wrap gap-2 items-start cursor-text focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all shadow-inner"
                                onClick={() => chipInputRef.current?.focus()}
                            >
                                {bulkChips.map((chip, idx) => (
                                    <div
                                        key={chip.key || `${chip.text}-${idx}`}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shrink-0 animate-in zoom-in-95 duration-100 ${chip.isValid
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-red-50 text-red-700 border-red-200'
                                            }`}
                                    >
                                        {chip.isValid ? (
                                            <Icon name="checkCircle" className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Icon name="xCircle" className="w-3.5 h-3.5 text-red-500" />
                                        )}
                                        <span className="max-w-[200px] truncate" title={chip.text}>
                                            {chip.text}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeChip(idx); }}
                                            className={`ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors ${chip.isValid ? 'text-emerald-700' : 'text-red-700'
                                                }`}
                                        >
                                            <Icon name="x" className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}

                                <input
                                    ref={chipInputRef}
                                    type="text"
                                    className="flex-1 min-w-[120px] bg-transparent border-none focus:ring-0 p-1 text-sm font-medium placeholder:text-slate-400"
                                    placeholder={bulkChips.length === 0 ? "Paste links or type @handles..." : "Type more..."}
                                    value={bulkInputValue}
                                    onChange={(e) => setBulkInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onPaste={handlePaste}
                                />
                            </div>
                            {invalidItems.length > 0 && (
                                <p className="text-xs text-red-500 font-bold px-1 animate-in fade-in slide-in-from-top-1">
                                    Red items are invalid (e.g., missing @ symbol) and will not be added.
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleBulkSubmit}
                            disabled={bulkProcessing || !bulkPlatform || validItems.length === 0}
                            className="px-6 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                        >
                            {bulkProcessing ? 'Adding...' : validItems.length > 0 ? `Add ${validItems.length} Channel${validItems.length !== 1 ? 's' : ''}` : 'Add Channels'}
                        </button>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
