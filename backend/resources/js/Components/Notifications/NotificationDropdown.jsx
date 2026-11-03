import React, { useEffect, useState, useCallback, useRef } from 'react';
import Icon from '@/Components/Icon';
import { Link, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const normalizeNotification = (notification) => {
    const payload = notification?.data && typeof notification.data === 'object'
        ? notification.data
        : notification;

    return {
        id: notification?.id ?? payload?.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: notification?.type ?? payload?.type ?? 'app.notification',
        read_at: notification?.read_at ?? null,
        created_at: notification?.created_at ?? payload?.created_at ?? new Date().toISOString(),
        data: {
            title: payload?.title ?? 'Notification',
            message: payload?.message ?? 'You have a new update.',
            type: payload?.type ?? 'info',
            action_url: payload?.action_url ?? null,
            extra_data: payload?.extra_data ?? {},
        },
    };
};

const NotificationItem = ({ notification, onMarkAsRead, onDelete }) => {
    const iconMap = {
        info: <Icon name="info" size={16} className="text-blue-500" />,
        success: <Icon name="success" size={16} className="text-emerald-500" />,
        warning: <Icon name="warning" size={16} className="text-amber-500" />,
        error: <Icon name="error" size={16} className="text-rose-500" />,
    };

    const typeClasses = {
        info: 'bg-blue-50',
        success: 'bg-emerald-50',
        warning: 'bg-amber-50',
        error: 'bg-rose-50',
    };

    const data = notification.data || {};
    const createdAt = new Date(notification.created_at);
    const createdAtLabel = Number.isNaN(createdAt.getTime())
        ? 'just now'
        : formatDistanceToNow(createdAt, { addSuffix: true });

    return (
        <div className={`group relative p-4 transition-colors hover:bg-slate-50 ${!notification.read_at ? 'bg-primary-50/30' : ''}`}>
            <div className="flex gap-3">
                <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeClasses[data.type || 'info']}`}>
                    {iconMap[data.type || 'info']}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-bold leading-tight truncate ${!notification.read_at ? 'text-slate-900' : 'text-slate-600'}`}>
                            {data.title}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 whitespace-nowrap mt-0.5">
                            {createdAtLabel}
                        </p>
                    </div>
                    <p className={`mt-1 text-xs leading-relaxed ${!notification.read_at ? 'text-slate-700' : 'text-slate-500'}`}>
                        {data.message}
                    </p>
 
                    <div className="mt-3 flex items-center gap-3">
                        {data.action_url && (
                            <Link
                                href={data.action_url}
                                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-primary-600 hover:text-primary-700"
                            >
                                <Icon name="externalLink" size={12} />
                                View Details
                            </Link>
                        )}
                        {!notification.read_at && (
                            <button
                                onClick={() => onMarkAsRead(notification.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-700"
                            >
                                <Icon name="check" size={12} />
                                Mark as Read
                            </button>
                        )}
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onDelete(notification.id)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Delete notification"
                    >
                        <Icon name="trash" size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

let hasLoggedEchoFallback = false;

export default function NotificationDropdown() {
    const { auth } = usePage().props;
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const liveNotificationsRef = useRef([]);
    const consecutiveErrorsRef = useRef(0);
    const skippedTicksRef = useRef(0);
    const pollingIntervalSeconds = Number(import.meta.env.VITE_NOTIFICATIONS_POLL_SECONDS ?? 45);
    const pollingIntervalMs = Number.isFinite(pollingIntervalSeconds) && pollingIntervalSeconds > 0
        ? Math.max(10000, pollingIntervalSeconds * 1000)
        : 45000;

    const fetchNotifications = useCallback(async () => {
        if (typeof document !== 'undefined' && document.hidden) {
            return;
        }

        try {
            const response = await axios.get(route('notifications.index'));
            consecutiveErrorsRef.current = 0;
            skippedTicksRef.current = 0;
            const list = Array.isArray(response?.data?.notifications?.data)
                ? response.data.notifications.data.map(normalizeNotification)
                : [];

            setNotifications(list);
            liveNotificationsRef.current = list;
            setUnreadCount(Number(response?.data?.unread_count ?? 0));
        } catch (error) {
            consecutiveErrorsRef.current = Math.min(6, consecutiveErrorsRef.current + 1);
            console.error('Failed to fetch notifications', error);
        }
    }, []);

    useEffect(() => {
        liveNotificationsRef.current = notifications;
    }, [notifications]);

    useEffect(() => {
        fetchNotifications();

        if (window.Echo) {
            const channel = window.Echo.private(`App.Models.User.${auth.user.id}`);

            channel.notification((incomingNotification) => {
                const notification = normalizeNotification(incomingNotification);
                const isDuplicate = liveNotificationsRef.current.some((item) => item.id === notification.id);
                if (isDuplicate) {
                    return;
                }

                setNotifications((previousNotifications) => [notification, ...previousNotifications].slice(0, 100));
                if (!notification.read_at) {
                    setUnreadCount((previousCount) => previousCount + 1);
                }
            });
        } else if (!hasLoggedEchoFallback) {
            hasLoggedEchoFallback = true;
            console.info('[Notifications] Real-time updates (Echo) not available. Falling back to active polling.');
        }

        return () => {
            if (window.Echo) {
                window.Echo.leave(`App.Models.User.${auth.user.id}`);
            }
        };
    }, [auth.user.id, fetchNotifications]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (typeof document !== 'undefined' && document.hidden) {
                return;
            }

            if (consecutiveErrorsRef.current > 0) {
                const backoffFactor = Math.pow(2, consecutiveErrorsRef.current);
                skippedTicksRef.current += 1;
                if (skippedTicksRef.current < backoffFactor) {
                    return;
                }
                skippedTicksRef.current = 0;
            }

            fetchNotifications();
        }, pollingIntervalMs);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [fetchNotifications, pollingIntervalMs]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        fetchNotifications();
    }, [isOpen, fetchNotifications]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAsRead = async (id) => {
        try {
            await axios.post(route('notifications.read', id));
            setNotifications((previousNotifications) => {
                let decremented = false;
                const updatedNotifications = previousNotifications.map((notification) => {
                    if (notification.id !== id || notification.read_at) {
                        return notification;
                    }

                    decremented = true;

                    return {
                        ...notification,
                        read_at: new Date().toISOString(),
                    };
                });

                if (decremented) {
                    setUnreadCount((previousCount) => Math.max(0, previousCount - 1));
                }

                return updatedNotifications;
            });
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.post(route('notifications.read-all'));
            setNotifications((previousNotifications) => previousNotifications.map((notification) => ({
                ...notification,
                read_at: notification.read_at ?? new Date().toISOString(),
            })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all as read', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await axios.delete(route('notifications.destroy', id));
            setNotifications((previousNotifications) => {
                const targetNotification = previousNotifications.find((notification) => notification.id === id);
                const filteredNotifications = previousNotifications.filter((notification) => notification.id !== id);

                if (targetNotification && !targetNotification.read_at) {
                    setUnreadCount((previousCount) => Math.max(0, previousCount - 1));
                }

                return filteredNotifications;
            });
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 focus:outline-none ring-1 ring-slate-200 shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle notifications"
            >
                <Icon name="bell" size={20} strokeWidth={2.2} className={unreadCount > 0 ? 'animate-bell-swing' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary-600 text-[9px] font-black leading-none text-white ring-2 ring-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute right-0 top-full z-[100] mt-3 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-primary-900/10"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/50">
                            <div>
                                <h3 className="text-sm font-black tracking-tight text-slate-900 uppercase">Notifications</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                    {unreadCount} UNREAD MESSAGES
                                </p>
                            </div>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-black text-primary-600 hover:text-primary-700 uppercase tracking-wider transition-colors"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
                            {notifications.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {notifications.map((notification) => (
                                        <NotificationItem
                                            key={notification.id}
                                            notification={notification}
                                            onMarkAsRead={markAsRead}
                                            onDelete={deleteNotification}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Icon name="inbox" size={32} className="text-slate-300" />
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">All caught up!</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        No new notifications at the moment.
                                    </p>
                                </div>
                            )}
                        </div>


                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
