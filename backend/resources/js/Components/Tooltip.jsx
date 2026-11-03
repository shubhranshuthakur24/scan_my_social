import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Transition } from '@headlessui/react';

export default function Tooltip({
    text,
    children,
    position = 'top',
    delay = 800,
    className = '',
    showOnFocus = true,
    showOnClick = false,
}) {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef(null);
    const autoHideRef = useRef(null);
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    // Performance: Optimize media query check once per component mount
    const canHoverRef = useRef(
        typeof window !== 'undefined' &&
        window.matchMedia('(hover: hover)').matches
    );

    const updateCoords = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();

        // Initial coordinates (relative to viewport)
        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                top = rect.top - 8; // 8px spacing
                left = rect.left + rect.width / 2;
                break;
            case 'bottom':
                top = rect.bottom + 8;
                left = rect.left + rect.width / 2;
                break;
            case 'bottom-end':
                top = rect.bottom + 8;
                left = rect.right;
                break;
            case 'left':
                top = rect.top + rect.height / 2;
                left = rect.left - 8;
                break;
            case 'right':
                top = rect.top + rect.height / 2;
                left = rect.right + 8;
                break;
        }

        setCoords({ top: top + window.scrollY, left: left + window.scrollX });
    };

    const handleMouseEnter = () => {
        if (autoHideRef.current) clearTimeout(autoHideRef.current);
        timeoutRef.current = setTimeout(() => {
            updateCoords();
            setShow(true);
        }, delay);
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setShow(false);
    };

    const handleFocus = () => {
        updateCoords();
        setShow(true);
    };

    const handleBlur = () => {
        setShow(false);
    };

    const toggleMobile = (e) => {
        if (!canHoverRef.current) {
            updateCoords();
            setShow(!show);

            // Auto hide after 3 seconds on mobile
            if (autoHideRef.current) clearTimeout(autoHideRef.current);
            autoHideRef.current = setTimeout(() => {
                setShow(false);
            }, 3000);
        }
    };

    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (autoHideRef.current) clearTimeout(autoHideRef.current);
        };
    }, []);

    // Also update coords on scroll or resize when visible
    useLayoutEffect(() => {
        if (show) {
            updateCoords();
            window.addEventListener('scroll', updateCoords, { passive: true });
            window.addEventListener('resize', updateCoords);
        }
        return () => {
            window.removeEventListener('scroll', updateCoords);
            window.removeEventListener('resize', updateCoords);
        };
    }, [show, position]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target)) {
                setShow(false);
            }
        };

        if (show) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [show]);

    const positions = {
        top: '-translate-x-1/2 -translate-y-full',
        bottom: '-translate-x-1/2',
        'bottom-end': '-translate-x-full',
        left: '-translate-x-full -translate-y-1/2',
        right: '-translate-y-1/2',
    };

    const arrows = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-primary-600',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-primary-600',
        'bottom-end': 'bottom-full right-5 border-b-primary-600',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-primary-600',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-primary-600',
    };

    const tooltipContent = (
        <Transition
            show={show}
            as={React.Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
        >
            <div
                role="tooltip"
                aria-hidden={!show}
                style={{
                    position: 'absolute',
                    top: `${coords.top}px`,
                    left: `${coords.left}px`,
                    zIndex: 9999
                }}
                className={`pointer-events-none ${positions[position]}`}
            >
                <div className="relative bg-primary-600 px-4 py-2 rounded-lg shadow-xl text-white text-[11px] font-bold tracking-wide max-w-[300px] w-max whitespace-normal leading-snug text-center capitalize">
                    {text}
                    <div className={`absolute w-0 h-0 border-[5px] border-transparent ${arrows[position]}`} />
                </div>
            </div>
        </Transition>
    );

    return (
        <>
            <div
                ref={triggerRef}
                className={`inline-block ${className}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={showOnFocus ? handleFocus : undefined}
                onBlur={showOnFocus ? handleBlur : undefined}
                onClick={showOnClick ? toggleMobile : undefined}
            >
                {children}
            </div>
            {typeof document !== 'undefined' && createPortal(tooltipContent, document.body)}
        </>
    );
}

