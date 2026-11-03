import React, { useRef, useState } from 'react';
import { Play } from 'lucide-react';

export default function MasonryMediaCard({
    src,
    alt,
    className = "",
    type = "image", // "image" or "video"
    aspect = "aspect-[9/16]",
    mediaClassName = ""
}) {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
        }
    };

    return (
        <div className={`break-inside-avoid masonry-item shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden hover:scale-[1.02] hover:shadow-primary-500/20 transition-all duration-500 border border-slate-100 group bg-slate-950 p-1.5 ${className}`}>
            <div className={`relative ${aspect} bg-black rounded-[1.8rem] overflow-hidden border border-slate-800 shadow-inner`}>
                {/* Dynamic Island Notch */}
                <div className="absolute left-1/2 top-1.5 z-20 -translate-x-1/2 rounded-full bg-black px-4 py-1 shadow-sm">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1 w-1 rounded-full bg-[#1a1a1a]" />
                        <div className="h-1 w-10 rounded-full bg-[#0a0a0a]" />
                    </div>
                </div>

                {/* Media Content */}
                <div className="w-full h-full relative" onClick={type === 'video' ? togglePlay : undefined}>
                    {type === "image" ? (
                        <img
                            src={src}
                            alt={alt}
                            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${mediaClassName}`}
                        />
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                src={src}
                                loop
                                playsInline
                                onPlay={() => setIsPlaying(true)}
                                onPause={() => setIsPlaying(false)}
                                className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ${mediaClassName}`}
                            />
                            {!isPlaying && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity duration-300 pointer-events-none">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl">
                                        <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Home Indicator */}
                <div className="absolute left-1/2 bottom-1.5 w-1/4 h-1 -translate-x-1/2 rounded-full bg-white/30" />
            </div>
        </div>
    );
}

