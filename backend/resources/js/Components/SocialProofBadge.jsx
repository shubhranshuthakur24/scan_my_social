import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function SocialProofBadge({ className }) {
    const avatars = [
        "/images/avatars/avatar1.png",
        "/images/avatars/avatar2.png",
        "/images/avatars/avatar3.png",
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn(
                "inline-flex items-center gap-4 rounded-full border border-white/10 bg-slate-950/40 px-5 py-2.5 backdrop-blur-md shadow-2xl relative group overflow-hidden",
                className
            )}
        >
            {/* Subtle Animated Glow Effect */}
            <div className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-primary-500/50 to-transparent transition-opacity group-hover:opacity-100" />
            <div className="absolute inset-x-0 -top-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-accent-400/30 to-transparent transition-opacity group-hover:opacity-100" />

            {/* Avatar Stack */}
            <div className="flex -space-x-3.5">
                {avatars.map((avatar, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 * i + 0.3 }}
                        className="relative"
                    >
                        <img
                            src={avatar}
                            alt={`User ${i + 1}`}
                            className="h-8 w-8 rounded-full border-2 border-slate-950 object-cover shadow-lg ring-1 ring-white/10 transition-transform group-hover:scale-110"
                            style={{ zIndex: avatars.length - i }}
                        />
                    </motion.div>
                ))}

                {/* Last "plus" bubble if needed, but the image shows 3 avatars and the text */}
            </div>

            {/* Text Content */}
            <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-slate-100 antialiased">
                    Trusted by <span className="text-primary-400">2,000+</span> users
                </span>
                {/* Optional secondary text if desired, but image is simple */}
            </div>

            {/* Interactive Shine Effect on Hover */}
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 -translate-x-full group-hover:translate-x-full" style={{ transition: 'all 0.8s' }} />
        </motion.div>
    );
}
