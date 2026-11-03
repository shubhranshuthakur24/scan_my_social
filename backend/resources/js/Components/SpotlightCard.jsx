import { useRef, useState } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(139, 92, 246, 0.15)' }) {
    const divRef = useRef(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        if (!divRef.current) return;

        const rect = divRef.current.getBoundingClientRect();

        // Spotlight position
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setPosition({ x, y });

        // 3D Tilt calculation
        // Calculate physics: center of card is 0, edges are -1 to 1
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // Sensitivity multipliers (lower is less rotation)
        const rotateMax = 4; // Max 4 degrees rotation

        const rotateX = ((y - centerY) / centerY) * -rotateMax;
        const rotateY = ((x - centerX) / centerX) * rotateMax;

        setTilt({ x: rotateX, y: rotateY });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
        setTilt({ x: 0, y: 0 }); // Reset tilt on leave
    };

    return (
        <div
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-xl transition-all duration-300 ease-out hover:shadow-2xl ${className}`}
            style={{
                transform: opacity ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)` : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                transformStyle: 'preserve-3d',
            }}
        >
            {/* Inner Glare / Rim Light (1px glassy top inner-glow) */}
            <div className="pointer-events-none absolute inset-0 rounded-3xl border-t border-white/10 mix-blend-overlay z-20" />

            {/* Spotlight Gradient */}
            <div
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-[1]"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
                }}
            />

            {/* Inner Content (slight z-translate for 3D flex) */}
            <div
                className="relative z-10 h-full w-full transition-transform duration-300 ease-out"
                style={{
                    transform: opacity ? 'translateZ(20px)' : 'translateZ(0px)',
                }}
            >
                {children}
            </div>
        </div>
    );
}
