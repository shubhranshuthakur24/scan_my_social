'use client';

import React from 'react';
import { AlertCircle, Globe } from 'lucide-react';
import { BaselineCapabilities } from '@/lib/watermark/browserCapabilities';

export interface CapabilityNoticeProps {
  capabilities: BaselineCapabilities;
}

export default function CapabilityNotice({ capabilities }: CapabilityNoticeProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (capabilities.isSupported && !capabilities.isMobileDevice) {
    return null;
  }

  return (
    <div className="rounded-xl border border-amber-200/90 bg-amber-50/60 p-4 shadow-2xs mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-amber-900 leading-relaxed flex-1">
          <p className="font-bold text-amber-950">
            {!capabilities.isSupported
              ? 'Browser feature limitation detected'
              : 'Desktop browser recommended'}
          </p>
          {!capabilities.isSupported ? (
            <div className="space-y-1 text-amber-800">
              <p>
                This tool requires browser features that may not be fully supported in your current environment:
              </p>
              <ul className="list-disc list-inside space-y-0.5 pl-1">
                {capabilities.unsupportedReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
              <p className="pt-1 flex items-center gap-1.5 font-medium">
                <Globe size={13} /> For full local processing support, try the latest version of Chrome or Edge.
              </p>
            </div>
          ) : capabilities.isMobileDevice ? (
            <p className="text-amber-800">
              Local media processing is compute-intensive. For faster processing and reliable background encoding, a modern desktop browser is recommended.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
