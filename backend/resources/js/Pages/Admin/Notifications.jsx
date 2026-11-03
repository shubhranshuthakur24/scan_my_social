import React, { useState, useMemo } from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import { Bell, Send, Users, Crown, Globe, Search, X, Info, CheckCircle, AlertTriangle, XCircle, ExternalLink, Clock, Hash } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_TYPES = [
    { value: 'info', label: 'Info', icon: Info, color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
    { value: 'success', label: 'Success', icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-500' },
    { value: 'warning', label: 'Warning', icon: AlertTriangle, color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-500' },
    { value: 'error', label: 'Error', icon: XCircle, color: 'bg-rose-50 text-rose-600 border-rose-200', dot: 'bg-rose-500' },
];

const TARGET_TYPES = [
    { value: 'individual', label: 'Individual Users', icon: Users, description: 'Send to specific users' },
    { value: 'plan', label: 'By Plan', icon: Crown, description: 'Send to all users on a plan' },
    { value: 'all', label: 'All Users', icon: Globe, description: 'Broadcast to everyone' },
];

function UserSelector({ users, selectedIds, onChange }) {
    const [search, setSearch] = useState('');

    const filteredUsers = useMemo(() => {
        if (!search.trim()) return users;
        const q = search.toLowerCase();
        return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }, [users, search]);

    const toggleUser = (id) => {
        onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
    };

    const removeUser = (id) => {
        onChange(selectedIds.filter(i => i !== id));
    };

    const selectedUsers = users.filter(u => selectedIds.includes(u.id));

    return (
        <div className="space-y-3">
            {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedUsers.map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg text-xs font-bold border border-primary-100">
                            {u.name}
                            <button onClick={() => removeUser(u.id)} className="text-primary-400 hover:text-primary-600 transition-colors">
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                </div>
                <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-shadow outline-none font-medium"
                />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-50 custom-scrollbar">
                {filteredUsers.map(u => (
                    <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedIds.includes(u.id) ? 'bg-primary-50/50' : 'hover:bg-slate-50'}`}
                    >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${selectedIds.includes(u.id) ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
                            {selectedIds.includes(u.id) && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                            {u.plan}
                        </span>
                    </button>
                ))}
                {filteredUsers.length === 0 && (
                    <div className="px-4 py-8 text-center text-sm text-slate-400 font-medium">
                        No users found matching "{search}"
                    </div>
                )}
            </div>
        </div>
    );
}

function NotificationPreview({ title, message, type }) {
    const typeConfig = NOTIFICATION_TYPES.find(t => t.value === type) || NOTIFICATION_TYPES[0];
    const TypeIcon = typeConfig.icon;

    const typeClasses = {
        info: 'bg-blue-50',
        success: 'bg-emerald-50',
        warning: 'bg-amber-50',
        error: 'bg-rose-50',
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg shadow-primary-900/5 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/50 border-b border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</p>
            </div>
            <div className="p-4">
                <div className="flex gap-3">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeClasses[type] || typeClasses.info}`}>
                        <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                            {title || 'Notification Title'}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {message || 'Your notification message will appear here...'}
                        </p>
                        <p className="mt-2 text-[10px] text-slate-400 font-medium">Just now</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Notifications({ users, plans, logs }) {
    const { flash } = usePage().props;
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        target_type: 'individual',
        user_ids: [],
        plan_name: plans[0] || '',
        title: '',
        message: '',
        type: 'info',
        action_url: '',
    });

    const recipientCount = useMemo(() => {
        switch (data.target_type) {
            case 'individual':
                return data.user_ids.length;
            case 'plan':
                return users.filter(u => u.plan === data.plan_name).length;
            case 'all':
                return users.length;
            default:
                return 0;
        }
    }, [data.target_type, data.user_ids, data.plan_name, users]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const confirmSend = () => {
        setShowConfirm(false);
        post(route('admin.notifications.send'), {
            preserveScroll: true,
            onSuccess: () => reset('title', 'message', 'action_url', 'user_ids'),
        });
    };

    const currentType = NOTIFICATION_TYPES.find(t => t.value === data.type) || NOTIFICATION_TYPES[0];

    return (
        <AuthenticatedLayout>
            <Head title="Push Notifications" />

            <div className="mx-auto max-w-6xl space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Push Notifications</h1>
                    <p className="text-sm text-slate-500 font-medium mt-1">Send real-time notifications to your users.</p>
                </div>

                {/* Success Flash */}
                {flash?.success && (
                    <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-sm font-bold">
                        <CheckCircle className="h-5 w-5 shrink-0" />
                        {flash.success}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Compose Form */}
                    <div className="lg:col-span-2">
                        <form onSubmit={handleSubmit}>
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                                        <Send className="h-4 w-4 text-primary-600" />
                                        Compose Notification
                                    </h2>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Target Type */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Target Audience</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {TARGET_TYPES.map(target => {
                                                const TargetIcon = target.icon;
                                                return (
                                                    <button
                                                        key={target.value}
                                                        type="button"
                                                        onClick={() => setData('target_type', target.value)}
                                                        className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                                                            data.target_type === target.value
                                                                ? 'border-primary-500 bg-primary-50/50 shadow-sm shadow-primary-500/10'
                                                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${data.target_type === target.value ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            <TargetIcon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{target.label}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">{target.description}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.target_type && <p className="mt-2 text-xs text-rose-500 font-bold">{errors.target_type}</p>}
                                    </div>

                                    {/* Target Specific Inputs */}
                                    {data.target_type === 'individual' && (
                                        <div>
                                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Select Users</label>
                                            <UserSelector
                                                users={users}
                                                selectedIds={data.user_ids}
                                                onChange={(ids) => setData('user_ids', ids)}
                                            />
                                            {errors.user_ids && <p className="mt-2 text-xs text-rose-500 font-bold">{errors.user_ids}</p>}
                                        </div>
                                    )}

                                    {data.target_type === 'plan' && (
                                        <div>
                                            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Select Plan</label>
                                            <div className="flex flex-wrap gap-3">
                                                {plans.map(plan => (
                                                    <button
                                                        key={plan}
                                                        type="button"
                                                        onClick={() => setData('plan_name', plan)}
                                                        className={`px-5 py-2.5 rounded-xl border-2 text-sm font-bold capitalize transition-all ${
                                                            data.plan_name === plan
                                                                ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        {plan}
                                                    </button>
                                                ))}
                                            </div>
                                            {errors.plan_name && <p className="mt-2 text-xs text-rose-500 font-bold">{errors.plan_name}</p>}
                                        </div>
                                    )}

                                    {data.target_type === 'all' && (
                                        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                                            <p className="text-xs font-bold text-amber-700">
                                                This will send a notification to all <span className="font-black">{users.length}</span> registered users.
                                            </p>
                                        </div>
                                    )}

                                    {/* Notification Type */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Notification Type</label>
                                        <div className="flex flex-wrap gap-2">
                                            {NOTIFICATION_TYPES.map(type => {
                                                const TypeIcon = type.icon;
                                                return (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setData('type', type.value)}
                                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                                                            data.type === type.value ? type.color + ' border-current' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <TypeIcon className="h-4 w-4" />
                                                        {type.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {errors.type && <p className="mt-2 text-xs text-rose-500 font-bold">{errors.type}</p>}
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Title</label>
                                        <input
                                            type="text"
                                            value={data.title}
                                            onChange={(e) => setData('title', e.target.value)}
                                            maxLength={100}
                                            placeholder="e.g. New Feature Available!"
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-shadow outline-none"
                                        />
                                        <div className="flex justify-between mt-1.5">
                                            {errors.title && <p className="text-xs text-rose-500 font-bold">{errors.title}</p>}
                                            <p className="text-[10px] text-slate-400 font-medium ml-auto">{data.title.length}/100</p>
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Message</label>
                                        <textarea
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            maxLength={500}
                                            rows={4}
                                            placeholder="Write your notification message..."
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-shadow outline-none resize-none"
                                        />
                                        <div className="flex justify-between mt-1.5">
                                            {errors.message && <p className="text-xs text-rose-500 font-bold">{errors.message}</p>}
                                            <p className="text-[10px] text-slate-400 font-medium ml-auto">{data.message.length}/500</p>
                                        </div>
                                    </div>

                                    {/* Action URL */}
                                    <div>
                                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                            Action URL <span className="text-slate-400 font-medium normal-case">(optional)</span>
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <ExternalLink className="h-4 w-4" />
                                            </div>
                                            <input
                                                type="text"
                                                value={data.action_url}
                                                onChange={(e) => setData('action_url', e.target.value)}
                                                placeholder="/dashboard or https://..."
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-shadow outline-none"
                                            />
                                        </div>
                                        {errors.action_url && <p className="mt-1.5 text-xs text-rose-500 font-bold">{errors.action_url}</p>}
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500">
                                        <span className="font-black text-slate-700">{recipientCount}</span> recipient{recipientCount !== 1 ? 's' : ''} selected
                                    </p>
                                    <button
                                        type="submit"
                                        disabled={processing || recipientCount === 0}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-black shadow-lg shadow-primary-500/20 hover:bg-primary-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send className="h-4 w-4" />
                                        {processing ? 'Sending...' : 'Send Notification'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Preview Panel */}
                    <div className="space-y-6">
                        <NotificationPreview
                            title={data.title}
                            message={data.message}
                            type={data.type}
                        />

                        {/* Quick Stats */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quick Stats</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-slate-900">{users.length}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Total Users</p>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-black text-primary-600">{logs.length}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Sent Total</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sent History */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary-600" />
                            Sent History
                        </h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Target</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Title</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Recipients</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {logs.length > 0 ? (
                                    logs.map(log => {
                                        const typeConfig = NOTIFICATION_TYPES.find(t => t.value === log.type) || NOTIFICATION_TYPES[0];
                                        return (
                                            <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4 text-xs text-slate-500 font-medium whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                                                        {log.target_type === 'individual' ? 'Individual' : log.target_type === 'plan' ? `Plan: ${log.target_filter}` : 'All Users'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{log.title}</p>
                                                    <p className="text-xs text-slate-500 truncate max-w-[200px] mt-0.5">{log.message}</p>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="inline-flex items-center gap-1 text-sm font-black text-slate-700">
                                                        <Hash className="h-3.5 w-3.5 text-slate-400" />
                                                        {log.recipient_count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${typeConfig.color}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${typeConfig.dot}`} />
                                                        {log.type}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Bell className="h-10 w-10 mb-4 opacity-20" />
                                                <p className="font-bold">No notifications sent yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Sent notifications will appear here.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                show={showConfirm}
                title="Send Notification"
                message={`Send this "${data.type}" notification to ${recipientCount} user${recipientCount !== 1 ? 's' : ''}? This action cannot be undone.`}
                confirmLabel="Send Now"
                variant="primary"
                onConfirm={confirmSend}
                onCancel={() => setShowConfirm(false)}
            />
        </AuthenticatedLayout>
    );
}
