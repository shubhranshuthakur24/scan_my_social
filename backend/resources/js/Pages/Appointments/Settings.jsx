import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import { useToast } from '@/Contexts/ToastContext';
import { useState } from 'react';
import InputError from '@/Components/InputError';
import { Settings, Sparkles, Calendar, Bell, Sliders, ArrowRight, Globe, FileText, SlidersHorizontal, Save, Clock3 } from 'lucide-react';
import DropdownSelect from '@/Components/common/DropdownSelect';
import BookingAvailabilitySettingsForm from './Partials/BookingAvailabilitySettingsForm';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

const COMMON_TIMEZONES = [
    { value: 'UTC', label: 'Coordinated Universal Time (UTC)' },
    { value: 'America/New_York', label: 'Eastern Time (EST/EDT)' },
    { value: 'America/Chicago', label: 'Central Time (CST/CDT)' },
    { value: 'America/Denver', label: 'Mountain Time (MST/MDT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PST/PDT)' },
    { value: 'Europe/London', label: 'London/Dublin (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris/Berlin/Rome (CET/CEST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Asia/Singapore', label: 'Singapore/Hong Kong (SGT)' },
    { value: 'Asia/Tokyo', label: 'Tokyo/Seoul (JST)' },
    { value: 'Australia/Sydney', label: 'Sydney/Melbourne (AEST/AEDT)' },
];

export default function SettingsPage({ auth, host, bookingAvailability, app_timezone }) {
    const { addToast } = useToast();

    // Helper for notice unit conversions
    const [noticeUnit, setNoticeUnit] = useState(() => {
        const mins = bookingAvailability?.default_minimum_booking_notice_minutes ?? 120;
        if (mins % 1440 === 0) return 'days';
        if (mins % 60 === 0) return 'hours';
        return 'minutes';
    });

    const [noticeVal, setNoticeVal] = useState(() => {
        const mins = bookingAvailability?.default_minimum_booking_notice_minutes ?? 120;
        if (mins % 1440 === 0) return mins / 1440;
        if (mins % 60 === 0) return mins / 60;
        return mins;
    });

    const generalSettingsForm = useForm({
        booking_timezone: bookingAvailability?.booking_timezone || '',
        booking_welcome_message: bookingAvailability?.booking_welcome_message || '',
        default_minimum_booking_notice_minutes: bookingAvailability?.default_minimum_booking_notice_minutes ?? 120,
        default_booking_window_days: bookingAvailability?.default_booking_window_days ?? 60,
    });

    const handleNoticeChange = (val, unit) => {
        const num = Number(val) || 0;
        let mins = num;
        if (unit === 'hours') mins = num * 60;
        if (unit === 'days') mins = num * 1440;
        setNoticeVal(num);
        generalSettingsForm.setData('default_minimum_booking_notice_minutes', mins);
    };

    const [showConfirm, setShowConfirm] = useState(false);

    const submitGeneralSettings = (e) => {
        e.preventDefault();
        setShowConfirm(true);
    };

    const confirmSubmitGeneralSettings = () => {
        setShowConfirm(false);
        generalSettingsForm.patch(route('appointments.settings.general.update'), {
            preserveScroll: true,
            onSuccess: () => addToast('General booking settings saved.', 'success'),
            onError: (errors) => {
                const firstErr = Object.values(errors)[0];
                addToast(firstErr || 'Unable to save general settings.', 'error');
            }
        });
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Availability & Rules"
            topbarDescription="Manage booking configurations, calendar syncing, and host settings."
        >
            <Head title="Availability & Rules" />
            <div className="mx-auto max-w-[1280px] space-y-6">
                
                {/* General Booking Settings Form */}
                <form onSubmit={submitGeneralSettings} className="rounded-brand border border-slate-200 bg-white p-5 shadow-sm space-y-5">
                    <div>
                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                            <SlidersHorizontal className="h-4 w-4 text-primary-600" />
                            General Booking Settings
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            Configure your booking page timezone override, custom welcome message, and default constraints.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Timezone Override */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Globe className="h-3.5 w-3.5" />
                                Booking Timezone
                            </label>
                            <DropdownSelect
                                value={generalSettingsForm.data.booking_timezone}
                                onChange={(val) => generalSettingsForm.setData('booking_timezone', val)}
                                options={[
                                    { value: '', label: `Use Server Default (${app_timezone || 'UTC'})` },
                                    ...COMMON_TIMEZONES
                                ]}
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                Overrides the default timezone for displaying schedules and computing slots.
                            </p>
                            <InputError message={generalSettingsForm.errors.booking_timezone} className="mt-1" />
                        </div>

                        {/* Booking Window */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Calendar className="h-3.5 w-3.5" />
                                Default Booking Window (days)
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={365}
                                value={generalSettingsForm.data.default_booking_window_days}
                                onChange={(e) => generalSettingsForm.setData('default_booking_window_days', Number(e.target.value))}
                                className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                Max number of days into the future clients can book appointments.
                            </p>
                            <InputError message={generalSettingsForm.errors.default_booking_window_days} className="mt-1" />
                        </div>

                        {/* Minimum Booking Notice */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Clock3 className="h-3.5 w-3.5" />
                                Default Minimum Booking Notice
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    value={noticeVal}
                                    onChange={(e) => handleNoticeChange(e.target.value, noticeUnit)}
                                    className="flex-1 rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                />
                                <DropdownSelect
                                    value={noticeUnit}
                                    onChange={(val) => {
                                        setNoticeUnit(val);
                                        handleNoticeChange(noticeVal, val);
                                    }}
                                    buttonClassName="h-[42px] !rounded-brand-sm"
                                    optionsClassName="!left-auto !right-0 min-w-[110px]"
                                    options={[
                                        { value: 'minutes', label: 'Minutes' },
                                        { value: 'hours', label: 'Hours' },
                                        { value: 'days', label: 'Days' }
                                    ]}
                                />
                            </div>
                            <p className="mt-1 text-[11px] text-slate-400">
                                Minimum lead time before an appointment can be booked.
                            </p>
                            <InputError message={generalSettingsForm.errors.default_minimum_booking_notice_minutes} className="mt-1" />
                        </div>

                        {/* Welcome Message */}
                        <div>
                            <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <FileText className="h-3.5 w-3.5" />
                                Custom Welcome Message
                            </label>
                            <textarea
                                value={generalSettingsForm.data.booking_welcome_message}
                                onChange={(e) => generalSettingsForm.setData('booking_welcome_message', e.target.value)}
                                rows={2}
                                placeholder="Choose the meeting type that fits best, then pick an available time."
                                className="w-full rounded-brand-sm border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                            />
                            <p className="mt-1 text-[11px] text-slate-400">
                                Displayed at the top of your public calendar booking landing page.
                            </p>
                            <InputError message={generalSettingsForm.errors.booking_welcome_message} className="mt-1" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={generalSettingsForm.processing || !generalSettingsForm.isDirty}
                            className="inline-flex items-center gap-2 rounded-brand-sm bg-primary-600 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {generalSettingsForm.processing ? 'Saving...' : 'Save General Settings'}
                        </button>
                    </div>
                </form>

                {/* Booking Availability Settings Forms */}
                <BookingAvailabilitySettingsForm bookingAvailability={bookingAvailability} />

                <ConfirmDialog
                    show={showConfirm}
                    title="Save General Booking Settings?"
                    message="Are you sure you want to update your timezone, welcome message, and default scheduling limits?"
                    onConfirm={confirmSubmitGeneralSettings}
                    onCancel={() => setShowConfirm(false)}
                    isLoading={generalSettingsForm.processing}
                />
            </div>
        </AuthenticatedLayout>
    );
}
