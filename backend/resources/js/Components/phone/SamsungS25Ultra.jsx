import React from 'react';
import { cn } from '@/lib/utils';

const samsungS25UltraStyles = `
    .samsung-s25-ultra {
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.75);
    }

    .samsung-s25-ultra__frame {
        background: #4f5c8e;
    }

    .samsung-s25-ultra__screen::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 20;
        pointer-events: none;
        border: 1px solid rgba(255, 255, 255, 0.12);
        opacity: 0.55;
    }
`;

export default function SamsungS25Ultra({
    children,
    className = '',
    bodyClassName = '',
    screenClassName = '',
    screenStyle,
    showCamera = false,
    showSideButtons = false,
    screenLabel = 'Samsung S25 Ultra screen',
    ...props
}) {
    return (
        <div
            className={cn('samsung-s25-ultra relative mx-auto aspect-[9.5/18] w-full max-w-[320px] overflow-hidden rounded-[18px]', className)}
            {...props}
        >
            <style>{samsungS25UltraStyles}</style>

            <div className={cn('samsung-s25-ultra__frame absolute inset-0', bodyClassName)}>
                {showSideButtons && <span aria-hidden="true" className="absolute -right-px top-1/3 h-16 w-px bg-black/20" />}
                {showCamera && <span aria-hidden="true" className="absolute left-1/2 top-3 z-30 h-2 w-2 -translate-x-1/2 rounded-full bg-black/40" />}

                <div
                    aria-label={screenLabel}
                    className={cn('samsung-s25-ultra__screen relative flex h-full w-full flex-col overflow-hidden text-white', screenClassName)}
                    style={screenStyle}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
