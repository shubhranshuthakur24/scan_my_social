import InputError from '@/Components/InputError';
import { ClipboardCopy, Plus, RotateCcw, Trash2 } from 'lucide-react';

export default function AdvanceSection({ form, replyVariants, reminder, retrigger = null, preview, leadForms = [] }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const followMessagePlaceholder = 'Please follow us to unlock the reply. Tap the profile button below and then confirm.';
    const reminderMessagePlaceholder = 'Hey, hope you enjoyed the resource. Want more? Reply here and I will send the next one.';
    const reminderMoreMessagePlaceholder = 'Amazing. Tell me what topic you want next and I will send it.';
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };
    const selectedLeadForm = leadForms.find((leadForm) => String(leadForm.id) === String(form.data.lead_form_id || ''));
    const showRetrigger = Boolean(retrigger?.show);
    const retriggerDisabled = Boolean(retrigger?.disabled);
    const retriggerTypeLabel = retrigger?.triggerType === 'reel' ? 'reel' : 'post';
    const insertLeadFormLink = () => {
        if (!selectedLeadForm) {
            return;
        }

        const firstVariant = form.data.reply_messages?.[0] || { message_text: '' };
        const currentText = String(firstVariant.message_text || '').trim();
        if (currentText.includes(selectedLeadForm.public_url)) {
            return;
        }

        const leadFormLine = `Resource Link: ${selectedLeadForm.public_url}`;
        const nextText = currentText !== '' ? `${currentText}\n${leadFormLine}` : leadFormLine;
        replyVariants.setReplyVariantField(0, 'message_text', nextText);
    };

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('dm')}
            onFocusCapture={() => preview.setScene('dm')}
        >
            <div className="flex w-full items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">7. Advance</h3>
            </div>

            <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                        Lead Form Link (Optional)
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                        Attach a published lead form to this flow and insert its public link into your first DM variant.
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                Published Form
                            </label>
                            <select
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                value={String(form.data.lead_form_id || '')}
                                onChange={(event) => form.setData('lead_form_id', event.target.value)}
                            >
                                <option value="">No lead form selected</option>
                                {leadForms.map((leadForm) => (
                                    <option key={leadForm.id} value={leadForm.id}>
                                        {leadForm.title}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.lead_form_id} className="mt-1" />
                        </div>
                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={insertLeadFormLink}
                                disabled={!selectedLeadForm}
                                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Insert Link In DM 1
                            </button>
                        </div>
                    </div>
                </div>

                {showRetrigger && (
                    <div className="rounded-2xl border border-primary-200 bg-primary-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-primary-700 shadow-sm">
                                        <RotateCcw className="h-4 w-4" />
                                    </span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                                            Process Existing Comments
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {retriggerDisabled
                                                ? 'Select a post or reel first, then enable this to scan existing comments when the flow is deployed.'
                                                : `Scan all current comments on this ${retriggerTypeLabel} and immediately send DMs to eligible commenters who match your keywords.`}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!retriggerDisabled) {
                                        retrigger.setEnabled(!retrigger.enabled);
                                    }
                                }}
                                disabled={retriggerDisabled}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none ${retrigger.enabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                                aria-pressed={Boolean(retrigger.enabled)}
                                aria-label="Toggle process existing comments"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${retrigger.enabled ? 'translate-x-5' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                                Ask to Follow Before Sending DM
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Send a follow request prompt with two buttons before your AutoDM reply.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => form.setData('ask_to_follow_enabled', !form.data.ask_to_follow_enabled)}
                            className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 motion-reduce:transition-none ${form.data.ask_to_follow_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            aria-pressed={form.data.ask_to_follow_enabled}
                            aria-label="Toggle ask to follow"
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${form.data.ask_to_follow_enabled ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    {form.data.ask_to_follow_enabled && (
                        <div className="mt-4 space-y-3">
                            <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                Follow Prompt Message
                            </label>
                            <div className="relative">
                                <textarea
                                    maxLength={1000}
                                    className="w-full min-h-[110px] rounded-xl border border-slate-300 bg-white p-3 pr-12 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                    placeholder={followMessagePlaceholder}
                                    value={form.data.ask_to_follow_message}
                                    onChange={(event) => form.setData('ask_to_follow_message', event.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => form.setData('ask_to_follow_message', insertPlaceholder(form.data.ask_to_follow_message, followMessagePlaceholder))}
                                    className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                    title="Insert placeholder"
                                    aria-label="Insert placeholder"
                                >
                                    <ClipboardCopy className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-xs text-slate-500">
                                {form.data.ask_to_follow_message.length}/1000
                            </p>
                            <p className="text-xs text-slate-500">
                                Fixed buttons: <span className="font-semibold">Visit Profile</span> and <span className="font-semibold">Yes, I follow</span>.
                            </p>

                            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                                <div>
                                    <p className="text-xs font-semibold text-slate-700">Follow Strictly</p>
                                    <p className="text-xs text-slate-500">
                                        Check follow status when possible; otherwise wait for confirmation.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => form.setData('ask_to_follow_strict', !form.data.ask_to_follow_strict)}
                                    className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 motion-reduce:transition-none ${form.data.ask_to_follow_strict ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                    aria-pressed={form.data.ask_to_follow_strict}
                                    aria-label="Toggle follow strict mode"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${form.data.ask_to_follow_strict ? 'translate-x-5' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>

                            <InputError message={form.errors.ask_to_follow_message} className="mt-2" />
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
                                Reminder DM (20-23h)
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                Send one follow-up DM inside the 24-hour window to increase replies.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => form.setData('reminder_enabled', !form.data.reminder_enabled)}
                            className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1 motion-reduce:transition-none ${form.data.reminder_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            aria-pressed={form.data.reminder_enabled}
                            aria-label="Toggle reminder DM"
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${form.data.reminder_enabled ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>

                    {form.data.reminder_enabled && (
                        <div className="mt-4 space-y-3">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Send After
                                    </label>
                                    <select
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                        value={String(form.data.reminder_delay_hours || 20)}
                                        onChange={(event) => form.setData('reminder_delay_hours', Number(event.target.value))}
                                    >
                                        <option value="20">20 hours</option>
                                        <option value="21">21 hours</option>
                                        <option value="22">22 hours</option>
                                        <option value="23">23 hours</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Offer URL (Optional)
                                    </label>
                                    <input
                                        type="url"
                                        value={form.data.reminder_offer_url || ''}
                                        onChange={(event) => form.setData('reminder_offer_url', event.target.value)}
                                        placeholder="https://scanmysocial.com/upgrade"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Button 1 (Conversation)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        value={form.data.reminder_primary_button_text || ''}
                                        onChange={(event) => form.setData('reminder_primary_button_text', event.target.value)}
                                        placeholder="Show me more"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Button 2 (Opt-out)
                                    </label>
                                    <input
                                        type="text"
                                        maxLength={30}
                                        value={form.data.reminder_secondary_button_text || ''}
                                        onChange={(event) => form.setData('reminder_secondary_button_text', event.target.value)}
                                        placeholder="Not now"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Follow-up on "Show me more"
                                </label>
                                <div className="relative mt-1">
                                    <textarea
                                        maxLength={1000}
                                        className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white p-3 pr-12 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                        placeholder={reminderMoreMessagePlaceholder}
                                        value={form.data.reminder_more_message || ''}
                                        onChange={(event) => form.setData('reminder_more_message', event.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => form.setData('reminder_more_message', insertPlaceholder(form.data.reminder_more_message, reminderMoreMessagePlaceholder))}
                                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                        title="Insert placeholder"
                                        aria-label="Insert placeholder"
                                    >
                                        <ClipboardCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                        Reminder Variants
                                    </label>
                                    <button
                                        type="button"
                                        onClick={reminder.addReminderMessage}
                                        disabled={(form.data.reminder_messages || []).length >= reminder.maxReminderMessages}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Reminder
                                    </button>
                                </div>

                                {(form.data.reminder_messages || ['']).map((message, index) => (
                                    <div key={`reminder-message-${index}`} className="rounded-xl border border-amber-200 bg-white p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
                                                Reminder {index + 1}
                                            </p>
                                            {(form.data.reminder_messages || []).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => reminder.removeReminderMessage(index)}
                                                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-600 transition-colors duration-200 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <textarea
                                                maxLength={1000}
                                                className="w-full min-h-[90px] rounded-xl border border-slate-300 bg-white p-3 pr-12 text-sm text-slate-900 focus:border-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-1"
                                                placeholder={reminderMessagePlaceholder}
                                                value={message || ''}
                                                onChange={(event) => reminder.setReminderMessage(index, event.target.value)}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => reminder.setReminderMessage(index, insertPlaceholder(message, reminderMessagePlaceholder))}
                                                className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                title="Insert placeholder"
                                                aria-label="Insert placeholder"
                                            >
                                                <ClipboardCopy className="h-4 w-4" />
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{String(message || '').length}/1000</p>
                                    </div>
                                ))}
                            </div>

                            <InputError message={form.errors.reminder_messages} className="mt-2" />
                            <InputError message={form.errors.reminder_delay_hours} className="mt-2" />
                            <InputError message={form.errors.reminder_offer_url} className="mt-2" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
