import React, { useState, useMemo } from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Icon from '@/Components/Icon';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

export default function Payouts({ payouts, stats }) {
    const [selectedPayout, setSelectedPayout] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [confirmDialog, setConfirmDialog] = useState({
        show: false,
        title: '',
        message: '',
        onConfirm: () => { },
        variant: 'default'
    });

    const statusForm = useForm({
        status: '',
        notes: '',
    });

    const formatRupees = (paisa) => `₹${(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

    const filteredPayouts = useMemo(() => {
        return payouts.filter(p => {
            const matchesSearch = p.user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 p.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (p.razorpay_payout_id && p.razorpay_payout_id.toLowerCase().includes(searchQuery.toLowerCase()));
            
            const matchesStatus = filterStatus === 'all' || p.status === filterStatus;
            
            return matchesSearch && matchesStatus;
        });
    }, [payouts, searchQuery, filterStatus]);

    const handleUpdateStatus = (payout, newStatus) => {
        const isApproval = newStatus === 'approved';
        const variant = newStatus === 'rejected' ? 'danger' : 'warning';

        const title = isApproval ? 'Approve & Initiate Transfer' : 'Reject Payout Request';
        const message = isApproval
            ? `This will immediately initiate a transfer of ${formatRupees(payout.amount)} via NEFT. The wallet will be deducted and status will move to 'Processing' until the bank confirms credit.`
            : `Are you sure you want to reject this payout request for ${formatRupees(payout.amount)}? The user's wallet balance will remain unchanged.`;

        setConfirmDialog({
            show: true,
            title,
            message,
            variant,
            onConfirm: () => {
                statusForm.clearErrors();
                statusForm.transform((data) => ({
                    ...data,
                    status: newStatus,
                }));

                statusForm.patch(route('admin.payouts.update-status', payout.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        setIsDetailModalOpen(false);
                        setSelectedPayout(null);
                        setConfirmDialog(prev => ({ ...prev, show: false }));
                        statusForm.reset();
                    },
                });
            }
        });
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'processing': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'reversed': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'rejected': return 'bg-slate-100 text-slate-700 border-slate-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getRazorpayStatusStyle = (status) => {
        switch (status) {
            case 'processed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'failed': return 'bg-rose-100 text-rose-700 border-rose-200';
            case 'reversed': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'initiated': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Admin - Payout Management" />

            <div className="mx-auto max-w-7xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                                <Icon name="landmark" size={24} />
                            </div>
                            Payout Management
                        </h1>
                        <p className="text-slate-500 font-medium mt-1">Review and process referral bounty withdrawal requests.</p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pending Review</p>
                        <p className="text-3xl font-black text-amber-600">{stats.pending_count}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">In Transit (Processing)</p>
                        <p className="text-3xl font-black text-blue-600">{stats.processing_count}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg text-white">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 text-primary-200">Total Capital Paid Out</p>
                        <p className="text-3xl font-black">{formatRupees(stats.total_paid)}</p>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Icon name="search" size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, email or payout ID..."
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 sm:text-sm transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Filter:</span>
                        <select
                            className="block w-full md:w-48 pl-3 pr-10 py-2 text-sm border-slate-200 focus:outline-none focus:ring-slate-900 focus:border-slate-900 rounded-xl bg-slate-50 font-bold"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Requests</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="paid">Paid</option>
                            <option value="rejected">Rejected</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                </div>

                {/* Payouts Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Requested At</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredPayouts.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-medium italic">
                                            No payout requests matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPayouts.map(payout => (
                                        <tr key={payout.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{payout.user.name}</span>
                                                    <span className="text-xs text-slate-400 font-mono">{payout.user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-black text-slate-800">
                                                {formatRupees(payout.amount)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                                                {new Date(payout.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getStatusStyle(payout.status)}`}>
                                                    {payout.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedPayout(payout); setIsDetailModalOpen(true); }}
                                                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                                                >
                                                    <Icon name="eye" size={14} /> Review Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {isDetailModalOpen && selectedPayout && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-slate-900">Review Payout Request</h3>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(selectedPayout.status)}`}>
                                    {selectedPayout.status}
                                </span>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <Icon name="x" size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested Amount</p>
                                    <p className="text-2xl font-black text-primary-600">{formatRupees(selectedPayout.amount)}</p>
                                </div>
                                <div className="border-l border-slate-200 pl-6">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">User's Current Balance</p>
                                    <p className={`text-xl font-black ${selectedPayout.user.wallet_balance < selectedPayout.amount ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {formatRupees(selectedPayout.user.wallet_balance)}
                                    </p>
                                    {selectedPayout.user.wallet_balance < selectedPayout.amount && selectedPayout.status === 'pending' && (
                                        <p className="text-[8px] text-rose-500 font-bold uppercase mt-1 flex items-center gap-1 animate-pulse">
                                            <Icon name="alert-triangle" size={10} /> Insufficient Balance for Payout
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Requested At</p>
                                    <p className="text-sm font-bold text-slate-600">
                                        {new Date(selectedPayout.created_at).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                {selectedPayout.status !== 'pending' && (
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Processed At</p>
                                        <p className="text-sm font-bold text-slate-600">
                                            {new Date(selectedPayout.updated_at).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                                <div className="flex items-center gap-2 text-slate-400 mb-2">
                                    <Icon name="landmark" size={16} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Bank Destination Details</span>
                                </div>

                                <div className="grid grid-cols-1 gap-y-4">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Account Name</p>
                                        <p className="text-sm font-black text-slate-900">{selectedPayout.bank_details.account_name}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Account Number</p>
                                            <p className="text-sm font-black text-slate-900 font-mono tracking-wider">{selectedPayout.bank_details.account_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">IFSC Code</p>
                                            <p className="text-sm font-black text-slate-900 font-mono uppercase tracking-widest">{selectedPayout.bank_details.ifsc}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RazorpayX Tracking Info */}
                            {selectedPayout.razorpay_payout_id && (
                                <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-3">
                                    <div className="flex items-center gap-2 text-blue-500 mb-2">
                                        <Icon name="creditCard" size={16} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">RazorpayX Transfer Details</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">Payout ID</p>
                                            <p className="text-xs font-black text-blue-800 font-mono">{selectedPayout.razorpay_payout_id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">Transfer Status</p>
                                            <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${getRazorpayStatusStyle(selectedPayout.razorpay_status)}`}>
                                                {selectedPayout.razorpay_status || 'unknown'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Admin Notes */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <Icon name="fileText" size={12} /> Admin Notes / Audit Trail
                                </p>
                                {selectedPayout.status === 'pending' ? (
                                    <textarea
                                        className="w-full bg-slate-50 border-slate-200 rounded-2xl p-4 text-sm focus:ring-slate-900 focus:border-slate-900 transition-all font-medium min-h-[100px]"
                                        placeholder="Add internal notes or rejection reason..."
                                        value={statusForm.notes}
                                        onChange={(e) => statusForm.setData('notes', e.target.value)}
                                    />
                                ) : (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-medium text-slate-600 italic">
                                        {selectedPayout.notes || 'No notes provided for this request.'}
                                    </div>
                                )}
                            </div>

                            {/* Error display */}
                            {selectedPayout.razorpay_error && (
                                <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                                    <div className="flex items-center gap-2 text-rose-500 mb-1">
                                        <Icon name="alert-circle" size={14} />
                                        <p className="text-[10px] font-bold uppercase tracking-tight">Error Logged</p>
                                    </div>
                                    <p className="text-xs font-medium text-rose-700">{selectedPayout.razorpay_error}</p>
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                                {selectedPayout.status === 'pending' && (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleUpdateStatus(selectedPayout, 'approved')}
                                            disabled={selectedPayout.user.wallet_balance < selectedPayout.amount || statusForm.processing}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                        >
                                            <Icon name="checkCircle" size={20} /> Approve & Pay
                                        </button>
                                        <button
                                            onClick={() => handleUpdateStatus(selectedPayout, 'rejected')}
                                            disabled={statusForm.processing}
                                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black px-6 py-4 rounded-2xl transition-all active:scale-[0.98]"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}

                                {selectedPayout.status === 'processing' && (
                                    <div className="text-center p-4 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm border border-blue-100 flex items-center justify-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                        Payout is in transit. Waiting for bank confirmation.
                                    </div>
                                )}

                                {selectedPayout.status === 'paid' && (
                                    <div className="text-center p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-sm border border-emerald-100 flex items-center justify-center gap-2">
                                        <Icon name="checkCircle" size={16} />
                                        Payout successfully credited to user bank account.
                                    </div>
                                )}

                                {(selectedPayout.status === 'failed' || selectedPayout.status === 'reversed') && (
                                    <div className="text-center p-4 bg-rose-50 text-rose-600 rounded-xl font-bold text-sm border border-rose-100">
                                        Payout failed or reversed. Wallet has been refunded.
                                    </div>
                                )}

                                {selectedPayout.status === 'rejected' && (
                                    <div className="text-center p-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-sm border border-slate-200 shadow-inner">
                                        This payout request was rejected.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmDialog
                show={confirmDialog.show}
                title={confirmDialog.title}
                message={confirmDialog.message}
                variant={confirmDialog.variant}
                confirmLabel="Confirm Action"
                isLoading={statusForm.processing}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, show: false }))}
                zIndexClass="z-[410]"
            />
        </AuthenticatedLayout>
    );
}
