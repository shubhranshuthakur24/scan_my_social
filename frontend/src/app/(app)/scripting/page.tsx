'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Sparkles,
  Copy,
  Check,
  Plus,
  Flame,
  Clock,
  Layers,
  FileCode,
  Share2,
  SlidersHorizontal,
  Search,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  Send,
  Wand2,
  TrendingUp,
  MessageSquare,
  ChevronRight,
  Eye,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

export interface HookVariation {
  id: string;
  type: 'Pattern Interrupt' | 'Curiosity Gap' | 'Bold Challenge';
  text: string;
  retentionScore: number;
}

export interface ScriptItem {
  id: string;
  title: string;
  topic: string;
  viralScore: number;
  duration: string;
  category: string;
  hooks: HookVariation[];
  activeHookIndex: number;
  body: string;
  cta: string;
  createdAt: string;
}

const initialScripts: ScriptItem[] = [
  {
    id: 'sc-1',
    title: 'The AI Automations That Make $10k/Month',
    topic: 'AI Side Hustles & Solopreneurship',
    viralScore: 96,
    duration: '45s',
    category: 'SaaS / AI',
    createdAt: 'Sep 12, 2026',
    activeHookIndex: 0,
    hooks: [
      {
        id: 'hk-1a',
        type: 'Pattern Interrupt',
        text: 'Stop building websites in 2026. Here are 3 AI agent workflows clients are happily paying $2,500 for right now.',
        retentionScore: 96,
      },
      {
        id: 'hk-1b',
        type: 'Curiosity Gap',
        text: 'Most creators have no idea this simple 3-node n8n workflow can replace a $4,000/month marketing agency.',
        retentionScore: 92,
      },
      {
        id: 'hk-1c',
        type: 'Bold Challenge',
        text: 'If you still spend more than 10 minutes a day writing DMs manually, you are leaving 80% of your revenue on the table.',
        retentionScore: 94,
      },
    ],
    body: 'First: Automated Instagram DM qualifier bots using Meta webhook actions. Second: Local business review aggregators. Third: Multi-language AI video dubbing pipelines.',
    cta: 'Comment "WORKFLOW" below and I will DM you the full prompt templates & n8n JSON schema!',
  },
  {
    id: 'sc-2',
    title: 'Why 99% Of Creators Fail At Hook Retention',
    topic: 'Content Strategy & Editing',
    viralScore: 92,
    duration: '35s',
    category: 'Growth Strategy',
    createdAt: 'Sep 10, 2026',
    activeHookIndex: 0,
    hooks: [
      {
        id: 'hk-2a',
        type: 'Pattern Interrupt',
        text: 'If your viewers drop off in the first 3 seconds, your script isn’t bad — your visual pattern interrupt is non-existent.',
        retentionScore: 92,
      },
      {
        id: 'hk-2b',
        type: 'Curiosity Gap',
        text: 'I analyzed 500 viral Reels that crossed 1M views, and every single one used this exact 2.5-second retention rule.',
        retentionScore: 95,
      },
      {
        id: 'hk-2c',
        type: 'Bold Challenge',
        text: 'Your intro is boring 90% of people in the first 2 seconds. Fix this single edit error immediately.',
        retentionScore: 89,
      },
    ],
    body: 'The golden rule of viral retention is changing the camera angle, caption position, or sound effect before the 2.5-second mark. Always open with high-contrast movement.',
    cta: 'Save this Reel so you remember this checklist before your next shoot!',
  },
  {
    id: 'sc-3',
    title: 'High-Converting DM Sales Funnel Blueprint',
    topic: 'Instagram Sales & Lead Gen',
    viralScore: 98,
    duration: '60s',
    category: 'Monetization',
    createdAt: 'Sep 08, 2026',
    activeHookIndex: 0,
    hooks: [
      {
        id: 'hk-3a',
        type: 'Pattern Interrupt',
        text: 'This 1-click Instagram story trigger generated 480 leads on complete autopilot while I was sleeping.',
        retentionScore: 98,
      },
      {
        id: 'hk-3b',
        type: 'Curiosity Gap',
        text: 'Why top 1% creators never send people to a link in bio anymore — and what they do instead.',
        retentionScore: 94,
      },
      {
        id: 'hk-3c',
        type: 'Bold Challenge',
        text: 'You are losing 70% of potential leads by asking them to click a link in your bio instead of triggering an AutoDM.',
        retentionScore: 91,
      },
    ],
    body: 'Step 1: Offer a hyper-specific lead magnet (like a prompt vault). Step 2: Set up a Meta webhook keyword trigger like "PLAYBOOK". Step 3: Automatically deliver the link directly in DMs with a Follow-to-Unlock gate.',
    cta: 'Comment "AUTODM" to receive our complete step-by-step setup blueprint in your inbox!',
  },
];

export default function ScriptingPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>(initialScripts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Generator Modal State
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generatorTopic, setGeneratorTopic] = useState('');
  const [generatorCategory, setGeneratorCategory] = useState('SaaS / AI');
  const [generatorTone, setGeneratorTone] = useState('High Energy');
  const [generatorDuration, setGeneratorDuration] = useState('45s');
  const [isGenerating, setIsGenerating] = useState(false);

  // Teleprompter Modal State
  const [activeTeleprompterScript, setActiveTeleprompterScript] = useState<ScriptItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<number>(3); // 1 to 5 speed multiplier
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const teleprompterRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopyScript = (script: ScriptItem) => {
    const activeHook = script.hooks[script.activeHookIndex] || script.hooks[0];
    const fullText = `🪝 HOOK (${activeHook.type}):\n${activeHook.text}\n\n⚡ BODY:\n${script.body}\n\n🎯 CALL TO ACTION:\n${script.cta}`;
    navigator.clipboard.writeText(fullText);
    setCopiedId(script.id);
    triggerToast('Copied script with active hook to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSwapHook = (scriptId: string, hookIdx: number) => {
    setScripts((prev) =>
      prev.map((sc) => (sc.id === scriptId ? { ...sc, activeHookIndex: hookIdx } : sc))
    );
  };

  const handleGenerateScript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generatorTopic.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const newScript: ScriptItem = {
        id: `sc-${Date.now()}`,
        title: generatorTopic,
        topic: generatorTopic,
        viralScore: Math.floor(Math.random() * 8) + 92,
        duration: generatorDuration,
        category: generatorCategory,
        createdAt: 'Just now',
        activeHookIndex: 0,
        hooks: [
          {
            id: `hk-new-a`,
            type: 'Pattern Interrupt',
            text: `Stop ignoring this massive shift in ${generatorTopic}. Here is the 3-step blueprint top creators use in 2026.`,
            retentionScore: 95,
          },
          {
            id: `hk-new-b`,
            type: 'Curiosity Gap',
            text: `Most people spend hours on ${generatorTopic} doing it completely wrong. Here is the secret workflow instead.`,
            retentionScore: 92,
          },
          {
            id: `hk-new-c`,
            type: 'Bold Challenge',
            text: `If you want to 10x your results with ${generatorTopic}, delete your old approach and steal this exact formula.`,
            retentionScore: 94,
          },
        ],
        body: `Step 1: Leverage automated competitor intelligence to pinpoint viral outlier topics. Step 2: Write pattern-interrupting hooks in the first 2.5 seconds. Step 3: Attach an AutoDM keyword funnel to convert viewers into leads.`,
        cta: `Comment "${generatorCategory.toUpperCase().slice(0, 5)}" below and I will DM you the full prompt template!`,
      };

      setScripts([newScript, ...scripts]);
      setIsGenerating(false);
      setIsGenerateModalOpen(false);
      setGeneratorTopic('');
      triggerToast(`Generated new viral script for "${generatorTopic}"!`);
    }, 1200);
  };

  // Auto-scroll logic for teleprompter
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && activeTeleprompterScript && teleprompterRef.current) {
      interval = setInterval(() => {
        if (teleprompterRef.current) {
          teleprompterRef.current.scrollTop += scrollSpeed;
        }
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying, scrollSpeed, activeTeleprompterScript]);

  // Filter scripts
  const categories = ['All', 'SaaS / AI', 'Growth Strategy', 'Monetization'];
  const filteredScripts = scripts.filter((sc) => {
    const matchesCategory = selectedCategory === 'All' || sc.category === selectedCategory;
    const matchesSearch =
      sc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sc.body.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <Sparkles size={16} className="text-purple-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="AI Scripting & Retention Studio"
        description="Craft high-retention video scripts with multi-hook split testing, teleprompter recording mode, and 1-click scheduler integration."
        actions={
          <Button
            variant="gradient"
            size="sm"
            icon={Plus}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generate New Script
          </Button>
        }
      />

      {/* Toolbar: Search & Category Filter Pills */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scripts by topic, hook, or keyword..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-purple-600 focus:bg-white text-slate-900 transition-all font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${selectedCategory === cat
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Scripts Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredScripts.length > 0 ? (
          filteredScripts.map((script) => {
            const activeHook = script.hooks[script.activeHookIndex] || script.hooks[0];
            return (
              <div
                key={script.id}
                className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-4">
                  {/* Top Header & Score Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider bg-purple-50 border border-purple-200/80 px-2 py-0.5 rounded-md">
                          {script.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{script.createdAt}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">{script.title}</h3>
                    </div>

                    <div className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-50 to-orange-50 px-3 py-1.5 text-xs font-black text-rose-600 border border-rose-200/80 shrink-0 shadow-2xs">
                      <Flame size={15} className="fill-rose-500 text-rose-500" />
                      <span>{script.viralScore}/100</span>
                    </div>
                  </div>

                  {/* 3-Hook Variation Engine Selector */}
                  <div className="rounded-2xl border border-purple-100 bg-linear-to-br from-purple-50/40 via-white to-purple-50/20 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                        <Wand2 size={12} className="text-primary-600" /> 3-Second Hook Variations (A/B Test)
                      </span>
                      <span className="text-[9px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        {activeHook.retentionScore}% Retention Score
                      </span>
                    </div>

                    {/* Hook Selector Tabs */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {script.hooks.map((hk, idx) => {
                        const isSelected = script.activeHookIndex === idx;
                        return (
                          <button
                            key={hk.id}
                            type="button"
                            onClick={() => handleSwapHook(script.id, idx)}
                            className={`px-2 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer text-center truncate ${isSelected
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-white text-slate-600 border border-purple-200/60 hover:border-purple-400'
                              }`}
                          >
                            Var {idx + 1}: {hk.type}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Hook Text Box */}
                    <div className="p-3 rounded-xl bg-white border border-purple-200/80 shadow-2xs space-y-1">
                      <p className="text-[10px] font-black uppercase text-primary-600 tracking-wider">
                        🪝 Active Hook ({activeHook.type})
                      </p>
                      <p className="text-xs font-bold text-slate-900 leading-relaxed">
                        "{activeHook.text}"
                      </p>
                    </div>
                  </div>

                  {/* Script Body & Call to Action */}
                  <div className="space-y-2 text-xs">
                    <div className="rounded-2xl bg-slate-50/80 p-3.5 border border-slate-200/60 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        ⚡ Core Body & Value Delivery ({script.duration})
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium">{script.body}</p>
                    </div>

                    <div className="rounded-2xl bg-emerald-50/60 p-3.5 border border-emerald-200/70 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 block">
                        🎯 Conversion Call to Action
                      </span>
                      <p className="text-emerald-950 font-bold leading-relaxed">{script.cta}</p>
                    </div>
                  </div>
                </div>

                {/* Footer Controls & Workflows */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock size={14} className="text-primary-600" />
                    <span>Est: {script.duration}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Launch Teleprompter Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTeleprompterScript(script);
                        setIsPlaying(false);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye size={13} /> Teleprompter
                    </button>

                    {/* Copy Full Script */}
                    <button
                      type="button"
                      onClick={() => handleCopyScript(script)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {copiedId === script.id ? (
                        <>
                          <Check size={13} className="text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Script
                        </>
                      )}
                    </button>

                    {/* Send to Scheduler */}
                    <Link href={`/instagram/calendar/scheduler?title=${encodeURIComponent(script.title)}&caption=${encodeURIComponent(`${script.hooks[script.activeHookIndex].text}\n\n${script.body}\n\n${script.cta}`)}`}>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-[#1e293b] hover:bg-[#0f172a] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Send size={12} /> Schedule Post
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 p-12 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-primary-600 flex items-center justify-center">
              <Sparkles size={22} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">No Scripts Found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery ? `No scripts matching "${searchQuery}"` : 'Generate your first AI script.'}
              </p>
            </div>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsGenerateModalOpen(true)}>
              Generate Script
            </Button>
          </div>
        )}
      </div>

      {/* GENERATOR MODAL */}
      {isGenerateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsGenerateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200 p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-primary-600 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <h3 className="text-base font-black text-slate-900">Generate AI Script</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateScript} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                  Video Topic or Core Idea <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={generatorTopic}
                  onChange={(e) => setGeneratorTopic(e.target.value)}
                  placeholder="e.g. How to use AI agents to automate Instagram DMs"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium focus:bg-white focus:border-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={generatorCategory}
                    onChange={(e) => setGeneratorCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-purple-500 outline-none font-bold"
                  >
                    <option value="SaaS / AI">SaaS / AI</option>
                    <option value="Growth Strategy">Growth Strategy</option>
                    <option value="Monetization">Monetization</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                    Duration Target
                  </label>
                  <select
                    value={generatorDuration}
                    onChange={(e) => setGeneratorDuration(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-purple-500 outline-none font-bold"
                  >
                    <option value="30s">30 Seconds (Fast Reel)</option>
                    <option value="45s">45 Seconds (Standard)</option>
                    <option value="60s">60 Seconds (In-Depth)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                  Tone of Voice
                </label>
                <select
                  value={generatorTone}
                  onChange={(e) => setGeneratorTone(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-purple-500 outline-none font-bold"
                >
                  <option value="High Energy">High Energy & Fast Paced</option>
                  <option value="Authoritative">Authoritative & Expert</option>
                  <option value="Storytelling">Storytelling & Relatable</option>
                  <option value="Contrarian">Contrarian & Disruptive</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  variant="gradient"
                  size="sm"
                  icon={Wand2}
                  disabled={isGenerating}
                >
                  {isGenerating ? 'Synthesizing...' : 'Generate 3-Hook Script'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TELEPROMPTER & LIVE RECORDING MODAL */}
      {activeTeleprompterScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-950 rounded-3xl border border-purple-900/60 text-white shadow-2xl overflow-hidden flex flex-col h-[80vh]">
            {/* Teleprompter Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="text-sm font-black tracking-wider text-slate-100 uppercase">
                  Teleprompter Recording Mode — {activeTeleprompterScript.title}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {/* Font Size Selector */}
                <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                  {(['sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setFontSize(sz)}
                      className={`px-2 py-0.5 text-[10px] font-black uppercase rounded cursor-pointer ${fontSize === sz ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTeleprompterScript(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Teleprompter Main Scrolling Text Window */}
            <div
              ref={teleprompterRef}
              className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar scroll-smooth"
            >
              <div className="text-center space-y-6 max-w-xl mx-auto py-8">
                {/* 🪝 Hook */}
                <div className="space-y-2">
                  <span className="inline-block rounded-full bg-purple-900/80 text-purple-300 px-3 py-1 text-xs font-black uppercase tracking-widest border border-purple-700/60">
                    🪝 HOOK (0 - 3 seconds)
                  </span>
                  <p
                    className={`font-black text-amber-300 leading-relaxed ${fontSize === 'sm'
                      ? 'text-lg'
                      : fontSize === 'md'
                        ? 'text-xl'
                        : fontSize === 'lg'
                          ? 'text-2xl'
                          : 'text-3xl'
                      }`}
                  >
                    "{activeTeleprompterScript.hooks[activeTeleprompterScript.activeHookIndex]?.text || activeTeleprompterScript.hooks[0].text}"
                  </p>
                </div>

                {/* ⚡ Body */}
                <div className="space-y-2 pt-4">
                  <span className="inline-block rounded-full bg-slate-800 text-slate-300 px-3 py-1 text-xs font-black uppercase tracking-widest border border-slate-700">
                    ⚡ VALUE DELIVERY (3 - 35 seconds)
                  </span>
                  <p
                    className={`font-bold text-slate-100 leading-relaxed ${fontSize === 'sm'
                      ? 'text-base'
                      : fontSize === 'md'
                        ? 'text-lg'
                        : fontSize === 'lg'
                          ? 'text-xl'
                          : 'text-2xl'
                      }`}
                  >
                    {activeTeleprompterScript.body}
                  </p>
                </div>

                {/* 🎯 CTA */}
                <div className="space-y-2 pt-4 pb-12">
                  <span className="inline-block rounded-full bg-emerald-900/80 text-emerald-300 px-3 py-1 text-xs font-black uppercase tracking-widest border border-emerald-700/60">
                    🎯 CALL TO ACTION
                  </span>
                  <p
                    className={`font-black text-emerald-400 leading-relaxed ${fontSize === 'sm'
                      ? 'text-lg'
                      : fontSize === 'md'
                        ? 'text-xl'
                        : fontSize === 'lg'
                          ? 'text-2xl'
                          : 'text-3xl'
                      }`}
                  >
                    "{activeTeleprompterScript.cta}"
                  </p>
                </div>
              </div>
            </div>

            {/* Teleprompter Bottom Controls Bar */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform hover:scale-105"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white ml-0.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (teleprompterRef.current) teleprompterRef.current.scrollTop = 0;
                    setIsPlaying(false);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Reset to Top"
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              {/* Speed Slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400">Scroll Speed:</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(Number(e.target.value))}
                  className="w-32 accent-purple-500 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-purple-400 w-8">{scrollSpeed}x</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTeleprompterScript(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
              >
                Close Teleprompter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
