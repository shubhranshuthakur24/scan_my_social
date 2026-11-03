'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

const InstagramLogo = ({ size = 12, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export interface InstagramButtonProps {
  children?: React.ReactNode;
  label?: string;
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  showExternalIcon?: boolean;
  showInstagramIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function InstagramButton({
  children,
  label = 'View on Instagram',
  href,
  target = '_blank',
  rel = 'noreferrer',
  onClick,
  showExternalIcon = true,
  showInstagramIcon = true,
  size = 'sm',
  className = '',
}: InstagramButtonProps) {
  const content = children || label;

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-[11px] gap-1 rounded-xl',
    md: 'px-4 py-2 text-xs sm:text-sm gap-1.5 rounded-2xl',
  }[size];

  const baseClasses = `inline-flex items-center justify-center font-extrabold text-white bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 shadow-2xs hover:opacity-95 active:scale-98 transition-all cursor-pointer select-none ${sizeStyles} ${className}`;

  const innerElements = (
    <>
      {showInstagramIcon && (
        <span className="flex items-center justify-center shrink-0">
          <InstagramLogo size={size === 'sm' ? 12 : 14} className="text-white" />
        </span>
      )}
      <span className="truncate">{content}</span>
      {showExternalIcon && (
        <ExternalLink size={size === 'sm' ? 10 : 12} className="shrink-0 text-white/90" />
      )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        onClick={onClick}
        className={baseClasses}
      >
        {innerElements}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={baseClasses}
    >
      {innerElements}
    </button>
  );
}
