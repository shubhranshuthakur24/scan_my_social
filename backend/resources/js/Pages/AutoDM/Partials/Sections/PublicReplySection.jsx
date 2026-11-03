import InputError from '@/Components/InputError';
import { ClipboardCopy, MessageSquare, Plus, Trash2 } from 'lucide-react';
import Icon from '@/Components/Icon';

export default function PublicReplySection({ form, publicReply, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const replyPlaceholder = 'Check your inbox, you are in!';
    const limitPlaceholder = '200';
    const quickTokens = ['[smile]', '[fire]', '[sparkles]', '[thanks]', '[dm]', '[info]'];
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };
    const appendToken = (currentText, index) => {
        const token = quickTokens[index % quickTokens.length];
        const base = String(currentText || '').trimEnd();
        return base ? `${base} ${token}` : token;
    };

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('public_reply')}
            onFocusCapture={() => preview.setScene('public_reply')}
        >
            <div className="flex w-full items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">4. Public Reply To Comment</h3>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Required for post/reel
                </span>
            </div>

            <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">
                    Step 1 runs before DM delivery. Max {publicReply.maxPublicCommentReplies} variants; one is chosen at random for each matched comment.
                </p>
                <p className="text-xs text-slate-500">
                    First {publicReply.minSystemPublicCommentReplies} comments are system-generated defaults. You can edit them, but cannot delete them.
                </p>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Reply Variants</p>
                        <p className="text-xs font-semibold text-slate-500">
                            {publicReply.publicReplyCount}/{publicReply.maxPublicCommentReplies}
                        </p>
                    </div>

                    {form.data.public_comment_reply.map((message, index) => (
                        <div
                            key={`public-comment-reply-${index}`}
                            onClick={() => publicReply.selectPublicReplyVariant(index)}
                            className={`rounded-xl border bg-white p-3 transition-colors ${
                                publicReply.activePublicReplyIndex === index
                                    ? 'border-primary-400 ring-1 ring-primary-200'
                                    : 'border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <p className="inline-flex shrink-0 items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Comment {index + 1}
                                    <MessageSquare className="h-3.5 w-3.5" />
                                </p>
                                <div className="relative min-w-0 flex-1">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => publicReply.setPublicReplyVariant(index, e.target.value)}
                                        onFocus={() => publicReply.selectPublicReplyVariant(index)}
                                        placeholder={replyPlaceholder}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => publicReply.setPublicReplyVariant(index, appendToken(message, index))}
                                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                        title="Add token"
                                        aria-label="Add token"
                                    >
                                        <span aria-hidden="true" className="text-[10px] leading-none">+tag</span>
                                    </button>
                                </div>
                                {index < publicReply.minSystemPublicCommentReplies ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-700">
                                        <Icon name="bot" size={12} />
                                        System
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => publicReply.removePublicReplyVariant(index)}
                                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-red-600 transition-colors duration-200 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Remove
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={publicReply.addPublicReplyVariant}
                        disabled={!publicReply.canAddPublicReply}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Public Reply
                    </button>
                    <p className="text-xs text-slate-500">
                        Add one optional extra comment (up to {publicReply.maxPublicCommentReplies} total).
                    </p>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Limit Public Replies</p>
                            <button
                                type="button"
                                onClick={() => form.setData('public_reply_limit_enabled', !form.data.public_reply_limit_enabled)}
                                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none ${form.data.public_reply_limit_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                aria-pressed={form.data.public_reply_limit_enabled}
                                aria-label="Toggle public reply limit"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${form.data.public_reply_limit_enabled ? 'translate-x-5' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        {form.data.public_reply_limit_enabled && (
                            <div className="mt-3">
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.data.public_reply_limit_count}
                                        onChange={(e) => form.setData('public_reply_limit_count', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                        placeholder={limitPlaceholder}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => form.setData('public_reply_limit_count', insertPlaceholder(String(form.data.public_reply_limit_count || ''), limitPlaceholder))}
                                        className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                        title="Insert placeholder"
                                        aria-label="Insert placeholder"
                                    >
                                        <ClipboardCopy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <InputError message={form.errors.public_reply_enabled} className="mt-2" />
                <InputError message={form.errors.public_comment_reply} className="mt-2" />
                <InputError message={form.errors.public_reply_limit_count} className="mt-2" />
            </div>
        </div>
    );
}
