import React from 'react';
import { Star, Quote } from 'lucide-react';

export default function TestimonialCard({ 
    quote, 
    author, 
    role, 
    bgColor = "bg-white", 
    className = "" 
}) {
    return (
        <div className={`testimonial-card relative p-8 sm:p-10 rounded-[2rem] border border-slate-100 ${bgColor} hover:shadow-xl transition-shadow overflow-hidden group ${className}`}>
            <Quote className="absolute top-8 right-8 w-24 h-24 text-slate-900/[0.04] transform -rotate-12 group-hover:scale-110 transition-transform duration-500" />
            
            <div className="flex items-center gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-8 h-8 sm:w-9 sm:h-9 bg-[#00b67a] flex items-center justify-center">
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white stroke-0" />
                    </div>
                ))}
            </div>
            
            <p className="text-lg sm:text-xl text-slate-700 font-medium mb-8 leading-relaxed font-montserrat relative z-10">
                "{quote}"
            </p>
            
            <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 shadow-sm">
                    {author.charAt(0)}
                </div>
                <div>
                    <p className="font-bold text-slate-900">{author}</p>
                    <p className="text-sm font-medium text-slate-500">{role}</p>
                </div>
            </div>
        </div>
    );
}
