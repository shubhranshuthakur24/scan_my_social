import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Icon from '@/Components/Icon';
import ChannelCard from '@/Components/ChannelCard';
import ContentCard from '@/Components/ContentCard';
import {
    Activity,
    Settings,
    Search,
    Bell,
    CheckCircle,
    User,
    ChevronRight,
    Plus,
    Sparkles,
    Star,
    Users
} from 'lucide-react';

export default function AdminDashboardPreview() {
    const tabs = ['home', 'channel', 'videos', 'projects', 'scripts'];
    const [activeTab, setActiveTab] = useState('home');
    const shouldReduceMotion = useReducedMotion();

    // Auto rotate tabs every 3.5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveTab(current => {
                const currentIndex = tabs.indexOf(current);
                return tabs[(currentIndex + 1) % tabs.length];
            });
        }, 3500);
        return () => clearInterval(timer);
    }, []);

    const renderSidebarItem = (id, label) => {
        const isActive = activeTab === id;
        return (
            <div className={`relative group cursor-pointer p-3 rounded-xl transition-all duration-300 ${isActive ? 'bg-primary-50 text-primary-600 shadow-sm border border-primary-100' : 'text-slate-400 hover:text-primary-500 hover:bg-slate-50 border border-transparent'}`}>
                <Icon name={id} size={20} className="shrink-0" />
            </div>
        );
    };

    return (
        <motion.div
            className="w-full mx-auto bg-slate-50 border border-slate-200 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-visible flex flex-col lg:flex-row lg:h-[720px] pb-10 sm:pb-0 font-sans text-slate-900 select-none relative group lg:rounded-[2rem]"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
            <style>{`
                @keyframes flyInUp {
                    0% { transform: translateY(150px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                @keyframes flyInRight {
                    0% { transform: translateX(150px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes flyInLeft {
                    0% { transform: translateX(-150px); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes flyInDown {
                    0% { transform: translateY(-150px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .dash-fly-up { animation: flyInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
                .dash-fly-right { animation: flyInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
                .dash-fly-left { animation: flyInLeft 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
                .dash-fly-down { animation: flyInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
            `}</style>

            {/* Extremely thin sidebar mimicking GetFrankli but light theme */}
            <div className="flex w-full overflow-x-auto lg:w-[80px] lg:border-r lg:border-b-0 border-b border-slate-200 bg-white lg:flex-col lg:rounded-tl-[2rem] lg:rounded-bl-[2rem] items-center py-4 lg:py-6 lg:justify-between shrink-0 shadow-[1px_0_10px_rgba(0,0,0,0.02)] z-30">
                <div className="flex flex-row lg:flex-col items-center gap-6 lg:gap-8 w-full px-4 lg:px-3">
                    {/* Brand Icon */}
                    <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-2xl bg-primary-600 flex items-center justify-center shadow-[0_4px_15px_rgba(168,85,247,0.3)] shrink-0 lg:mb-4 border border-primary-400">
                        <Activity size={20} className="text-white animate-pulse" />
                    </div>
                    {/* Nav Icons */}
                    <div className="flex flex-row lg:flex-col gap-3 lg:w-full items-center flex-1">
                        {renderSidebarItem('home', 'Dashboard')}
                        {renderSidebarItem('channel', 'Channels')}
                        {renderSidebarItem('videos', 'Videos')}
                        {renderSidebarItem('projects', 'Projects')}
                        {renderSidebarItem('scripts', 'Scripts')}
                    </div>
                </div>
                <div className="p-3 text-slate-400 hover:text-slate-800 cursor-pointer transition-colors hover:bg-slate-50 rounded-xl">
                    <Settings size={22} className="hover:rotate-90 duration-500" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-slate-50/50 flex flex-col min-w-0 relative lg:rounded-r-[2rem] overflow-hidden">
                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-60 z-0" />

                {/* Top Nav Bar */}
                <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-20 lg:rounded-tr-[2rem]">
                    <div className="flex items-center gap-3 text-slate-400 bg-white border border-slate-200 rounded-xl px-4 py-2 w-64 shadow-sm transition-all focus-within:ring-2 ring-primary-500/20">
                        <Search size={16} />
                        <span className="text-xs font-medium">Search across {activeTab}...</span>
                    </div>
                    <div className="flex items-center gap-5">
                        <Bell size={18} className="text-slate-400 hidden sm:block hover:text-slate-800 cursor-pointer" />
                        <div className="px-3 py-1.5 bg-green-50 rounded-full border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-widest hidden lg:flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" /> API Synced
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer hover:bg-slate-200 transition-colors">
                            <User size={16} className="text-slate-500" />
                        </div>
                    </div>
                </div>

                {/* Dashboard Body - dynamic based on active tag */}
                <div className="p-4 sm:p-6 lg:p-10 flex-1 overflow-visible relative z-10 w-full lg:w-[95%] max-w-[1200px] mx-auto">
                    <AnimatePresence mode="wait" initial={!shouldReduceMotion}>
                        <motion.div
                            key={activeTab}
                            className="h-auto lg:h-full flex flex-col gap-6 pb-12"
                            initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
                            transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {activeTab === 'home' && <HomeView />}
                            {activeTab === 'channel' && <ChannelsView />}
                            {activeTab === 'videos' && <VideosView />}
                            {activeTab === 'projects' && <ProjectsView />}
                            {activeTab === 'scripts' && <ScriptsView />}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Glossy Reflection overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-white/30 via-transparent to-transparent pointer-events-none opacity-50 z-30 rounded-[2rem]" />
        </motion.div>
    );
}

/* ═══════════════════════════════════
     SUB VIEWS
═══════════════════════════════════ */

function HomeView() {
    const defaultFeed = [
        { msg: "Hook Extraction complete for Video_192.mp4", status: "READY", color: "text-green-700", bg: "bg-green-50 border-green-200" },
        { msg: "Analyzing emotional resonance on AlexH_Reel", status: "PROCESSING", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
        { msg: "Outlier spike detected at 00:04 timeline", status: "FLAGGED", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
        { msg: "Script generation triggered for Output_B", status: "READY", color: "text-green-700", bg: "bg-green-50 border-green-200" },
        { msg: "Fetching channel metadata [Node 42_ACTIVE]", status: "SYNCING", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
    ];

    const [feed, setFeed] = useState(defaultFeed);
    const [outlierCount, setOutlierCount] = useState(24);

    useEffect(() => {
        const interval = setInterval(() => {
            setFeed(prev => {
                const newFeed = [...prev];
                const last = newFeed.pop();
                newFeed.unshift(last);
                return newFeed;
            });
            setOutlierCount(prev => prev > 26 ? 24 : prev + Math.floor(Math.random() * 2));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <>
            {/* Mini Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 shrink-0">
                {['Proxy Pools 100%', 'Webhooks Firing', '24H Uptime'].map((title, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 flex items-center gap-4 p-5 shadow-sm dash-fly-down" style={{ animationDelay: `${i * 0.15}s` }}>
                        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                            <p className="text-xs text-slate-500 font-medium">Latency &lt; 20ms</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:flex-1 lg:min-h-0">
                <div className="col-span-1 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col shadow-sm dash-fly-left" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6 shrink-0">Active Outliers</h3>
                    <div className="flex-1 flex items-center justify-center relative">
                        <svg width="180" height="180" viewBox="0 0 180 180" className="rotate-[-90deg]">
                            <circle cx="90" cy="90" r="70" fill="none" stroke="#f1f5f9" strokeWidth="12" />
                            <g className="origin-center animate-[spin_8s_linear_infinite]">
                                <circle cx="90" cy="90" r="70" fill="none" stroke="#A855F7" strokeWidth="12" strokeDasharray="440" strokeDashoffset="120" strokeLinecap="round" />
                            </g>
                            <circle cx="90" cy="90" r="50" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                            <g className="origin-center animate-[spin_12s_linear_infinite_reverse]">
                                <circle cx="90" cy="90" r="50" fill="none" stroke="#3b82f6" strokeWidth="8" strokeDasharray="314" strokeDashoffset="180" strokeLinecap="round" />
                            </g>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-black text-slate-800 tracking-tighter">{outlierCount}</span>
                            <span className="text-[10px] text-primary-600 font-bold tracking-widest mt-1">LOGGED</span>
                        </div>
                    </div>
                    <div className="mt-6 flex flex-col gap-4 shrink-0 border-t border-slate-100 pt-6 text-sm">
                        <div className="flex justify-between font-medium"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-primary-500 animate-pulse"></span>High Lift</div><b>68.2%</b></div>
                        <div className="flex justify-between font-medium text-slate-500"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>Processing</div><b>21.4%</b></div>
                    </div>
                </div>
                <div className="col-span-1 lg:col-span-2 bg-linear-to-br from-primary-950 to-primary-900 rounded-3xl border border-primary-800 p-6 flex flex-col relative overflow-hidden shadow-lg dash-fly-right" style={{ animationDelay: '0.3s' }}>
                    <div className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-100 pb-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Analysis Feed</h3>
                        <span className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Streaming</span>
                    </div>
                    <div className="flex-1 relative overflow-hidden">
                        <div className="absolute inset-0 flex flex-col gap-1 transition-transform duration-700 ease-in-out snap-y">
                            {feed.map((row, i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-2xl bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3 w-3/4">
                                        <CheckCircle size={16} className="text-slate-400 shrink-0" />
                                        <span className="text-sm text-slate-700 font-medium truncate">{row.msg}</span>
                                    </div>
                                    <span className={`text-[9px] font-bold px-3 py-1.5 border rounded-full uppercase tracking-widest shrink-0 ${row.color} ${row.bg}`}>{row.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function ChannelsView() {
    const channels = [
        { name: "Creator OS", followers: "1.2M", platform: "youtube", isVerified: true, isBusiness: true },
        { name: "ScaleLoop", followers: "450K", platform: "tiktok", isVerified: false, isBusiness: true },
        { name: "Solo Brand Lab", followers: "890K", platform: "instagram", isVerified: true, isBusiness: false },
        { name: "HookSmith", followers: "2.1M", platform: "youtube", isVerified: true, isBusiness: true },
        { name: "Vidmatic", followers: "150K", platform: "tiktok", isVerified: false, isBusiness: false },
        { name: "AlexH_Reel", followers: "300K", platform: "instagram", isVerified: true, isBusiness: false },
        { name: "GrowthFrame", followers: "780K", platform: "youtube", isVerified: true, isBusiness: true },
        { name: "TrendPulse", followers: "260K", platform: "instagram", isVerified: false, isBusiness: false },
        { name: "ClipForge", followers: "540K", platform: "tiktok", isVerified: true, isBusiness: true },
        { name: "CreatorMentor", followers: "1.05M", platform: "youtube", isVerified: true, isBusiness: false },
        { name: "ReelBlueprint", followers: "410K", platform: "instagram", isVerified: true, isBusiness: true },
        { name: "SnapGrowthLab", followers: "190K", platform: "tiktok", isVerified: false, isBusiness: true },
    ];
    const watchlists = [
        { name: 'High Potential', channelsCount: 4, isFavorite: true, members: ['CO', 'SL', 'HS', 'AR'] },
        { name: 'Brand Builders', channelsCount: 3, isFavorite: false, members: ['SB', 'VM', 'CL'] },
        { name: 'Shorts Lab', channelsCount: 6, isFavorite: false, members: ['HM', 'VL', 'AO', 'TR', 'NY'] },
    ];

    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Connected Channels</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage and sync creator watchlists.</p>
                </div>
                <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                    <span className="material-icons-round text-[18px]">add</span> Add Channel
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_290px] gap-5 lg:gap-6">
                <div className="grid self-start content-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {channels.map((ch, i) => (
                        <div key={i} className="dash-fly-up" style={{ animationDelay: `${i * 0.1}s` }}>
                            <ChannelCard
                                name={ch.name}
                                followers={ch.followers}
                                platform={ch.platform}
                                imageUrl={null}
                                profileStatus="COMPLETED"
                                postStatus="COMPLETED"
                                isPrivate={false}
                                isVerified={ch.isVerified}
                                isBusiness={ch.isBusiness}
                                className="card-border shadow-sm transform transition-all hover:scale-[1.02] hover:shadow-md"
                            />
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm dash-fly-right h-fit xl:sticky xl:top-2">
                    <div className="mb-4 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 tracking-tight">Your Watchlists</h3>
                                <p className="mt-1 text-xs font-medium text-slate-500">{watchlists.length} lists</p>
                            </div>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                        {watchlists.map((watchlist, idx) => (
                            <div
                                key={watchlist.name}
                                className={`rounded-2xl border p-3.5 shadow-sm transition-all hover:shadow-md dash-fly-up ${watchlist.isFavorite ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white'}`}
                                style={{ animationDelay: `${idx * 0.1 + 0.2}s` }}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-bold text-slate-900">{watchlist.name}</p>
                                            {watchlist.isFavorite && (
                                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                                                    <Star size={12} className="fill-current" />
                                                </span>
                                            )}
                                        </div>
                                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                            <Users size={11} />
                                            {watchlist.channelsCount} channels
                                        </span>
                                    </div>
                                    <button className="text-xs font-bold text-primary-600 inline-flex items-center gap-1 hover:text-primary-700 transition-colors">
                                        Open <ChevronRight size={12} />
                                    </button>
                                </div>

                                <div className="mt-3 flex -space-x-2">
                                    {watchlist.members.map((member, memberIdx) => (
                                        <div
                                            key={`${watchlist.name}-${memberIdx}`}
                                            className="h-7 w-7 rounded-full border-2 border-white bg-slate-200 text-[9px] font-black text-slate-600 flex items-center justify-center shadow-sm"
                                        >
                                            {member}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

function VideosView() {
    const scrollRef = useRef(null);
    const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);

    const basePosts = [
        {
            platform: 'instagram',
            caption: 'How to scale short-form content without burning out',
            display_url: '/images/dashboard-hero.avif',
            url: 'https://example.com',
            owner_username: 'creator_os',
            video_play_count: 284000,
            video_view_count: 284000,
            likes_count: 18300,
            comments_count: 920,
            breakout_multiplier: 4.7,
            breakout_label: 'Outlier',
            taken_at: '2026-03-24T10:00:00Z',
            projects: [{ id: 1, name: 'Q2 Content Sprint' }],
        },
        {
            platform: 'youtube',
            caption: '3 hooks that instantly improve retention in 2026',
            display_url: '/images/dashboard-hero.avif',
            url: 'https://example.com',
            owner_username: 'hooksmith',
            video_play_count: 612000,
            video_view_count: 612000,
            likes_count: 24100,
            comments_count: 1600,
            breakout_multiplier: 6.2,
            breakout_label: 'Breakout',
            taken_at: '2026-03-23T09:30:00Z',
            projects: [],
        },
        {
            platform: 'tiktok',
            caption: 'Behind the scenes: testing CTA variants in one day',
            display_url: '/images/dashboard-hero.avif',
            url: 'https://example.com',
            owner_username: 'vidmatic',
            video_play_count: 171000,
            video_view_count: 171000,
            likes_count: 11200,
            comments_count: 430,
            breakout_multiplier: 3.1,
            breakout_label: 'Strong',
            taken_at: '2026-03-22T07:10:00Z',
            projects: [],
        },
        {
            platform: 'instagram',
            caption: 'Analyzing the exact pacing pattern of this viral reel',
            display_url: '/images/dashboard-hero.avif',
            url: 'https://example.com',
            owner_username: 'scaleloop',
            video_play_count: 438000,
            video_view_count: 438000,
            likes_count: 20800,
            comments_count: 1100,
            breakout_multiplier: 5.4,
            breakout_label: 'Explosive',
            taken_at: '2026-03-21T12:45:00Z',
            projects: [{ id: 2, name: 'Retention Lab' }],
        },
    ];
    const samplePosts = Array.from({ length: 16 }, (_, idx) => {
        const base = basePosts[idx % basePosts.length];
        const multiplierBoost = (idx % 4) * 0.3;
        return {
            ...base,
            id: 1000 + idx,
            owner_username: `${base.owner_username}_${idx + 1}`,
            caption: `${base.caption} - Variant ${idx + 1}`,
            breakout_multiplier: Number((base.breakout_multiplier + multiplierBoost).toFixed(1)),
            video_play_count: base.video_play_count + (idx * 12000),
            video_view_count: base.video_view_count + (idx * 12000),
            likes_count: base.likes_count + (idx * 700),
            comments_count: base.comments_count + (idx * 35),
        };
    });

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return undefined;

        const interval = setInterval(() => {
            if (isAutoScrollPaused) return;
            if (scrollEl.scrollHeight <= scrollEl.clientHeight) return;

            const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2;
            if (atBottom) {
                scrollEl.scrollTop = 0;
                return;
            }

            scrollEl.scrollTop += 5;
        }, 30);

        return () => clearInterval(interval);
    }, [isAutoScrollPaused]);

    return (
        <>
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Viral Database</h2>
                    <p className="text-sm text-slate-500 mt-1">Analyzed outliers and extraction history.</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl flex items-center gap-2"><span className="material-icons-round text-[18px]">filter_list</span> Filter</div>
                </div>
            </div>

            <div
                ref={scrollRef}
                onMouseEnter={() => setIsAutoScrollPaused(true)}
                onMouseLeave={() => setIsAutoScrollPaused(false)}
                className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar max-h-[560px]"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                    {samplePosts.map((post, idx) => (
                        <div key={post.id} className="dash-fly-up pointer-events-none" style={{ animationDelay: `${(idx + 1) * 0.08}s` }}>
                            <ContentCard post={post} />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}

function ProjectsView() {
    const [search, setSearch] = useState('');
    const [viewAs, setViewAs] = useState('Cards');
    const projects = [
        { id: 1, name: 'Motivational Hooks', postsCount: 24, createdAt: 'Mar 06, 2026', color: 'orange' },
        { id: 2, name: 'Real Estate Scripts', postsCount: 13, createdAt: 'Mar 11, 2026', color: 'blue' },
        { id: 3, name: 'UGC Ads Testing', postsCount: 31, createdAt: 'Mar 16, 2026', color: 'emerald' },
        { id: 4, name: 'Finance Shorts', postsCount: 9, createdAt: 'Mar 22, 2026', color: 'purple' },
        { id: 5, name: 'Creator Rebrand', postsCount: 17, createdAt: 'Mar 25, 2026', color: 'pink' },
        { id: 6, name: 'Evergreen Explainers', postsCount: 28, createdAt: 'Mar 27, 2026', color: 'slate' },
    ];
    const colorMap = {
        slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-400', swatch: 'bg-slate-400' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-400', swatch: 'bg-orange-400' },
        red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-400', swatch: 'bg-red-400' },
        emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-400', swatch: 'bg-emerald-400' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-400', swatch: 'bg-blue-400' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-400', swatch: 'bg-purple-400' },
        pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-400', swatch: 'bg-pink-400' },
    };
    const filteredProjects = projects.filter((project) =>
        project.name.toLowerCase().includes(search.toLowerCase())
    );
    const totalItems = filteredProjects.reduce((sum, project) => sum + project.postsCount, 0);

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Projects</h2>
                    <p className="text-sm text-slate-500 mt-1">Plan and organize your content with a dedicated workspace for each project.</p>
                </div>
                <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                    <Plus size={14} />
                    Create Project
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white px-3 h-11">
                    <Search size={14} className="text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects"
                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                </div>
                <button
                    className={`px-4 h-11 border border-slate-200 rounded-xl bg-white text-sm font-bold transition-all ${search.trim() ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 opacity-60 cursor-not-allowed'}`}
                    disabled={!search.trim()}
                >
                    Go
                </button>
                <button
                    onClick={() => setViewAs((prev) => (prev === 'Cards' ? 'Table' : 'Cards'))}
                    className="px-4 h-11 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                    View: {viewAs}
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4 shrink-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Projects</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{filteredProjects.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Items</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{totalItems}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Mode</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{viewAs}</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl shadow-sm p-4 overflow-hidden dash-fly-up" style={{ animationDelay: '0.1s' }}>
                {filteredProjects.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 bg-success-50 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                            <span className="material-icons-round text-success-400 text-3xl">folder_open</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No projects yet.</h3>
                        <p className="text-sm text-slate-500 max-w-md">
                            Create a project folder to organize videos, scripts, and media in one workspace.
                        </p>
                    </div>
                ) : viewAs === 'Cards' ? (
                    <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredProjects.map((project, i) => {
                                const colors = colorMap[project.color] || colorMap.slate;
                                return (
                                    <div
                                        key={project.id}
                                        className={`relative group p-5 rounded-2xl border ${colors.border} ${colors.bg} hover:shadow-md transition-all dash-fly-up`}
                                        style={{ animationDelay: `${(i + 1) * 0.08}s` }}
                                    >
                                        <button className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/80 text-slate-400 hover:text-red-500 transition-all">
                                            <span className="material-icons-round text-base">delete</span>
                                        </button>
                                        <svg className={`w-10 h-10 mb-3 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                        </svg>
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">{project.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <span className={`font-semibold ${colors.icon}`}>{project.postsCount} items</span>
                                            <span>|</span>
                                            <span>{project.createdAt}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Project</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Items</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Created</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Color</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredProjects.map((project) => {
                                    const colors = colorMap[project.color] || colorMap.slate;
                                    return (
                                        <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">{project.name}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{project.postsCount}</td>
                                            <td className="px-4 py-3 text-sm text-slate-500">{project.createdAt}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex w-2.5 h-2.5 rounded-full ${colors.swatch}`} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function ScriptsView() {
    const [search, setSearch] = useState('');
    const [viewAs, setViewAs] = useState('Table');
    const scripts = [
        { id: 1, title: 'Hook Contrast Blueprint', suggestedTopic: 'Creator retention hooks', status: 'ready', duration: '42s', score: 94 },
        { id: 2, title: 'Authority Angle Test', suggestedTopic: 'Thought-leadership short', status: 'draft', duration: '34s', score: 90 },
        { id: 3, title: 'Objection Crusher V2', suggestedTopic: 'Sales objection handling', status: 'ready', duration: '28s', score: 91 },
        { id: 4, title: 'UGC Problem-Solution Flow', suggestedTopic: 'Paid social UGC', status: 'processing', duration: '--', score: '--' },
        { id: 5, title: 'Story Arc Teardown', suggestedTopic: 'Narrative pacing analysis', status: 'ready', duration: '51s', score: 88 },
    ];
    const filteredScripts = scripts.filter((script) =>
        `${script.title} ${script.suggestedTopic}`.toLowerCase().includes(search.toLowerCase())
    );
    const readyScripts = filteredScripts.filter((script) => script.status === 'ready').length;
    const processingScripts = filteredScripts.filter((script) => script.status === 'processing').length;

    const getStatusClass = (status) => {
        if (status === 'ready') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'processing') return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-slate-100 text-slate-600 border-slate-200';
    };

    return (
        <div className="h-full min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-bold font-heading text-slate-900 tracking-tight">Scripts Workspace</h2>
                    <p className="text-sm text-slate-500 mt-1">Manage and review your AI-generated content scripts.</p>
                </div>
                <button className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                    <Sparkles size={14} />
                    New Script
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 mb-4 shrink-0">
                <div className="flex items-center gap-2 border border-slate-200 rounded-xl bg-white px-3 h-11">
                    <Search size={14} className="text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search scripts..."
                        className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                    />
                </div>
                <button
                    className={`px-4 h-11 border border-slate-200 rounded-xl bg-white text-sm font-bold transition-all ${search.trim() ? 'text-slate-700 hover:bg-slate-50' : 'text-slate-400 opacity-60 cursor-not-allowed'}`}
                    disabled={!search.trim()}
                >
                    Go
                </button>
                <button
                    onClick={() => setViewAs((prev) => (prev === 'Table' ? 'Cards' : 'Table'))}
                    className="px-4 h-11 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                    View: {viewAs}
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Scripts</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{filteredScripts.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Ready</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{readyScripts}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Processing</p>
                    <p className="mt-1 text-lg font-black text-amber-600">{processingScripts}</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-3xl shadow-sm p-4 overflow-hidden dash-fly-up" style={{ animationDelay: '0.1s' }}>
                {filteredScripts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <div className="w-16 h-16 bg-success-50 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                            <span className="material-icons-round text-success-400 text-3xl">description</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-1">No scripts found.</h3>
                        <p className="text-sm text-slate-500 max-w-md">
                            Generate your first script by selecting a video and running AI Process.
                        </p>
                    </div>
                ) : viewAs === 'Table' ? (
                    <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Script Item</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Suggested Topic</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Score</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Duration</th>
                                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredScripts.map((script) => (
                                    <tr key={script.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${getStatusClass(script.status)}`}>
                                                    {script.status}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-700 truncate">{script.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{script.suggestedTopic}</td>
                                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">{script.score}</td>
                                        <td className="px-4 py-3 text-sm text-slate-500">{script.duration}</td>
                                        <td className="px-4 py-3">
                                            <button className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-colors">
                                                View
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto pr-1 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredScripts.map((script, i) => (
                                <div
                                    key={script.id}
                                    className="rounded-2xl border border-slate-200 p-4 bg-white hover:shadow-sm transition-all dash-fly-up"
                                    style={{ animationDelay: `${(i + 1) * 0.08}s` }}
                                >
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{script.title}</h4>
                                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider shrink-0 ${getStatusClass(script.status)}`}>
                                            {script.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-4">{script.suggestedTopic}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Score</p>
                                            <p className="mt-1 text-sm font-black text-slate-900">{script.score}</p>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                                            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Duration</p>
                                            <p className="mt-1 text-sm font-black text-slate-900">{script.duration}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
