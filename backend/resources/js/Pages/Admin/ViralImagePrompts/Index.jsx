import React, { useLayoutEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import PromptCard from '@/Components/PromptCard';
import Icon from '@/Components/Icon';
import PublicLayout from '@/Layouts/PublicLayout';

gsap.registerPlugin(ScrollTrigger);

function splitIntoColumns(items, numCols) {
    const cols = Array.from({ length: numCols }, () => []);

    items.forEach((item, index) => {
        cols[index % numCols].push(item);
    });

    return cols;
}

const carouselStyles = `
    .prompts-carousel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1.5rem;
        align-items: start;
        width: 100%;
    }

    @media (max-width: 1024px) {
        .prompts-carousel {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 768px) {
        .prompts-carousel {
            grid-template-columns: 1fr;
        }
    }

    .carousel-col {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        will-change: transform;
    }

    .carousel-col--staggered {
        margin-top: 4.5rem;
    }

    @media (max-width: 768px) {
        .carousel-col--staggered {
            margin-top: 0;
        }
    }
`;

export default function Index({ prompts, auth }) {
    const containerRef = useRef(null);
    const carouselRef = useRef(null);
    const colRefs = useRef([]);
    const [col1, col2, col3] = splitIntoColumns(prompts, 3);

    useLayoutEffect(() => {
        if (!carouselRef.current || prompts.length === 0 || typeof window === 'undefined') {
            return undefined;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return undefined;
        }

        const mm = gsap.matchMedia();
        const ctx = gsap.context(() => {
            mm.add('(min-width: 769px)', () => {
                const distances = [120, -160, 110];

                colRefs.current.forEach((col, index) => {
                    if (!col) {
                        return;
                    }

                    gsap.fromTo(
                        col,
                        { y: distances[index] * -0.35 },
                        {
                            y: distances[index],
                            ease: 'none',
                            scrollTrigger: {
                                trigger: carouselRef.current,
                                start: 'top bottom',
                                end: 'bottom top',
                                scrub: 1.1,
                            },
                        }
                    );
                });

                gsap.set('.product-card', { opacity: 0, y: 36 });

                ScrollTrigger.batch('.product-card', {
                    start: 'top 92%',
                    onEnter: (batch) => {
                        gsap.to(batch, {
                            opacity: 1,
                            y: 0,
                            duration: 0.75,
                            ease: 'power3.out',
                            stagger: 0.1,
                            overwrite: true,
                        });
                    },
                });
            });
        }, carouselRef);

        return () => {
            mm.revert();
            ctx.revert();
        };
    }, [prompts.length]);

    return (
        <>

            <Head title="Viral Image Prompts - ScanMySocial" />

            <style dangerouslySetInnerHTML={{ __html: carouselStyles }} />

            <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute left-1/2 top-0 h-[460px] w-[920px] -translate-x-1/2 rounded-full bg-primary-500/10 blur-3xl" />
                <div className="absolute -left-24 top-1/4 h-[320px] w-[320px] rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute bottom-0 right-[-80px] h-[360px] w-[360px] rounded-full bg-accent-500/10 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.06),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.05),_transparent_26%)]" />
            </div>

            <main ref={containerRef} className="bg-[#FAFAFA] min-h-screen pt-24  pb-24 relative overflow-hidden">

                <section className="mx-auto mb-14 max-w-3xl text-center">
                    <span className="inline-block rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600">
                        Prompt Vault
                    </span>
                    <h1 className="mt-6 text-4xl font-black leading-[0.95] tracking-tightest text-slate-900 sm:text-6xl">
                        Viral image <span className="text-primary-600">Prompts.</span>
                    </h1>
                    <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-relaxed text-slate-500 sm:text-lg">
                        Explore the visual prompts behind high-performing creative angles. Each card is optimized for quick scanning and easy copying.
                    </p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-primary-500" />
                            {prompts.length} prompts
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500 shadow-sm">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            New visual ideas
                        </div>
                    </div>
                </section>

                {prompts.length > 0 ? (
                    <div ref={carouselRef} className="prompts-carousel">
                        <div ref={(el) => { colRefs.current[0] = el; }} className="carousel-col carousel-col--staggered">
                            {col1.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>

                        <div ref={(el) => { colRefs.current[1] = el; }} className="carousel-col">
                            {col2.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>

                        <div ref={(el) => { colRefs.current[2] = el; }} className="carousel-col carousel-col--staggered">
                            {col3.map((prompt) => (
                                <PromptCard key={prompt.id} prompt={prompt} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mx-auto max-w-xl rounded-[2rem] border border-white/80 bg-white/90 p-10 text-center shadow-2xl shadow-primary-500/8 backdrop-blur-xl">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600">
                            <Icon name="image" size={28} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">No prompts found</h2>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                            No prompts are available right now.
                        </p>
                    </div>
                )}
            </main>
        </>
    );
}

Index.layout = (page) => <PublicLayout>{page}</PublicLayout>;
