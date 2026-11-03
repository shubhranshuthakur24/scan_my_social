import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import KpiCard from '@/Components/common/KpiCard';
import WorkbenchCalendar from '@/Components/common/WorkbenchCalendar';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import InstagramAccountSelector from '@/Components/Instagram/InstagramAccountSelector';
import useInstagramSelectedAccount from '@/Components/Instagram/useInstagramSelectedAccount';
import InstagramDisconnectModal from '@/Components/Instagram/InstagramDisconnectModal';
import InstagramDisconnectedHero from '@/Components/Instagram/InstagramDisconnectedHero';
import InstagramNotConnectedEmptyState from '@/Components/Instagram/InstagramNotConnectedEmptyState';
import Modal from '@/Components/Modal';
import { Head, router } from '@inertiajs/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Clock3, Send, AlertTriangle, CheckCircle2, LoaderCircle, Trash2, CalendarPlus, Clapperboard, Film, NotebookPen, Pencil, Eye, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    SchedulerModalOverlay,
    SchedulerModalShell,
} from './ContentSchedulerModalShell';

const statusClasses = {
    draft: 'border-slate-200 bg-slate-50 text-slate-600',
    scheduled: 'border-sky-200 bg-sky-50 text-sky-700',
    publishing: 'border-warning-200 bg-warning-50 text-warning-700',
    published: 'border-success-200 bg-success-50 text-success-700',
    failed: 'border-error-200 bg-error-50 text-error-700',
    cancelled: 'border-slate-200 bg-white text-slate-400',
};

const metricCards = [
    ['scheduled', 'Scheduled', Clock3, 'sky'],
    ['publishing', 'In Queue', LoaderCircle, 'warning'],
    ['published', 'Published', CheckCircle2, 'success'],
    ['failed', 'Failed', AlertTriangle, 'danger'],
];

const statusMeta = {
    draft: { label: 'Draft', stripe: 'bg-slate-200 text-slate-700' },
    scheduled: { label: 'Scheduled', stripe: 'bg-sky-100 text-sky-800' },
    publishing: { label: 'Publishing', stripe: 'bg-warning-100 text-warning-800' },
    published: { label: 'Posted', stripe: 'bg-emerald-100 text-emerald-800' },
    failed: { label: 'Failed', stripe: 'bg-rose-100 text-rose-800' },
    cancelled: { label: 'Cancelled', stripe: 'bg-slate-100 text-slate-500' },
};

const localMonthValue = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');

    return `${date.getFullYear()}-${month}`;
};

const localDateValue = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${date.getFullYear()}-${month}-${day}`;
};

const formatTime = (dateString) => {
    if (!dateString) {
        return '--';
    }

    return new Date(dateString).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
    });
};

const formatDateTime = (dateString) => {
    if (!dateString) {
        return null;
    }

    return new Date(dateString).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

export default function Calendar({
    calendar_month,
    calendar_today = '',
    instagram_accounts = [],
    selected_instagram_account_id = null,
    has_active_account = true,
    disconnectToast = null,
    connected_count = 0,
    can_connect_more = false,
    events = [],
    scheduler_notes = [],
    status_counts = {},
}) {
    const maxInstaCards = 5;
    const accountList = Array.isArray(instagram_accounts) ? instagram_accounts : [];
    const hasActiveAccount =
        Boolean(has_active_account) &&
        accountList.some((account) => account.status === 'active');
    const [showDisconnectModal, setShowDisconnectModal] = useState(false);

    useEffect(() => {
        if (!disconnectToast?.message || !disconnectToast?.account_id) {
            return;
        }

        const fingerprint = `${disconnectToast.account_id}:${disconnectToast.updated_at || 'unknown'}`;
        const storageKey = `calendar:disconnect-modal:${fingerprint}`;

        try {
            if (window.sessionStorage.getItem(storageKey)) {
                return;
            }

            window.sessionStorage.setItem(storageKey, '1');
        } catch (error) {
            // Ignore storage errors.
        }

        setShowDisconnectModal(true);
    }, [disconnectToast]);

    const effectiveConnectedCount = Number.isFinite(Number(connected_count))
        ? Number(connected_count)
        : accountList.length;
    const accountConnectHref = can_connect_more
        ? route('settings', { tab: 'integration' }, false)
        : route('settings.upgrade', [], false);
    const {
        selectedAccountId,
        selectAccount,
    } = useInstagramSelectedAccount({
        accounts: accountList,
        initialSelectedAccountId: selected_instagram_account_id,
        preferStored: true,
        requireActive: true,
    });
    const [contextMenu, setContextMenu] = useState(null);
    const [contextMenuWarning, setContextMenuWarning] = useState('');
    const [noteEditor, setNoteEditor] = useState(null);
    const [previewNote, setPreviewNote] = useState(null);
    const [previewPost, setPreviewPost] = useState(null);
    const [isSavingNote, setIsSavingNote] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({
        show: false,
        type: null,
        item: null,
        isLoading: false,
    });

    const postEvents = useMemo(() => events
        .filter((event) => event.scheduled_at)
        .map((event) => ({
            id: String(event.id),
            title: event.title,
            start: event.scheduled_at,
            classNames: ['content-scheduler-event', `content-scheduler-event-${event.status}`],
            extendedProps: event,
        })), [events]);

    const noteEvents = useMemo(() => scheduler_notes.map((note) => ({
        id: `note-${note.id}`,
        title: note.content,
        start: note.note_date,
        allDay: true,
        classNames: ['content-scheduler-note'],
        extendedProps: {
            ...note,
            is_scheduler_note: true,
        },
    })), [scheduler_notes]);

    const calendarEvents = useMemo(() => [...noteEvents, ...postEvents], [noteEvents, postEvents]);
    const datesWithContent = useMemo(() => new Set([
        ...postEvents.map((event) => String(event.start).slice(0, 10)),
        ...noteEvents.map((event) => String(event.start).slice(0, 10)),
    ]), [noteEvents, postEvents]);
    const referenceToday = calendar_today || localDateValue(new Date());

    const changeMonth = (info) => {
        if (info.view.type !== 'dayGridMonth') {
            return;
        }

        const nextMonth = localMonthValue(info.view.currentStart);

        if (nextMonth !== calendar_month) {
            router.get(route('instagram.calendar'), {
                month: nextMonth,
                instagram_account_id: selectedAccountId || '',
            }, {
                preserveScroll: true,
                replace: true,
            });
        }
    };

    const switchAccount = useCallback((nextAccountId) => {
        selectAccount(nextAccountId);
    }, [selectAccount]);

    const closeContextMenu = () => {
        setContextMenu(null);
        setContextMenuWarning('');
    };

    const openScheduleWizard = (format) => {
        if (!contextMenu) {
            return;
        }

        if (contextMenu.isPast) {
            setContextMenuWarning('Cannot schedule posts for past dates');

            return;
        }

        closeContextMenu();
        router.get(route('instagram.schedule'), {
            date: contextMenu.date,
            format,
            instagram_account_id: selectedAccountId || '',
        });
    };

    const openNoteEditor = (date, note = null) => {
        closeContextMenu();
        setNoteEditor({
            id: note?.id || null,
            date,
            content: note?.content || '',
        });
    };

    const closeNoteEditor = () => {
        if (isSavingNote) {
            return;
        }

        setNoteEditor(null);
    };

    const openNotePreview = (note) => {
        setPreviewNote(note);
    };

    const closeNotePreview = () => {
        setPreviewNote(null);
    };

    const saveNote = () => {
        if (!noteEditor || isSavingNote) {
            return;
        }

        const content = noteEditor.content.trim();
        if (content.length === 0) {
            return;
        }

        setIsSavingNote(true);

        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setNoteEditor(null);
            },
            onFinish: () => {
                setIsSavingNote(false);
            },
        };

        if (noteEditor.id) {
            router.patch(route('instagram.notes.update', noteEditor.id), {
                content,
            }, requestOptions);

            return;
        }

        router.post(route('instagram.notes.store'), {
            note_date: noteEditor.date,
            content,
        }, requestOptions);
    };

    const requestDeleteNote = (note) => {
        setDeleteDialog({
            show: true,
            type: 'note',
            item: note,
            isLoading: false,
        });
    };

    const requestDeletePost = (post) => {
        setDeleteDialog({
            show: true,
            type: 'post',
            item: post,
            isLoading: false,
        });
    };

    const closeDeleteDialog = () => {
        if (deleteDialog.isLoading) {
            return;
        }

        setDeleteDialog({
            show: false,
            type: null,
            item: null,
            isLoading: false,
        });
    };

    const confirmDelete = () => {
        if (!deleteDialog.show || !deleteDialog.item || deleteDialog.isLoading) {
            return;
        }

        setDeleteDialog((current) => ({
            ...current,
            isLoading: true,
        }));

        const requestOptions = {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setDeleteDialog({
                    show: false,
                    type: null,
                    item: null,
                    isLoading: false,
                });
            },
            onFinish: () => {
                setDeleteDialog((current) => {
                    if (!current.show) {
                        return current;
                    }

                    return {
                        ...current,
                        isLoading: false,
                    };
                });
            },
        };

        if (deleteDialog.type === 'post') {
            router.patch(route('instagram.posts.cancel', deleteDialog.item.id), {}, requestOptions);

            return;
        }

        router.delete(route('instagram.notes.destroy', deleteDialog.item.id), requestOptions);
    };

    const openPostPreview = (event) => {
        setPreviewPost(event);
    };

    const closePostPreview = () => {
        setPreviewPost(null);
    };

    useEffect(() => {
        if (!contextMenu) {
            return undefined;
        }

        const close = () => closeContextMenu();

        window.addEventListener('click', close);
        window.addEventListener('resize', close);
        window.addEventListener('scroll', close, true);
        window.addEventListener('keydown', close);

        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('resize', close);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('keydown', close);
        };
    }, [contextMenu]);

    const lastRequestedAccountIdRef = useRef(null);

    useEffect(() => {
        if (!hasActiveAccount) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        const localSelectedAccountId = Number(selectedAccountId || 0);
        const serverAccountId = Number(selected_instagram_account_id || 0);

        if (localSelectedAccountId <= 0 || localSelectedAccountId === serverAccountId) {
            lastRequestedAccountIdRef.current = null;
            return;
        }

        if (lastRequestedAccountIdRef.current === localSelectedAccountId) {
            return;
        }

        lastRequestedAccountIdRef.current = localSelectedAccountId;

        router.get(route('instagram.calendar'), {
            month: calendar_month,
            instagram_account_id: localSelectedAccountId,
        }, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }, [calendar_month, hasActiveAccount, selectedAccountId, selected_instagram_account_id]);

    return (
        <AuthenticatedLayout
            topbarTitle="Publishing Calendar"
            topbarDescription="Plan, inspect, and recover Instagram posts across every scheduled date."
            
        >

            <Head title="Content Scheduler Calendar" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                {!hasActiveAccount ? (
                    accountList.length === 0 && !disconnectToast?.account_id ? (
                        <InstagramNotConnectedEmptyState
                            description="Connect an Instagram account first, then plan, inspect, and recover posts on your publishing calendar."
                            connectHref={accountConnectHref}
                        />
                    ) : (
                        <InstagramDisconnectedHero
                            username={
                                disconnectToast?.username ||
                                accountList.find((a) => a.id === selectedAccountId)?.username ||
                                accountList[0]?.username
                            }
                            reconnectAccountId={
                                disconnectToast?.account_id ||
                                selectedAccountId ||
                                accountList[0]?.id
                            }
                            actionText="plan, schedule, and publish posts"
                        />
                    )
                ) : (
                    <>
                        {disconnectToast?.account_id && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-900">Instagram Account Disconnected</h3>
                                            <p className="mt-1 text-xs font-semibold text-slate-600">
                                                ScanMySocial is no longer authorized to connect to {disconnectToast.username ? `@${disconnectToast.username.replace(/^@+/, '')}` : 'your account'}. Reconnect to schedule and publish posts.
                                            </p>
                                        </div>
                                    </div>
                                    <a
                                        href={route('social-integrations.instagram.connect', {
                                            reconnect_account_id: disconnectToast.account_id,
                                        })}
                                        className="inline-flex h-9 items-center justify-center rounded-xl bg-amber-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shrink-0"
                                    >
                                        Reconnect Account
                                    </a>
                                </div>
                            </div>
                        )}
                        <InstagramAccountSelector
                            accounts={accountList}
                            selectedAccountId={selectedAccountId}
                            connectedCount={effectiveConnectedCount}
                            maxCards={maxInstaCards}
                            canConnectMore={can_connect_more}
                            connectHref={accountConnectHref}
                            onSelect={switchAccount}
                        />
                        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {metricCards.map(([key, label, Icon, variant]) => (
                        <KpiCard
                            key={key}
                            label={label}
                            value={status_counts[key] || 0}
                            icon={Icon}
                            variant={variant}
                        />
                    ))}
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                    {postEvents.length === 0 && noteEvents.length === 0 && (
                        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-black text-slate-900">No scheduled posts on this calendar yet</p>
                                <p className="mt-1 text-sm font-semibold text-slate-500">Pick a date from the visible calendar or create a scheduled Instagram post.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.visit(route('instagram.schedule', { instagram_account_id: selectedAccountId || '' }))}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-primary-600/25 transition hover:bg-primary-700"
                            >
                                <Send className="h-4 w-4" />
                                Schedule Post
                            </button>
                        </div>
                    )}

                    <WorkbenchCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        className="content-scheduler-calendar"
                        initialView="dayGridMonth"
                        initialDate={`${calendar_month}-01`}
                        events={calendarEvents}
                        height="auto"
                        fixedWeekCount={false}
                        showNonCurrentDates
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek,dayGridDay',
                        }}
                        datesSet={changeMonth}
                        dayCellDidMount={(arg) => {
                            const handler = (mouseEvent) => {
                                mouseEvent.preventDefault();
                                const date = arg.el.getAttribute('data-date') || localDateValue(arg.date);
                                const nextMenu = {
                                    date,
                                    isPast: date < referenceToday,
                                    x: Math.min(mouseEvent.clientX, window.innerWidth - 260),
                                    y: Math.min(mouseEvent.clientY, window.innerHeight - 240),
                                };

                                setContextMenu(nextMenu);
                                setContextMenuWarning(nextMenu.isPast ? 'Cannot schedule posts for past dates' : '');
                            };

                            arg.el.addEventListener('contextmenu', handler);
                            arg.el.__schedulerContextMenuHandler = handler;

                            const date = arg.el.getAttribute('data-date') || localDateValue(arg.date);
                            if (date < referenceToday) {
                                arg.el.classList.add('scheduler-day-past');
                            } else {
                                arg.el.classList.remove('scheduler-day-past');
                            }
                            if (datesWithContent.has(date)) {
                                return;
                            }

                            const frame = arg.el.querySelector('.fc-daygrid-day-frame');
                            if (!frame) {
                                return;
                            }

                            const hint = document.createElement('div');
                            hint.className = 'scheduler-empty-hint';
                            hint.textContent = 'Right-click to schedule content or create notes';
                            frame.appendChild(hint);
                            arg.el.__schedulerEmptyHint = hint;
                        }}
                        dayCellWillUnmount={(arg) => {
                            const handler = arg.el.__schedulerContextMenuHandler;
                            const hint = arg.el.__schedulerEmptyHint;

                            if (typeof handler === 'function') {
                                arg.el.removeEventListener('contextmenu', handler);
                            }
                            if (hint && hint.parentNode) {
                                hint.parentNode.removeChild(hint);
                            }

                            delete arg.el.__schedulerContextMenuHandler;
                            delete arg.el.__schedulerEmptyHint;
                        }}
                        eventContent={(eventInfo) => {
                            const event = eventInfo.event.extendedProps;

                            if (event.is_scheduler_note) {
                                return (
                                    <div className="scheduler-note-card min-w-0 rounded-lg border border-amber-200 bg-amber-50/80 p-2">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-800">
                                                Note
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(mouseEvent) => {
                                                        mouseEvent.preventDefault();
                                                        mouseEvent.stopPropagation();
                                                        openNotePreview(event);
                                                    }}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                                                    title="View note"
                                                    aria-label="View note"
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(mouseEvent) => {
                                                        mouseEvent.preventDefault();
                                                        mouseEvent.stopPropagation();
                                                        openNoteEditor(event.note_date, event);
                                                    }}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-white text-amber-700 transition hover:bg-amber-100"
                                                    title="Edit note"
                                                    aria-label="Edit note"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(mouseEvent) => {
                                                        mouseEvent.preventDefault();
                                                        mouseEvent.stopPropagation();
                                                        requestDeleteNote(event);
                                                    }}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                                    title="Delete note"
                                                    aria-label="Delete note"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-1 line-clamp-3 text-[11px] font-semibold leading-4 text-amber-900">
                                            {event.content}
                                        </p>
                                    </div>
                                );
                            }

                            const status = statusMeta[event.status] || statusMeta.draft;
                            const timeLabel = formatTime(event.published_at || event.scheduled_at);
                            const formatLabel = event.format ? `${event.format.charAt(0).toUpperCase()}${event.format.slice(1)}` : 'Post';

                            return (
                                <div className={`scheduler-calendar-card min-w-0 overflow-hidden rounded-xl border ${statusClasses[event.status] || statusClasses.draft}`}>
                                    <div className={`px-2 py-1 text-center text-[10px] font-black uppercase tracking-wide ${status.stripe}`}>
                                        {status.label}
                                    </div>
                                    <div className="space-y-2 px-2 py-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-black text-slate-700">
                                                {formatLabel}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-600">{timeLabel}</span>
                                        </div>
                                        <p className="line-clamp-2 text-[12px] font-black leading-4 text-slate-900">
                                            {event.title}
                                        </p>
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-[10px] font-bold text-slate-500">
                                                @{event.instagram_account?.username || 'account'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(mouseEvent) => {
                                                        mouseEvent.preventDefault();
                                                        mouseEvent.stopPropagation();
                                                        openPostPreview(event);
                                                    }}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
                                                    title="Preview post"
                                                    aria-label={`Preview ${event.title}`}
                                                >
                                                    <Eye className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(mouseEvent) => {
                                                        mouseEvent.preventDefault();
                                                        mouseEvent.stopPropagation();
                                                        requestDeletePost(event);
                                                    }}
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-rose-200 bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                                                    title="Delete post"
                                                    aria-label={`Delete ${event.title}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }}
                    />
                </section>
            </>
        )}

                {contextMenu && (
                    <div
                        className="fixed z-[80] w-56 rounded-xl border border-slate-700/40 bg-slate-900/95 p-2 shadow-2xl"
                        style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={() => openNoteEditor(contextMenu.date)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-100 transition hover:bg-slate-700/80"
                        >
                            <NotebookPen className="h-4 w-4" />
                            Create Note
                        </button>
                        {[
                            ['Schedule Post', 'image', CalendarPlus],
                            ['Schedule Story', 'story', Film],
                            ['Schedule Reel', 'reel', Clapperboard],
                        ].map(([label, format, Icon]) => (
                            <button
                                key={label}
                                type="button"
                                onClick={() => openScheduleWizard(format)}
                                disabled={contextMenu.isPast}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-slate-100 transition hover:bg-slate-700/80 disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </button>
                        ))}

                        {contextMenuWarning && (
                            <p className="mt-2 rounded-lg bg-slate-800 px-2 py-1.5 text-xs font-semibold text-slate-200">
                                {contextMenuWarning}
                            </p>
                        )}
                    </div>
                )}

                {noteEditor && (
                    <SchedulerModalOverlay zIndexClass="z-[400]" className="bg-slate-900/50">
                        <SchedulerModalShell
                            className="max-w-md"
                            title={noteEditor.id ? 'Edit Note' : 'Create Note'}
                            description={noteEditor.date}
                            icon={NotebookPen}
                            onClose={closeNoteEditor}
                            closeDisabled={isSavingNote}
                            closeLabel="Close note editor"
                            footer={(
                                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={closeNoteEditor}
                                        disabled={isSavingNote}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={saveNote}
                                        disabled={isSavingNote || noteEditor.content.trim().length === 0}
                                    >
                                        {isSavingNote ? 'Saving...' : 'Save Note'}
                                    </Button>
                                </div>
                            )}
                        >
                            <textarea
                                value={noteEditor.content}
                                onChange={(event) => setNoteEditor((current) => ({
                                    ...current,
                                    content: event.target.value,
                                }))}
                                rows={5}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                                placeholder="Write your note..."
                                maxLength={1500}
                            />
                        </SchedulerModalShell>
                    </SchedulerModalOverlay>
                )}

                <Modal show={Boolean(previewNote)} maxWidth="lg" onClose={closeNotePreview} zIndexClass="z-[400]">
                    {previewNote && (
                        <SchedulerModalShell
                            className="max-w-none border-0 shadow-none"
                            bodyClassName="bg-amber-50/40"
                            title="View Note"
                            description={previewNote.note_date}
                            icon={NotebookPen}
                            onClose={closeNotePreview}
                            closeLabel="Close note preview"
                        >
                            <article className="space-y-4 rounded-2xl border border-amber-200 bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-amber-800">
                                        Note
                                    </span>
                                    {previewNote.updated_at && (
                                        <span className="text-xs font-semibold text-slate-500">
                                            Updated {formatDateTime(previewNote.updated_at)}
                                        </span>
                                    )}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-6 text-slate-700">
                                        {previewNote.content}
                                    </p>
                                </div>

                                {previewNote.created_at && (
                                    <p className="text-xs font-semibold text-slate-400">
                                        Created {formatDateTime(previewNote.created_at)}
                                    </p>
                                )}
                            </article>
                        </SchedulerModalShell>
                    )}
                </Modal>

                <Modal show={Boolean(previewPost)} maxWidth="2xl" onClose={closePostPreview} zIndexClass="z-[400]">
                    {previewPost && (
                        <SchedulerModalShell
                            className="max-w-none border-0 shadow-none"
                            bodyClassName="bg-slate-50"
                            title="Post Preview"
                            description="Review the scheduled account, media, caption, and tags."
                            icon={Eye}
                            onClose={closePostPreview}
                            closeLabel="Close post preview"
                        >
                            <article className="mx-auto w-full max-w-[420px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-3 px-4 py-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-black uppercase text-slate-700">
                                        {(previewPost.instagram_account?.username || 'ac').slice(0, 2)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-black text-slate-900">@{previewPost.instagram_account?.username || 'account'}</p>
                                        <p className="text-xs font-semibold text-slate-400">
                                            {previewPost.published_at ? 'Published' : 'Scheduled'} - {formatTime(previewPost.published_at || previewPost.scheduled_at)}
                                        </p>
                                    </div>
                                </div>

                                <div className="aspect-[4/5] bg-slate-100">
                                    {previewPost.media?.[0]?.url ? (
                                        previewPost.media[0].media_type === 'video' ? (
                                            <video src={previewPost.media[0].url} className="h-full w-full object-cover" controls />
                                        ) : (
                                            <img src={previewPost.media[0].url} alt={previewPost.title} className="h-full w-full object-cover" />
                                        )
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                                            No media preview
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2 px-4 py-3">
                                    <p className="break-words text-sm font-semibold text-slate-700">
                                        <span className="mr-1 font-black text-slate-900">@{previewPost.instagram_account?.username || 'account'}</span>
                                        {previewPost.caption || previewPost.title || 'Your post caption preview appears here.'}
                                    </p>
                                    {Array.isArray(previewPost.hashtags) && previewPost.hashtags.length > 0 && (
                                        <p className="break-words text-xs font-black text-primary-700">
                                            {previewPost.hashtags.map((tag) => `#${tag}`).join(' ')}
                                        </p>
                                    )}
                                </div>
                            </article>
                        </SchedulerModalShell>
                    )}
                </Modal>

                <ConfirmDialog
                    show={deleteDialog.show}
                    title={deleteDialog.type === 'post' ? 'Delete this post?' : 'Delete this note?'}
                    message={deleteDialog.type === 'post'
                        ? 'This will cancel the post and remove it from the calendar.'
                        : 'This note will be removed from this date.'}
                    confirmLabel={deleteDialog.type === 'post' ? 'Delete post' : 'Delete note'}
                    cancelLabel="Keep"
                    variant="danger"
                    isLoading={deleteDialog.isLoading}
                    onCancel={closeDeleteDialog}
                    onConfirm={confirmDelete}
                    zIndexClass="z-[410]"
                />
            </div>

            {disconnectToast?.account_id && (
                <InstagramDisconnectModal
                    show={showDisconnectModal}
                    onClose={() => setShowDisconnectModal(false)}
                    username={disconnectToast.username || null}
                    accountId={disconnectToast.account_id}
                />
            )}
        </AuthenticatedLayout>
    );
}
