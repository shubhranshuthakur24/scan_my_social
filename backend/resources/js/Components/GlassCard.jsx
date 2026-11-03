import React from 'react';

export default function GlassCard({ children, className = '', elevation = 'interactive', ...props }) {
    const elevations = {
        base: 'surface-base',
        interactive: 'surface-interactive',
        elevated: 'surface-elevated',
    };

    return (
        <div
            className={` ${elevations[elevation] || elevations.interactive} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
