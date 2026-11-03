import React from 'react';
import Icon from '@/Components/Icon';

export const PLATFORMS = [
    { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500', supported: true },
    { id: 'youtube', name: 'YouTube', color: 'bg-red-600', supported: false },
    { id: 'tiktok', name: 'TikTok', color: 'bg-slate-900', supported: false },
    { id: 'linkedin', name: 'LinkedIn', color: 'bg-[#0077B5]', supported: false },
];

export function PlatformIcon({ platform, className = "w-4 h-4", padding = "p-1", size }) {
    const p = PLATFORMS.find(item => item.id === platform) || PLATFORMS.find(item => item.id === 'instagram');

    // If platform is instagram, we use our branded icon from registry which already has the gradient
    if (platform === 'instagram') {
        return (
            <div className={`rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 ${padding}`}>
                <Icon name="instagram" size={size || 16} plain={false} className={className} />
            </div>
        );
    }

    return (
        <div className={`${p.color} rounded-full flex items-center justify-center text-white shrink-0 ${padding}`}>
            <Icon name={p.id} className={className} strokeWidth={0} fill="currentColor" size={size || 12} plain={true} />
        </div>
    );
}

export default PlatformIcon;
