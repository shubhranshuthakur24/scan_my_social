import React, { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import TestimonialCard from './TestimonialCard';
import MasonryMediaCard from './MasonryMediaCard';

gsap.registerPlugin(ScrollTrigger);

const TESTIMONIALS = [
    {
        quote: "I found a competitor's video with 2M views, broke it down using Scan My Social, recreated it for my niche, and got 300K views in 4 days. I would have never found that without this tool.",
        author: "Sarah K.",
        role: "Fitness Coach",
        bgColor: "bg-blue-50"
    },
    {
        quote: "The Auto DM follow-to-unlock feature alone grew my Instagram by 4,000 followers in two weeks. My lead magnet was being delivered while I slept.",
        author: "Rahul M.",
        role: "Business Coach",
        bgColor: "bg-indigo-50"
    },
    {
        quote: "I cancelled my ManyChat subscription the same day I signed up for Scan My Social. Same Auto DM features, plus everything else I needed   at half the price.",
        author: "Priya T.",
        role: "Digital Entrepreneur",
        bgColor: "bg-fuchsia-50"
    },
    {
        quote: "I had no idea what content to make. Now I look at what is already working in my niche, recreate it with my own angle, and it consistently performs. This tool changed how I create.",
        author: "James O.",
        role: "Content Creator",
        bgColor: "bg-rose-50"
    }
];

export default function Testimonials() {
    const sectionRef = useRef(null);

    useGSAP(() => {
        const cards = sectionRef.current.querySelectorAll('.testimonial-card');

        gsap.fromTo(cards,
            { y: 50, opacity: 0, scale: 0.95 },
            {
                y: 0,
                opacity: 1,
                scale: 1,
                duration: 0.8,
                stagger: 0.15,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: sectionRef.current.querySelector('.testimonials-grid'),
                    start: 'top 80%',
                }
            }
        );

    }, { scope: sectionRef });

    return (
        <section ref={sectionRef} className="pt-32 pb-24 sm:pt-48 sm:pb-32 bg-white relative" id="testimonials">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary-50/50 rounded-full blur-3xl rounded-tl-none -translate-y-1/2 pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center mb-16">
                    <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                        Real Creators. <span className="text-primary-600">Real Results.</span>
                    </h2>
                    <p className="text-2xl font-black text-slate-400 tracking-tight font-montserrat">
                        See how we've helped creators like you build great brands and businesses.

                    </p>
                </div>



                {/* Mixed Media Masonry "Wall of Love" Grid */}
                <div className="mt-32 max-w-6xl mx-auto">

                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6 masonry-grid">

                        <MasonryMediaCard
                            type="video"
                            src="/testimonials/testimonial1.mp4"
                            alt="Creator Success Story"
                            aspect="aspect-[9/16]"
                        />

                        <TestimonialCard
                            quote="What stood out to me was how quickly it fit into our workflow. No steep learning curve, no friction just a straightforward way to produce content that actually resonates."
                            author="Ryan Mitchell"
                            role="via Trustpilot"
                            bgColor="bg-emerald-50"
                            className="break-inside-avoid masonry-item"
                        />

                        <MasonryMediaCard
                            type="video"
                            src="/testimonials/testimonial2.mp4"
                            alt="Vertical Video Review"
                            aspect="aspect-[9/16]"
                        />



                        <TestimonialCard
                            quote="Before this, our content strategy was mostly guesswork. Now we’re building off what’s already proven to work and adding our own perspective. The consistency in performance has been a noticeable step up."
                            author="James Oliver."
                            role="via Trustpilot"
                            bgColor="bg-rose-50"
                            className="break-inside-avoid masonry-item"
                        />

                        <MasonryMediaCard
                            type="video"
                            src="/testimonials/testimonial3.mp4"
                            alt="Brand Success Story"
                            aspect="aspect-[9/16]"
                        />
                        <TestimonialCard
                            quote="The Auto DM feature is incredibly well thought out. Setup was seamless it took me under two minutes to connect everything to our reels, and it’s been running reliably ever since."
                            author="Mark Davis."
                            role="via Trustpilot"
                            bgColor="bg-rose-50"
                            className="break-inside-avoid masonry-item"
                        />

                        <MasonryMediaCard
                            type="video"
                            src="/testimonials/testimonial4.mp4"
                            alt="Creator Review"
                            aspect="aspect-[9/16]"
                        />
                        <TestimonialCard
                            quote="This tool brought a level of clarity to our content process that we were missing. Instead of chasing ideas, we now operate with a clear framework and the results have followed."
                            author="Ananya Sharma"
                            role="via Trustpilot"
                            bgColor="bg-rose-50"
                            className="break-inside-avoid masonry-item"
                        />
                        <MasonryMediaCard
                            type="video"
                            src="/testimonials/testimonial5.mp4"
                            alt="Reel Success Story"
                            aspect="aspect-[9/16]"
                        />


                    </div>
                </div>
            </div>
        </section>
    );
}
