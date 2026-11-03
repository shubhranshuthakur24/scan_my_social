'use client';

import React from 'react';
import { Signal, Wifi, BatteryFull } from 'lucide-react';

export interface PhoneMockupFrameProps {
  children: React.ReactNode;
  time?: string;
  className?: string;
  screenClassName?: string;
  screenStyle?: React.CSSProperties;
  showStatusBar?: boolean;
  statusBarClassName?: string;
  statusBarStyle?: React.CSSProperties;
  showHomeIndicator?: boolean;
  homeIndicatorClassName?: string;
  showDynamicIsland?: boolean;
}

export default function PhoneMockupFrame({
  children,
  time = '9:41',
  className = '',
  screenClassName = '',
  screenStyle,
  showStatusBar = true,
  statusBarClassName = '',
  statusBarStyle,
  showHomeIndicator = true,
  homeIndicatorClassName = '',
  showDynamicIsland = true,
}: PhoneMockupFrameProps) {
  return (
    <div className={`mx-auto w-full max-w-85 ${className}`}>
      <div className="relative mx-auto w-[300px]">
        {/* Physical Side Buttons */}
        <div className="absolute -left-1 top-16 h-8 w-[3px] rounded-full bg-[#1f1f1f]/95" />
        <div className="absolute -left-1 top-28 h-12 w-[3px] rounded-full bg-[#1f1f1f]/95" />
        <div className="absolute -left-1 top-44 h-16 w-[3px] rounded-full bg-[#1f1f1f]/95" />
        <div className="absolute -right-1 top-44 h-20 w-[3px] rounded-full bg-[#1f1f1f]/95" />

        {/* Outer & Inner Bezel Frames */}
        <div className="rounded-[3.1rem] bg-linear-to-b from-[#1c1a26] via-[#0b0a10] to-[#161420] p-[3px] shadow-[0_30px_60px_-20px_rgba(124,58,237,0.25)]">
          <div className="rounded-[2.9rem] bg-linear-to-b from-[#121118] to-[#040406] p-[7px]">
            <div
              className={`relative h-[620px] overflow-hidden rounded-[2.45rem] border border-slate-800/80 bg-black text-slate-100 flex flex-col select-none ${screenClassName}`}
              style={screenStyle}
            >
              {/* Dynamic Island Notch */}
              {showDynamicIsland && (
                <div className="absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full bg-black px-5 py-1 flex items-center justify-center pointer-events-none">
                  <div className="h-1.5 w-20 rounded-full bg-slate-900/90" />
                </div>
              )}

              {/* iOS Status Bar */}
              {showStatusBar && (
                <div
                  className={`flex items-center justify-between px-5 pt-3.5 pb-1 text-[10px] font-semibold text-slate-300 z-20 relative shrink-0 ${statusBarClassName}`}
                  style={statusBarStyle}
                >
                  <span>{time}</span>
                  <span className="inline-flex items-center gap-1">
                    <Signal className="h-3 w-3" />
                    <Wifi className="h-3 w-3" />
                    <BatteryFull className="h-3 w-3" />
                  </span>
                </div>
              )}

              {/* Screen Content */}
              {children}

              {/* iOS Home Indicator Bar */}
              {showHomeIndicator && (
                <div
                  className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full bg-white/40 z-30 pointer-events-none ${homeIndicatorClassName}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
