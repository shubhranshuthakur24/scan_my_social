'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface PrimaryNavTabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface PrimaryNavTabsProps {
  tabs: PrimaryNavTabItem[];
  rightElement?: React.ReactNode;
  className?: string;
  /** Unique module identifier (e.g. 'instagram', 'content-library') for route position memory */
  id?: string;
}

/**
 * Global module-scoped memory keyed by module ID so navigating between pages animates smoothly
 */
const globalNavMemory: Record<string, { left: number; width: number }> = {};

/**
 * Width of the concave flare + slope on each side of the active notch.
 * Symmetrical 26px flare on left and right outside the tab content.
 */
export const NOTCH_FLARE_SPAN = 26;

/**
 * NotchedTabBackdrop renders the curved notched background:
 * - Spans from the top border (-top-[1px]) with a subtle 2-3px floating bottom gap.
 * - Smooth concave flares along the top edge tangent to y=1.
 * - Gentle ~65° inward slope.
 * - Smooth, round convex fillets tangent to the bottom edge at y=55.
 * - Symmetrical 26px flares on left and right completely outside the tab content.
 */
export function NotchedTabBackdrop({ width }: { width: number }) {
  const w = Math.max(width, 100);

  const flareW = 14;
  const slopeW = 4;
  const cornerW = 8;
  const leftStartCorner = 18; // 14 + 4
  const leftEndCorner = 26; // 18 + 8 (matches NOTCH_FLARE_SPAN)

  const rightEndCorner = w - leftEndCorner;
  const rightStartCorner = w - leftStartCorner;
  const rightSlopeEnd = w - flareW;

  const pathD = `
    M 0,1 
    C 7,1 11,4 ${flareW},14 
    L ${leftStartCorner},38 
    C 20,47 22,55 ${leftEndCorner},55 
    L ${rightEndCorner},55 
    C ${rightStartCorner - 4},55 ${rightStartCorner - 2},47 ${rightStartCorner},38 
    L ${rightSlopeEnd},14 
    C ${w - 11},4 ${w - 7},1 ${w},1 
    Z
  `;

  return (
    <svg
      aria-hidden="true"
      className="w-full h-[45px] pointer-events-none text-primary-600"
      viewBox={`0 0 ${w} 56`}
      preserveAspectRatio="none"
    >
      <path
        fill="currentColor"
        d={pathD}
      />
    </svg>
  );
}

export default function PrimaryNavTabs({
  tabs,
  rightElement,
  className = '',
  id = 'default',
}: PrimaryNavTabsProps) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Compute active tab index based on route
  const resolvedActiveIndex = tabs.findIndex((tab, i) => {
    const isFirstTab = i === 0;
    return tab.exact
      ? pathname === tab.href
      : pathname === tab.href || (!isFirstTab && pathname.startsWith(tab.href));
  });
  const activeIndex = resolvedActiveIndex >= 0 ? resolvedActiveIndex : 0;

  // Optimistic index for instant 0ms response on click
  const [optimisticIndex, setOptimisticIndex] = useState<number | null>(null);
  const effectiveIndex = optimisticIndex ?? activeIndex;

  // Check if we have previous memory from client-side navigation within this module
  const rememberedRect = globalNavMemory[id] ?? null;

  // Track whether we are in active sliding mode (triggered by tab navigation/clicks)
  const [isSliding, setIsSliding] = useState(() => Boolean(rememberedRect));

  // Active tab indicator geometry
  const [tabRect, setTabRect] = useState<{ left: number; width: number } | null>(() => rememberedRect);
  const [isReady, setIsReady] = useState(false);

  const updatePosition = (idx: number, animate = true) => {
    const tabEl = tabRefs.current[idx];
    if (tabEl) {
      const left = tabEl.offsetLeft;
      const width = tabEl.offsetWidth;
      if (width > 0) {
        setTabRect({ left, width });
        globalNavMemory[id] = { left, width };
        if (animate) setIsReady(true);
      }
    }
  };

  // Synchronous pre-paint measurement to prevent layout jumps on initial load
  useIsomorphicLayoutEffect(() => {
    setOptimisticIndex(null);

    const hasPrevious = Boolean(globalNavMemory[id]);
    updatePosition(activeIndex, hasPrevious);

    // Enable fluid animations for subsequent tab switches
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 50);

    const onResize = () => updatePosition(activeIndex, false);
    window.addEventListener('resize', onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, [pathname, activeIndex, id]);

  return (
    <div className={`flex items-center justify-between gap-4 mb-8 flex-wrap ${className}`}>
      {/* Flush Notched Floating Pill Navigation */}
      <div className="overflow-x-auto scrollbar-none py-1">
        <div
          ref={containerRef}
          className="relative inline-flex items-stretch bg-white border border-slate-200/90 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-12 h-[48px] select-none"
        >
          {/* Butter-Smooth Sliding Notched Backdrop (Active during transitions) */}
          {isSliding && tabRect && (
            <div
              className={`absolute left-0 -top-[1px] bottom-[2px] pointer-events-none z-0 ${
                isReady
                  ? 'transition-[transform,width] duration-350 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[transform,width]'
                  : ''
              }`}
              style={{
                transform: `translate3d(${tabRect.left - NOTCH_FLARE_SPAN}px, 0, 0)`,
                width: `${tabRect.width + NOTCH_FLARE_SPAN * 2}px`,
              }}
            >
              <NotchedTabBackdrop width={tabRect.width + NOTCH_FLARE_SPAN * 2} />
            </div>
          )}

          {/* Navigation Tab Links */}
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isCurrentActive = idx === effectiveIndex;

            return (
              <Link
                key={tab.name}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                href={tab.href}
                onClick={() => {
                  setIsSliding(true);
                  setOptimisticIndex(idx);
                  updatePosition(idx, true);
                }}
                className={`relative z-10 flex items-center justify-center gap-2 px-5 sm:px-6 text-xs sm:text-sm font-semibold shrink-0 whitespace-nowrap select-none transition-colors duration-200 ${
                  isCurrentActive
                    ? 'text-white'
                    : 'text-slate-700 hover:text-slate-950'
                }`}
              >
                {/* Zero-jump native CSS backdrop on initial SSR / first load */}
                {isCurrentActive && !isSliding && (
                  <div className="absolute -left-[26px] -top-[1px] bottom-[2px] w-[calc(100%+52px)] h-[45px] pointer-events-none z-0">
                    <NotchedTabBackdrop width={200} />
                  </div>
                )}
                <Icon
                  className={`relative z-10 w-4 h-4 transition-colors duration-200 ${
                    isCurrentActive ? 'text-white' : 'text-slate-600'
                  }`}
                />
                <span className="relative z-10 tracking-tight">{tab.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Element (Optional switcher, buttons, or custom controls) */}
      {rightElement && <div className="shrink-0 flex items-center gap-2">{rightElement}</div>}
    </div>
  );
}
