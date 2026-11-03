import React from 'react';
import Button from '@/Components/Button';

/**
 * @deprecated Use <Button variant="gradient"> instead. This is a temporary
 * compatibility wrapper that will be removed in Phase 3.
 */
export default function GradientButton({ children, className = '', variant = 'primary', ...props }) {
    return (
        <Button variant="gradient" className={className} {...props}>
            {children}
        </Button>
    );
}
