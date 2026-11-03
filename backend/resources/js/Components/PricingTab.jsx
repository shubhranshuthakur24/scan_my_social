import React from 'react';
import { motion } from 'framer-motion';

export default function PricingTab({ text, selected, setSelected, discount = false, theme = 'dark' }) {
    const isLight = theme === 'light';

    return (
        <button
            onClick={() => setSelected(text)}
            className={`relative px-6 py-2.5 min-h-[44px] text-sm font-medium capitalize transition-all duration-300 rounded-full z-10 ${discount ? 'flex items-center justify-center gap-3' : ''
                } ${selected
                    ? (isLight ? 'text-white' : 'text-black')
                    : (isLight ? 'text-gray-500 hover:text-gray-900' : 'text-gray-400 hover:text-white')}`}
        >
            <span className="relative z-10">{text}</span>

            {/* Animated Tab Indicator */}
            {selected && (
                <motion.span
                    layoutId="pricing-tab"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    className={`absolute inset-0 z-0 rounded-full shadow-md ${isLight ? 'bg-primary-500' : 'bg-white'}`}
                />
            )}
        </button>
    );
}
