import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import Button from '@/Components/Button';
import InstagramAccountSelector from '@/Components/Instagram/InstagramAccountSelector';
import useInstagramSelectedAccount from '@/Components/Instagram/useInstagramSelectedAccount';
import { AlertCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import FlowContent from './Partials/FlowContent';
import CreateHeaderActions from './Partials/CreateHeaderActions';
import PreviewPhone from './Partials/PreviewPhone';
import NoAccountConnectedState from './Partials/NoAccountConnectedState';
import {
    CTA_RECOMMENDED_MAX,
    MAX_PUBLIC_COMMENT_REPLIES,
    MAX_REPLY_MESSAGE_LENGTH,
    MIN_SYSTEM_PUBLIC_COMMENT_REPLIES,
    buildSystemPublicCommentReplies,
    normalizePublicCommentReplies,
} from './createUtils';
import { compressImageToJpeg, getReplyImageLimits } from '@/Utils/imageCompression';

const { maxBytes: MAX_REPLY_IMAGE_BYTES, maxInputBytes: MAX_REPLY_IMAGE_INPUT_BYTES } = getReplyImageLimits();
const LINK_LINE_PATTERN = /^(?<label>[^:\n]{1,80})\s*:\s*(?<url>https?:\/\/\S+)$/im;
const ASK_TO_FOLLOW_PROFILE_BUTTON_LABEL = 'Visit Profile';
const ASK_TO_FOLLOW_CONFIRM_BUTTON_LABEL = 'Yes, I follow';
const CONTENT_SOURCE_OPTIONS = [
    { value: 'media', label: 'Post / Reel' },
    { value: 'story', label: 'Story' },
];
const COMMENT_TRIGGER_TYPES = ['post', 'reel'];

const defaultTriggerTypeForSource = (source) => (source === 'story' ? 'story' : 'post');
const normalizeTriggerType = (value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();

    if (['post', 'reel', 'story'].includes(normalizedValue)) {
        return normalizedValue;
    }

    return null;
};
const resolveContentSourceFromTriggerType = (triggerType) => (
    normalizeTriggerType(triggerType) === 'story' ? 'story' : 'media'
);
const dialogIconToneClasses = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    warning: 'border-warning-200 bg-warning-50 text-warning-700',
};

function WorkflowDialog({
    cancelLabel,
    confirmLabel,
    confirmVariant = 'primary',
    description,
    eyebrow,
    iconTone = 'amber',
    onCancel,
    onConfirm,
    title,
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                onClick={onCancel}
                aria-label={`Close ${eyebrow.toLowerCase()} dialog`}
            />

            <div
                className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${eyebrow.replace(/\s+/g, '-').toLowerCase()}-dialog-title`}
            >
                <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${dialogIconToneClasses[iconTone] || dialogIconToneClasses.amber}`}>
                        <AlertCircle className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{eyebrow}</p>
                        <h4 id={`${eyebrow.replace(/\s+/g, '-').toLowerCase()}-dialog-title`} className="mt-1 break-words text-base font-bold text-slate-900">
                            {title}
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        {cancelLabel}
                    </Button>
                    <Button type="button" variant={confirmVariant} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

const buildSingleReplyMessage = (variant = null) => {
    if (typeof variant === 'string') {
        return {
            message_text: variant,
            media_url: '',
            preview_media_url: '',
        };
    }

    return {
        message_text: variant?.message_text || '',
        media_url: variant?.media_url || '',
        preview_media_url: variant?.preview_media_url || '',
    };
};

export default function Create({
    auth,
    account = null,
    accounts = [],
    selectedAccountId = null,
    connectedCount = 0,
    canConnectMore = false,
    flow = null,
    autodm_templates = null,
    duplicate_trigger_media_urls = [],
    duplicate_trigger_media_urls_by_account = {},
    lead_forms = [],
}) {
    const isEditMode = Boolean(flow?.id);
    const accountList = Array.isArray(accounts) && accounts.length > 0
        ? accounts
        : (account ? [account] : []);
    const createPrefill = useMemo(() => {
        if (typeof window === 'undefined') {
            return {
                accountId: 0,
                triggerType: null,
                triggerValue: '',
                contentSource: 'media',
            };
        }

        const search = new URLSearchParams(window.location.search);
        const prefillAccountId = Number(search.get('instagram_account_id') || 0);
        const prefillTriggerType = normalizeTriggerType(search.get('trigger_type'));
        const prefillTriggerValue = String(search.get('instagram_media_id') || '').trim();

        return {
            accountId: Number.isFinite(prefillAccountId) && prefillAccountId > 0 ? Math.trunc(prefillAccountId) : 0,
            triggerType: prefillTriggerType,
            triggerValue: prefillTriggerValue,
            contentSource: resolveContentSourceFromTriggerType(prefillTriggerType),
        };
    }, []);
    const debugAutodmPrefill = useMemo(() => {
        if (typeof window === 'undefined') {
            return false;
        }

        const search = new URLSearchParams(window.location.search);
        const hasDebugQuery = search.get('autodm_debug') === '1';
        const hasDebugStorage = window.localStorage?.getItem('autodm_prefill_debug') === '1';

        return hasDebugQuery || hasDebugStorage;
    }, []);
    const effectiveConnectedCount = Number.isFinite(Number(connectedCount))
        ? Number(connectedCount)
        : accountList.length;
    const maxInstaCards = 5;
    const accountConnectHref = canConnectMore
        ? route('settings', { tab: 'integration' }, false)
        : route('settings.upgrade', [], false);
    const fallbackAccount = accountList[0] || null;
    const initialInstagramAccountId = Number(
        flow?.instagram_account_id
        || selectedAccountId
        || createPrefill.accountId
        || fallbackAccount?.id
        || 0
    ) || '';
    const {
        selectedAccountId: persistedSelectedAccountId,
        selectAccount,
    } = useInstagramSelectedAccount({
        accounts: accountList,
        initialSelectedAccountId: initialInstagramAccountId,
        preferStored: !isEditMode && createPrefill.accountId <= 0,
    });
    const initialKeywordArray = Array.isArray(flow?.keywords) ? flow.keywords : [];
    const initialReplyMessages = [buildSingleReplyMessage(Array.isArray(flow?.reply_messages) ? flow.reply_messages[0] : null)];
    const initialPublicReplyMessages = normalizePublicCommentReplies(
        flow?.public_comment_reply,
        flow?.name || '',
        initialKeywordArray
    );
    const initialReminderMessages = Array.isArray(flow?.reminder_messages) && flow.reminder_messages.length > 0
        ? flow.reminder_messages.map((message) => String(message || ''))
        : [''];
    const initialContentSource = flow?.trigger_type === 'story' ? 'story' : 'media';
    const initialResolvedContentSource = flow?.trigger_type
        ? resolveContentSourceFromTriggerType(flow?.trigger_type)
        : createPrefill.contentSource;
    const initialNonEditTriggerType = createPrefill.triggerType || defaultTriggerTypeForSource(initialResolvedContentSource);
    const initialIsCommentTriggerFlow = flow
        ? COMMENT_TRIGGER_TYPES.includes(String(flow?.trigger_type || '').toLowerCase())
        : COMMENT_TRIGGER_TYPES.includes(String(initialNonEditTriggerType || '').toLowerCase());
    const initialMatchAllComments = initialIsCommentTriggerFlow
        ? Boolean(flow?.match_all_comments)
        : false;
    const templateUseCases = Array.isArray(autodm_templates?.use_cases)
        ? autodm_templates.use_cases
        : [];
    const flowTemplates = Array.isArray(autodm_templates?.templates)
        ? autodm_templates.templates
        : [];

    const initialFormData = {
        instagram_account_id: initialInstagramAccountId,
        name: flow?.name || '',
        trigger_type: flow?.trigger_type || initialNonEditTriggerType,
        trigger_value: flow?.trigger_value || createPrefill.triggerValue,
        trigger_media_url: flow?.trigger_media_url || '',
        lead_form_id: flow?.lead_form_id || '',
        keywords: initialKeywordArray.join(','),
        match_all_comments: initialMatchAllComments,
        reply_messages: initialReplyMessages,
        opening_message_enabled: Boolean(flow?.opening_message_enabled),
        opening_message: flow?.opening_message || '',
        opening_button_text: flow?.opening_button_text || '',
        public_reply_enabled: initialIsCommentTriggerFlow ? true : false,
        public_comment_reply: initialIsCommentTriggerFlow ? initialPublicReplyMessages : [],
        public_reply_limit_enabled: initialIsCommentTriggerFlow ? Boolean(flow?.public_reply_limit_enabled) : false,
        public_reply_limit_count: flow?.public_reply_limit_count || 200,
        ask_to_follow_enabled: Boolean(flow?.ask_to_follow_enabled),
        ask_to_follow_strict: Boolean(flow?.ask_to_follow_strict),
        ask_to_follow_message: flow?.ask_to_follow_message || '',
        reminder_enabled: Boolean(flow?.reminder_enabled),
        reminder_delay_hours: Number(flow?.reminder_delay_hours || 20),
        reminder_messages: initialReminderMessages,
        reminder_primary_button_text: flow?.reminder_primary_button_text || 'Show me more',
        reminder_secondary_button_text: flow?.reminder_secondary_button_text || 'Not now',
        reminder_more_message: flow?.reminder_more_message || 'Awesome. Tell me what you need next and I will help.',
        reminder_offer_url: flow?.reminder_offer_url || '',
        reminder_offer_button_text: flow?.reminder_offer_button_text || 'Get Premium',
        retrigger_existing: false,
    };

    const { data, setData, post, patch, processing, errors, transform, isDirty } = useForm(initialFormData);

    useEffect(() => {
        const nextAccountId = Number(persistedSelectedAccountId || 0);
        const currentAccountId = Number(data.instagram_account_id || 0);

        if (nextAccountId <= 0 || nextAccountId === currentAccountId) {
            return;
        }

        setData('instagram_account_id', nextAccountId);
    }, [data.instagram_account_id, persistedSelectedAccountId, setData]);

    const selectedAccount = useMemo(() => {
        if (!accountList.length) {
            return null;
        }

        const selectedId = Number(data.instagram_account_id || 0);
        if (selectedId > 0) {
            return accountList.find((item) => Number(item.id) === selectedId) || accountList[0];
        }

        return accountList[0];
    }, [accountList, data.instagram_account_id]);

    const [mediaList, setMediaList] = useState([]);
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [loadingMoreMedia, setLoadingMoreMedia] = useState(false);
    const [hasMoreMedia, setHasMoreMedia] = useState(false);
    const [nextMediaCursor, setNextMediaCursor] = useState(null);
    const [mediaError, setMediaError] = useState('');
    const [contentSource, setContentSource] = useState(initialResolvedContentSource || initialContentSource);
    const [keywordInput, setKeywordInput] = useState('');
    const [keywordChips, setKeywordChips] = useState(() => initialKeywordArray);
    const [activeTemplateId, setActiveTemplateId] = useState(null);
    const [templateToConfirm, setTemplateToConfirm] = useState(null);
    const [templateSaveDialogOpen, setTemplateSaveDialogOpen] = useState(false);
    const [templateSaveProcessing, setTemplateSaveProcessing] = useState(false);
    const [templateSaveErrors, setTemplateSaveErrors] = useState({});
    const [templateDraft, setTemplateDraft] = useState(() => ({
        title: '',
        name: '',
        badge: '',
        description: '',
        use_case_id: templateUseCases[0]?.id ? String(templateUseCases[0].id) : '',
        is_system: false,
        is_default: false,
    }));
    const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
    const [pendingVisit, setPendingVisit] = useState(null);
    const [simulatorComment, setSimulatorComment] = useState('');
    const [simulationMode, setSimulationMode] = useState('initial_trigger');
    const [simulationResult, setSimulationResult] = useState(null);
    const [simulationPlayback, setSimulationPlayback] = useState({
        isRunning: false,
        currentStepIndex: -1,
        timelineSteps: [],
        startedAt: null,
        finishedAt: null,
        runId: 0,
    });
    const isCommentTriggerFlow = useMemo(
        () => COMMENT_TRIGGER_TYPES.includes(String(data.trigger_type || '').toLowerCase()),
        [data.trigger_type]
    );
    const [replyLinkEditors, setReplyLinkEditors] = useState({});
    const [pendingReplyImages, setPendingReplyImages] = useState({});
    const [replyImageErrors, setReplyImageErrors] = useState({});
    const [previewScene, setPreviewScene] = useState('content');
    const [activePublicReplyIndex, setActivePublicReplyIndex] = useState(0);
    const [visibleStartIndex, setVisibleStartIndex] = useState(0);
    const [visibleEndIndex, setVisibleEndIndex] = useState(0);
    const [canSlidePrev, setCanSlidePrev] = useState(false);
    const [canSlideNext, setCanSlideNext] = useState(false);
    const requestSeqRef = useRef(0);
    const allowNextVisitRef = useRef(false);
    const mediaSwiperRef = useRef(null);
    const mediaListRef = useRef([]);
    const hasHydratedSelectedSlideRef = useRef(false);
    const shouldHydratePrefilledTriggerRef = useRef(Boolean(!isEditMode && createPrefill.triggerValue));
    const hasAttemptedPrefilledLookupRef = useRef(false);
    const isHydratingPrefilledTriggerRef = useRef(false);
    const hasFinishedInitialMediaLoadRef = useRef(false);
    const pendingReplyImagesRef = useRef({});
    const simulationTimerRef = useRef(null);
    const simulationRunIdRef = useRef(0);

    const logPrefillDebug = useCallback((event, payload = {}) => {
        if (!debugAutodmPrefill) {
            return;
        }

        console.debug('[AutoDM Prefill]', event, payload);
    }, [debugAutodmPrefill]);

    useEffect(() => {
        mediaListRef.current = mediaList;
    }, [mediaList]);

    useEffect(() => {
        pendingReplyImagesRef.current = pendingReplyImages;
    }, [pendingReplyImages]);

    useEffect(() => {
        if (templateUseCases.length === 0 || templateDraft.use_case_id) {
            return;
        }

        setTemplateDraft((prev) => ({
            ...prev,
            use_case_id: String(templateUseCases[0].id),
        }));
    }, [templateUseCases, templateDraft.use_case_id]);

    useEffect(() => () => {
        Object.values(pendingReplyImagesRef.current).forEach((item) => {
            if (item?.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
    }, []);

    useEffect(() => () => {
        if (simulationTimerRef.current) {
            clearTimeout(simulationTimerRef.current);
            simulationTimerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (selectedAccount?.id) {
            fetchMedia(selectedAccount.id);
        } else {
            setMediaList([]);
            setHasMoreMedia(false);
            setNextMediaCursor(null);
        }
    }, [selectedAccount?.id, contentSource]);

    const syncMediaSwiperState = useCallback((swiperInstance = null) => {
        const swiper = swiperInstance || mediaSwiperRef.current;
        if (!swiper || mediaList.length === 0) {
            setCanSlidePrev(false);
            setCanSlideNext(false);
            setVisibleStartIndex(0);
            setVisibleEndIndex(0);
            return;
        }

        const safeActiveIndex = Math.max(0, swiper.activeIndex || 0);
        const dynamicVisible = typeof swiper.slidesPerViewDynamic === 'function'
            ? swiper.slidesPerViewDynamic('current', true)
            : 1;
        const visibleCount = Math.max(1, Math.round(dynamicVisible || 1));

        setCanSlidePrev(!swiper.isBeginning);
        setCanSlideNext(!swiper.isEnd);
        setVisibleStartIndex(safeActiveIndex);
        setVisibleEndIndex(Math.min(mediaList.length - 1, safeActiveIndex + visibleCount - 1));
    }, [mediaList.length]);

    useEffect(() => {
        const swiper = mediaSwiperRef.current;
        if (!swiper) {
            return;
        }

        swiper.update();
        syncMediaSwiperState(swiper);
    }, [mediaList.length, syncMediaSwiperState]);

    useEffect(() => {
        const swiper = mediaSwiperRef.current;
        if (!swiper || mediaList.length === 0 || !isEditMode || hasHydratedSelectedSlideRef.current) {
            return;
        }

        const initialSelectedId = String(data.trigger_value || '');
        if (!initialSelectedId) {
            return;
        }

        const selectedIndex = mediaList.findIndex((item) => String(item.id) === initialSelectedId);
        if (selectedIndex < 0) {
            return;
        }

        swiper.slideTo(selectedIndex, 0);
        syncMediaSwiperState(swiper);
        hasHydratedSelectedSlideRef.current = true;
    }, [data.trigger_value, isEditMode, mediaList, syncMediaSwiperState]);

    const fetchMedia = async (accountId, options = {}) => {
        const { append = false, cursor = null } = options;
        const requestSeq = append ? requestSeqRef.current : ++requestSeqRef.current;
        const selectedTriggerId = String(data.trigger_value || '').trim();
        logPrefillDebug('fetchMedia:start', {
            accountId,
            append,
            cursor,
            source: contentSource,
            requestSeq,
            activeRequestSeq: requestSeqRef.current,
            selectedTriggerId,
        });

        if (append) {
            setLoadingMoreMedia(true);
        } else {
            setLoadingMedia(true);
        }
        setMediaError('');

        try {
            const params = {};
            if (cursor) {
                params.after = cursor;
            }
            params.source = contentSource;

            const response = await axios.get(route('autodm.fetch-media', accountId, false), { params });

            if (!append && requestSeq !== requestSeqRef.current) {
                return;
            }

            const media = Array.isArray(response?.data?.media) ? response.data.media : [];
            const nextCursor = typeof response?.data?.paging?.next_cursor === 'string'
                ? response.data.paging.next_cursor
                : null;
            const hasNextPage = Boolean(response?.data?.paging?.has_next_page && nextCursor);

            let selectedPinnedFromPrevious = false;
            let nextBaseMediaList = media;
            if (!append && selectedTriggerId) {
                const selectedInResponse = media.some((item) => String(item.id) === selectedTriggerId);
                if (!selectedInResponse) {
                    const selectedFromPrevious = mediaListRef.current.find((item) => String(item.id) === selectedTriggerId);
                    if (selectedFromPrevious) {
                        selectedPinnedFromPrevious = true;
                        nextBaseMediaList = [selectedFromPrevious, ...media];
                        logPrefillDebug('fetchMedia:preserve-selected', {
                            selectedTriggerId,
                            responseCount: media.length,
                            mergedCount: nextBaseMediaList.length,
                        });
                    }
                }
            }

            if (!append) {
                setMediaList(nextBaseMediaList);
            } else {
                setMediaList((prev) => {
                    const existingIds = new Set(prev.map((item) => item.id));
                    const newItems = media.filter((item) => !existingIds.has(item.id));
                    return [...prev, ...newItems];
                });
            }

            logPrefillDebug('fetchMedia:response', {
                append,
                source: contentSource,
                responseCount: media.length,
                nextCursor,
                hasNextPage,
                selectedTriggerId,
                selectedPinnedFromPrevious,
            });
            setNextMediaCursor(nextCursor);
            setHasMoreMedia(hasNextPage);

            const selectedStillExists = append
                ? media.some((item) => String(item.id) === selectedTriggerId)
                : nextBaseMediaList.some((item) => String(item.id) === selectedTriggerId);
            if (!append && !selectedStillExists && !isEditMode && !shouldHydratePrefilledTriggerRef.current) {
                logPrefillDebug('fetchMedia:clear-selection', {
                    reason: 'selected_not_found_after_base_fetch',
                    selectedTriggerId,
                    source: contentSource,
                    mediaCount: nextBaseMediaList.length,
                });
                setData('trigger_value', '');
                setData('trigger_type', defaultTriggerTypeForSource(contentSource));
                setData('trigger_media_url', '');
            }
        } catch (error) {
            logPrefillDebug('fetchMedia:error', {
                append,
                source: contentSource,
                selectedTriggerId,
                message: error?.message || 'unknown_error',
            });
            if (!append && requestSeq !== requestSeqRef.current) {
                return;
            }

            if (!append) {
                setMediaList([]);
                setHasMoreMedia(false);
                setNextMediaCursor(null);
            }
            setMediaError(contentSource === 'story'
                ? 'Unable to load stories for this account. Please try again.'
                : 'Unable to load media for this account. Please try again.');
        } finally {
            if (append) {
                setLoadingMoreMedia(false);
            } else if (requestSeq === requestSeqRef.current) {
                setLoadingMedia(false);
                hasFinishedInitialMediaLoadRef.current = true;
            }
        }
    };

    const fetchMediaById = async (accountId, mediaId) => {
        const normalizedMediaId = String(mediaId || '').trim();
        if (!normalizedMediaId) {
            return null;
        }
        logPrefillDebug('fetchMediaById:start', {
            accountId,
            mediaId: normalizedMediaId,
            source: contentSource,
        });

        const response = await axios.get(route('autodm.fetch-media', accountId, false), {
            params: {
                source: contentSource,
                media_id: normalizedMediaId,
            },
        });
        const media = Array.isArray(response?.data?.media) ? response.data.media : [];
        logPrefillDebug('fetchMediaById:response', {
            accountId,
            mediaId: normalizedMediaId,
            source: contentSource,
            mediaCount: media.length,
        });

        return media[0] || null;
    };

    const loadMoreMedia = () => {
        if (!selectedAccount?.id || !hasMoreMedia || !nextMediaCursor || loadingMoreMedia || loadingMedia) {
            return;
        }

        fetchMedia(selectedAccount.id, { append: true, cursor: nextMediaCursor });
    };

    const handleInstagramAccountChange = (rawValue) => {
        const normalizedAccountId = Number(selectAccount(rawValue) || 0);
        shouldHydratePrefilledTriggerRef.current = false;
        setData('instagram_account_id', normalizedAccountId > 0 ? normalizedAccountId : '');
        setData('trigger_value', '');
        setData('trigger_type', defaultTriggerTypeForSource(contentSource));
        setData('trigger_media_url', '');
        setMediaList([]);
        setHasMoreMedia(false);
        setNextMediaCursor(null);
        setMediaError('');
        hasFinishedInitialMediaLoadRef.current = false;
        hasHydratedSelectedSlideRef.current = false;
    };

    const handleContentSourceChange = (source) => {
        if (source !== 'media' && source !== 'story') {
            return;
        }

        if (source === contentSource) {
            return;
        }

        shouldHydratePrefilledTriggerRef.current = false;
        setContentSource(source);
        setData('trigger_value', '');
        setData('trigger_type', defaultTriggerTypeForSource(source));
        setData('trigger_media_url', '');
        if (source === 'story') {
            setData('public_reply_enabled', false);
            setData('public_comment_reply', []);
            setData('public_reply_limit_enabled', false);
            setData('public_reply_limit_count', 200);
        } else {
            const seededPublicReplies = normalizePublicCommentReplies(data.public_comment_reply, data.name, keywordChips);
            setData('public_reply_enabled', true);
            setData('public_comment_reply', seededPublicReplies);
        }
        setMediaList([]);
        setHasMoreMedia(false);
        setNextMediaCursor(null);
        setMediaError('');
        hasFinishedInitialMediaLoadRef.current = false;
        hasHydratedSelectedSlideRef.current = false;
    };

    const slideMedia = (direction) => {
        const swiper = mediaSwiperRef.current;
        if (!swiper || !mediaList.length) {
            return;
        }

        if (direction === 'next') {
            swiper.slideNext();
        } else {
            swiper.slidePrev();
        }
    };

    const handleMediaSelect = (item) => {
        setData('trigger_value', item.id);
        const selectedTriggerType = item.autodm_trigger_type
            || (contentSource === 'story'
                ? 'story'
                : (item.media_type === 'VIDEO' ? 'reel' : 'post'));
        setData('trigger_type', selectedTriggerType);
        setData('trigger_media_url', item.thumbnail_url || item.media_url || '');
        setPreviewScene('content');
    };

    const syncKeywordChips = (chips) => {
        setKeywordChips(chips);
        setData('keywords', chips.join(','));
    };

    const applyTemplate = (template) => {
        Object.values(pendingReplyImagesRef.current).forEach((item) => {
            if (item?.previewUrl) {
                URL.revokeObjectURL(item.previewUrl);
            }
        });
        setPendingReplyImages({});
        setReplyImageErrors({});
        setActiveTemplateId(template.id);
        const templateName = (template.name || '').trim();
        const templateKeywords = Array.isArray(template.keywords) ? template.keywords : [];
        const templatePublicReplies = Array.isArray(template.public_comment_reply) && template.public_comment_reply.length > 0
            ? template.public_comment_reply.map((message) => String(message || '').trim()).filter(Boolean)
            : [];
        const generatedPublicReplies = buildSystemPublicCommentReplies(templateName, templateKeywords);
        const mergedPublicReplies = [...new Set([...templatePublicReplies, ...generatedPublicReplies])].slice(0, MAX_PUBLIC_COMMENT_REPLIES);
        const currentIsCommentTriggerFlow = COMMENT_TRIGGER_TYPES.includes(String(data.trigger_type || '').toLowerCase());

        setData('name', template.name);
        setData('reply_messages', [buildSingleReplyMessage(Array.isArray(template.reply_messages) ? template.reply_messages[0] : null)]);
        setData('opening_message_enabled', Boolean(template.opening_message_enabled));
        setData('opening_message', template.opening_message || '');
        setData('opening_button_text', template.opening_button_text || '');
        setData('public_reply_enabled', currentIsCommentTriggerFlow ? true : false);
        setData('public_comment_reply', currentIsCommentTriggerFlow
            ? normalizePublicCommentReplies(mergedPublicReplies, templateName, templateKeywords)
            : []);
        setData('public_reply_limit_enabled', currentIsCommentTriggerFlow ? Boolean(template.public_reply_limit_enabled) : false);
        setData('public_reply_limit_count', Number(template.public_reply_limit_count || 200));
        setData('ask_to_follow_enabled', Boolean(template.ask_to_follow_enabled));
        setData('ask_to_follow_strict', Boolean(template.ask_to_follow_strict));
        setData('ask_to_follow_message', template.ask_to_follow_message || '');
        setData('reminder_enabled', Boolean(template.reminder_enabled));
        setData('reminder_delay_hours', Number(template.reminder_delay_hours || 20));
        setData('reminder_messages', Array.isArray(template.reminder_messages) && template.reminder_messages.length > 0
            ? template.reminder_messages.map((message) => String(message || ''))
            : ['']);
        setData('reminder_primary_button_text', template.reminder_primary_button_text || 'Show me more');
        setData('reminder_secondary_button_text', template.reminder_secondary_button_text || 'Not now');
        setData('reminder_more_message', template.reminder_more_message || 'Awesome. Tell me what you need next and I will help.');
        setData('reminder_offer_url', template.reminder_offer_url || '');
        setData('reminder_offer_button_text', template.reminder_offer_button_text || 'Get Premium');
        setKeywordInput('');
        syncKeywordChips(Array.isArray(template.keywords) ? template.keywords : []);
    };

    const requestApplyTemplate = (template) => {
        setTemplateToConfirm(template);
    };

    const confirmApplyTemplate = () => {
        if (!templateToConfirm) {
            return;
        }

        applyTemplate(templateToConfirm);
        setTemplateToConfirm(null);
    };

    const cancelApplyTemplate = () => {
        setTemplateToConfirm(null);
    };

    const openTemplateSaveDialog = () => {
        const defaultUseCaseId = templateUseCases[0]?.id ? String(templateUseCases[0].id) : '';
        const derivedTitle = String(data.name || '').trim();
        const normalizedKeywords = Array.isArray(keywordChips)
            ? keywordChips.map((keyword) => String(keyword || '').trim()).filter(Boolean)
            : [];

        setTemplateSaveErrors({});
        setTemplateDraft({
            title: derivedTitle !== '' ? derivedTitle : 'My AutoDM Template',
            name: derivedTitle !== '' ? derivedTitle : 'My AutoDM Template',
            badge: '',
            description: normalizedKeywords.length > 0
                ? `AutoDM template for ${normalizedKeywords.slice(0, 3).join(', ')}.`
                : '',
            use_case_id: defaultUseCaseId,
            is_system: false,
            is_default: false,
        });
        setTemplateSaveDialogOpen(true);
    };

    const closeTemplateSaveDialog = () => {
        if (templateSaveProcessing) {
            return;
        }

        setTemplateSaveDialogOpen(false);
    };

    const setTemplateDraftField = (field, value) => {
        setTemplateDraft((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const submitTemplateDraft = (event) => {
        event.preventDefault();

        if (templateSaveProcessing) {
            return;
        }

        const replyMessages = Array.isArray(data.reply_messages)
            ? data.reply_messages.map((reply) => ({
                message_text: String(reply?.message_text || '').trim(),
                media_url: String(reply?.media_url || '').trim(),
            }))
            : [];
        const reminderMessages = Array.isArray(data.reminder_messages)
            ? data.reminder_messages.map((message) => String(message || '').trim()).filter(Boolean)
            : [];
        const publicReplyMessages = Array.isArray(data.public_comment_reply)
            ? data.public_comment_reply.map((message) => String(message || '').trim()).filter(Boolean)
            : [];
        const payload = {
            use_case_id: Number(templateDraft.use_case_id || 0),
            title: String(templateDraft.title || '').trim(),
            name: String(templateDraft.name || '').trim() || String(templateDraft.title || '').trim(),
            badge: String(templateDraft.badge || '').trim(),
            description: String(templateDraft.description || '').trim(),
            trigger_type: String(data.trigger_type || 'post'),
            content_source: String(contentSource || 'media'),
            keywords: Array.isArray(keywordChips)
                ? keywordChips.map((keyword) => String(keyword || '').trim()).filter(Boolean)
                : [],
            reply_messages: replyMessages,
            opening_message_enabled: Boolean(data.opening_message_enabled),
            opening_message: String(data.opening_message || '').trim(),
            opening_button_text: String(data.opening_button_text || '').trim(),
            public_reply_enabled: Boolean(data.public_reply_enabled),
            public_comment_reply: publicReplyMessages,
            public_reply_limit_enabled: Boolean(data.public_reply_limit_enabled),
            public_reply_limit_count: Number(data.public_reply_limit_count || 200),
            ask_to_follow_enabled: Boolean(data.ask_to_follow_enabled),
            ask_to_follow_strict: Boolean(data.ask_to_follow_strict),
            ask_to_follow_message: String(data.ask_to_follow_message || '').trim(),
            reminder_enabled: Boolean(data.reminder_enabled),
            reminder_delay_hours: Number(data.reminder_delay_hours || 20),
            reminder_messages: reminderMessages,
            reminder_primary_button_text: String(data.reminder_primary_button_text || '').trim(),
            reminder_secondary_button_text: String(data.reminder_secondary_button_text || '').trim(),
            reminder_more_message: String(data.reminder_more_message || '').trim(),
            reminder_offer_url: String(data.reminder_offer_url || '').trim(),
            reminder_offer_button_text: String(data.reminder_offer_button_text || '').trim(),
            is_system: Boolean(auth?.is_super_admin && templateDraft.is_system),
            is_default: Boolean(templateDraft.is_default),
            recommended: false,
            is_active: true,
        };

        setTemplateSaveProcessing(true);
        setTemplateSaveErrors({});

        router.post(route('autodm.templates.store', [], false), payload, {
            preserveScroll: true,
            onSuccess: () => {
                setTemplateSaveDialogOpen(false);
            },
            onError: (nextErrors) => {
                setTemplateSaveErrors(nextErrors || {});
            },
            onFinish: () => {
                setTemplateSaveProcessing(false);
            },
        });
    };

    const appendKeywords = (rawText, currentChips) => {
        const tokens = rawText
            .split(',')
            .map(keyword => keyword.trim())
            .filter(Boolean);

        const nextChips = [...currentChips];

        tokens.forEach((token) => {
            const exists = nextChips.some(existing => existing.toLowerCase() === token.toLowerCase());
            if (!exists) {
                nextChips.push(token);
            }
        });

        return nextChips;
    };

    const commitKeywordInput = () => {
        if (!keywordInput.trim()) {
            return;
        }

        const nextChips = appendKeywords(keywordInput, keywordChips);
        syncKeywordChips(nextChips);
        setKeywordInput('');
    };

    const handleKeywordKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const nextChips = appendKeywords(keywordInput, keywordChips);
            syncKeywordChips(nextChips);
            setKeywordInput('');
            return;
        }

        if (e.key === 'Backspace' && keywordInput.length === 0 && keywordChips.length > 0) {
            e.preventDefault();
            const nextChips = keywordChips.slice(0, -1);
            syncKeywordChips(nextChips);
        }
    };

    const removeKeywordChip = (indexToRemove) => {
        const nextChips = keywordChips.filter((_, index) => index !== indexToRemove);
        syncKeywordChips(nextChips);
    };

    const toggleMatchAllComments = () => {
        if (!isCommentTriggerFlow) {
            return;
        }

        setData('match_all_comments', !Boolean(data.match_all_comments));
        setPreviewScene('keyword');
    };

    const setReplyVariantField = (index, field, value) => {
        const safeIndex = 0;
        const currentRaw = data.reply_messages?.[safeIndex];
        const current = typeof currentRaw === 'object' && currentRaw !== null
            ? currentRaw
            : {
                message_text: typeof currentRaw === 'string' ? currentRaw : '',
                media_url: '',
            };
        const next = [{
            ...current,
            [field]: value,
        }];
        setData('reply_messages', next);

        if (field === 'media_url' && String(value || '').trim() === '') {
            const pending = pendingReplyImagesRef.current[safeIndex];
            if (pending?.previewUrl) {
                URL.revokeObjectURL(pending.previewUrl);
            }
            setPendingReplyImages((previous) => {
                const nextPending = { ...previous };
                delete nextPending[safeIndex];
                return nextPending;
            });
            setReplyImageErrors((previous) => {
                const nextErrors = { ...previous };
                delete nextErrors[safeIndex];
                return nextErrors;
            });
        }
    };

    const setReminderMessage = (index, value) => {
        const nextMessages = Array.isArray(data.reminder_messages)
            ? [...data.reminder_messages]
            : [''];
        nextMessages[index] = value;
        setData('reminder_messages', nextMessages);
    };

    const addReminderMessage = () => {
        const currentMessages = Array.isArray(data.reminder_messages) ? data.reminder_messages : [];
        if (currentMessages.length >= 3) {
            return;
        }

        setData('reminder_messages', [...currentMessages, '']);
    };

    const removeReminderMessage = (indexToRemove) => {
        const currentMessages = Array.isArray(data.reminder_messages) ? data.reminder_messages : [];
        const nextMessages = currentMessages.filter((_, index) => index !== indexToRemove);
        setData('reminder_messages', nextMessages.length > 0 ? nextMessages : ['']);
    };

    const openReplyLinkEditor = (index) => {
        const currentDraft = replyLinkEditors[index] || {};
        setReplyLinkEditors((previous) => ({
            ...previous,
            [index]: {
                open: true,
                name: String(currentDraft.name || ''),
                value: String(currentDraft.value || ''),
            },
        }));
    };

    const closeReplyLinkEditor = (index) => {
        setReplyLinkEditors((previous) => ({
            ...previous,
            [index]: {
                open: false,
                name: '',
                value: '',
            },
        }));
    };

    const setReplyLinkEditorName = (index, name) => {
        setReplyLinkEditors((previous) => ({
            ...previous,
            [index]: {
                ...(previous[index] || { open: true, value: '' }),
                open: true,
                name,
            },
        }));
    };

    const setReplyLinkEditorValue = (index, value) => {
        setReplyLinkEditors((previous) => ({
            ...previous,
            [index]: {
                ...(previous[index] || { open: true, name: '' }),
                open: true,
                value,
            },
        }));
    };

    const saveReplyLinkEditor = (index) => {
        const draftName = String(replyLinkEditors[index]?.name || '').trim();
        const draftValue = String(replyLinkEditors[index]?.value || '').trim();
        if (!draftValue) {
            closeReplyLinkEditor(index);
            return;
        }

        const normalizedLink = /^https?:\/\//i.test(draftValue)
            ? draftValue.replace(/^http:\/\//i, 'https://')
            : `https://${draftValue}`;
        const normalizedLinkLine = draftName !== ''
            ? `${draftName}: ${normalizedLink}`
            : normalizedLink;
        const currentMessage = String(data.reply_messages[index]?.message_text || '');
        const nextMessage = currentMessage.trim().length > 0
            ? `${currentMessage.trim()}\n${normalizedLinkLine}`
            : normalizedLinkLine;
        setReplyVariantField(index, 'message_text', nextMessage);
        closeReplyLinkEditor(index);
    };

    const removeReplyLink = (index) => {
        closeReplyLinkEditor(index);
    };

    const openReplyImagePicker = (index) => {
        const input = document.getElementById(`reply-image-file-${index}`);
        if (!input) {
            return;
        }

        input.click();
    };

    const resolveReplyVariantMedia = (index, persistedMediaUrl = '', persistedPreviewMediaUrl = '') => {
        const localPreview = pendingReplyImages[index]?.previewUrl;
        if (localPreview) {
            return localPreview;
        }

        const canonicalMedia = String(persistedMediaUrl || '').trim();
        if (!canonicalMedia) {
            return '';
        }

        const previewMedia = String(persistedPreviewMediaUrl || '').trim();
        return previewMedia || canonicalMedia;
    };

    const hasPendingReplyImage = (index) => Boolean(pendingReplyImages[index]?.file);

    const getReplyImageError = (index) => replyImageErrors[index] || null;

    const setReplyImageError = (index, message) => {
        setReplyImageErrors((previous) => ({
            ...previous,
            [index]: message,
        }));
    };

    const clearReplyImageError = (index) => {
        setReplyImageErrors((previous) => {
            const nextErrors = { ...previous };
            delete nextErrors[index];
            return nextErrors;
        });
    };

    const handleReplyImageSelection = async (index, file) => {
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            setReplyImageError(index, 'Select a valid image file (PNG, JPG, WEBP, AVIF).');
            return;
        }

        if (file.size > MAX_REPLY_IMAGE_INPUT_BYTES) {
            setReplyImageError(index, 'Image size must be 10MB or less.');
            return;
        }

        const existingPending = pendingReplyImagesRef.current[index];
        if (existingPending?.previewUrl) {
            URL.revokeObjectURL(existingPending.previewUrl);
        }

        let compressedFile;
        try {
            compressedFile = await compressImageToJpeg(file);
        } catch (error) {
            setReplyImageError(index, error?.message || 'Failed to compress image. Try a smaller file.');
            return;
        }

        if (compressedFile.size > MAX_REPLY_IMAGE_BYTES) {
            setReplyImageError(index, 'Image must be 2MB or less after compression.');
            return;
        }

        const previewUrl = URL.createObjectURL(compressedFile);
        setPendingReplyImages((previous) => ({
            ...previous,
            [index]: {
                file: compressedFile,
                previewUrl,
            },
        }));
        clearReplyImageError(index);
    };

    const selectPublicReplyVariant = (index) => {
        setActivePublicReplyIndex(index);
        setPreviewScene('public_reply');
    };

    const setPublicReplyVariant = (index, value) => {
        const next = [...data.public_comment_reply];
        next[index] = value;
        setActivePublicReplyIndex(index);
        setData('public_comment_reply', next);
    };

    const addPublicReplyVariant = () => {
        if (data.public_comment_reply.length >= MAX_PUBLIC_COMMENT_REPLIES) {
            return;
        }

        setActivePublicReplyIndex(data.public_comment_reply.length);
        setPreviewScene('public_reply');
        setData('public_comment_reply', [...data.public_comment_reply, '']);
    };

    const removePublicReplyVariant = (indexToRemove) => {
        if (indexToRemove < MIN_SYSTEM_PUBLIC_COMMENT_REPLIES) {
            return;
        }

        const next = data.public_comment_reply.filter((_, index) => index !== indexToRemove);
        const shiftedIndex = activePublicReplyIndex > indexToRemove
            ? activePublicReplyIndex - 1
            : activePublicReplyIndex;
        const safeNextIndex = Math.min(Math.max(0, shiftedIndex), Math.max(0, next.length - 1));
        setActivePublicReplyIndex(safeNextIndex);
        setData('public_comment_reply', next);
    };

    const activeDuplicateTriggerMediaUrls = useMemo(() => {
        const selectedIdKey = String(data.instagram_account_id || '');
        const byAccount = duplicate_trigger_media_urls_by_account && typeof duplicate_trigger_media_urls_by_account === 'object'
            ? duplicate_trigger_media_urls_by_account
            : {};
        const selectedAccountDuplicates = byAccount[selectedIdKey];

        if (Array.isArray(selectedAccountDuplicates)) {
            return selectedAccountDuplicates;
        }

        if (Array.isArray(duplicate_trigger_media_urls)) {
            return duplicate_trigger_media_urls;
        }

        return [];
    }, [data.instagram_account_id, duplicate_trigger_media_urls, duplicate_trigger_media_urls_by_account]);
    const duplicateFlowError = useMemo(() => {
        const activeTriggerMediaUrl = String(data.trigger_media_url || '').trim();
        const hasDuplicateConfiguration = activeDuplicateTriggerMediaUrls.some(
            (value) => String(value || '').trim() === activeTriggerMediaUrl
        );

        if (hasDuplicateConfiguration && activeTriggerMediaUrl) {
            return 'This content is already used in another flow.';
        }

        return '';
    }, [data.trigger_media_url, activeDuplicateTriggerMediaUrls]);
    const hasPendingReplyImageChanges = useMemo(
        () => Object.keys(pendingReplyImages).length > 0,
        [pendingReplyImages]
    );
    const hasUnsavedChanges = Boolean(selectedAccount) && !processing && (
        isDirty
        || keywordInput.trim().length > 0
        || hasPendingReplyImageChanges
    );

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return undefined;
        }

        const removeBeforeVisitListener = router.on('before', (event) => {
            if (allowNextVisitRef.current) {
                allowNextVisitRef.current = false;
                return;
            }

            const visit = event?.detail?.visit;
            if (!visit) {
                return;
            }

            // Allow form submissions (POST/PATCH/etc.) without unsaved-changes confirmation.
            const visitMethod = String(visit.method || 'get').toLowerCase();
            if (visitMethod !== 'get') {
                return;
            }

            event.preventDefault();
            setPendingVisit(visit);
            setLeaveDialogOpen(true);
        });

        return () => {
            if (typeof removeBeforeVisitListener === 'function') {
                removeBeforeVisitListener();
            }
        };
    }, [hasUnsavedChanges]);

    useEffect(() => {
        if (!hasUnsavedChanges) {
            return undefined;
        }

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges]);

    const cancelPendingNavigation = useCallback(() => {
        setLeaveDialogOpen(false);
        setPendingVisit(null);
    }, []);

    const confirmPendingNavigation = useCallback(() => {
        if (!pendingVisit) {
            return;
        }

        const { url, ...options } = pendingVisit;
        allowNextVisitRef.current = true;
        setLeaveDialogOpen(false);
        setPendingVisit(null);
        router.visit(typeof url === 'string' ? url : url.toString(), options);
    }, [pendingVisit]);

    const submit = (e) => {
        e.preventDefault();

        const normalizedKeywordChips = appendKeywords(keywordInput, keywordChips);
        const normalizedKeywords = normalizedKeywordChips.join(',');

        if (duplicateFlowError) {
            return;
        }

        if (keywordInput.trim()) {
            setKeywordChips(normalizedKeywordChips);
            setKeywordInput('');
            setData('keywords', normalizedKeywords);
        }

        const singleReplyMessage = data.reply_messages?.[0] || { message_text: '', media_url: '' };
        const replyImagesPayload = Object.entries(pendingReplyImages).reduce((carry, [index, imageMeta]) => {
            if (imageMeta?.file instanceof File) {
                carry[index] = imageMeta.file;
            }
            return carry;
        }, {});
        const hasReplyImageUploads = Object.keys(replyImagesPayload).length > 0;

        const normalizedReplyMessagesWithIndexes = [{
            index: 0,
            message_text: String(singleReplyMessage?.message_text || '').trim(),
            media_url: String(singleReplyMessage?.media_url || '').trim(),
        }].filter((variant) => variant.message_text.length > 0 || variant.media_url.length > 0);

        // Keep one reply message entry when the user uploads an image-only reply.
        if (hasReplyImageUploads && normalizedReplyMessagesWithIndexes.length === 0) {
            normalizedReplyMessagesWithIndexes.push({
                index: 0,
                message_text: '',
                media_url: '',
            });
        }

        const normalizedReplyMessages = normalizedReplyMessagesWithIndexes.map((variant) => ({
            message_text: variant.message_text,
            media_url: variant.media_url,
        }));
        const replyMessageIndexes = normalizedReplyMessagesWithIndexes.map((variant) => variant.index);
        const normalizedPublicReplyMessages = normalizePublicCommentReplies(
            data.public_comment_reply,
            data.name,
            normalizedKeywordChips
        );
        const normalizedReminderMessages = (Array.isArray(data.reminder_messages) ? data.reminder_messages : [])
            .map((message) => String(message || '').trim())
            .filter((message) => message.length > 0)
            .slice(0, 3);
        const selectedMediaUrl = selectedMedia
            ? (selectedMedia.thumbnail_url || selectedMedia.media_url || '')
            : data.trigger_media_url;
        transform((formData) => {
            const isCommentTriggerFlowForSubmit = COMMENT_TRIGGER_TYPES.includes(String(formData.trigger_type || '').toLowerCase());
            const payload = {
                ...formData,
                instagram_account_id: formData.instagram_account_id
                    ? Number(formData.instagram_account_id)
                    : null,
                name: formData.name.trim(),
                trigger_media_url: selectedMediaUrl,
                lead_form_id: formData.lead_form_id ? Number(formData.lead_form_id) : null,
                keywords: normalizedKeywords,
                match_all_comments: isCommentTriggerFlowForSubmit && formData.match_all_comments ? 1 : 0,
                reply_messages: normalizedReplyMessages,
                opening_message_enabled: formData.opening_message_enabled ? 1 : 0,
                opening_message: formData.opening_message_enabled
                    ? formData.opening_message.trim()
                    : '',
                opening_button_text: formData.opening_message_enabled
                    ? (formData.opening_button_text || '').trim()
                    : '',
                public_reply_enabled: isCommentTriggerFlowForSubmit ? 1 : 0,
                public_comment_reply: isCommentTriggerFlowForSubmit ? normalizedPublicReplyMessages : [],
                public_reply_limit_enabled: isCommentTriggerFlowForSubmit && formData.public_reply_limit_enabled ? 1 : 0,
                public_reply_limit_count: isCommentTriggerFlowForSubmit && formData.public_reply_limit_enabled
                    ? Number(formData.public_reply_limit_count || 200)
                    : null,
                ask_to_follow_enabled: formData.ask_to_follow_enabled ? 1 : 0,
                ask_to_follow_strict: formData.ask_to_follow_enabled && formData.ask_to_follow_strict ? 1 : 0,
                ask_to_follow_message: formData.ask_to_follow_enabled
                    ? (formData.ask_to_follow_message || '').trim()
                    : '',
                reminder_enabled: formData.reminder_enabled ? 1 : 0,
                reminder_delay_hours: formData.reminder_enabled
                    ? Number(formData.reminder_delay_hours || 20)
                    : null,
                reminder_messages: formData.reminder_enabled ? normalizedReminderMessages : [],
                reminder_primary_button_text: formData.reminder_enabled
                    ? (formData.reminder_primary_button_text || '').trim()
                    : '',
                reminder_secondary_button_text: formData.reminder_enabled
                    ? (formData.reminder_secondary_button_text || '').trim()
                    : '',
                reminder_more_message: formData.reminder_enabled
                    ? (formData.reminder_more_message || '').trim()
                    : '',
                reminder_offer_url: formData.reminder_enabled
                    ? (formData.reminder_offer_url || '').trim()
                    : '',
                reminder_offer_button_text: formData.reminder_enabled
                    ? (formData.reminder_offer_button_text || '').trim()
                    : '',
                retrigger_existing: !isEditMode && Boolean(formData.retrigger_existing) ? 1 : 0,
            };

            if (hasReplyImageUploads) {
                payload.reply_images = replyImagesPayload;
                payload.reply_message_indexes = replyMessageIndexes;
            } else {
                delete payload.reply_images;
                delete payload.reply_message_indexes;
            }

            if (isEditMode) {
                payload._method = 'patch';
            }

            return payload;
        });

        if (isEditMode) {
            post(route('autodm.flows.update', flow.id, false), { forceFormData: true });
            return;
        }

        post(route('autodm.flows.store', [], false), { forceFormData: true });
    };

    const stopSimulation = (preserveTimeline = true) => {
        simulationRunIdRef.current += 1;
        if (simulationTimerRef.current) {
            clearTimeout(simulationTimerRef.current);
            simulationTimerRef.current = null;
        }

        setSimulationPlayback((previous) => ({
            ...previous,
            isRunning: false,
            currentStepIndex: preserveTimeline ? previous.currentStepIndex : -1,
            timelineSteps: preserveTimeline ? previous.timelineSteps : [],
            finishedAt: Date.now(),
        }));
    };

    const runSimulation = () => {
        stopSimulation(false);
        const normalizedComment = simulatorComment.trim().toLowerCase();
        const selectedReplyVariant = data.reply_messages?.[0] || { message_text: '', media_url: '' };
        const normalizedReplyMessages = [{
            message_text: String(selectedReplyVariant?.message_text || '').trim(),
            media_url: resolveReplyVariantMedia(0, selectedReplyVariant?.media_url).trim(),
        }].filter((variant) => variant.message_text.length > 0 || variant.media_url.length > 0);
        const keywordsForSimulation = appendKeywords(keywordInput, keywordChips);
        const normalizedPublicReplyMessages = normalizePublicCommentReplies(
            data.public_comment_reply,
            data.name,
            keywordsForSimulation
        );
        const openingEnabled = Boolean(data.opening_message_enabled && data.opening_message.trim());
        const openingCtaText = (data.opening_button_text || '').trim();
        const openingWithCta = openingEnabled && openingCtaText.length > 0;
        const isCommentTriggerFlowForSimulation = COMMENT_TRIGGER_TYPES.includes(String(data.trigger_type || '').toLowerCase());
        const publicReplyEnabled = simulationMode === 'initial_trigger'
            && isCommentTriggerFlowForSimulation
            && Boolean(data.public_reply_enabled && normalizedPublicReplyMessages.length > 0);
        const publicReplyLimited = isCommentTriggerFlowForSimulation && Boolean(data.public_reply_enabled && data.public_reply_limit_enabled);
        const publicReplyLimitCount = Number(data.public_reply_limit_count || 200);

        const timelineSteps = [{
            type: 'checking',
            label: 'Checking trigger rules',
            scene: simulationMode === 'post_cta_response' ? 'dm' : 'keyword',
            delayMs: 650,
        }];

        const finalizeWith = (resultPayload, finalStepType = null, finalScene = null, finalDelay = 600) => {
            const finalSteps = [...timelineSteps];
            if (finalStepType) {
                finalSteps.push({
                    type: finalStepType,
                    label: resultPayload.title,
                    scene: finalScene || (simulationMode === 'post_cta_response' ? 'dm' : 'keyword'),
                    delayMs: finalDelay,
                });
            }
            const runId = simulationRunIdRef.current + 1;
            simulationRunIdRef.current = runId;
            setSimulationResult({
                ...resultPayload,
                testedComment: simulatorComment.trim(),
                mode: resultPayload?.mode || simulationMode,
            });
            setSimulationPlayback({
                isRunning: true,
                currentStepIndex: -1,
                timelineSteps: finalSteps.map((step) => ({ ...step, status: step.status || 'pending' })),
                startedAt: Date.now(),
                finishedAt: null,
                runId,
            });

            const advance = (stepIndex) => {
                if (simulationRunIdRef.current !== runId) {
                    return;
                }
                if (stepIndex >= finalSteps.length) {
                    setSimulationPlayback((previous) => ({
                        ...previous,
                        isRunning: false,
                        currentStepIndex: finalSteps.length - 1,
                        timelineSteps: previous.timelineSteps.map((step, index) => ({
                            ...step,
                            status: step.status === 'skipped'
                                ? 'skipped'
                                : index < finalSteps.length
                                    ? 'done'
                                    : step.status,
                        })),
                        finishedAt: Date.now(),
                    }));
                    simulationTimerRef.current = null;
                    return;
                }

                const activeStep = finalSteps[stepIndex];
                setPreviewScene(activeStep.scene || (simulationMode === 'post_cta_response' ? 'dm' : 'keyword'));
                setSimulationPlayback((previous) => ({
                    ...previous,
                    currentStepIndex: stepIndex,
                    timelineSteps: previous.timelineSteps.map((step, index) => ({
                        ...step,
                        status: step.status === 'skipped'
                            ? 'skipped'
                            : index < stepIndex
                                ? 'done'
                                : index === stepIndex
                                    ? 'active'
                                    : 'pending',
                    })),
                }));

                simulationTimerRef.current = setTimeout(() => {
                    setSimulationPlayback((previous) => ({
                        ...previous,
                        timelineSteps: previous.timelineSteps.map((step, index) => ({
                            ...step,
                            status: index <= stepIndex && step.status !== 'skipped' ? 'done' : step.status,
                        })),
                    }));
                    advance(stepIndex + 1);
                }, Math.max(250, activeStep.delayMs || 600));
            };

            advance(0);
        };

        if (!data.trigger_value) {
            finalizeWith({
                state: 'error',
                title: 'Select content first',
                message: 'Pick a post or reel before testing trigger behavior.',
            }, 'error', simulationMode === 'post_cta_response' ? 'dm' : 'keyword');
            return;
        }

        if (!normalizedComment) {
            finalizeWith({
                state: 'error',
                title: 'Add a test comment',
                message: 'Type a comment message to simulate keyword matching.',
            }, 'error', simulationMode === 'post_cta_response' ? 'dm' : 'keyword');
            return;
        }

        if (simulationMode === 'post_cta_response' && !openingWithCta) {
            finalizeWith({
                state: 'error',
                title: 'CTA button is required',
                message: 'Post-CTA simulation needs an opening message with a CTA button label.',
            }, 'error', 'dm');
            return;
        }

        const isAnyCommentModeEnabled = isCommentTriggerFlowForSimulation && Boolean(data.match_all_comments);
        let matchedKeyword = '';
        if (simulationMode === 'initial_trigger') {
            matchedKeyword = isAnyCommentModeEnabled
                ? 'Any comment'
                : (keywordsForSimulation.find((keyword) =>
                    normalizedComment.includes(keyword.toLowerCase())
                ) || '');

            if (!matchedKeyword) {
                finalizeWith({
                    state: 'no-match',
                    title: 'No keyword match',
                    message: 'This comment would not trigger the automation.',
                    mode: simulationMode,
                }, 'no_match', 'keyword');
                return;
            }
        } else {
            const normalizedCta = openingCtaText.toLowerCase();
            if (!normalizedComment.includes(normalizedCta)) {
                finalizeWith({
                    state: 'no-match',
                    title: 'CTA response not matched',
                    message: `Expected a response containing "${openingCtaText}" for post-CTA simulation.`,
                    mode: simulationMode,
                }, 'no_match', 'dm');
                return;
            }

            matchedKeyword = `CTA "${openingCtaText}"`;
        }

        if (normalizedReplyMessages.length === 0) {
            finalizeWith({
                state: 'error',
                title: 'No reply message available',
                message: 'Add a reply message to test the flow.',
            }, 'error', 'dm');
            return;
        }

        const selectedReply = normalizedReplyMessages[0];
        const selectedPublicReply = normalizedPublicReplyMessages[0] || '';
        const sequenceSteps = [];

        if (simulationMode === 'initial_trigger') {
            timelineSteps.push({
                type: 'keyword_match',
                label: isAnyCommentModeEnabled ? 'Any comment mode matched' : `Keyword matched: ${matchedKeyword}`,
                scene: 'keyword',
                delayMs: 700,
            });

            if (publicReplyEnabled) {
                const limitSuffix = publicReplyLimited ? ` (daily cap ${publicReplyLimitCount})` : '';
                sequenceSteps.push(`Public comment reply${limitSuffix}: "${selectedPublicReply}"`);
                timelineSteps.push({
                    type: 'public_reply',
                    label: 'Posting public reply',
                    scene: 'public_reply',
                    delayMs: 750,
                });
            } else {
                timelineSteps.push({
                    type: 'public_reply_skipped',
                    label: 'Public reply disabled',
                    scene: 'keyword',
                    delayMs: 450,
                    status: 'skipped',
                });
            }

            if (openingEnabled) {
                if (openingWithCta) {
                    sequenceSteps.push(`Opening DM sent with CTA button "${openingCtaText}".`);
                    sequenceSteps.push('System waits for CTA click/message before sending resource reply.');
                    timelineSteps.push({
                        type: 'opening_message',
                        label: 'Sending opening DM',
                        scene: 'dm',
                        delayMs: 700,
                    });
                    timelineSteps.push({
                        type: 'wait_for_cta',
                        label: 'Waiting for CTA response',
                        scene: 'dm',
                        delayMs: 700,
                    });
                    timelineSteps.push({
                        type: 'cta_response',
                        label: `User clicked: ${openingCtaText}`,
                        scene: 'dm',
                        delayMs: 650,
                    });
                    sequenceSteps.push(`User clicked/replied "${openingCtaText}".`);
                } else {
                    sequenceSteps.push('Opening DM sent immediately.');
                    timelineSteps.push({
                        type: 'opening_message',
                        label: 'Sending opening DM',
                        scene: 'dm',
                        delayMs: 700,
                    });
                }
            }

            if (openingWithCta) {
                sequenceSteps.push('Reply variant is queued and sent after CTA response.');
            }
        } else {
            sequenceSteps.push(`User clicked/replied "${openingCtaText}".`);
            timelineSteps.push({
                type: 'cta_response',
                label: `CTA received: ${openingCtaText}`,
                scene: 'dm',
                delayMs: 700,
            });
        }

        if (selectedReply.media_url.length > 0) {
            timelineSteps.push({
                type: 'reply_image',
                label: 'Sending image attachment',
                scene: 'dm',
                delayMs: 700,
            });
            sequenceSteps.push('Image attachment sent in DM.');
        }

        if (selectedReply.message_text) {
            timelineSteps.push({
                type: 'reply_text',
                label: 'Sending reply message',
                scene: 'dm',
                delayMs: 700,
            });
            sequenceSteps.push(`Reply text sent: ${selectedReply.message_text}`);
        }

        timelineSteps.push({
            type: 'complete',
            label: 'Simulation complete',
            scene: 'dm',
            delayMs: 600,
        });

        finalizeWith({
            state: 'matched',
            title: simulationMode === 'initial_trigger' ? 'Initial trigger sequence' : 'Post-CTA response sequence',
            message: simulationMode === 'initial_trigger'
                ? 'Sequence preview from comment match to next action.'
                : 'Sequence preview after user CTA click/message.',
            keyword: matchedKeyword,
            ctaResponseText: simulationMode === 'post_cta_response'
                ? simulatorComment.trim()
                : (openingWithCta ? openingCtaText : ''),
            reply: selectedReply.message_text || '(No text - image only reply)',
            replyHasImage: selectedReply.media_url.length > 0,
            openingEnabled,
            openingButtonEnabled: openingWithCta,
            publicReplyEnabled,
            publicReply: selectedPublicReply,
            publicReplyLimited,
            publicReplyLimitCount,
            sequenceSteps,
            mode: simulationMode,
        });
    };

    const selectedMedia = useMemo(
        () => mediaList.find((item) => String(item.id) === String(data.trigger_value)) || null,
        [mediaList, data.trigger_value]
    );

    useEffect(() => {
        if (isEditMode || !shouldHydratePrefilledTriggerRef.current) {
            return;
        }

        const selectedTriggerId = String(data.trigger_value || '').trim();
        if (selectedTriggerId === '') {
            logPrefillDebug('prefill:stop-empty-trigger');
            shouldHydratePrefilledTriggerRef.current = false;
            return;
        }

        if (selectedMedia) {
            logPrefillDebug('prefill:resolved-in-media-list', { selectedTriggerId });
            shouldHydratePrefilledTriggerRef.current = false;
            return;
        }

        if (loadingMedia || loadingMoreMedia) {
            logPrefillDebug('prefill:wait-loading', {
                selectedTriggerId,
                loadingMedia,
                loadingMoreMedia,
            });
            return;
        }

        if (isHydratingPrefilledTriggerRef.current) {
            logPrefillDebug('prefill:wait-hydrating', { selectedTriggerId });
            return;
        }

        if (selectedAccount?.id && !hasAttemptedPrefilledLookupRef.current) {
            logPrefillDebug('prefill:lookup-by-id:start', {
                selectedTriggerId,
                accountId: selectedAccount.id,
            });
            hasAttemptedPrefilledLookupRef.current = true;
            isHydratingPrefilledTriggerRef.current = true;
            fetchMediaById(selectedAccount.id, selectedTriggerId)
                .then((resolvedMedia) => {
                    if (resolvedMedia) {
                        logPrefillDebug('prefill:lookup-by-id:found', {
                            selectedTriggerId,
                            resolvedId: resolvedMedia.id,
                        });
                        setMediaList((previousMediaList) => {
                            const existingIds = new Set(previousMediaList.map((item) => String(item.id)));
                            if (existingIds.has(String(resolvedMedia.id))) {
                                return previousMediaList;
                            }

                            return [resolvedMedia, ...previousMediaList];
                        });
                        shouldHydratePrefilledTriggerRef.current = false;

                        return;
                    }

                    if (hasMoreMedia && nextMediaCursor) {
                        logPrefillDebug('prefill:lookup-by-id:miss-try-pagination', {
                            selectedTriggerId,
                            nextMediaCursor,
                        });
                        fetchMedia(selectedAccount.id, { append: true, cursor: nextMediaCursor });

                        return;
                    }

                    if (!hasFinishedInitialMediaLoadRef.current) {
                        logPrefillDebug('prefill:lookup-by-id:wait-initial-load', { selectedTriggerId });
                        return;
                    }

                    logPrefillDebug('prefill:clear-selection-after-lookup-miss', {
                        selectedTriggerId,
                        reason: 'lookup_miss_no_more_pages',
                    });
                    shouldHydratePrefilledTriggerRef.current = false;
                    setData('trigger_value', '');
                    setData('trigger_type', defaultTriggerTypeForSource(contentSource));
                    setData('trigger_media_url', '');
                })
                .catch((error) => {
                    logPrefillDebug('prefill:lookup-by-id:error', {
                        selectedTriggerId,
                        message: error?.message || 'unknown_error',
                    });
                    if (hasMoreMedia && nextMediaCursor) {
                        logPrefillDebug('prefill:lookup-error-try-pagination', {
                            selectedTriggerId,
                            nextMediaCursor,
                        });
                        fetchMedia(selectedAccount.id, { append: true, cursor: nextMediaCursor });

                        return;
                    }

                    if (!hasFinishedInitialMediaLoadRef.current) {
                        logPrefillDebug('prefill:lookup-error-wait-initial-load', { selectedTriggerId });
                        return;
                    }

                    logPrefillDebug('prefill:clear-selection-after-lookup-error', {
                        selectedTriggerId,
                        reason: 'lookup_error_no_more_pages',
                    });
                    shouldHydratePrefilledTriggerRef.current = false;
                    setData('trigger_value', '');
                    setData('trigger_type', defaultTriggerTypeForSource(contentSource));
                    setData('trigger_media_url', '');
                })
                .finally(() => {
                    isHydratingPrefilledTriggerRef.current = false;
                });

            return;
        }

        if (selectedAccount?.id && hasMoreMedia && nextMediaCursor) {
            logPrefillDebug('prefill:paginate-for-selected-media', {
                selectedTriggerId,
                nextMediaCursor,
            });
            fetchMedia(selectedAccount.id, { append: true, cursor: nextMediaCursor });
            return;
        }

        logPrefillDebug('prefill:clear-selection-terminal', {
            selectedTriggerId,
            reason: 'no_account_or_pages',
        });
        shouldHydratePrefilledTriggerRef.current = false;
        setData('trigger_value', '');
        setData('trigger_type', defaultTriggerTypeForSource(contentSource));
        setData('trigger_media_url', '');
    }, [
        contentSource,
        data.trigger_value,
        hasMoreMedia,
        isEditMode,
        loadingMedia,
        loadingMoreMedia,
        nextMediaCursor,
        selectedAccount?.id,
        selectedMedia,
        setData,
    ]);

    useEffect(() => {
        if (isEditMode || !selectedMedia) {
            return;
        }

        const resolvedTriggerType = selectedMedia.autodm_trigger_type
            || (contentSource === 'story'
                ? 'story'
                : (selectedMedia.media_type === 'VIDEO' ? 'reel' : 'post'));
        const resolvedMediaUrl = selectedMedia.thumbnail_url || selectedMedia.media_url || '';

        if (data.trigger_type !== resolvedTriggerType) {
            setData('trigger_type', resolvedTriggerType);
        }
        if (!data.trigger_media_url && resolvedMediaUrl) {
            setData('trigger_media_url', resolvedMediaUrl);
        }
    }, [contentSource, data.trigger_media_url, data.trigger_type, isEditMode, selectedMedia, setData]);

    const hasAnyCommentMode = isCommentTriggerFlow && Boolean(data.match_all_comments);
    const hasKeywords = hasAnyCommentMode || keywordChips.length > 0 || keywordInput.trim().length > 0;
    const activeReplyMessage = data.reply_messages?.[0] || { message_text: '', media_url: '' };
    const hasReplyMessage = String(activeReplyMessage?.message_text || '').trim().length > 0
        || String(activeReplyMessage?.media_url || '').trim().length > 0
        || hasPendingReplyImageChanges;
    const hasFlowName = data.name.trim().length > 0;
    const hasTriggerContent = Boolean(data.trigger_value);
    const hasOpeningMessageBody = data.opening_message.trim().length > 0;
    const hasPublicCommentReply = data.public_comment_reply.some((message) => (message || '').trim().length > 0);
    const hasValidPublicReplyLimit = Number(data.public_reply_limit_count) > 0;
    const hasAskToFollowMessage = data.ask_to_follow_message.trim().length > 0;
    const hasReminderMessages = (Array.isArray(data.reminder_messages) ? data.reminder_messages : [])
        .some((message) => String(message || '').trim().length > 0);
    const hasReminderDelay = Number(data.reminder_delay_hours) >= 20 && Number(data.reminder_delay_hours) <= 23;
    const openingCtaText = (data.opening_button_text || '').trim();
    const ctaCharCount = openingCtaText.length;
    const hasOpeningCta = Boolean(data.opening_message_enabled && openingCtaText);
    const ctaWarning = hasOpeningCta && (ctaCharCount < 2 || ctaCharCount > CTA_RECOMMENDED_MAX);
    const publicReplyCount = data.public_comment_reply.length;
    const canAddPublicReply = publicReplyCount < MAX_PUBLIC_COMMENT_REPLIES;
    const openingStepComplete = !data.opening_message_enabled || hasOpeningMessageBody;
    const publicReplyStepComplete = !isCommentTriggerFlow
        || (hasPublicCommentReply && (!data.public_reply_limit_enabled || hasValidPublicReplyLimit));
    const reminderStepComplete = !data.reminder_enabled || (hasReminderDelay && hasReminderMessages);
    const isSubmitDisabled = !selectedAccount
        || processing
        || !hasFlowName
        || !hasTriggerContent
        || !hasKeywords
        || !hasReplyMessage
        || !openingStepComplete
        || !publicReplyStepComplete
        || !reminderStepComplete
        || Boolean(duplicateFlowError);
    const replyVariantError = useMemo(() => {
        if (errors.reply_messages) {
            return errors.reply_messages;
        }

        const firstNestedReplyErrorKey = Object.keys(errors).find((key) =>
            key.startsWith('reply_messages.') || key.startsWith('reply_images.')
        );
        return firstNestedReplyErrorKey ? errors[firstNestedReplyErrorKey] : null;
    }, [errors]);
    const missingRequiredItems = useMemo(() => {
        const missing = [];

        if (!hasFlowName) missing.push('Flow Name');
        if (!hasTriggerContent) missing.push('Select Content');
        if (!hasAnyCommentMode && !hasKeywords) missing.push('Keywords');
        if (!hasReplyMessage) missing.push('Reply Message');
        if (data.opening_message_enabled && !hasOpeningMessageBody) {
            missing.push('Opening Message text');
        }
        if (isCommentTriggerFlow && !hasPublicCommentReply) {
            missing.push('Public Comment Reply');
        }
        if (isCommentTriggerFlow && data.public_reply_limit_enabled && !hasValidPublicReplyLimit) {
            missing.push('Public Reply Limit');
        }
        if (data.ask_to_follow_enabled && !hasAskToFollowMessage) {
            missing.push('Ask to Follow message');
        }
        if (data.reminder_enabled && !hasReminderMessages) {
            missing.push('Reminder message');
        }
        if (data.reminder_enabled && !hasReminderDelay) {
            missing.push('Reminder delay (20-23h)');
        }
        if (duplicateFlowError) {
            missing.push('Duplicate Flow Configuration');
        }

        return missing;
    }, [
        data.opening_message_enabled,
        isCommentTriggerFlow,
        data.public_reply_limit_enabled,
        hasFlowName,
        hasAnyCommentMode,
        hasKeywords,
        hasOpeningMessageBody,
        hasPublicCommentReply,
        hasReplyMessage,
        hasTriggerContent,
        hasValidPublicReplyLimit,
        data.ask_to_follow_enabled,
        hasAskToFollowMessage,
        data.reminder_enabled,
        hasReminderMessages,
        hasReminderDelay,
        duplicateFlowError,
    ]);
    const mediaTypeLabel = selectedMedia?.autodm_media_label
        || (data.trigger_type === 'story'
            ? 'Story'
            : (selectedMedia?.media_type === 'VIDEO' ? 'Reel' : 'Post'));
    const previewCaption = selectedMedia?.caption
        || (data.trigger_type === 'story'
            ? 'Your selected story context appears here.'
            : 'Your selected post caption appears here.');
    const previewHandle = useMemo(() => {
        const username = (selectedAccount?.username || '').trim();
        if (username) {
            return username.startsWith('@') ? username.slice(1) : username;
        }

        const rawId = String(selectedAccount?.ig_account_id || '').trim();
        if (!rawId) {
            return 'instagram_user';
        }

        if (rawId.length <= 14) {
            return rawId;
        }

        return `${rawId.slice(0, 6)}...${rawId.slice(-4)}`;
    }, [selectedAccount?.username, selectedAccount?.ig_account_id]);
    const accountProfileUrl = useMemo(() => {
        const existingProfileUrl = (selectedAccount?.profile_url || '').trim();
        if (existingProfileUrl) {
            return existingProfileUrl;
        }

        const username = (selectedAccount?.username || '').trim();
        if (!username) {
            return null;
        }

        const handle = username.startsWith('@') ? username.slice(1) : username;
        return `https://www.instagram.com/${handle}/`;
    }, [selectedAccount?.profile_url, selectedAccount?.username]);
    const accountProfileImageUrl = useMemo(() => {
        const existingProfileImageUrl = (selectedAccount?.profile_picture_url || '').trim();
        return existingProfileImageUrl || null;
    }, [selectedAccount?.profile_picture_url]);
    const previewKeywords = useMemo(
        () => appendKeywords(keywordInput, keywordChips),
        [keywordInput, keywordChips]
    );
    const previewKeyword = useMemo(() => {
        if (isCommentTriggerFlow && data.match_all_comments) {
            return 'Any comment';
        }

        const liveSimulationComment = (simulatorComment || '').trim();
        if (simulationPlayback.isRunning && liveSimulationComment) {
            return liveSimulationComment;
        }

        const lastTestedComment = String(simulationResult?.testedComment || '').trim();
        if (lastTestedComment) {
            return lastTestedComment;
        }

        return previewKeywords[0] || 'price';
    }, [data.match_all_comments, isCommentTriggerFlow, previewKeywords, simulationPlayback.isRunning, simulationResult, simulatorComment]);
    const previewPublicReplyMessage = useMemo(() => {
        const normalizedReplies = normalizePublicCommentReplies(data.public_comment_reply, data.name, previewKeywords);
        const selectedReply = normalizedReplies[Math.min(activePublicReplyIndex, normalizedReplies.length - 1)];
        const fallbackReply = normalizedReplies[0];
        const previewReply = selectedReply || fallbackReply;
        return previewReply && previewReply.trim().length > 0
            ? previewReply
            : 'Take a look, I just sent it.';
    }, [data.public_comment_reply, data.name, previewKeywords, activePublicReplyIndex]);
    const previewOpeningMessage = (data.opening_message || '').trim();
    const previewOpeningEnabled = Boolean(data.opening_message_enabled && previewOpeningMessage.length > 0);
    const previewCtaLabel = (data.opening_button_text || '').trim();
    const previewAskToFollowEnabled = Boolean(data.ask_to_follow_enabled);
    const previewAskToFollowMessage = (data.ask_to_follow_message || '').trim();
    const previewAskToFollowProfileButton = ASK_TO_FOLLOW_PROFILE_BUTTON_LABEL;
    const previewAskToFollowConfirmButton = ASK_TO_FOLLOW_CONFIRM_BUTTON_LABEL;
    const previewReplyVariant = useMemo(
        () => {
            const firstVariant = data.reply_messages?.[0] || { message_text: '', media_url: '' };
            return {
                ...firstVariant,
                media_url: resolveReplyVariantMedia(0, firstVariant?.media_url, firstVariant?.preview_media_url),
            };
        },
        [data.reply_messages, pendingReplyImages]
    );
    const previewReplyMessage = String(previewReplyVariant?.message_text || '').trim();
    const previewReplyMedia = String(previewReplyVariant?.media_url || '').trim();
    const previewLinkLineMatch = previewReplyMessage.match(LINK_LINE_PATTERN);
    const previewReplyLinkLabel = (previewLinkLineMatch?.groups?.label || '').trim() || 'Open Link';
    const previewReplyLink = (previewLinkLineMatch?.groups?.url || '').trim();
    const previewReplyBody = previewReplyLink
        ? previewReplyMessage.replace(previewLinkLineMatch?.[0] || '', '').replace(/\n{2,}/g, '\n').trim()
        : previewReplyMessage;
    const showCommentPreview = previewScene === 'keyword' || previewScene === 'public_reply';
    const isSimulationSettled = Boolean(simulationResult) && !simulationPlayback.isRunning;
    const showPublicReplyInPreview = showCommentPreview
        && isCommentTriggerFlow
        && data.public_reply_enabled
        && (!isSimulationSettled || (simulationResult?.state === 'matched' && simulationResult?.publicReplyEnabled));
    const previewSceneLabel = previewScene === 'keyword'
        ? 'Keyword Comment'
        : previewScene === 'public_reply'
            ? 'Public Reply'
            : previewScene === 'dm'
                ? 'DM'
                : 'Content';
    const formProps = {
        data,
        errors,
        duplicateFlowError,
        processing,
        setData,
        replyVariantError,
        ctaCharCount,
        ctaWarning,
        openingCtaText,
        ctaRecommendedMax: CTA_RECOMMENDED_MAX,
    };
    const mediaProps = {
        mediaList,
        loadingMedia,
        loadingMoreMedia,
        hasMoreMedia,
        mediaError,
        contentSource,
        sourceOptions: CONTENT_SOURCE_OPTIONS,
        visibleStartIndex,
        visibleEndIndex,
        canSlidePrev,
        canSlideNext,
        mediaSwiperRef,
        syncMediaSwiperState,
        onContentSourceChange: handleContentSourceChange,
        handleMediaSelect,
        slideMedia,
        loadMoreMedia,
    };
    const keywordsProps = {
        isCommentTriggerFlow,
        isAnyCommentMode: hasAnyCommentMode,
        toggleMatchAllComments,
        keywordInput,
        setKeywordInput,
        keywordChips,
        handleKeywordKeyDown,
        commitKeywordInput,
        removeKeywordChip,
    };
    const templatesProps = {
        flowTemplates,
        templateUseCases,
        activeTemplateId,
        requestApplyTemplate,
        onSaveCurrentTemplate: openTemplateSaveDialog,
        canCreateSystemTemplate: Boolean(auth?.is_super_admin),
    };
    const publicReplyProps = {
        isCommentTriggerFlow,
        maxPublicCommentReplies: MAX_PUBLIC_COMMENT_REPLIES,
        minSystemPublicCommentReplies: MIN_SYSTEM_PUBLIC_COMMENT_REPLIES,
        publicReplyCount,
        canAddPublicReply,
        activePublicReplyIndex,
        selectPublicReplyVariant,
        setPublicReplyVariant,
        addPublicReplyVariant,
        removePublicReplyVariant,
    };
    const replyVariantsProps = {
        maxReplyMessageLength: MAX_REPLY_MESSAGE_LENGTH,
        replyLinkEditors,
        setReplyVariantField,
        openReplyLinkEditor,
        closeReplyLinkEditor,
        setReplyLinkEditorName,
        setReplyLinkEditorValue,
        saveReplyLinkEditor,
        removeReplyLink,
        openReplyImagePicker,
        handleReplyImageSelection,
        resolveReplyVariantMedia,
        hasPendingReplyImage,
        getReplyImageError,
    };
    const reminderProps = {
        maxReminderMessages: 3,
        setReminderMessage,
        addReminderMessage,
        removeReminderMessage,
    };
    const retriggerProps = {
        show: !isEditMode && data.trigger_type !== 'story',
        disabled: !data.trigger_value,
        enabled: Boolean(data.trigger_value && data.retrigger_existing),
        triggerType: data.trigger_type,
        setEnabled: (enabled) => setData('retrigger_existing', enabled),
    };
    const simulationProps = {
        mode: simulationMode,
        setInitialMode: () => {
            stopSimulation(false);
            setSimulationResult(null);
            setSimulationMode('initial_trigger');
            setPreviewScene('keyword');
        },
        setPostCtaMode: () => {
            stopSimulation(false);
            setSimulationResult(null);
            setSimulationMode('post_cta_response');
            setPreviewScene('dm');
        },
        runSimulation,
        stopSimulation,
        comment: simulatorComment,
        setComment: setSimulatorComment,
        result: simulationResult,
        playback: simulationPlayback,
    };
    const previewProps = {
        scene: previewScene,
        setScene: setPreviewScene,
        sceneLabel: previewSceneLabel,
        triggerType: data.trigger_type,
        accountProfileImageUrl,
        accountProfileUrl,
        selectedMedia,
        mediaTypeLabel,
        handle: previewHandle,
        caption: previewCaption,
        keyword: previewKeyword,
        publicReplyMessage: previewPublicReplyMessage,
        showCommentPreview,
        showPublicReplyInPreview,
        openingEnabled: previewOpeningEnabled,
        openingMessage: previewOpeningMessage,
        ctaLabel: previewCtaLabel,
        askToFollowEnabled: previewAskToFollowEnabled,
        askToFollowMessage: previewAskToFollowMessage,
        askToFollowProfileButton: previewAskToFollowProfileButton,
        askToFollowConfirmButton: previewAskToFollowConfirmButton,
        replyMedia: previewReplyMedia,
        replyBody: previewReplyBody,
        replyLink: previewReplyLink,
        replyLinkLabel: previewReplyLinkLabel,
        simulation: {
            mode: simulationMode,
            result: simulationResult,
            playback: simulationPlayback,
        },
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            moduleTabsAction={(
                <CreateHeaderActions
                    isEditMode={isEditMode}
                    hasUnsavedChanges={hasUnsavedChanges}
                    processing={processing}
                    isSubmitDisabled={isSubmitDisabled}
                />
            )}
        >
            <Head title={isEditMode ? 'Edit AutoDM Flow' : 'Create AutoDM Flow'} />

            <div className="mx-auto max-w-[1320px] space-y-5">
                <InstagramAccountSelector
                    accounts={accountList}
                    selectedAccountId={data.instagram_account_id}
                    connectedCount={effectiveConnectedCount}
                    maxCards={maxInstaCards}
                    canConnectMore={canConnectMore}
                    connectHref={accountConnectHref}
                    onSelect={handleInstagramAccountChange}
                />


                {!selectedAccount ? (
                    <NoAccountConnectedState error={errors.account} />
                ) : (
                    <form
                        id="autodm-flow-form"
                        onSubmit={submit}
                        className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,370px)_minmax(0,1fr)] xl:items-start xl:gap-6 2xl:gap-8"
                    >
                        <div className="order-2 min-w-0 xl:order-1 xl:self-stretch">
                            <PreviewPhone preview={previewProps} />
                        </div>
                        <div className="order-1 min-w-0 space-y-5 xl:order-2">
                            <FlowContent
                                leadForms={lead_forms}
                                missingRequiredItems={missingRequiredItems}
                                form={formProps}
                                media={mediaProps}
                                keywords={keywordsProps}
                                templates={templatesProps}
                                publicReply={publicReplyProps}
                                replyVariants={replyVariantsProps}
                                reminder={reminderProps}
                                retrigger={retriggerProps}
                                simulation={simulationProps}
                                preview={previewProps}
                            />

                        </div>
                    </form>
                )}
            </div>

            {leaveDialogOpen && (
                <WorkflowDialog
                    eyebrow="Unsaved Changes"
                    title="Leave without saving?"
                    description="Your edits will be discarded if you leave this page now."
                    cancelLabel="Stay here"
                    confirmLabel="Leave page"
                    confirmVariant="warning"
                    iconTone="warning"
                    onCancel={cancelPendingNavigation}
                    onConfirm={confirmPendingNavigation}
                />
            )}

            {templateToConfirm && (
                <WorkflowDialog
                    eyebrow="Apply Template"
                    title={templateToConfirm.title}
                    description="This will replace current flow name, keywords, reply message, and opening message values."
                    cancelLabel="Cancel"
                    confirmLabel="Yes, apply template"
                    onCancel={cancelApplyTemplate}
                    onConfirm={confirmApplyTemplate}
                />
            )}

            {templateSaveDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
                        onClick={closeTemplateSaveDialog}
                        aria-label="Close save template dialog"
                    />

                    <div className="relative z-10 w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Template Library</p>
                                <h4 className="mt-1 text-base font-bold text-slate-900">Save Current Flow As Template</h4>
                                <p className="mt-1 text-sm text-slate-600">
                                    This saves your current trigger, keywords, replies, and advanced settings.
                                </p>
                            </div>
                        </div>

                        <form className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submitTemplateDraft}>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Title</label>
                                <input
                                    type="text"
                                    value={templateDraft.title}
                                    onChange={(event) => setTemplateDraftField('title', event.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                                    maxLength={120}
                                    required
                                />
                                {templateSaveErrors.title && (
                                    <p className="mt-1 text-xs text-rose-600">{templateSaveErrors.title}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Flow Name</label>
                                <input
                                    type="text"
                                    value={templateDraft.name}
                                    onChange={(event) => setTemplateDraftField('name', event.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                                    maxLength={120}
                                    required
                                />
                                {templateSaveErrors.name && (
                                    <p className="mt-1 text-xs text-rose-600">{templateSaveErrors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Use Case</label>
                                <select
                                    value={templateDraft.use_case_id}
                                    onChange={(event) => setTemplateDraftField('use_case_id', event.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                                    required
                                >
                                    {templateUseCases.map((useCase) => (
                                        <option key={useCase.id} value={useCase.id}>
                                            {useCase.name}
                                        </option>
                                    ))}
                                </select>
                                {templateSaveErrors.use_case_id && (
                                    <p className="mt-1 text-xs text-rose-600">{templateSaveErrors.use_case_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Badge</label>
                                <input
                                    type="text"
                                    value={templateDraft.badge}
                                    onChange={(event) => setTemplateDraftField('badge', event.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                                    maxLength={40}
                                    placeholder="Lead Magnet"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">Description</label>
                                <textarea
                                    value={templateDraft.description}
                                    onChange={(event) => setTemplateDraftField('description', event.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                                    maxLength={300}
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-2">
                                {Boolean(auth?.is_super_admin) && (
                                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(templateDraft.is_system)}
                                            onChange={(event) => setTemplateDraftField('is_system', event.target.checked)}
                                            className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        Save as system template (visible to all users)
                                    </label>
                                )}

                                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(templateDraft.is_default)}
                                        onChange={(event) => setTemplateDraftField('is_default', event.target.checked)}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    Mark as default for this use case
                                </label>

                                {templateSaveErrors.reply_messages && (
                                    <p className="text-xs text-rose-600">{templateSaveErrors.reply_messages}</p>
                                )}
                                {templateSaveErrors.public_comment_reply && (
                                    <p className="text-xs text-rose-600">{templateSaveErrors.public_comment_reply}</p>
                                )}
                                {templateSaveErrors.reminder_messages && (
                                    <p className="text-xs text-rose-600">{templateSaveErrors.reminder_messages}</p>
                                )}
                            </div>

                            <div className="sm:col-span-2 mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button type="button" variant="secondary" onClick={closeTemplateSaveDialog} disabled={templateSaveProcessing}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" disabled={templateSaveProcessing}>
                                    {templateSaveProcessing ? 'Saving...' : 'Save template'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
