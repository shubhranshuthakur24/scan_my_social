import React from 'react';
import {
    Circle,
    Home,
    HelpCircle,
    Eye,
    EyeOff,
    Tv,
    Briefcase,
    Send,
    Video,
    FolderKanban,
    FileText,
    Settings,
    Copy,
    Coins,
    LogOut,
    Search,
    Plus,
    CirclePlus,
    X,
    ChevronDown,
    ChevronRight,
    Check,
    Edit2,
    Trash2,
    Menu,
    LayoutGrid,
    CheckCircle,
    XCircle,
    Info,
    AlertTriangle,
    ExternalLink,
    List,
    Link as LinkIcon,
    User,
    Bell,
    Calendar,
    Clock,
    Mail,
    Phone,
    Filter,
    Download,
    Upload,
    RefreshCcw,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    ArrowDownZA,
    ArrowUpAZ,
    Shield,
    CreditCard,
    BarChart3,
    Flag,
    Lock,
    Image,
    Sparkles,
    Zap,
    AlertCircle,
    History,
    MessageSquare,
    Play,
    Tag,
    HousePlug,
    Gift,
    Landmark,
    Target,
    Activity,
    FlaskConical,
    Wand,
    FolderPlus,
    Speech,
    TrendingUp,
    Radio,
    Microscope,
    Mic,
    Anchor,
    Triangle,
    LockKeyhole,
    Megaphone,
    ShieldCheck,
    Shuffle,
    CircleAlert,
    MoveRight,
    ThumbsUp,
    Users,
    MessageSquareHeart,
    Undo,
    Bot,
    Cpu,
    Wrench,
    PartyPopper,
    Star,
    Rocket,
    Banknote,
    BadgeCheck,
    RefreshCw,
    Inbox,
    Layers,
    Languages
} from 'lucide-react';

function monogramIcon({ size = 24, plain = false, className = '', label = '', color = '#111827' }) {
    const svg = (
        <svg style={{ width: size, height: size }} className={`${className} ${plain ? '' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="12" fill={plain ? color : 'currentColor'} />
            <text x="12" y="14.5" textAnchor="middle" fontSize="8" fontWeight="700" fill={plain ? '#ffffff' : color} fontFamily="system-ui, -apple-system, Segoe UI, sans-serif">
                {label}
            </text>
        </svg>
    );

    if (plain) {
        return svg;
    }

    return (
        <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full shadow-sm overflow-hidden p-1">
            {svg}
        </div>
    );
}

const ICON_MAP = {
    inbox: Inbox,
    // Navigation
    home: Home,
    eye: Eye,
    eyeOff: EyeOff,
    channel: Tv,
    briefcase: Briefcase,
    videos: Video,
    projects: FolderKanban,
    scripts: FileText,
    forms: FileText,
    image: Image,
    copy: Copy,
    coins: Coins,
    prompts: Image,
    sparkles: Sparkles,
    settings: Settings,
    logout: LogOut,
    send: Send,
    landmark: Landmark,
    // Actions / UI
    search: Search,
    plus: Plus,
    circlePlus: CirclePlus,
    x: X,
    chevronDown: ChevronDown,
    chevronRight: ChevronRight,
    check: Check,
    edit: Edit2,
    trash: Trash2,
    menu: Menu,
    grid: LayoutGrid,
    list: List,
    link: LinkIcon,
    externalLink: ExternalLink,
    // Status
    success: CheckCircle,
    checkCircle: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
    watchlist: () => <svg className=" text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>,
    verified: () => <svg aria-label="Verified" className="w-[14px] h-[14px] text-blue-500 shrink-0" fill="currentColor" role="img" viewBox="0 0 40 40"><title>Verified</title><path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path></svg>,
    // Platforms
    youtube: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: plain ? size : size * 0.65, height: plain ? size : size * 0.65 }} className={`${className} ${plain ? 'text-[#FF0000]' : 'text-[#FF0000]'} fill-current`} viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-white shadow-sm overflow-hidden border border-slate-100">
                {svg}
            </div>
        );
    },
    linkedin: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#0077B5]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-[#0077B5] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    instagram: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#E4405F]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    tiktok: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-black' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M19.589 6.686a4.793 4.793 0 01-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 01-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 013.183-4.51v-3.5a6.329 6.329 0 00-3.932 1.321 6.331 6.331 0 002.534 11.458h.01a6.331 6.331 0 005.968-4.516V8.69a9.052 9.052 0 005.222 1.648V6.896a6.375 6.375 0 01-1.126-.23L19.589 6.686z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-black shadow-sm overflow-hidden p-1 border border-slate-800">
                {svg}
            </div>
        );
    },
    facebook: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#1877F2]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.02 4.388 11.012 10.125 11.927V15.563H7.078V12.07h3.047V9.413c0-3.022 1.792-4.689 4.533-4.689 1.313 0 2.686.235 2.686.235v2.969h-1.514c-1.49 0-1.954.93-1.954 1.885v2.257h3.328l-.532 3.494h-2.796V24C19.612 23.085 24 18.093 24 12.073z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-[#1877F2] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    pinterest: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#E60023]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M12 0a12 12 0 00-4.377 23.173c-.06-.985-.113-2.5.024-3.575.124-.973.804-6.193.804-6.193s-.205-.41-.205-1.016c0-.952.553-1.664 1.242-1.664.585 0 .867.439.867.965 0 .588-.374 1.468-.567 2.283-.162.688.345 1.248 1.023 1.248 1.227 0 2.17-1.293 2.17-3.157 0-1.651-1.188-2.806-2.882-2.806-1.964 0-3.116 1.473-3.116 2.994 0 .593.228 1.229.513 1.575a.206.206 0 01.047.197c-.051.216-.165.688-.188.784-.03.126-.097.153-.225.092-.838-.39-1.363-1.613-1.363-2.597 0-2.114 1.536-4.056 4.43-4.056 2.326 0 4.135 1.658 4.135 3.874 0 2.312-1.458 4.173-3.48 4.173-.68 0-1.32-.354-1.538-.771l-.418 1.593c-.151.582-.562 1.311-.837 1.756A12 12 0 1012 0z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-[#E60023] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    twitter: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-black' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.932zm-1.291 19.494h2.04L6.486 3.24H4.298L17.61 20.647z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-black shadow-sm overflow-hidden p-1 border border-slate-800">
                {svg}
            </div>
        );
    },
    github: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#181717]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M12 0a12 12 0 00-3.792 23.387c.6.113.82-.26.82-.577v-2.234c-3.338.725-4.033-1.61-4.033-1.61-.546-1.386-1.333-1.756-1.333-1.756-1.089-.744.083-.729.083-.729 1.204.085 1.838 1.236 1.838 1.236 1.07 1.835 2.81 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.466-1.333-5.466-5.931 0-1.31.468-2.381 1.235-3.221-.124-.304-.535-1.528.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 016.002 0c2.291-1.552 3.298-1.23 3.298-1.23.653 1.648.243 2.872.12 3.176.77.84 1.233 1.911 1.233 3.221 0 4.609-2.805 5.623-5.477 5.921.43.372.823 1.104.823 2.224v3.293c0 .319.216.694.825.576A12 12 0 0012 0z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-[#181717] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    whatsapp: ({ size = 24, plain = false, className = "" }) => {
        const svg = (
            <svg style={{ width: size, height: size }} className={`${className} ${plain ? 'text-[#25D366]' : 'fill-white'} fill-current`} viewBox="0 0 24 24">
                <path d="M20.52 3.478A11.947 11.947 0 0012.042 0C5.438 0 .08 5.358.08 11.962c0 2.108.55 4.166 1.595 5.982L0 24l6.222-1.634a11.96 11.96 0 005.82 1.487h.005c6.602 0 11.96-5.358 11.96-11.962a11.9 11.9 0 00-3.487-8.413zm-8.478 18.36h-.004a9.94 9.94 0 01-5.066-1.39l-.364-.216-3.691.968.987-3.6-.237-.37a9.92 9.92 0 01-1.522-5.269c.002-5.488 4.47-9.955 9.96-9.955 2.66.001 5.16 1.037 7.04 2.918a9.897 9.897 0 012.915 7.045c-.003 5.49-4.47 9.955-9.958 9.955zm5.46-7.437c-.299-.15-1.768-.873-2.042-.972-.274-.1-.473-.15-.673.15-.199.299-.772.972-.946 1.171-.175.2-.349.224-.648.075-.299-.15-1.262-.465-2.403-1.482-.887-.79-1.486-1.767-1.66-2.066-.175-.299-.019-.46.13-.609.134-.133.299-.349.448-.523.15-.175.199-.299.299-.498.099-.2.05-.374-.025-.523-.075-.15-.673-1.62-.922-2.217-.242-.58-.488-.501-.673-.51l-.573-.01c-.2 0-.523.075-.797.374s-1.046 1.022-1.046 2.49 1.071 2.89 1.22 3.09c.149.199 2.107 3.218 5.106 4.512.713.308 1.269.492 1.703.63.715.228 1.366.196 1.88.119.573-.085 1.768-.723 2.017-1.422.249-.698.249-1.296.174-1.421-.075-.125-.274-.2-.573-.349z" />
            </svg>
        );
        if (plain) return svg;
        return (
            <div style={{ width: size, height: size }} className="flex items-center justify-center rounded-full bg-[#25D366] shadow-sm overflow-hidden p-1">
                {svg}
            </div>
        );
    },
    threads: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'T', color: '#000000' }),
    snapchat: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'S', color: '#FFFC00' }),
    behance: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'Be', color: '#1769ff' }),
    dribbble: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'D', color: '#ea4c89' }),
    reddit: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'R', color: '#ff4500' }),
    telegram: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'Tg', color: '#229ED9' }),
    tumblr: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'Tu', color: '#36465D' }),
    viber: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'V', color: '#7360f2' }),
    discord: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'Dc', color: '#5865F2' }),
    sharechat: ({ size = 24, plain = false, className = "" }) => monogramIcon({ size, plain, className, label: 'Sc', color: '#f65f6a' }),
    // General
    user: User,
    bell: Bell,
    circle: Circle,
    calendar: Calendar,
    clock: Clock,
    mail: Mail,
    phone: Phone,
    filter: Filter,
    download: Download,
    upload: Upload,
    refresh: RefreshCcw,
    arrowLeft: ArrowLeft,
    arrowRight: ArrowRight,
    arrowUp: ArrowUp,
    arrowDown: ArrowDown,
    arrowDownZA: ArrowDownZA,
    arrowUpAZ: ArrowUpAZ,
    shield: Shield,
    creditCard: CreditCard,
    helpCircle: HelpCircle,
    barChart: BarChart3,
    flag: Flag,
    lock: Lock,
    zap: Zap,
    alertCircle: AlertCircle,
    history: History,
    messageSquare: MessageSquare,
    play: Play,
    fileText: FileText,
    tag: Tag,
    housePlug: HousePlug,
    gift: Gift,
    target: Target,
    activity: Activity,
    flask: FlaskConical,
    wand: Wand,
    folderPlus: FolderPlus,
    speech: Speech,
    trendingUp: TrendingUp,
    radio: Radio,
    TrendingUp: TrendingUp,
    Radio: Radio,
    FolderKanban: FolderKanban,
    microscope: Microscope,
    mic: Mic,
    anchor: Anchor,
    triangle: Triangle,
    lockKeyhole: LockKeyhole,
    megaphone: Megaphone,
    shieldCheck: ShieldCheck,
    shuffle: Shuffle,

    moveRight: MoveRight,
    thumbsUp: ThumbsUp,
    users: Users,
    engagement: MessageSquareHeart,
    undo: Undo,
    bot: Bot,
    cpu: Cpu,
    wrench: Wrench,
    partyPopper: PartyPopper,
    star: Star,
    rocket: Rocket,
    banknote: Banknote,
    badgeCheck: BadgeCheck,
    refreshCw: RefreshCw,
    layers: Layers,
    languages: Languages
};

export default function Icon({ name, size = 20, className = "", strokeWidth = 2, ...props }) {
    const LucideIcon = ICON_MAP[name];

    if (!LucideIcon) {
        console.warn(`Icon "${name}" not found.`);
        return null;
    }



    let pixelSize = size;
    if (typeof size === 'number' && size < 12) {
        pixelSize = size * 4;
    }

    return (
        <LucideIcon
            size={pixelSize}
            className={className}
            strokeWidth={strokeWidth}
            {...props}
        />
    );
}
