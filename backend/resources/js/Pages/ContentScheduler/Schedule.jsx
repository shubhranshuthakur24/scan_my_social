import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import SharedDropdownSelect from '@/Components/common/DropdownSelect';
import EmptyState from '@/Components/EmptyState';
import InstagramAccountSelector from '@/Components/Instagram/InstagramAccountSelector';
import InstagramDisconnectModal from '@/Components/Instagram/InstagramDisconnectModal';
import InstagramDisconnectedHero from '@/Components/Instagram/InstagramDisconnectedHero';
import InstagramNotConnectedEmptyState from '@/Components/Instagram/InstagramNotConnectedEmptyState';
import useInstagramSelectedAccount from '@/Components/Instagram/useInstagramSelectedAccount';
import { Head, router, useForm } from '@inertiajs/react';
import { Menu, Transition } from '@headlessui/react';
import { AlertTriangle, Bookmark, CalendarPlus, Check, CheckCircle2, ChevronRight, ChevronDown, Clapperboard, Eye, Film, GalleryHorizontal, Hash, Heart, Image, MapPin, MessageCircle, MoreHorizontal, Send, Sparkles, Type, Upload, Video, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from 'react';
import {
    SchedulerModalOverlay,
    SchedulerModalShell,
    SchedulerUploadDropzone,
    SchedulerUploadPreview,
    SchedulerUploadProgress,
} from './ContentSchedulerModalShell';
import InstagramPostPreview from './InstagramPostPreview';

function DropdownSelect({ label, value, onChange, options, className = "" }) {
    const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0];

    return (
        <div className={`space-y-1.5 ${className}`}>
            {label && (
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {label}
                </label>
            )}
            <Menu as="div" className="relative w-full">
                {({ open }) => (
                    <>
                        <Menu.Button className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50/50 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left">
                            <span className="truncate">{selectedOption?.label || "Select Option"}</span>
                            <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                        </Menu.Button>

                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-100"
                            enterFrom="transform opacity-0 scale-95"
                            enterTo="transform opacity-100 scale-100"
                            leave="transition ease-in duration-75"
                            leaveFrom="transform opacity-100 scale-100"
                            leaveTo="transform opacity-0 scale-95"
                        >
                            <Menu.Items className="absolute right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl focus:outline-none">
                                {options.map((option) => {
                                    const isSelected = String(option.value) === String(value);
                                    return (
                                        <Menu.Item key={option.value} disabled={option.disabled}>
                                            {({ active }) => (
                                                <button
                                                    type="button"
                                                    disabled={option.disabled}
                                                    onClick={() => onChange(option.value)}
                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${active ? "bg-slate-100 text-slate-900" : "text-slate-700"
                                                        } ${isSelected ? "text-primary-700" : ""}`}
                                                >
                                                    <span className="truncate">{option.label}</span>
                                                    {isSelected && (
                                                        <span className="text-primary-600 font-bold" aria-hidden="true">
                                                            ✓
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </Menu.Item>
                                    );
                                })}
                            </Menu.Items>
                        </Transition>
                    </>
                )}
            </Menu>
        </div>
    );
}

const formatRequirements = {
    image: 'One image',
    video: 'One video',
    reel: 'One video',
    story: 'One image or video',
    carousel: 'Two to ten images or videos',
};

const formatIcons = {
    image: Image,
    video: Video,
    reel: Clapperboard,
    story: Film,
    carousel: GalleryHorizontal,
};

const schedulerUploadOptions = {
    image: {
        accept: 'image/jpeg,image/png,image/webp',
        helper: 'JPG, PNG, WEBP up to 200 MB',
        invalidMessage: 'Image posts only accept JPG, PNG, or WEBP files.',
        emptyTitle: 'Only image media fits this post',
        emptyDescription: 'Switch the post format or upload an image file to continue.',
    },
    video: {
        accept: 'video/mp4,video/quicktime',
        helper: 'MP4, MOV up to 200 MB',
        invalidMessage: 'Video posts only accept MP4 or MOV files.',
        emptyTitle: 'Only video media fits this post',
        emptyDescription: 'Switch the post format or upload an MP4 or MOV file to continue.',
    },
    reel: {
        accept: 'video/mp4,video/quicktime',
        helper: 'MP4, MOV up to 200 MB',
        invalidMessage: 'Reels only accept MP4 or MOV files.',
        emptyTitle: 'Only video media fits this Reel',
        emptyDescription: 'Upload an MP4 or MOV file to continue, or switch to an image-based post.',
    },
    story: {
        accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime',
        helper: 'JPG, PNG, WEBP, MP4, MOV up to 200 MB',
        invalidMessage: 'Stories accept JPG, PNG, WEBP, MP4, or MOV files.',
        emptyTitle: 'No matching story media yet',
        emptyDescription: 'Upload an image or video file to continue.',
    },
    carousel: {
        accept: 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime',
        helper: 'JPG, PNG, WEBP, MP4, MOV up to 200 MB',
        invalidMessage: 'Carousel posts accept JPG, PNG, WEBP, MP4, or MOV files.',
        emptyTitle: 'No matching carousel media yet',
        emptyDescription: 'Upload images or videos to build your carousel.',
    },
};

const getSchedulerUploadOption = (format) => schedulerUploadOptions[format] || schedulerUploadOptions.story;

const schedulerFileMatchesFormat = (file, format) => {
    const mimeType = String(file?.type || '').toLowerCase();
    const fileName = String(file?.name || '').toLowerCase();
    const isImage = mimeType.startsWith('image/') || /\.(jpe?g|png|webp)$/.test(fileName);
    const isVideo = mimeType.startsWith('video/') || /\.(mp4|mov)$/.test(fileName);

    if (format === 'image') {
        return isImage;
    }

    if (['video', 'reel'].includes(format)) {
        return isVideo;
    }

    return isImage || isVideo;
};

const schedulerAssetMatchesFormat = (asset, format) => {
    if (format === 'image') {
        return asset.media_type === 'image';
    }

    if (['video', 'reel'].includes(format)) {
        return asset.media_type === 'video';
    }

    return ['image', 'video'].includes(asset.media_type);
};

const appendUniqueSchedulerMediaId = (mediaIds, mediaId) => [...new Set([...mediaIds, mediaId])].slice(0, 10);

const stepFieldMap = {
    1: ['instagram_account_id', 'format'],
    2: ['media_asset_ids'],
    3: ['title', 'caption', 'hashtags', 'options.alt_text', 'options.location_id', 'options.reel_thumbnail_media_id', 'scheduled_at'],
};

const pad2 = (value) => String(value).padStart(2, '0');
const toLocalDateTimeValue = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());

    return localDate.toISOString().slice(0, 16);
};

const toLocalDateValue = (date) => {
    const localDate = new Date(date);
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());

    return localDate.toISOString().slice(0, 10);
};

const defaultScheduledAt = () => toLocalDateTimeValue(new Date(Date.now() + 60 * 60 * 1000));
const validQueryDate = (dateValue) => /^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ''));
const buildScheduledAtFromDate = (dateValue) => {
    const today = toLocalDateValue(new Date());
    if (!validQueryDate(dateValue)) {
        return defaultScheduledAt();
    }

    if (dateValue < today) {
        return defaultScheduledAt();
    }

    if (dateValue === today) {
        return defaultScheduledAt();
    }

    return `${dateValue}T09:00`;
};

const extractScheduleParts = (datetimeValue) => {
    const parsed = new Date(datetimeValue);
    const base = Number.isNaN(parsed.getTime()) ? new Date(Date.now() + 60 * 60 * 1000) : parsed;
    const hour24 = base.getHours();

    return {
        date: toLocalDateValue(base),
        hour: String(hour24 % 12 || 12),
        minute: pad2(base.getMinutes()),
        period: hour24 >= 12 ? 'PM' : 'AM',
    };
};

export default function Schedule({
    instagram_accounts = [],
    selected_instagram_account_id = null,
    has_active_account = true,
    disconnectToast = null,
    connected_count = 0,
    can_connect_more = false,
    media_assets = [],
    format_options = [],
    scheduled_posts = [],
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
        const storageKey = `schedule:disconnect-modal:${fingerprint}`;

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
    const schedulerPrefill = useMemo(() => {
        if (typeof window === 'undefined') {
            return {
                format: 'image',
                scheduledAt: defaultScheduledAt(),
            };
        }

        const search = new URLSearchParams(window.location.search);
        const requestedFormat = String(search.get('format') || '').trim().toLowerCase();
        const allowedFormats = new Set(format_options.map((option) => String(option.value)));
        const format = allowedFormats.has(requestedFormat) ? requestedFormat : 'image';
        const requestedDate = String(search.get('date') || '').trim();

        return {
            format,
            scheduledAt: buildScheduledAtFromDate(requestedDate),
        };
    }, [format_options]);
    const scheduleQueryContext = useMemo(() => {
        if (typeof window === 'undefined') {
            return {};
        }

        const search = new URLSearchParams(window.location.search);
        const requestedFormat = String(search.get('format') || '').trim().toLowerCase();
        const requestedDate = String(search.get('date') || '').trim();
        const allowedFormats = new Set(format_options.map((option) => String(option.value)));
        const params = {};

        if (allowedFormats.has(requestedFormat)) {
            params.format = requestedFormat;
        }
        if (validQueryDate(requestedDate)) {
            params.date = requestedDate;
        }

        return params;
    }, [format_options]);
    const {
        selectedAccountId,
        selectAccount,
    } = useInstagramSelectedAccount({
        accounts: accountList,
        initialSelectedAccountId: selected_instagram_account_id,
        preferStored: true,
        requireActive: true,
    });

    const generateThumbnailVideoRef = useRef(null);
    const [step, setStep] = useState(1);
    const [hashtagText, setHashtagText] = useState('');
    const [clientErrors, setClientErrors] = useState({});
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [scheduleError, setScheduleError] = useState('');
    const [scheduleDate, setScheduleDate] = useState(toLocalDateValue(new Date()));
    const [scheduleHour, setScheduleHour] = useState('12');
    const [scheduleMinute, setScheduleMinute] = useState('00');
    const [schedulePeriod, setSchedulePeriod] = useState('PM');
    const [reelThumbnailSource, setReelThumbnailSource] = useState('library');
    const [showLibraryModal, setShowLibraryModal] = useState(false);
    const [showLibraryUploadModal, setShowLibraryUploadModal] = useState(false);
    const [thumbnailCaptureSecond, setThumbnailCaptureSecond] = useState(1);
    const [thumbnailVideoDuration, setThumbnailVideoDuration] = useState(0);
    const [thumbnailCaptureError, setThumbnailCaptureError] = useState('');
    const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);

    const form = useForm({
        draft_post_id: null,
        instagram_account_id: Number(selected_instagram_account_id || 0) || accountList.find((account) => account.status === 'active')?.id || '',
        format: schedulerPrefill.format,
        media_asset_ids: [],
        title: '',
        caption: '',
        hashtags: [],
        scheduled_at: schedulerPrefill.scheduledAt,
        publish_now: false,
        status: 'scheduled',
        options: {
            alt_text: '',
            location_id: '',
            share_to_feed: true,
            reel_thumbnail_media_id: '',
            reel_thumbnail_source: 'library',
        },
    });

    const thumbnailUploadForm = useForm({
        media: null,
    });
    const libraryUploadForm = useForm({
        media: null,
    });
    const selectedLibraryUploadFile = libraryUploadForm.data.media;
    const selectedLibraryUploadFileType = selectedLibraryUploadFile?.type || '';
    const [libraryUploadPreviewUrl, setLibraryUploadPreviewUrl] = useState(null);
    const isLibraryImagePreview = selectedLibraryUploadFileType.startsWith('image/');
    const isLibraryVideoPreview = selectedLibraryUploadFileType.startsWith('video/');
    const schedulerUploadOption = useMemo(() => getSchedulerUploadOption(form.data.format), [form.data.format]);

    useEffect(() => {
        if (!selectedLibraryUploadFile) {
            setLibraryUploadPreviewUrl(null);

            return undefined;
        }

        const objectUrl = URL.createObjectURL(selectedLibraryUploadFile);
        setLibraryUploadPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedLibraryUploadFile]);

    const selectedAssets = useMemo(
        () => media_assets.filter((asset) => form.data.media_asset_ids.includes(asset.id)),
        [form.data.media_asset_ids, media_assets]
    );

    const imageAssets = useMemo(
        () => media_assets.filter((asset) => asset.media_type === 'image'),
        [media_assets]
    );

    const selectedReelThumbnail = useMemo(() => {
        const selectedId = Number(form.data.options.reel_thumbnail_media_id || 0);
        if (selectedId < 1) {
            return null;
        }

        return imageAssets.find((asset) => asset.id === selectedId) || null;
    }, [form.data.options.reel_thumbnail_media_id, imageAssets]);
    const selectedReelVideoAsset = useMemo(() => {
        if (form.data.format !== 'reel') {
            return null;
        }

        return selectedAssets.find((asset) => asset.media_type === 'video') || null;
    }, [form.data.format, selectedAssets]);

    const parseHashtags = () =>
        hashtagText
            .split(/[,\s]+/)
            .map((tag) => tag.replace(/^#/, '').trim())
            .filter(Boolean);

    const getFieldError = (field) => clientErrors[field] || form.errors[field];

    const clearStepErrors = (stepNumber) => {
        const fields = stepFieldMap[stepNumber] || [];
        setClientErrors((previousErrors) => {
            const nextErrors = { ...previousErrors };
            fields.forEach((field) => {
                delete nextErrors[field];
            });

            return nextErrors;
        });
    };

    const findErrorStep = (errors) => {
        if (!errors || typeof errors !== 'object') {
            return 1;
        }

        for (let candidateStep = 1; candidateStep <= 3; candidateStep += 1) {
            const fields = stepFieldMap[candidateStep] || [];
            const hasStepError = fields.some((field) =>
                Object.keys(errors).some((key) => key === field || key.startsWith(`${field}.`))
            );

            if (hasStepError) {
                return candidateStep;
            }
        }

        return 1;
    };

    const validateStep = (stepNumber) => {
        const errors = {};

        if (stepNumber === 1) {
            if (!form.data.instagram_account_id) {
                errors.instagram_account_id = 'Select an Instagram account.';
            }
        }

        if (stepNumber === 2) {
            if (form.data.media_asset_ids.length < 1) {
                errors.media_asset_ids = 'Select at least one media asset.';
            }
        }

        if (stepNumber === 3) {
            const hashtags = parseHashtags();
            const isStory = form.data.format === 'story';
            const isImage = form.data.format === 'image';

            if (form.data.format !== 'reel' && (form.data.title || '').length > 120) {
                errors.title = 'Title must be 120 characters or fewer.';
            }

            if ((form.data.caption || '').length > 2200) {
                errors.caption = 'Caption must be 2200 characters or fewer.';
            }

            if (!isStory) {
                if (hashtags.length > 30) {
                    errors.hashtags = 'Use up to 30 hashtags.';
                }

                const longTag = hashtags.find((tag) => tag.length > 80);
                if (longTag) {
                    errors.hashtags = 'Each hashtag must be 80 characters or fewer.';
                }
            }

            if (isImage && (form.data.options.alt_text || '').length > 1000) {
                errors['options.alt_text'] = 'Alt text must be 1000 characters or fewer.';
            }

            if ((form.data.options.location_id || '').length > 120) {
                errors['options.location_id'] = 'Location ID must be 120 characters or fewer.';
            }

            if (form.data.options.reel_thumbnail_media_id && !imageAssets.some((asset) => asset.id === Number(form.data.options.reel_thumbnail_media_id))) {
                errors['options.reel_thumbnail_media_id'] = 'Selected thumbnail is no longer available.';
            }
        }

        return errors;
    };

    const isStepComplete = (stepNumber) => Object.keys(validateStep(stepNumber)).length === 0;

    const stepEligibleAssets = useMemo(() => {
        if (form.data.format === 'image') {
            return media_assets.filter((asset) => asset.media_type === 'image');
        }

        if (['video', 'reel'].includes(form.data.format)) {
            return media_assets.filter((asset) => asset.media_type === 'video');
        }

        return media_assets;
    }, [form.data.format, media_assets]);
    const libraryModalAssets = stepEligibleAssets;

    const toggleAsset = (asset) => {
        const currentIds = form.data.media_asset_ids;
        const isSelected = currentIds.includes(asset.id);
        const isCarousel = form.data.format === 'carousel';

        if (!isCarousel) {
            form.setData('media_asset_ids', isSelected ? [] : [asset.id]);
            return;
        }

        form.setData(
            'media_asset_ids',
            isSelected ? currentIds.filter((id) => id !== asset.id) : [...currentIds, asset.id].slice(0, 10)
        );
    };

    const isFutureDateTime = (datetimeValue) => {
        const parsed = new Date(datetimeValue);

        return !Number.isNaN(parsed.getTime()) && parsed.getTime() > Date.now();
    };

    const composeScheduledAtFromModal = () => {
        const hour = Number(scheduleHour);
        const minute = Number(scheduleMinute);

        if (!scheduleDate || Number.isNaN(hour) || Number.isNaN(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) {
            return null;
        }

        const hour24 = schedulePeriod === 'PM' ? (hour % 12) + 12 : hour % 12;

        return `${scheduleDate}T${pad2(hour24)}:${pad2(minute)}`;
    };

    const submit = (status, scheduledAtOverride = null, options = {}) => {
        const publishNow = Boolean(options.publishNow);
        if (status === 'draft' && form.data.media_asset_ids.length < 1) {
            setClientErrors((previousErrors) => ({
                ...previousErrors,
                media_asset_ids: 'Select at least one media asset before saving a draft.',
            }));
            setStep(2);

            return;
        }

        if (status === 'scheduled' && !publishNow) {
            const finalScheduledAt = scheduledAtOverride || form.data.scheduled_at;
            if (!finalScheduledAt || !isFutureDateTime(finalScheduledAt)) {
                setScheduleError('Please select a future date and time to schedule your post.');
                setShowScheduleModal(true);

                return;
            }
        }

        form.transform((data) => ({
            ...data,
            status,
            publish_now: publishNow,
            scheduled_at: status === 'scheduled' && !publishNow ? (scheduledAtOverride || data.scheduled_at) : null,
            hashtags: parseHashtags(),
        }));

        form.post(route('instagram.posts.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setHashtagText('');
                setReelThumbnailSource('library');
                setScheduleError('');
                setShowScheduleModal(false);
                setStep(1);
                setClientErrors({});
            },
            onError: (errors) => {
                setStep(findErrorStep(errors));
                if (errors.scheduled_at) {
                    setScheduleError(errors.scheduled_at);
                    setShowScheduleModal(true);
                }
            },
            onFinish: () => form.transform((data) => data),
        });
    };

    const handleContinue = () => {
        clearStepErrors(step);
        const stepErrors = validateStep(step);
        if (Object.keys(stepErrors).length > 0) {
            setClientErrors((previousErrors) => ({ ...previousErrors, ...stepErrors }));

            return;
        }

        setStep((currentStep) => Math.min(3, currentStep + 1));
    };

    const handleStepChange = (targetStep) => {
        if (targetStep <= step) {
            setStep(targetStep);

            return;
        }

        let currentStep = step;
        while (currentStep < targetStep) {
            const stepErrors = validateStep(currentStep);
            if (Object.keys(stepErrors).length > 0) {
                clearStepErrors(currentStep);
                setClientErrors((previousErrors) => ({ ...previousErrors, ...stepErrors }));
                setStep(currentStep);

                return;
            }

            currentStep += 1;
        }

        setStep(targetStep);
    };

    const openScheduleModal = () => {
        const stepErrors = validateStep(3);
        if (Object.keys(stepErrors).length > 0) {
            setClientErrors((previousErrors) => ({ ...previousErrors, ...stepErrors }));
            setStep(3);

            return;
        }

        const parts = extractScheduleParts(form.data.scheduled_at || defaultScheduledAt());
        setScheduleDate(parts.date);
        setScheduleHour(parts.hour);
        setScheduleMinute(parts.minute);
        setSchedulePeriod(parts.period);
        setScheduleError('');
        setShowScheduleModal(true);
    };

    const handleScheduleFromModal = () => {
        const scheduledAt = composeScheduledAtFromModal();
        if (!scheduledAt || !isFutureDateTime(scheduledAt)) {
            setScheduleError('Please select a future date and time to schedule your post.');

            return;
        }

        form.setData('scheduled_at', scheduledAt);
        submit('scheduled', scheduledAt);
    };

    const handlePostNow = () => {
        form.setData('scheduled_at', null);
        submit('scheduled', null, { publishNow: true });
    };

    const continueDraft = (draftPost) => {
        const availableMediaIds = new Set(media_assets.map((asset) => Number(asset.id)));
        const draftMediaIds = (Array.isArray(draftPost.media) ? draftPost.media : [])
            .map((asset) => Number(asset.id))
            .filter((id) => availableMediaIds.has(id));
        const draftHashtags = (Array.isArray(draftPost.hashtags) ? draftPost.hashtags : [])
            .map((tag) => String(tag).replace(/^#/, '').trim())
            .filter(Boolean);
        const draftOptions = draftPost.options && typeof draftPost.options === 'object' ? draftPost.options : {};
        const draftScheduledAt = draftPost.scheduled_at
            ? toLocalDateTimeValue(new Date(draftPost.scheduled_at))
            : defaultScheduledAt();

        form.setData(() => ({
            draft_post_id: Number(draftPost.id || 0) || null,
            instagram_account_id: Number(draftPost.instagram_account?.id || 0) || '',
            format: String(draftPost.format || 'image'),
            media_asset_ids: draftMediaIds,
            title: String(draftPost.title || ''),
            caption: String(draftPost.caption || ''),
            hashtags: draftHashtags,
            scheduled_at: draftScheduledAt,
            status: 'scheduled',
            options: {
                alt_text: String(draftOptions.alt_text || ''),
                location_id: String(draftOptions.location_id || ''),
                share_to_feed: typeof draftOptions.share_to_feed === 'boolean' ? draftOptions.share_to_feed : true,
                reel_thumbnail_media_id: draftOptions.reel_thumbnail_media_id ? Number(draftOptions.reel_thumbnail_media_id) : '',
                reel_thumbnail_source: String(draftOptions.reel_thumbnail_source || 'library'),
            },
        }));

        setHashtagText(draftHashtags.map((tag) => `#${tag}`).join(' '));
        setReelThumbnailSource(String(draftOptions.reel_thumbnail_source || 'library'));
        setClientErrors({});
        form.clearErrors();
        setScheduleError('');
        setShowScheduleModal(false);
        setStep(3);
    };

    const handleReelThumbnailUpload = () => {
        clearStepErrors(3);
        setThumbnailCaptureError('');

        if (!thumbnailUploadForm.data.media) {
            setClientErrors((previousErrors) => ({
                ...previousErrors,
                'options.reel_thumbnail_media_id': 'Select an image file first.',
            }));

            return;
        }

        const previousImageIds = new Set(imageAssets.map((asset) => asset.id));

        thumbnailUploadForm.post(route('instagram.media.store'), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: (page) => {
                const updatedMedia = page?.props?.media_assets || [];
                const newThumbnail = updatedMedia.find((asset) => asset.media_type === 'image' && !previousImageIds.has(asset.id));

                if (newThumbnail) {
                    form.setData('options', {
                        ...form.data.options,
                        reel_thumbnail_media_id: newThumbnail.id,
                        reel_thumbnail_source: 'library',
                    });
                    setReelThumbnailSource('library');
                    clearStepErrors(3);
                }

                thumbnailUploadForm.reset('media');
            },
        });
    };
    const seekVideoToSecond = (videoElement, targetSecond) => new Promise((resolve, reject) => {
        if (!videoElement) {
            reject(new Error('Video element is unavailable.'));

            return;
        }

        const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : 0;
        const boundedSecond = Math.max(0, Math.min(targetSecond, Math.max(0, duration - 0.1)));

        const cleanup = () => {
            videoElement.removeEventListener('seeked', handleSeeked);
            videoElement.removeEventListener('error', handleError);
        };
        const handleSeeked = () => {
            cleanup();
            resolve();
        };
        const handleError = () => {
            cleanup();
            reject(new Error('Unable to seek video for thumbnail capture.'));
        };

        if (Math.abs((videoElement.currentTime || 0) - boundedSecond) < 0.05) {
            resolve();

            return;
        }

        videoElement.addEventListener('seeked', handleSeeked, { once: true });
        videoElement.addEventListener('error', handleError, { once: true });
        videoElement.currentTime = boundedSecond;
    });
    const handleGenerateReelThumbnail = async () => {
        clearStepErrors(3);
        setThumbnailCaptureError('');

        if (!selectedReelVideoAsset) {
            setClientErrors((previousErrors) => ({
                ...previousErrors,
                'options.reel_thumbnail_media_id': 'Select a reel video in Step 2 before generating a thumbnail.',
            }));

            return;
        }

        const videoElement = generateThumbnailVideoRef.current;
        if (!videoElement) {
            setThumbnailCaptureError('Video preview is not ready yet. Please try again.');

            return;
        }

        const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : 0;
        if (duration <= 0) {
            setThumbnailCaptureError('Video metadata is still loading. Please wait a second and retry.');

            return;
        }

        setIsGeneratingThumbnail(true);

        try {
            await seekVideoToSecond(videoElement, thumbnailCaptureSecond);

            const width = videoElement.videoWidth;
            const height = videoElement.videoHeight;
            if (!width || !height) {
                throw new Error('Unable to read video dimensions for thumbnail generation.');
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext('2d');
            if (!context) {
                throw new Error('Unable to prepare thumbnail canvas.');
            }

            context.drawImage(videoElement, 0, 0, width, height);

            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((generatedBlob) => {
                    if (!generatedBlob) {
                        reject(new Error('Unable to generate thumbnail image.'));

                        return;
                    }

                    resolve(generatedBlob);
                }, 'image/jpeg', 0.92);
            });

            const baseName = (selectedReelVideoAsset.original_name || 'reel')
                .replace(/\.[^.]+$/, '')
                .replace(/[^a-zA-Z0-9-_]/g, '-')
                .slice(0, 40) || 'reel';
            const frameLabel = String(Math.round(thumbnailCaptureSecond * 10) / 10).replace('.', '-');
            const generatedFile = new File([blob], `${baseName}-thumb-${frameLabel}.jpg`, { type: 'image/jpeg' });
            const previousImageIds = new Set(imageAssets.map((asset) => asset.id));

            thumbnailUploadForm.setData('media', generatedFile);

            await new Promise((resolve, reject) => {
                thumbnailUploadForm.post(route('instagram.media.store'), {
                    forceFormData: true,
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: (page) => {
                        const updatedMedia = page?.props?.media_assets || [];
                        const newThumbnail = updatedMedia.find((asset) => asset.media_type === 'image' && !previousImageIds.has(asset.id));

                        if (!newThumbnail) {
                            reject(new Error('Thumbnail generated but could not be selected automatically.'));

                            return;
                        }

                        form.setData('options', {
                            ...form.data.options,
                            reel_thumbnail_media_id: newThumbnail.id,
                            reel_thumbnail_source: 'library',
                        });
                        setReelThumbnailSource('library');
                        clearStepErrors(3);
                        thumbnailUploadForm.reset('media');
                        resolve();
                    },
                    onError: () => {
                        reject(new Error('Unable to upload generated thumbnail.'));
                    },
                });
            });
        } catch (error) {
            setThumbnailCaptureError(error instanceof Error ? error.message : 'Unable to generate thumbnail. Please try another frame.');
        } finally {
            setIsGeneratingThumbnail(false);
        }
    };
    const openLibraryModal = () => {
        setShowLibraryModal(true);
    };
    const closeLibraryModal = (force = false) => {
        if (!force && libraryUploadForm.processing) {
            return;
        }

        setShowLibraryUploadModal(false);
        setShowLibraryModal(false);
        libraryUploadForm.reset();
        libraryUploadForm.clearErrors();
    };
    const closeLibraryUploadModal = (force = false) => {
        if (!force && libraryUploadForm.processing) {
            return;
        }

        setShowLibraryUploadModal(false);
        libraryUploadForm.reset();
        libraryUploadForm.clearErrors();
    };
    const submitLibraryUpload = (event) => {
        event.preventDefault();

        const selectedFile = libraryUploadForm.data.media;
        if (selectedFile && !schedulerFileMatchesFormat(selectedFile, form.data.format)) {
            libraryUploadForm.setError('media', schedulerUploadOption.invalidMessage);

            return;
        }

        const previousMediaIds = new Set(media_assets.map((asset) => asset.id));

        libraryUploadForm.post(route('instagram.media.store'), {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: (page) => {
                const updatedMedia = page?.props?.media_assets || [];
                const newAsset = updatedMedia.find((asset) =>
                    !previousMediaIds.has(asset.id) && schedulerAssetMatchesFormat(asset, form.data.format)
                );

                if (newAsset) {
                    const nextMediaAssetIds = form.data.format === 'carousel'
                        ? appendUniqueSchedulerMediaId(form.data.media_asset_ids, newAsset.id)
                        : [newAsset.id];

                    form.setData('media_asset_ids', nextMediaAssetIds);
                    setClientErrors((previousErrors) => {
                        if (!previousErrors.media_asset_ids) {
                            return previousErrors;
                        }

                        const nextErrors = { ...previousErrors };
                        delete nextErrors.media_asset_ids;

                        return nextErrors;
                    });
                }

                closeLibraryUploadModal(true);
            },
        });
    };

    const switchAccount = useCallback((nextAccountId) => {
        const validAccountId = Number(selectAccount(nextAccountId) || 0);
        if (validAccountId <= 0) {
            return;
        }

        router.get(route('instagram.schedule'), {
            ...scheduleQueryContext,
            instagram_account_id: validAccountId,
        }, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    }, [scheduleQueryContext, selectAccount]);

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

        router.get(route('instagram.schedule'), {
            ...scheduleQueryContext,
            instagram_account_id: localSelectedAccountId,
        }, {
            preserveScroll: true,
            preserveState: false,
            replace: true,
        });
    }, [hasActiveAccount, scheduleQueryContext, selectedAccountId, selected_instagram_account_id]);

    useEffect(() => {
        const normalizedSelectedAccountId = Number(selectedAccountId || 0);
        const normalizedFormAccountId = Number(form.data.instagram_account_id || 0);

        if (normalizedSelectedAccountId <= 0 || normalizedFormAccountId === normalizedSelectedAccountId) {
            return;
        }

        form.setData('instagram_account_id', normalizedSelectedAccountId);
    }, [form, selectedAccountId]);

    const activeAccountCount = accountList.filter((account) => account.status === 'active').length;
    const selectedAccount = accountList.find((account) => account.id === form.data.instagram_account_id) || null;
    const activeFormat = format_options.find((option) => option.value === form.data.format) || null;
    const draftPosts = useMemo(
        () => scheduled_posts.filter((post) => post.status === 'draft'),
        [scheduled_posts]
    );
    const accountDropdownOptions = useMemo(() => {
        return [
            { value: '', label: 'Select account' },
            ...accountList.map((account) => ({
                value: String(account.id),
                label: `@${account.username || 'instagram'}${account.status !== 'active' ? ` (${account.status})` : ''}`,
                disabled: account.status !== 'active',
            })),
        ];
    }, [accountList]);

    const canSaveDraft = Boolean(form.data.instagram_account_id) && form.data.media_asset_ids.length > 0;
    const previewAsset = selectedAssets[0] || null;
    const captionLength = (form.data.caption || '').length;
    const hashtagCount = parseHashtags().length;
    const previewHashtagLine = parseHashtags().map((tag) => `#${tag}`).join(' ');
    const previewCardAsset = form.data.format === 'reel' && selectedReelThumbnail ? selectedReelThumbnail : previewAsset;
    const previewHandle = selectedAccount?.username || 'creator';
    const previewCaption = (form.data.caption || '').trim() || 'Your caption will appear here.';
    const previewCaptionShort = previewCaption.length > 170 ? `${previewCaption.slice(0, 167)}...` : previewCaption;
    const modalScheduledAt = composeScheduledAtFromModal();
    const modalTimeIsPast = !modalScheduledAt || !isFutureDateTime(modalScheduledAt);

    return (
        <AuthenticatedLayout
            topbarTitle="Schedule Instagram Content"
            topbarDescription="Create posts, Reels, stories, and carousels from uploaded media."
        >
            <Head title="Schedule Instagram Content" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                {!hasActiveAccount ? (
                    accountList.length === 0 && !disconnectToast?.account_id ? (
                        <InstagramNotConnectedEmptyState
                            description="Connect an Instagram account first, then create and schedule your posts."
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
                            actionText="create and schedule posts"
                        />
                    )
                ) : (
                    <>
                        {disconnectToast?.account_id && (
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                                    <div>
                                        <p className="text-sm font-black">
                                            Instagram connection expired for @{disconnectToast.username || 'your account'}
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-amber-700">
                                            Disconnected accounts are shown for context but cannot be scheduled. Reconnect to schedule posts.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowDisconnectModal(true)}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition shrink-0"
                                >
                                    Fix Now
                                </button>
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

                        {/* Steps */}
                        <section>
                            <form onSubmit={(event) => event.preventDefault()} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-100 p-4">
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            [1, 'Format'],
                                            [2, 'Media'],
                                            [3, 'Review'],
                                        ].map(([number, label]) => (
                                            <button
                                                key={number}
                                                type="button"
                                                onClick={() => handleStepChange(number)}
                                                disabled={number > 1 && !isStepComplete(number - 1)}
                                                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${step === number
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                    } disabled:cursor-not-allowed disabled:opacity-50`}
                                            >
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20">{number}</span>
                                                {label}
                                            </button>
                                        ))}
                                    </div>


                                </div>

                                <div className="p-4 sm:p-5">
                                    {step === 1 && (
                                        <div className="space-y-5">
                                            <div className="space-y-1">
                                                <SharedDropdownSelect
                                                    label="Instagram Account"
                                                    value={form.data.instagram_account_id}
                                                    onChange={(val) => {
                                                        const nextAccountId = Number(val || 0);
                                                        if (nextAccountId <= 0) {
                                                            form.setData('instagram_account_id', '');
                                                            return;
                                                        }

                                                        form.setData('instagram_account_id', nextAccountId);
                                                        switchAccount(nextAccountId);
                                                    }}
                                                    options={accountDropdownOptions}
                                                />
                                                {getFieldError('instagram_account_id') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('instagram_account_id')}</span>}
                                            </div>

                                            <div>
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Format</p>
                                                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                    {format_options.map((option) => {
                                                        const FormatIcon = formatIcons[option.value] || Image;

                                                        return (
                                                            <button
                                                                key={option.value}
                                                                type="button"
                                                                onClick={() => {
                                                                    form.setData({
                                                                        ...form.data,
                                                                        format: option.value,
                                                                        media_asset_ids: [],
                                                                    });
                                                                }}
                                                                className={`rounded-2xl border p-4 text-left transition ${form.data.format === option.value
                                                                    ? 'border-primary-300 bg-primary-50 text-primary-800 shadow-sm'
                                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span className="inline-flex items-center gap-2 text-sm font-black">
                                                                        <FormatIcon className="h-4 w-4" />
                                                                        {option.label}
                                                                    </span>
                                                                    {form.data.format === option.value && <Check className="h-4 w-4" />}
                                                                </div>
                                                                <p className="mt-2 text-xs font-semibold text-slate-500">{formatRequirements[option.value]}</p>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {getFieldError('format') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('format')}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {step === 2 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <h2 className="text-base font-black text-slate-900">Select Media</h2>
                                                    <p className="text-sm font-semibold text-slate-500">{formatRequirements[form.data.format]}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={openLibraryModal}
                                                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-sm font-black text-white transition hover:bg-primary-700"
                                                >
                                                    <Image className="h-4 w-4" />
                                                    Open Library
                                                </button>
                                            </div>

                                            {selectedAssets.length === 0 ? (
                                                <EmptyState
                                                    className="rounded-2xl border border-slate-200 bg-slate-50 py-10"
                                                    title="No media selected yet"
                                                    description="Open Library to pick media for this post."
                                                    icon={Image}
                                                />
                                            ) : (
                                                <div className="mx-auto w-full max-w-[360px]">
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Instagram Preview</p>
                                                        <div className="mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                                            <div className="flex items-center justify-between px-3 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-9 w-9 rounded-full bg-linear-to-br from-fuchsia-500 via-rose-500 to-amber-400 p-[1.5px]">
                                                                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-black uppercase text-slate-700">
                                                                            {previewHandle.slice(0, 2)}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-900">@{previewHandle}</p>
                                                                        <p className="text-[11px] font-semibold text-slate-500">Preview mode</p>
                                                                    </div>
                                                                </div>
                                                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                            </div>
                                                            <div className="relative aspect-[4/5] bg-slate-100">
                                                                {previewCardAsset ? (
                                                                    previewCardAsset.media_type === 'video' ? (
                                                                        <video src={previewCardAsset.url} className="h-full w-full object-cover" muted autoPlay loop />
                                                                    ) : (
                                                                        <img src={previewCardAsset.url} alt={previewCardAsset.title || previewCardAsset.original_name} className="h-full w-full object-cover" />
                                                                    )
                                                                ) : (
                                                                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">Select media in Step 2</div>
                                                                )}
                                                                {form.data.format === 'reel' && (
                                                                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                                                        Reel
                                                                    </span>
                                                                )}
                                                                {form.data.format === 'carousel' && selectedAssets.length > 1 && (
                                                                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black text-white">
                                                                        1/{selectedAssets.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2 px-3 py-3">
                                                                <div className="flex items-center justify-between text-slate-700">
                                                                    <div className="flex items-center gap-3">
                                                                        <Heart className="h-5 w-5" />
                                                                        <MessageCircle className="h-5 w-5" />
                                                                        <Send className="h-5 w-5" />
                                                                    </div>
                                                                    <Bookmark className="h-5 w-5" />
                                                                </div>
                                                                <p className="text-xs font-black text-slate-900">1,284 likes</p>
                                                                {form.data.title && <p className="text-xs font-black text-slate-900">{form.data.title}</p>}
                                                                <p className="text-xs font-semibold leading-5 text-slate-700">
                                                                    <span className="mr-1 font-black text-slate-900">@{previewHandle}</span>
                                                                    {previewCaptionShort}
                                                                </p>
                                                                {previewHashtagLine && <p className="text-xs font-black text-primary-700">{previewHashtagLine}</p>}
                                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Just now</p>
                                                            </div>
                                                        </div>
                                                        <p className="mt-3 text-xs font-semibold text-slate-500">
                                                            Manage selected media in <span className="font-black text-slate-700">Open Library</span>.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            {getFieldError('media_asset_ids') && <span className="block text-xs font-bold text-rose-600">{getFieldError('media_asset_ids')}</span>}
                                            {form.data.media_asset_ids.length === 0 && (
                                                <p className="text-xs font-semibold text-slate-500">
                                                    Select at least one media item to continue to Step 3.
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {step === 3 && (
                                        <div className="space-y-5">
                                            <div className="rounded-2xl border border-primary-200 bg-gradient-to-r from-primary-50 via-white to-amber-50 p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="inline-flex items-center gap-2 text-sm font-black text-slate-900">
                                                        <Sparkles className="h-4 w-4 text-primary-600" />
                                                        Post Summary
                                                    </p>

                                                </div>
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                                                        @{selectedAccount?.username || 'account'}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                                                        {(() => {
                                                            const ActiveFormatIcon = formatIcons[form.data.format] || Image;

                                                            return <ActiveFormatIcon className="h-3.5 w-3.5 text-primary-600" />;
                                                        })()}
                                                        {activeFormat?.label || form.data.format}
                                                    </span>
                                                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                                                        {selectedAssets.length} media selected
                                                    </span>
                                                    {form.data.format === 'reel' && (
                                                        <span className={`rounded-full px-3 py-1 text-xs font-black shadow-sm ${selectedReelThumbnail ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                                            {selectedReelThumbnail ? 'Thumbnail ready' : 'Pick a thumbnail'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                                                <div className="space-y-4">
                                                    {form.data.format !== 'reel' && (
                                                        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                                                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                                                <Type className="h-3.5 w-3.5" />
                                                                Title
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={form.data.title}
                                                                onChange={(event) => form.setData('title', event.target.value)}
                                                                className="mt-2 w-full rounded-xl border-slate-200 text-sm font-semibold focus:border-primary-400 focus:ring-primary-200"
                                                                placeholder="Campaign post name"
                                                            />
                                                            {getFieldError('title') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('title')}</span>}
                                                        </label>
                                                    )}

                                                    <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
                                                            {form.data.format === 'reel' ? 'Reel Description' : form.data.format === 'story' ? 'Story Text' : 'Caption'}
                                                        </span>
                                                        <textarea
                                                            value={form.data.caption}
                                                            onChange={(event) => form.setData('caption', event.target.value)}
                                                            rows={form.data.format === 'reel' ? 5 : 7}
                                                            className="mt-2 w-full rounded-xl border-slate-200 text-sm font-semibold leading-6 focus:border-primary-400 focus:ring-primary-200"
                                                            placeholder={form.data.format === 'reel' ? 'Type your reel description here...' : 'Write the post caption...'}
                                                        />
                                                        <div className="mt-2 flex items-center justify-between">
                                                            <span className="text-xs font-semibold text-slate-500">Keep it clear and action-oriented.</span>
                                                            <span className={`text-xs font-black ${captionLength > 2200 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                                {captionLength}/2200
                                                            </span>
                                                        </div>
                                                        {getFieldError('caption') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('caption')}</span>}
                                                    </label>

                                                    {form.data.format !== 'story' && (
                                                        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                                                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                                                <Hash className="h-3.5 w-3.5" />
                                                                Hashtags
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={hashtagText}
                                                                onChange={(event) => setHashtagText(event.target.value)}
                                                                className="mt-2 w-full rounded-xl border-slate-200 text-sm font-semibold focus:border-primary-400 focus:ring-primary-200"
                                                                placeholder="#launch #creator"
                                                            />
                                                            <div className="mt-2 flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-slate-500">Use commas or spaces.</span>
                                                                <span className={`text-xs font-black ${hashtagCount > 30 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                                    {hashtagCount}/30
                                                                </span>
                                                            </div>
                                                            {getFieldError('hashtags') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('hashtags')}</span>}
                                                        </label>
                                                    )}

                                                    {form.data.format === 'reel' && (
                                                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <p className="text-sm font-black text-slate-900">Thumbnail</p>
                                                                {selectedReelThumbnail && (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                                                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                                                        Selected
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-700">
                                                                <label className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name="reel-thumbnail-source"
                                                                        value="library"
                                                                        checked={reelThumbnailSource === 'library'}
                                                                        onChange={() => {
                                                                            setReelThumbnailSource('library');
                                                                            form.setData('options', { ...form.data.options, reel_thumbnail_source: 'library' });
                                                                        }}
                                                                        className="border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    Select from library
                                                                </label>
                                                                <label className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name="reel-thumbnail-source"
                                                                        value="upload"
                                                                        checked={reelThumbnailSource === 'upload'}
                                                                        onChange={() => {
                                                                            setReelThumbnailSource('upload');
                                                                            form.setData('options', { ...form.data.options, reel_thumbnail_source: 'upload' });
                                                                        }}
                                                                        className="border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    Upload custom
                                                                </label>
                                                                <label className="inline-flex items-center gap-2">
                                                                    <input
                                                                        type="radio"
                                                                        name="reel-thumbnail-source"
                                                                        value="generate"
                                                                        checked={reelThumbnailSource === 'generate'}
                                                                        onChange={() => {
                                                                            setReelThumbnailSource('generate');
                                                                            setThumbnailCaptureError('');
                                                                            form.setData('options', { ...form.data.options, reel_thumbnail_source: 'generate' });
                                                                        }}
                                                                        className="border-slate-300 text-primary-600 focus:ring-primary-500"
                                                                    />
                                                                    Generate from video
                                                                </label>
                                                            </div>

                                                            {reelThumbnailSource === 'library' ? (
                                                                imageAssets.length === 0 ? (
                                                                    <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-500">
                                                                        No image assets found. Switch to upload to add a custom thumbnail.
                                                                    </p>
                                                                ) : (
                                                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                                        {imageAssets.map((asset) => {
                                                                            const selected = Number(form.data.options.reel_thumbnail_media_id || 0) === asset.id;

                                                                            return (
                                                                                <button
                                                                                    key={asset.id}
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        clearStepErrors(3);
                                                                                        form.setData('options', {
                                                                                            ...form.data.options,
                                                                                            reel_thumbnail_media_id: asset.id,
                                                                                            reel_thumbnail_source: 'library',
                                                                                        });
                                                                                    }}
                                                                                    className={`overflow-hidden rounded-xl border text-left ${selected ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white'}`}
                                                                                >
                                                                                    <div className="aspect-video bg-slate-100">
                                                                                        <img src={asset.url} alt={asset.title || asset.original_name} className="h-full w-full object-cover" />
                                                                                    </div>
                                                                                    <p className="truncate px-2 py-1.5 text-xs font-bold text-slate-700">{asset.title || asset.original_name}</p>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )
                                                            ) : reelThumbnailSource === 'upload' ? (
                                                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                                                                    <label className="block">
                                                                        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Upload Thumbnail</span>
                                                                        <input
                                                                            type="file"
                                                                            accept="image/*"
                                                                            onChange={(event) => {
                                                                                const file = event.target.files?.[0] || null;
                                                                                thumbnailUploadForm.setData('media', file);
                                                                            }}
                                                                            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-slate-700"
                                                                        />
                                                                    </label>
                                                                    <button
                                                                        type="button"
                                                                        onClick={handleReelThumbnailUpload}
                                                                        disabled={thumbnailUploadForm.processing}
                                                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-200 disabled:opacity-60"
                                                                    >
                                                                        <Upload className="h-4 w-4" />
                                                                        {thumbnailUploadForm.processing ? 'Uploading...' : 'Upload Thumbnail'}
                                                                    </button>
                                                                    <p className="text-xs font-semibold text-slate-500">
                                                                        Upload a custom thumbnail image (9:16 ratio recommended).
                                                                    </p>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                                                                    {selectedReelVideoAsset ? (
                                                                        <>
                                                                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                                                                                <video
                                                                                    ref={generateThumbnailVideoRef}
                                                                                    src={selectedReelVideoAsset.url}
                                                                                    onLoadedMetadata={(event) => {
                                                                                        const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
                                                                                        setThumbnailVideoDuration(duration);
                                                                                        if (duration > 0) {
                                                                                            setThumbnailCaptureSecond(Math.min(1, Math.max(0, duration - 0.1)));
                                                                                        }
                                                                                    }}
                                                                                    className="max-h-72 w-full object-contain"
                                                                                    controls
                                                                                    muted
                                                                                    playsInline
                                                                                    crossOrigin="anonymous"
                                                                                />
                                                                            </div>

                                                                            <div className="space-y-2">
                                                                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500">
                                                                                    <span>Frame Time</span>
                                                                                    <span>{thumbnailCaptureSecond.toFixed(1)}s</span>
                                                                                </div>
                                                                                <input
                                                                                    type="range"
                                                                                    min="0"
                                                                                    max={Math.max(0.1, thumbnailVideoDuration || 0.1)}
                                                                                    step="0.1"
                                                                                    value={Math.min(thumbnailCaptureSecond, Math.max(0.1, thumbnailVideoDuration || 0.1))}
                                                                                    onChange={(event) => {
                                                                                        const nextSecond = Number(event.target.value);
                                                                                        setThumbnailCaptureSecond(nextSecond);
                                                                                        if (generateThumbnailVideoRef.current && Number.isFinite(nextSecond)) {
                                                                                            generateThumbnailVideoRef.current.currentTime = nextSecond;
                                                                                        }
                                                                                    }}
                                                                                    className="w-full accent-primary-600"
                                                                                />
                                                                            </div>

                                                                            <button
                                                                                type="button"
                                                                                onClick={handleGenerateReelThumbnail}
                                                                                disabled={isGeneratingThumbnail || thumbnailUploadForm.processing || thumbnailVideoDuration <= 0}
                                                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                                                            >
                                                                                <Sparkles className="h-4 w-4" />
                                                                                {isGeneratingThumbnail || thumbnailUploadForm.processing ? 'Generating...' : 'Generate Thumbnail'}
                                                                            </button>

                                                                            <p className="text-xs font-semibold text-slate-500">
                                                                                Capture a frame from your selected reel video and save it to library automatically.
                                                                            </p>
                                                                        </>
                                                                    ) : (
                                                                        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-500">
                                                                            Select a reel video in Step 2 to generate a thumbnail.
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {getFieldError('options.reel_thumbnail_media_id') && (
                                                                <span className="block text-xs font-bold text-rose-600">{getFieldError('options.reel_thumbnail_media_id')}</span>
                                                            )}
                                                            {thumbnailCaptureError && (
                                                                <span className="block text-xs font-bold text-rose-600">{thumbnailCaptureError}</span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className={`grid grid-cols-1 gap-3 ${form.data.format === 'image' ? 'sm:grid-cols-2' : ''}`}>
                                                        {form.data.format === 'image' && (
                                                            <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                                                                <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                                                    <Eye className="h-3.5 w-3.5" />
                                                                    Alt Text
                                                                </span>
                                                                <input
                                                                    type="text"
                                                                    value={form.data.options.alt_text}
                                                                    onChange={(event) => form.setData('options', { ...form.data.options, alt_text: event.target.value })}
                                                                    className="mt-2 w-full rounded-xl border-slate-200 text-sm font-semibold focus:border-primary-400 focus:ring-primary-200"
                                                                    placeholder="Image accessibility text"
                                                                />
                                                                {getFieldError('options.alt_text') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('options.alt_text')}</span>}
                                                            </label>
                                                        )}
                                                        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                                                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
                                                                <MapPin className="h-3.5 w-3.5" />
                                                                Location ID
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={form.data.options.location_id}
                                                                onChange={(event) => form.setData('options', { ...form.data.options, location_id: event.target.value })}
                                                                className="mt-2 w-full rounded-xl border-slate-200 text-sm font-semibold focus:border-primary-400 focus:ring-primary-200"
                                                                placeholder="Optional Meta location"
                                                            />
                                                            {getFieldError('options.location_id') && <span className="mt-1 block text-xs font-bold text-rose-600">{getFieldError('options.location_id')}</span>}
                                                        </label>
                                                    </div>
                                                </div>

                                                <aside className="space-y-4 xl:sticky xl:top-24 self-start">
                                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Instagram Preview</p>
                                                        <div className="mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
                                                            <div className="flex items-center justify-between px-3 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="h-9 w-9 rounded-full bg-linear-to-br from-fuchsia-500 via-rose-500 to-amber-400 p-[1.5px]">
                                                                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-black uppercase text-slate-700">
                                                                            {previewHandle.slice(0, 2)}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-black text-slate-900">@{previewHandle}</p>
                                                                        <p className="text-[11px] font-semibold text-slate-500">Preview mode</p>
                                                                    </div>
                                                                </div>
                                                                <MoreHorizontal className="h-4 w-4 text-slate-500" />
                                                            </div>
                                                            <div className="relative aspect-[4/5] bg-slate-100">
                                                                {previewCardAsset ? (
                                                                    previewCardAsset.media_type === 'video' ? (
                                                                        <video src={previewCardAsset.url} className="h-full w-full object-cover" muted autoPlay loop />
                                                                    ) : (
                                                                        <img src={previewCardAsset.url} alt={previewCardAsset.title || previewCardAsset.original_name} className="h-full w-full object-cover" />
                                                                    )
                                                                ) : (
                                                                    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">Select media in Step 2</div>
                                                                )}
                                                                {form.data.format === 'reel' && (
                                                                    <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                                                                        Reel
                                                                    </span>
                                                                )}
                                                                {form.data.format === 'carousel' && selectedAssets.length > 1 && (
                                                                    <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-black text-white">
                                                                        1/{selectedAssets.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-2 px-3 py-3">
                                                                <div className="flex items-center justify-between text-slate-700">
                                                                    <div className="flex items-center gap-3">
                                                                        <Heart className="h-5 w-5" />
                                                                        <MessageCircle className="h-5 w-5" />
                                                                        <Send className="h-5 w-5" />
                                                                    </div>
                                                                    <Bookmark className="h-5 w-5" />
                                                                </div>
                                                                <p className="text-xs font-black text-slate-900">1,284 likes</p>
                                                                {form.data.title && <p className="text-xs font-black text-slate-900">{form.data.title}</p>}
                                                                <p className="text-xs font-semibold leading-5 text-slate-700">
                                                                    <span className="mr-1 font-black text-slate-900">@{previewHandle}</span>
                                                                    {previewCaptionShort}
                                                                </p>
                                                                {previewHashtagLine && <p className="text-xs font-black text-primary-700">{previewHashtagLine}</p>}
                                                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Just now</p>
                                                            </div>
                                                        </div>
                                                    </div>


                                                </aside>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className={`flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between ${step === 3 ? 'sticky bottom-0 z-10 bg-white/95 backdrop-blur' : ''}`}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(Math.max(1, step - 1))}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                                        disabled={step === 1}
                                    >
                                        Back
                                    </button>
                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() => submit('draft')}
                                            disabled={form.processing || !canSaveDraft}
                                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                                        >
                                            Save Draft
                                        </button>
                                        {step < 3 ? (
                                            <button
                                                type="button"
                                                onClick={handleContinue}
                                                disabled={!isStepComplete(step)}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Continue
                                                <ChevronRight className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={openScheduleModal}
                                                disabled={form.processing}
                                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
                                            >
                                                <Send className="h-4 w-4" />
                                                Schedule
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </section>
                        <div className="mt-4 border-t border-slate-100 pt-4">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Saved Drafts</p>
                                <span className="text-xs font-bold text-slate-500">{draftPosts.length} draft{draftPosts.length === 1 ? '' : 's'}</span>
                            </div>

                            {draftPosts.length === 0 ? (
                                <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
                                    No drafts yet. Use Save Draft after selecting media.
                                </p>
                            ) : (
                                <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                    {draftPosts.map((draftPost) => (
                                        <div key={draftPost.id} className="w-[290px] shrink-0 rounded-2xl border border-slate-200 bg-white p-2.5">
                                            <InstagramPostPreview post={draftPost} />
                                            <div className="mt-2 flex items-center justify-between gap-2 px-1">
                                                <span className="truncate text-xs font-black capitalize text-slate-700">{draftPost.format} draft</span>
                                                <span className="text-[11px] font-semibold text-slate-500">
                                                    {draftPost.scheduled_at
                                                        ? `Planned ${new Date(draftPost.scheduled_at).toLocaleDateString()}`
                                                        : 'No schedule'}
                                                </span>
                                            </div>
                                            <div className="mt-2 px-1">
                                                <button
                                                    type="button"
                                                    onClick={() => continueDraft(draftPost)}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-black text-white transition hover:bg-primary-700"
                                                >
                                                    Continue
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {showLibraryModal && (
                <SchedulerModalOverlay>
                    <SchedulerModalShell
                        className="max-w-5xl"
                        title="Media Library"
                        description="Pick media for Step 2 and continue."
                        icon={GalleryHorizontal}
                        onClose={closeLibraryModal}
                        closeLabel="Close media library"
                        footer={(
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs font-semibold text-slate-500">
                                    Selected media: <span className="font-black text-slate-900">{form.data.media_asset_ids.length}</span>
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => setShowLibraryModal(false)}
                                    size="sm"
                                    className="w-full sm:w-auto"
                                >
                                    Done
                                </Button>
                            </div>
                        )}
                    >
                        <div className="space-y-4">
                            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900">Choose reusable scheduler media</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">Uploads stay in your scheduler library for future posts.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    icon={<Upload className="h-4 w-4" />}
                                    onClick={() => setShowLibraryUploadModal(true)}
                                    className="w-full sm:w-auto"
                                >
                                    Upload Media
                                </Button>
                            </div>

                            {media_assets.length === 0 ? (
                                <EmptyState
                                    className="rounded-2xl border border-slate-200 bg-slate-50 py-10"
                                    title="No media uploaded yet"
                                    description="Upload media in this modal, then select it for your scheduled post."
                                    icon={Image}
                                />
                            ) : libraryModalAssets.length === 0 ? (
                                <EmptyState
                                    className="rounded-2xl border border-slate-200 bg-slate-50 py-10"
                                    title={schedulerUploadOption.emptyTitle}
                                    description={schedulerUploadOption.emptyDescription}
                                    icon={form.data.format === 'image' ? Image : Video}
                                />
                            ) : (
                                <div className="grid max-h-[54vh] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                                    {libraryModalAssets.map((asset) => {
                                        const selected = form.data.media_asset_ids.includes(asset.id);
                                        const assetTitle = asset.title || asset.original_name;

                                        return (
                                            <button
                                                type="button"
                                                key={asset.id}
                                                onClick={() => toggleAsset(asset)}
                                                aria-pressed={selected}
                                                aria-label={`${selected ? 'Deselect' : 'Select'} ${assetTitle}`}
                                                className={`relative overflow-hidden rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${selected
                                                        ? 'border-primary-400 bg-primary-50 shadow-sm'
                                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {selected && (
                                                    <span className="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow" aria-hidden="true">
                                                        <Check className="h-4 w-4" />
                                                    </span>
                                                )}
                                                <div className="aspect-video bg-slate-100">
                                                    {asset.media_type === 'video' ? (
                                                        <video src={asset.url} className="h-full w-full object-cover" muted />
                                                    ) : (
                                                        <img src={asset.url} alt={assetTitle} className="h-full w-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="p-3">
                                                    <p className="truncate text-sm font-black text-slate-900" title={assetTitle}>{assetTitle}</p>
                                                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold capitalize text-slate-500">
                                                        {asset.media_type === 'video' ? <Video className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
                                                        {asset.media_type}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </SchedulerModalShell>
                </SchedulerModalOverlay>
            )}

            {showLibraryUploadModal && (
                <SchedulerModalOverlay zIndexClass="z-[400]" className="bg-slate-900/55">
                    <SchedulerModalShell
                        as="form"
                        onSubmit={submitLibraryUpload}
                        className="max-w-2xl"
                        title="Upload Media"
                        description="Add an image or video to the scheduler library."
                        icon={Upload}
                        onClose={closeLibraryUploadModal}
                        closeDisabled={libraryUploadForm.processing}
                        closeLabel="Close upload modal"
                        footer={(
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeLibraryUploadModal}
                                    disabled={libraryUploadForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={libraryUploadForm.processing}
                                    icon={<Upload className="h-4 w-4" />}
                                >
                                    {libraryUploadForm.processing ? `Uploading ${Math.round(libraryUploadForm.progress?.percentage || 0)}%` : 'Upload Media'}
                                </Button>
                            </div>
                        )}
                    >
                        <div className="space-y-4">
                            <SchedulerUploadDropzone
                                id="schedule-library-upload-media"
                                accept={schedulerUploadOption.accept}
                                helper={schedulerUploadOption.helper}
                                onChange={(event) => {
                                    libraryUploadForm.clearErrors('media');
                                    libraryUploadForm.setData('media', event.target.files?.[0] || null);
                                }}
                                file={selectedLibraryUploadFile}
                                error={libraryUploadForm.errors.media}
                                icon={Upload}
                            />

                            <SchedulerUploadPreview
                                file={selectedLibraryUploadFile}
                                previewUrl={libraryUploadPreviewUrl}
                                isImagePreview={isLibraryImagePreview}
                                isVideoPreview={isLibraryVideoPreview}
                            />

                            <SchedulerUploadProgress progress={libraryUploadForm.progress} />
                        </div>
                    </SchedulerModalShell>
                </SchedulerModalOverlay>
            )}

            {showScheduleModal && (
                <SchedulerModalOverlay className="bg-slate-900/40">
                    <SchedulerModalShell
                        className="max-w-xl"
                        title="Schedule Post"
                        description="Choose a future time, or publish this post now."
                        icon={CalendarPlus}
                        onClose={() => setShowScheduleModal(false)}
                        closeLabel="Close schedule post modal"
                        footer={(
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => setShowScheduleModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handlePostNow}
                                    disabled={form.processing}
                                >
                                    Post now
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleScheduleFromModal}
                                    disabled={form.processing}
                                >
                                    Schedule
                                </Button>
                            </div>
                        )}
                    >
                        <div className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Date</span>
                                    <input
                                        type="date"
                                        value={scheduleDate}
                                        onChange={(event) => setScheduleDate(event.target.value)}
                                        className="mt-2 min-h-11 w-full rounded-xl border-slate-200 text-sm font-bold focus:border-primary-400 focus:ring-primary-200"
                                    />
                                </label>

                                <div>
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Time</span>
                                    <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="12"
                                            value={scheduleHour}
                                            onChange={(event) => setScheduleHour(event.target.value)}
                                            className="min-h-11 w-full rounded-xl border-slate-200 text-center text-sm font-bold focus:border-primary-400 focus:ring-primary-200"
                                            aria-label="Schedule hour"
                                        />
                                        <span className="text-lg font-black text-slate-500">:</span>
                                        <input
                                            type="number"
                                            min="0"
                                            max="59"
                                            value={scheduleMinute}
                                            onChange={(event) => setScheduleMinute(event.target.value)}
                                            className="min-h-11 w-full rounded-xl border-slate-200 text-center text-sm font-bold focus:border-primary-400 focus:ring-primary-200"
                                            aria-label="Schedule minute"
                                        />
                                        <div className="inline-flex overflow-hidden rounded-xl border border-slate-200" role="group" aria-label="Select AM or PM">
                                            {['AM', 'PM'].map((period) => (
                                                <button
                                                    key={period}
                                                    type="button"
                                                    onClick={() => setSchedulePeriod(period)}
                                                    aria-pressed={schedulePeriod === period}
                                                    className={`min-h-11 px-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${schedulePeriod === period
                                                            ? 'bg-slate-900 text-white'
                                                            : 'bg-white text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                >
                                                    {period}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {(scheduleError || modalTimeIsPast) && (
                                <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
                                    <p className="text-sm font-black">Time is in the past</p>
                                    <p className="mt-1 text-sm font-semibold">
                                        {scheduleError || 'Please select a future date and time to schedule your post.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </SchedulerModalShell>
                </SchedulerModalOverlay>
            )}

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
