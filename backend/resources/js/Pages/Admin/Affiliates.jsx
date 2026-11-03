import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';

export default function Affiliates({ applications }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [processing, setProcessing] = useState(false);

    const getStatusStyle = (status) => {
        if (status === 'approved_claimed') {
            return 'bg-emerald-100 text-emerald-700';
        }

        if (status === 'approved_unclaimed') {
            return 'bg-blue-100 text-blue-700';
        }

        if (status === 'pending') {
            return 'bg-amber-100 text-amber-700';
        }

        return 'bg-rose-100 text-rose-700';
    };

    const handleStatusUpdate = (app, status) => {
        setProcessing(true);
        router.patch(route('admin.affiliates.update-status', {
            application: app.id,
        }), {
            status,
            reason: status === 'rejected' ? rejectionReason : '',
        }, {
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                setSelectedUser(null);
                setRejectionReason('');
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Affiliate Management" />

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                            <Icon name="landmark" size={20} />
                        </div>
                        Affiliate Applications
                    </h1>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Note</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Applied</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {applications.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400 font-medium">No applications found.</td>
                                    </tr>
                                ) : (
                                    applications.map((app) => (
                                        <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{app.name}</span>
                                                    <span className="text-xs text-slate-500">{app.email}</span>
                                                    {(app.claimed_user || app.user) && (
                                                        <span className="text-[10px] font-bold text-primary-600 mt-0.5">Claimed User Linked</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">
                                                {app.contact || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-widest ${getStatusStyle(app.status)}`}>
                                                    {app.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[150px] truncate text-[10px] text-slate-400 font-medium" title={app.note}>
                                                    {app.note || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {app.created_at ? new Date(app.created_at).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(app.status === 'pending' || app.status === 'rejected') && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleStatusUpdate(app, 'approved')}
                                                            disabled={processing}
                                                            className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-black rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedUser(app)}
                                                            className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-black rounded-lg hover:bg-rose-100 transition-all"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {app.status === 'approved_unclaimed' && (
                                                    <span className="text-[10px] font-black text-blue-600 uppercase">Waiting for claim</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-8 space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-slate-900">Reject Application</h3>
                            <p className="text-sm text-slate-500 font-medium">Please provide a reason for rejecting {selectedUser.name}'s application.</p>
                        </div>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g. Website doesn't meet our quality standards..."
                            className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none text-sm font-medium transition-shadow"
                        />

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-2xl hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleStatusUpdate(selectedUser, 'rejected')}
                                disabled={processing || !rejectionReason.trim()}
                                className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all disabled:opacity-50 shadow-lg shadow-rose-600/20"
                            >
                                {processing ? 'Rejecting...' : 'Reject Partner'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
