'use client';

import React, { useState } from 'react';
import PhoneMockupFrame from './PhoneMockupFrame';
import {
  ChevronLeft,
  MoreHorizontal,
  Heart,
  MessageSquare,
  Send,
  Bookmark,
  User,
  ThumbsUp,
  Flame,
  Zap,
  Star,
  Laugh,
  ExternalLink,
  CheckCircle2,
  Lock
} from 'lucide-react';

export interface PreviewPhoneProps {
  scene: 'content' | 'dm' | 'comment';
  onSceneChange?: (scene: 'content' | 'dm' | 'comment') => void;
  // Account info
  handle: string;
  accountProfileImageUrl?: string;
  // Selected Media
  selectedMedia?: {
    id: string;
    title: string;
    type: string;
    thumbnail: string;
    views?: string;
    comments?: string;
  } | null;
  sourceType?: 'media' | 'story';
  caption?: string;
  // DM Payload
  triggerKeyword: string;
  dmGreeting?: string;
  dmMessage: string;
  buttonLabel?: string;
  buttonUrl?: string;
  hasSecondaryButton?: boolean;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  // Growth & Gate
  requireFollow?: boolean;
  isFollowGateSimulated?: boolean;
  onToggleFollowGate?: () => void;
  // Comments Payload
  autoCommentReply?: boolean;
  commentReplies?: string[];
  publicReplyMessage?: string;
  className?: string;
}

export default function PreviewPhone({
  scene = 'content',
  onSceneChange,
  handle = 'scanmysocial',
  accountProfileImageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
  selectedMedia,
  sourceType = 'media',
  caption = 'Turn your Instagram comments into sales on autopilot. Comment PLAYBOOK below to get free instant access! 🚀',
  triggerKeyword = 'PLAYBOOK',
  dmGreeting = 'Hey there! 👋',
  dmMessage = 'Thanks for commenting! Here is your exclusive direct access link to our 2026 AI Instagram Growth Playbook & Prompt Vault:',
  buttonLabel = '📥 Download Playbook (PDF)',
  buttonUrl = 'https://scanmysocial.com/playbook',
  hasSecondaryButton = false,
  secondaryButtonLabel = '💬 Book 1-on-1 Call',
  secondaryButtonUrl = 'https://scanmysocial.com/call',
  requireFollow = true,
  isFollowGateSimulated = false,
  onToggleFollowGate,
  autoCommentReply = true,
  commentReplies = ['Check your DMs! 🚀 Just sent you the direct link.'],
  publicReplyMessage,
  className = '',
}: PreviewPhoneProps) {
  const [internalFollowSimulated, setInternalFollowSimulated] = useState(isFollowGateSimulated);

  const followSimulated = isFollowGateSimulated !== undefined ? isFollowGateSimulated : internalFollowSimulated;

  const handleToggleFollow = () => {
    if (onToggleFollowGate) {
      onToggleFollowGate();
    } else {
      setInternalFollowSimulated(!internalFollowSimulated);
    }
  };

  const isStoryTrigger = sourceType === 'story';
  const mediaTypeLabel = selectedMedia
    ? (selectedMedia.type ? selectedMedia.type.toUpperCase() : 'REEL')
    : (isStoryTrigger ? 'STORY' : 'POST');
  const activePublicReply = publicReplyMessage || (commentReplies && commentReplies.length > 0 ? commentReplies[0] : 'Check your DMs! 🚀');

  return (
    <aside className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Top Scene Tab Selector Bar */}
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400">Phone Preview</h4>
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => onSceneChange?.('content')}
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${scene === 'content'
              ? 'bg-white text-primary-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
          >
            Post / Story
          </button>
          <button
            type="button"
            onClick={() => onSceneChange?.('dm')}
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${scene === 'dm'
              ? 'bg-white text-primary-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
          >
            DM Chat
          </button>
          <button
            type="button"
            onClick={() => onSceneChange?.('comment')}
            className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${scene === 'comment'
              ? 'bg-white text-primary-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
          >
            Comments
          </button>
        </div>
      </div>

      {/* iPhone Frame Simulator */}
      <PhoneMockupFrame>
        {/* SCENE CONTENT RENDERER */}
        <div className="px-3 pb-3 pt-2">
          {scene === 'dm' ? (
            /* ==================================== */
            /* SCENE 1: DIRECT MESSAGE CHAT         */
            /* ==================================== */
            <>
              {/* DM Header */}
              <div className="flex items-center justify-between pb-3 text-slate-200">
                <ChevronLeft
                  className="h-4 w-4 cursor-pointer text-slate-400 hover:text-white"
                  onClick={() => onSceneChange?.('content')}
                />
                <div className="min-w-0 text-center flex items-center gap-1.5">
                  {accountProfileImageUrl ? (
                    <img
                      src={accountProfileImageUrl}
                      alt={handle}
                      className="w-4 h-4 rounded-full object-cover border border-primary-500/40"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center text-[9px] font-bold text-white">
                      {handle[0]?.toUpperCase()}
                    </div>
                  )}
                  <p className="truncate text-[11px] font-bold text-slate-100">@{handle}</p>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
                <MoreHorizontal className="h-4 w-4 text-slate-400" />
              </div>

              {/* DM Chat Scroll Area */}
              <div className="flex h-[520px] flex-col rounded-xl border border-slate-800 bg-linear-to-b from-slate-950 to-black p-2.5">
                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-none">
                  <div className="flex min-h-full flex-col justify-end space-y-2.5 text-[11px]">

                    {/* Follow-Gate Locked Banner (If enabled & not simulated as followed) */}
                    {requireFollow && !followSimulated && (
                      <div className="max-w-[92%] rounded-2xl border border-primary-900/60 bg-primary-950/40 p-3 text-slate-100 space-y-2 animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-primary-300 font-bold text-[10px]">
                          <Lock size={12} className="text-primary-400" /> Follow Required to Unlock
                        </div>
                        <p className="text-[10px] text-slate-300 leading-snug">
                          Please follow @{handle} to instantly unlock your link!
                        </p>
                        <div className="space-y-1 pt-1">
                          <button
                            type="button"
                            className="w-full rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-center text-[10px] font-bold text-slate-200"
                          >
                            Visit Profile
                          </button>
                          <button
                            type="button"
                            onClick={handleToggleFollow}
                            className="w-full rounded-full bg-gradient-to-r from-primary-600 to-indigo-600 px-3 py-1.5 text-center text-[10px] font-bold text-white shadow-xs hover:brightness-110 cursor-pointer"
                          >
                            Yes, I Follow @{handle}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DM Opening Greeting */}
                    {dmGreeting && (
                      <div className="max-w-[90%] rounded-2xl bg-slate-800/90 px-3 py-2 text-slate-100 shadow-2xs">
                        <p className="whitespace-pre-wrap break-words">{dmGreeting}</p>
                      </div>
                    )}

                    {/* User Trigger Keyword Echo (Right Bubble) */}
                    {triggerKeyword && (
                      <div className="ml-auto max-w-[70%] rounded-2xl bg-gradient-to-r from-primary-600 to-violet-600 px-3.5 py-2 text-right text-white font-mono font-bold shadow-xs">
                        {triggerKeyword}
                      </div>
                    )}

                    {/* DM Payload & CTA Buttons (Left Bubble) */}
                    {dmMessage && (
                      <div className="max-w-[90%] rounded-2xl bg-slate-800/90 px-3 py-2.5 text-slate-100 space-y-2 shadow-2xs">
                        <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">{dmMessage}</p>

                        {buttonLabel && (
                          <a
                            href={buttonUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full rounded-full bg-primary-600 hover:bg-primary-500 px-3 py-2 text-center text-[10px] font-bold text-white transition-colors shadow-xs"
                          >
                            {buttonLabel}
                          </a>
                        )}

                        {hasSecondaryButton && secondaryButtonLabel && (
                          <a
                            href={secondaryButtonUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="block w-full rounded-full bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-center text-[10px] font-bold text-slate-200 transition-colors"
                          >
                            {secondaryButtonLabel}
                          </a>
                        )}
                      </div>
                    )}

                    {!dmMessage && !dmGreeting && !requireFollow && (
                      <div className="max-w-[90%] rounded-2xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-slate-400 italic">
                        Type a message in the creator payload form to preview.
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Simulation Controls */}
                {requireFollow && (
                  <div className="text-center pt-2 pb-1 border-t border-slate-900 mt-1">
                    <button
                      type="button"
                      onClick={handleToggleFollow}
                      className="text-[9px] font-bold text-primary-400 hover:text-primary-300 underline cursor-pointer"
                    >
                      {followSimulated ? '↺ Switch to Locked Follow-Gate' : '⚡ Simulate Unlocked Follow State'}
                    </button>
                  </div>
                )}

                {/* DM Input Bar */}
                <div className="mt-2 flex items-center gap-2 px-1">
                  {accountProfileImageUrl ? (
                    <img
                      src={accountProfileImageUrl}
                      alt="Account profile"
                      className="h-5 w-5 rounded-full object-cover border border-primary-500/40"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-400">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                  <div className="flex-1 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] text-slate-500">
                    Message...
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ==================================== */
            /* SCENE 2 & 3: CONTENT / COMMENTS VIEW */
            /* ==================================== */
            <>
              {/* Instagram Feed Header */}
              <div className="flex items-center justify-between pb-2 text-slate-200">
                <ChevronLeft className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-bold tracking-wider uppercase text-slate-300">
                  {isStoryTrigger ? 'STORIES' : 'POSTS'}
                </p>
                <MoreHorizontal className="h-4 w-4 text-slate-400" />
              </div>

              {/* Account Creator Bar */}
              <div className="flex items-center gap-2 pb-2.5">
                {accountProfileImageUrl ? (
                  <img
                    src={accountProfileImageUrl}
                    alt="Account profile"
                    className="h-6.5 w-6.5 rounded-full object-cover border border-primary-500/50"
                  />
                ) : (
                  <div className="flex h-6.5 w-6.5 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-xs">
                    {handle[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-bold text-slate-100">@{handle}</p>
                  <p className="text-[9px] text-slate-400">AutoDM keyword trigger</p>
                </div>
              </div>

              {/* Media Image Box */}
              <div className="relative h-82.5 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 group">
                {selectedMedia ? (
                  <img
                    src={selectedMedia.thumbnail}
                    alt={selectedMedia.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-900 to-primary-950/40 p-6 text-center">
                    <p className="text-xs text-primary-300 font-medium">
                      {isStoryTrigger ? 'Select a story to preview' : 'Global Trigger: Active on All Posts & Reels'}
                    </p>
                  </div>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white border border-white/10">
                  {mediaTypeLabel}
                </span>
              </div>

              {/* Feed Action Bar (Likes, Comments, Share, Bookmark) */}
              <div className="flex items-center justify-between pt-2.5 text-slate-100">
                <div className="flex items-center gap-3">
                  <Heart className="h-4 w-4 hover:text-rose-500 transition-colors cursor-pointer" />
                  <MessageSquare
                    className={`h-4 w-4 cursor-pointer transition-colors ${scene === 'comment' ? 'text-primary-400 fill-primary-400' : 'hover:text-primary-400'
                      }`}
                    onClick={() => onSceneChange?.('comment')}
                  />
                  <Send className="h-4 w-4 hover:text-primary-400 transition-colors cursor-pointer" />
                </div>
                <Bookmark className="h-4 w-4 text-slate-400 hover:text-white transition-colors cursor-pointer" />
              </div>

              {/* Caption & Comments Container */}
              <div className="relative pt-2.5 h-[135px]">
                {/* Feed Caption */}
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-2">
                  <p className="line-clamp-4 text-[10px] leading-relaxed text-slate-200">
                    <span className="font-bold text-slate-100">@{handle}</span>{' '}
                    <span className="text-slate-300">{caption}</span>
                  </p>
                </div>

                {/* INSTAGRAM SLIDING COMMENTS DRAWER (Shown when scene === 'comment') */}
                <div
                  className={`absolute inset-x-0 -bottom-10 transition-all duration-300 ease-out ${scene === 'comment'
                    ? 'translate-y-0 opacity-100 z-30'
                    : 'translate-y-full opacity-0 pointer-events-none'
                    }`}
                >
                  <div className="flex h-[320px] flex-col overflow-hidden rounded-2xl border border-slate-700/90 bg-[#1c1d22] shadow-2xl">
                    {/* Drawer Drag Bar */}
                    <div className="flex justify-center pb-1 pt-2">
                      <span className="h-1 w-10 rounded-full bg-slate-500/60" />
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-1">
                      {/* Comments Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <p className="text-xs font-bold text-slate-100">Comments</p>
                        <span className="text-[10px] text-primary-400 font-bold bg-primary-950/60 px-2 py-0.5 rounded-full border border-primary-800/50">
                          AutoDM Triggered
                        </span>
                      </div>

                      {/* Comment Thread */}
                      <div className="mt-2.5 min-h-0 flex-1 space-y-3 overflow-y-auto scrollbar-none pr-0.5">
                        <div className="space-y-2">
                          {/* Viewer Comment (Trigger Match) */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-start gap-2">
                              <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-[9px]">
                                U
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <p className="text-[10px] font-bold text-slate-200">instagram_user</p>
                                <p className="text-[10px] font-mono font-bold text-primary-400 uppercase">
                                  {triggerKeyword || 'KEYWORD'}
                                </p>
                                <p className="text-[8px] text-slate-400">1m · Reply</p>
                              </div>
                            </div>
                            <Heart className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-500" />
                          </div>

                          {/* Public Bot Auto-Reply */}
                          {autoCommentReply && (
                            <div className="ml-6 border-l-2 border-primary-500/40 pl-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 flex-1 items-start gap-1.5">
                                  {accountProfileImageUrl ? (
                                    <img
                                      src={accountProfileImageUrl}
                                      alt={handle}
                                      className="mt-0.5 h-4 w-4 rounded-full object-cover border border-primary-400"
                                    />
                                  ) : (
                                    <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-[8px]">
                                      {handle[0]?.toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="truncate text-[9px] font-bold text-primary-300">@{handle}</p>
                                    <p className="whitespace-pre-wrap break-words text-[9px] text-slate-200 leading-snug">
                                      {activePublicReply}
                                    </p>
                                    <p className="text-[8px] text-slate-400">Just now · Reply</p>
                                  </div>
                                </div>
                                <Heart className="mt-1 h-3 w-3 shrink-0 text-rose-500 fill-rose-500" />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reaction Emoji Toolbar */}
                      <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 px-1 text-slate-300">
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><ThumbsUp className="h-3.5 w-3.5 text-blue-400" /></button>
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><Flame className="h-3.5 w-3.5 text-amber-500" /></button>
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><Heart className="h-3.5 w-3.5 text-rose-500" /></button>
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><Zap className="h-3.5 w-3.5 text-emerald-400" /></button>
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><Star className="h-3.5 w-3.5 text-yellow-400" /></button>
                        <button type="button" className="p-0.5 hover:scale-125 transition-transform"><Laugh className="h-3.5 w-3.5 text-amber-400" /></button>
                      </div>

                      {/* Comment Input Bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white font-bold text-[9px]">
                          U
                        </div>
                        <div className="flex-1 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[9px] text-slate-400">
                          Add a comment...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </PhoneMockupFrame>
    </aside>
  );
}
