import { useForm, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const defaultFields = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email', required: true },
    { key: 'message', label: 'Message', type: 'textarea', required: false },
];

export const defaultWebPageTheme = {
    theme_key: 'studio',
    background_color: '#f8fafc',
    text_color: '#0f172a',
    muted_text_color: '#64748b',
    accent_color: '#ef4444',
    surface_color: '#ffffff',
    border_color: '#e2e8f0',
    button_style: 'rounded',
    radius_style: 'rounded',
    layout_style: 'split',
    font_style: 'sans',
};

function buttonRadius(settings) {
    if (settings.button_style === 'pill') {
        return '999px';
    }

    return settings.button_style === 'sharp' ? '4px' : '12px';
}

function surfaceRadius(settings) {
    if (settings.radius_style === 'sharp') {
        return '4px';
    }

    return settings.radius_style === 'soft' ? '28px' : '12px';
}

function contrastColor(hexColor) {
    const hex = String(hexColor || '').replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) {
        return '#ffffff';
    }

    const [red, green, blue] = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16));
    const luminance = ((red * 299) + (green * 587) + (blue * 114)) / 1000;

    return luminance > 160 ? '#111827' : '#ffffff';
}

function sectionAnchor(section) {
    if (section.type === 'contact_form') {
        return 'contact';
    }

    const heading = section.content?.heading || section.type;

    return String(heading)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function surfaceStyle(settings) {
    return {
        backgroundColor: settings.surface_color,
        borderColor: settings.border_color,
        borderRadius: surfaceRadius(settings),
        color: settings.text_color,
    };
}

function trackedHref(webPage, section, url, target = 'primary', disableInteractions = false) {
    if (disableInteractions || !url) {
        return '#';
    }

    if (url.startsWith('#')) {
        return url;
    }

    return route('web-pages.public.click', {
        username: webPage.username,
        slug: webPage.slug,
        blockId: section.id,
        target,
    }, false);
}

function CtaButton({ webPage, section, label, url, variant = 'primary', disableInteractions = false, compact = false }) {
    if (!label) {
        return null;
    }

    const settings = webPage.theme_settings;
    const isPrimary = variant === 'primary';

    return (
        <a
            href={trackedHref(webPage, section, url, variant, disableInteractions)}
            onClick={disableInteractions ? (event) => event.preventDefault() : undefined}
            className={`inline-flex items-center justify-center gap-2 border font-extrabold transition ${compact ? 'px-3 py-2 text-[10px]' : 'px-5 py-3 text-sm hover:-translate-y-0.5'}`}
            style={isPrimary ? {
                backgroundColor: settings.accent_color,
                borderColor: settings.accent_color,
                borderRadius: buttonRadius(settings),
                color: contrastColor(settings.accent_color),
            } : {
                borderColor: settings.border_color,
                borderRadius: buttonRadius(settings),
                color: settings.text_color,
            }}
        >
            {label}
            {!compact && <ArrowRight className="h-4 w-4" />}
        </a>
    );
}

function StaticContactForm({ section, settings, compact }) {
    const fields = section.content?.fields?.length ? section.content.fields : defaultFields;

    return (
        <section id="contact" className={compact ? 'px-5 py-5' : 'mx-auto max-w-6xl px-5 py-16 sm:px-8'}>
            <div className={`grid border ${compact ? 'gap-3 p-4' : 'gap-8 p-6 md:grid-cols-[0.75fr_1.25fr] md:p-10'}`} style={surfaceStyle(settings)}>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: settings.accent_color }}>Get in touch</p>
                    <h2 className={compact ? 'mt-1 text-base font-black' : 'mt-3 text-3xl font-black sm:text-4xl'}>{section.content?.heading || 'Contact us'}</h2>
                </div>
                <div className={compact ? 'space-y-2' : 'space-y-3'}>
                    {fields.slice(0, compact ? 2 : fields.length).map((field) => (
                        <div key={field.key} className={`border ${compact ? 'h-7 px-2' : 'px-4 py-3'}`} style={{ borderColor: settings.border_color, borderRadius: buttonRadius(settings), color: settings.muted_text_color }}>
                            <span className={compact ? 'text-[8px] font-bold' : 'text-xs font-bold'}>{field.label}</span>
                        </div>
                    ))}
                    <span className={`inline-flex font-black ${compact ? 'px-3 py-2 text-[9px]' : 'px-5 py-3 text-sm'}`} style={{ backgroundColor: settings.accent_color, borderRadius: buttonRadius(settings), color: contrastColor(settings.accent_color) }}>
                        {section.content?.button_label || 'Submit'}
                    </span>
                </div>
            </div>
        </section>
    );
}

function ContactForm({ webPage, section }) {
    const { flash } = usePage().props;
    const settings = webPage.theme_settings;
    const fields = section.content?.fields?.length ? section.content.fields : defaultFields;
    const form = useForm({ data: {} });

    const submit = (event) => {
        event.preventDefault();
        form.post(route('web-pages.public.submit', {
            username: webPage.username,
            slug: webPage.slug,
            blockId: section.id,
        }, false), { preserveScroll: true });
    };

    const updateValue = (key, value) => {
        form.setData('data', { ...form.data.data, [key]: value });
    };

    return (
        <section id="contact" className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <div className="grid gap-8 border p-6 md:grid-cols-[0.75fr_1.25fr] md:p-10" style={surfaceStyle(settings)}>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: settings.accent_color }}>Get in touch</p>
                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">{section.content?.heading || 'Contact us'}</h2>
                    <p className="mt-3 max-w-sm text-sm leading-6" style={{ color: settings.muted_text_color }}>Share a few details and we will take it from there.</p>
                </div>
                <div>
                    {flash?.success && (
                        <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            {flash.success}
                        </div>
                    )}
                    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                        {fields.map((field) => {
                            const error = form.errors[`data.${field.key}`];
                            const value = form.data.data[field.key] || '';
                            const isWide = field.type === 'textarea';

                            return (
                                <div key={field.key} className={isWide ? 'sm:col-span-2' : ''}>
                                    <label className="mb-1.5 block text-xs font-black uppercase tracking-wider" style={{ color: settings.muted_text_color }}>
                                        {field.label}
                                        {field.required && <span className="text-rose-500"> *</span>}
                                    </label>
                                    {isWide ? (
                                        <textarea value={value} onChange={(event) => updateValue(field.key, event.target.value)} rows={4} className="w-full border bg-transparent text-sm shadow-sm focus:ring-2" style={{ borderColor: settings.border_color, borderRadius: buttonRadius(settings) }} />
                                    ) : (
                                        <input value={value} onChange={(event) => updateValue(field.key, event.target.value)} type={field.type || 'text'} className="w-full border bg-transparent text-sm shadow-sm focus:ring-2" style={{ borderColor: settings.border_color, borderRadius: buttonRadius(settings) }} />
                                    )}
                                    {error && <p className="mt-1 text-xs font-bold text-rose-600">{error}</p>}
                                </div>
                            );
                        })}
                        <div className="sm:col-span-2">
                            <button type="submit" disabled={form.processing} className="inline-flex items-center gap-2 px-5 py-3 text-sm font-black disabled:opacity-60" style={{ backgroundColor: settings.accent_color, borderRadius: buttonRadius(settings), color: contrastColor(settings.accent_color) }}>
                                {form.processing ? 'Sending...' : (section.content?.button_label || 'Submit')}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
}

function HeroSection({ webPage, section, compact, disableInteractions }) {
    const content = section.content || {};
    const settings = webPage.theme_settings;
    const layout = settings.layout_style || 'split';
    const imageUrl = content.image_url;
    const copy = (
        <div className={compact ? '' : 'relative z-10'}>
            {content.eyebrow && <p className={`${compact ? 'text-[8px]' : 'text-xs'} font-black uppercase tracking-[0.22em]`} style={{ color: layout === 'immersive' ? '#ffffff' : settings.accent_color }}>{content.eyebrow}</p>}
            <h1 className={`${compact ? 'mt-2 text-[22px] leading-[1.02]' : 'mt-4 max-w-4xl text-4xl leading-[1.02] sm:text-6xl lg:text-7xl'} font-black`} style={{ color: layout === 'immersive' ? '#ffffff' : settings.text_color }}>{content.heading || webPage.title}</h1>
            {content.body && <p className={`${compact ? 'mt-2 line-clamp-2 text-[9px] leading-4' : 'mt-5 max-w-2xl text-base font-medium leading-7 sm:text-lg'} `} style={{ color: layout === 'immersive' ? '#e5e7eb' : settings.muted_text_color }}>{content.body}</p>}
            <div className={`${compact ? 'mt-3' : 'mt-8'} flex flex-wrap gap-2`}>
                <CtaButton webPage={webPage} section={section} label={content.primary_label} url={content.primary_url} compact={compact} disableInteractions={disableInteractions} />
                <CtaButton webPage={webPage} section={section} label={content.secondary_label} url={content.secondary_url} variant="secondary" compact={compact} disableInteractions={disableInteractions} />
            </div>
        </div>
    );

    if (layout === 'immersive' && imageUrl) {
        return (
            <section className={`relative overflow-hidden ${compact ? 'min-h-[250px] p-5' : 'min-h-[82vh] px-5 py-20 sm:px-8 lg:px-14'}`} style={{ backgroundColor: settings.text_color }}>
                <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/60" />
                <div className={`relative z-10 mx-auto flex h-full max-w-7xl items-center ${compact ? 'min-h-[210px]' : 'min-h-[65vh]'}`}>
                    <div className={compact ? 'max-w-[72%]' : 'max-w-3xl'}>{copy}</div>
                </div>
            </section>
        );
    }

    if (layout === 'editorial') {
        return (
            <section className={compact ? 'p-5' : 'mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16'}>
                <div className={compact ? '' : 'max-w-5xl'}>{copy}</div>
                {imageUrl && <img src={imageUrl} alt="" className={`${compact ? 'mt-4 aspect-[2/1]' : 'mt-10 aspect-[16/7]'} w-full object-cover`} style={{ borderRadius: surfaceRadius(settings) }} />}
            </section>
        );
    }

    if (layout === 'centered') {
        return (
            <section className={`${compact ? 'p-5' : 'mx-auto max-w-6xl px-5 py-16 text-center sm:px-8'}`}>
                <div className={compact ? '' : 'mx-auto max-w-4xl'}>{copy}</div>
                {imageUrl && <img src={imageUrl} alt="" className={`${compact ? 'mt-4 aspect-[2/1]' : 'mt-10 aspect-[16/8]'} w-full object-cover`} style={{ borderRadius: surfaceRadius(settings) }} />}
            </section>
        );
    }

    return (
        <section className={`mx-auto grid max-w-7xl items-center ${compact ? 'min-h-[250px] grid-cols-[1.05fr_0.95fr] gap-4 p-5' : 'min-h-[78vh] gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]'}`}>
            {copy}
            {imageUrl ? (
                <img src={imageUrl} alt="" className="aspect-[4/5] h-full max-h-[680px] w-full object-cover" style={{ borderRadius: surfaceRadius(settings) }} />
            ) : (
                <div className="aspect-[4/5] w-full border" style={surfaceStyle(settings)} />
            )}
        </section>
    );
}

function ContentSection({ webPage, section, compact, disableInteractions }) {
    const content = section.content || {};
    const settings = webPage.theme_settings;
    const anchor = sectionAnchor(section);
    const sectionClass = compact ? 'px-5 py-5' : 'mx-auto max-w-6xl px-5 py-16 sm:px-8';
    const headingClass = compact ? 'text-base font-black' : 'text-3xl font-black sm:text-4xl';

    if (section.type === 'text') {
        return (
            <section id={anchor} className={`${sectionClass} ${compact ? '' : 'grid gap-6 md:grid-cols-[0.65fr_1.35fr]'}`}>
                <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: settings.accent_color }}>The idea</p>
                <div>
                    <h2 className={headingClass}>{content.heading}</h2>
                    <p className={`${compact ? 'mt-2 text-[9px] leading-4' : 'mt-5 text-lg leading-8'}`} style={{ color: settings.muted_text_color }}>{content.body}</p>
                </div>
            </section>
        );
    }

    if (section.type === 'image') {
        return (
            <section id={anchor} className={`${sectionClass} grid items-center ${compact ? 'grid-cols-2 gap-3' : 'gap-8 lg:grid-cols-[1.2fr_0.8fr]'}`}>
                <img src={content.image_url} alt={content.heading || webPage.title} className="aspect-[4/3] w-full object-cover" style={{ borderRadius: surfaceRadius(settings) }} />
                <div>
                    <h2 className={headingClass}>{content.heading}</h2>
                    <p className={`${compact ? 'mt-2 text-[9px] leading-4' : 'mt-4 text-base leading-7'}`} style={{ color: settings.muted_text_color }}>{content.body}</p>
                </div>
            </section>
        );
    }

    if (section.type === 'video') {
        return (
            <section id={anchor} className={sectionClass}>
                <h2 className={headingClass}>{content.heading}</h2>
                <div className={`${compact ? 'mt-3 aspect-video' : 'mt-7 aspect-video'} overflow-hidden border`} style={surfaceStyle(settings)}>
                    {compact ? <div className="flex h-full items-center justify-center text-[10px] font-black" style={{ color: settings.muted_text_color }}>VIDEO</div> : <iframe title={content.heading || 'Video'} src={content.url} className="h-full w-full" allowFullScreen />}
                </div>
            </section>
        );
    }

    if (section.type === 'cta') {
        return (
            <section id={anchor} className={`${sectionClass} text-center`}>
                <h2 className={headingClass}>{content.heading}</h2>
                <p className={`${compact ? 'mt-2 text-[9px]' : 'mx-auto mt-4 max-w-2xl text-base leading-7'}`} style={{ color: settings.muted_text_color }}>{content.body}</p>
                <div className={compact ? 'mt-3' : 'mt-7'}>
                    <CtaButton webPage={webPage} section={section} label={content.primary_label || 'Continue'} url={content.primary_url || content.url} compact={compact} disableInteractions={disableInteractions} />
                </div>
            </section>
        );
    }

    if (section.type === 'link_list') {
        return (
            <section id={anchor} className={sectionClass}>
                <h2 className={headingClass}>{content.heading}</h2>
                <div className={`${compact ? 'mt-3 gap-2' : 'mt-6 gap-3'} grid`}>
                    {(content.links || []).map((link) => (
                        <a key={`${link.label}-${link.url}`} href={disableInteractions ? '#' : link.url} onClick={disableInteractions ? (event) => event.preventDefault() : undefined} className={`flex items-center justify-between border font-black ${compact ? 'px-3 py-2 text-[9px]' : 'px-5 py-4 text-sm'}`} style={surfaceStyle(settings)}>
                            {link.label}
                            <ArrowRight className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
                        </a>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'faq') {
        return (
            <section id={anchor} className={sectionClass}>
                <h2 className={headingClass}>{content.heading}</h2>
                <div className={`${compact ? 'mt-3' : 'mt-6'} divide-y`} style={{ borderColor: settings.border_color }}>
                    {(content.items || []).map((item) => (
                        <div key={item.question} className={compact ? 'py-2' : 'grid gap-2 py-5 md:grid-cols-2'}>
                            <h3 className={compact ? 'text-[9px] font-black' : 'font-black'}>{item.question}</h3>
                            <p className={compact ? 'text-[8px]' : 'text-sm leading-6'} style={{ color: settings.muted_text_color }}>{item.answer}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'testimonials') {
        return (
            <section id={anchor} className={sectionClass}>
                <h2 className={headingClass}>{content.heading}</h2>
                <div className={`${compact ? 'mt-3 gap-2' : 'mt-6 gap-4'} grid md:grid-cols-2`}>
                    {(content.items || []).map((item) => (
                        <blockquote key={`${item.name}-${item.quote}`} className={`border ${compact ? 'p-3' : 'p-6'}`} style={surfaceStyle(settings)}>
                            <p className={compact ? 'text-[9px] font-bold leading-4' : 'text-lg font-bold leading-8'}>"{item.quote}"</p>
                            <footer className={`${compact ? 'mt-2 text-[8px]' : 'mt-5 text-sm'} font-black`} style={{ color: settings.muted_text_color }}>{item.name}</footer>
                        </blockquote>
                    ))}
                </div>
            </section>
        );
    }

    if (section.type === 'contact_form') {
        return disableInteractions
            ? <StaticContactForm section={section} settings={settings} compact={compact} />
            : <ContactForm webPage={webPage} section={section} />;
    }

    return null;
}

export default function WebPageCanvas({
    webPage,
    displayMode = 'public',
    disableInteractions = false,
    showBranding = true,
}) {
    const settings = { ...defaultWebPageTheme, ...(webPage.theme_settings || {}) };
    const page = { ...webPage, theme_settings: settings };
    const compact = displayMode === 'thumbnail';
    const sections = compact ? (page.sections || []).slice(0, 2) : (page.sections || []);
    const fontFamily = settings.font_style === 'serif'
        ? 'Georgia, Cambria, "Times New Roman", serif'
        : 'Inter, ui-sans-serif, system-ui, sans-serif';

    return (
        <div className="min-h-full overflow-hidden" style={{ backgroundColor: settings.background_color, color: settings.text_color, fontFamily }}>
            {!compact && (
                <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
                    <a href="#" onClick={disableInteractions ? (event) => event.preventDefault() : undefined} className="max-w-[70%] truncate text-sm font-black">{page.title}</a>
                    <a href="#contact" onClick={disableInteractions ? (event) => event.preventDefault() : undefined} className="text-xs font-black uppercase tracking-wider" style={{ color: settings.accent_color }}>Contact</a>
                </header>
            )}
            {sections.map((section, index) => (
                index === 0 && section.type === 'hero'
                    ? <HeroSection key={section.id} webPage={page} section={section} compact={compact} disableInteractions={disableInteractions} />
                    : <ContentSection key={section.id} webPage={page} section={section} compact={compact} disableInteractions={disableInteractions} />
            ))}
            {!compact && showBranding && (
                <footer className="mx-auto flex max-w-7xl items-center justify-between border-t px-5 py-7 text-xs font-bold sm:px-8" style={{ borderColor: settings.border_color, color: settings.muted_text_color }}>
                    <span>{page.title}</span>
                    <span>Made with ScanMySocial</span>
                </footer>
            )}
        </div>
    );
}
