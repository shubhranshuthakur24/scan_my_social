'use client';

import React from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { ChevronLeft, Layers } from 'lucide-react';

export interface SchedulerHeaderProps {
  mediaLibraryCount: number;
  onOpenMediaLibrary: () => void;
  className?: string;
}

export default function SchedulerHeader({
  mediaLibraryCount,
  onOpenMediaLibrary,
  className = '',
}: SchedulerHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <Link href="/instagram/calendar">
        <Button variant="ghost" size="sm" icon={ChevronLeft}>
          Back to Calendar
        </Button>
      </Link>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={Layers}
          onClick={onOpenMediaLibrary}
        >
          Media Library ({mediaLibraryCount})
        </Button>
      </div>
    </div>
  );
}
