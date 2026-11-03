import Icon from '@/Components/Icon';
import { ExternalLink } from 'lucide-react';
import { mixHex, pickReadableText, withAlpha } from '@/Pages/LinkPage/Partials/themeColors';

const styleRadius = {
    rounded: 'rounded-xl',
    pill: 'rounded-full',
    sharp: 'rounded-none',
};

const fontStyles = {
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono',
};

const linkIconNames = new Set([
    'link',
    'instagram',
    'youtube',
    'tiktok',
    'linkedin',
    'facebook',
    'pinterest',
    'twitter',
    'github',
    'whatsapp',
    'threads',
    'snapchat',
    'behance',
    'dribbble',
    'reddit',
    'telegram',
    'tumblr',
    'viber',
    'discord',
    'sharechat',
    'mail',
    'phone',
    'calendar',
    'sparkles',
]);

function LinkPageIcon({ name, className = '', size = 18 }) {
    return <Icon name={linkIconNames.has(name) ? name : 'link'} size={size} plain className={className} />;
}

function Avatar({ linkPage, compact, borderColor, surfaceColor, className = '' }) {
    const sizeClass = compact ? 'h-12 w-12 text-xl' : 'h-20 w-20 text-3xl';

    return (
        <div
            className={`${sizeClass} ${className} flex shrink-0 items-center justify-center overflow-hidden rounded-full font-black shadow-lg`}
            style={{ backgroundColor: surfaceColor, border: `${compact ? 2 : 3}px solid ${borderColor}` }}
        >
            {linkPage.avatar_url ? (
                <img src={linkPage.avatar_url} alt={linkPage.display_name} className="h-full w-full object-cover" />
            ) : (
                linkPage.display_name?.charAt(0) || '@'
            )}
        </div>
    );
}

function Identity({ linkPage, compact, textColor, mutedColor, align = 'center', showAvatar = true, fontClass = 'font-sans' }) {
    const alignment = align === 'left' ? 'items-start text-left' : 'items-center text-center';
    const titleSize = compact ? 'text-xl' : 'text-3xl';

    return (
        <div className={`flex flex-col ${alignment}`}>
            {showAvatar && (
                <Avatar
                    linkPage={linkPage}
                    compact={compact}
                    borderColor={withAlpha(textColor, 0.28)}
                    surfaceColor={withAlpha(textColor, 0.12)}
                    className="mb-3"
                />
            )}
            <h1 className={`${fontClass} ${titleSize} max-w-full break-words font-black leading-tight`} style={{ color: textColor }}>
                {linkPage.display_name}
            </h1>
            <p className={`${compact ? 'mt-1 text-[10px]' : 'mt-1.5 text-sm'} font-bold`} style={{ color: mutedColor }}>
                @{linkPage.username}
            </p>
            {linkPage.bio && (
                <p className={`${compact ? 'mt-2 line-clamp-2 text-[10px]' : 'mt-3 max-w-md text-sm'} leading-relaxed`} style={{ color: mutedColor }}>
                    {linkPage.bio}
                </p>
            )}
        </div>
    );
}

function LinkList({ links, settings, compact, disableLinkNavigation, textColor, emptyOnTransparent = false }) {
    const radius = styleRadius[settings.button_style] || styleRadius.rounded;
    const safeButtonText = pickReadableText(settings.button_background_color, settings.button_text_color);
    const visibleLinks = compact ? links.slice(0, 3) : links;

    if (visibleLinks.length === 0) {
        return (
            <div
                className={`${compact ? 'p-3 text-[10px]' : 'p-5 text-sm'} rounded-xl border text-center font-bold`}
                style={{
                    borderColor: withAlpha(textColor, 0.22),
                    backgroundColor: emptyOnTransparent ? withAlpha('#ffffff', 0.12) : withAlpha(textColor, 0.07),
                    color: withAlpha(textColor, 0.68),
                }}
            >
                Your links will appear here.
            </div>
        );
    }

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            {visibleLinks.map((link) => {
                const LinkElement = disableLinkNavigation ? 'div' : 'a';

                return (
                    <LinkElement
                        key={link.id}
                        {...(disableLinkNavigation ? {} : { href: link.url })}
                        className={`${radius} group flex min-h-0 items-center ${compact ? 'gap-2 px-2.5 py-2.5' : 'gap-3 px-4 py-4'} shadow-md transition duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                        style={{ backgroundColor: settings.button_background_color, color: safeButtonText }}
                    >
                        <span
                            className={`${compact ? 'h-7 w-7' : 'h-10 w-10'} flex shrink-0 items-center justify-center rounded-full`}
                            style={{ backgroundColor: withAlpha(safeButtonText, 0.12) }}
                        >
                            <LinkPageIcon name={link.icon || 'link'} size={compact ? 13 : 17} className="text-current" />
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                            <span className={`${compact ? 'text-[10px]' : 'text-sm'} block truncate font-black`}>{link.title}</span>
                            {link.description && !compact && (
                                <span className="mt-0.5 block truncate text-xs" style={{ color: withAlpha(safeButtonText, 0.75) }}>
                                    {link.description}
                                </span>
                            )}
                        </span>
                        <ExternalLink className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} shrink-0`} style={{ color: withAlpha(safeButtonText, 0.65) }} />
                    </LinkElement>
                );
            })}
        </div>
    );
}

function CoverImage({ source, alt, className = '', position = 'center' }) {
    if (!source) {
        return null;
    }

    return <img src={source} alt={alt} className={`h-full w-full object-cover ${className}`} style={{ objectPosition: position }} />;
}

export default function LinkInBioPublicCard({ linkPage, settings, links, disableLinkNavigation = false, displayMode = 'public' }) {
    const compact = displayMode !== 'public';
    const layout = settings.layout || 'editorial';
    const coverImage = linkPage.banner_url || settings.cover_image;
    const safePageText = pickReadableText(settings.background_color, settings.text_color);
    const mutedPageText = withAlpha(safePageText, 0.72);
    const surfaceColor = mixHex(settings.background_color, safePageText, 0.06);
    const fontClass = fontStyles[settings.font_style] || fontStyles.sans;
    const containerClass = compact
        ? 'relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.6rem] border shadow-lg'
        : 'relative overflow-hidden rounded-[2rem] border shadow-2xl shadow-slate-900/10';
    const baseStyle = {
        backgroundColor: settings.background_color,
        borderColor: withAlpha(safePageText, 0.2),
        color: safePageText,
    };
    const linkList = (
        <LinkList
            links={links}
            settings={settings}
            compact={compact}
            disableLinkNavigation={disableLinkNavigation}
            textColor={safePageText}
        />
    );

    if (layout === 'immersive') {
        return (
            <div className={`${containerClass} ${compact ? '' : 'min-h-[720px]'}`} style={baseStyle}>
                <div className="absolute inset-0">
                    <CoverImage source={coverImage} alt="" position="70% center" />
                    <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/15 to-black/95" />
                </div>
                <div className={`relative z-10 mt-auto ${compact ? 'p-4' : 'p-7 sm:p-9'}`}>
                    <Identity linkPage={linkPage} compact={compact} textColor="#ffffff" mutedColor="rgba(255,255,255,0.72)" align="left" showAvatar={false} fontClass={fontClass} />
                    <div className={compact ? 'mt-4' : 'mt-7'}>{linkList}</div>
                </div>
            </div>
        );
    }

    if (layout === 'split') {
        return (
            <div className={containerClass} style={baseStyle}>
                <div className={`${compact ? 'h-[48%]' : 'h-80 sm:h-96'} shrink-0 overflow-hidden`}>
                    <CoverImage source={coverImage} alt="" />
                </div>
                <div className={`${compact ? 'p-4' : 'p-7 sm:p-9'} flex-1`} style={{ backgroundColor: settings.background_color }}>
                    <Identity linkPage={linkPage} compact={compact} textColor={safePageText} mutedColor={mutedPageText} align="left" showAvatar={false} fontClass={fontClass} />
                    <div className={compact ? 'mt-4' : 'mt-7'}>{linkList}</div>
                </div>
            </div>
        );
    }

    if (layout === 'cinematic') {
        return (
            <div className={`${containerClass} ${compact ? '' : 'min-h-[720px]'}`} style={baseStyle}>
                <div className={`${compact ? 'h-[62%]' : 'h-[430px]'} relative shrink-0 overflow-hidden`}>
                    <CoverImage source={coverImage} alt="" position="center 38%" />
                    <div
                        className="absolute inset-x-0 bottom-0 h-2/3"
                        style={{ background: `linear-gradient(180deg, transparent 0%, ${withAlpha(settings.background_color, 0.98)} 100%)` }}
                    />
                    <div className={`absolute inset-x-0 bottom-0 ${compact ? 'px-4 pb-4' : 'px-7 pb-8 sm:px-9'}`}>
                        <Identity linkPage={linkPage} compact={compact} textColor={safePageText} mutedColor={mutedPageText} showAvatar={false} fontClass={fontClass} />
                    </div>
                </div>
                <div className={`${compact ? 'px-4 pb-4' : 'px-7 pb-8 sm:px-9 sm:pb-10'} flex-1`}>{linkList}</div>
            </div>
        );
    }

    if (layout === 'poster') {
        return (
            <div
                className={`${containerClass} ${compact ? '' : 'min-h-[700px]'}`}
                style={{
                    ...baseStyle,
                    backgroundImage: `radial-gradient(circle at 78% 12%, ${withAlpha(settings.button_background_color, 0.45)} 0, transparent 34%), linear-gradient(145deg, ${settings.background_color} 18%, ${mixHex(settings.background_color, settings.button_background_color, 0.38)} 100%)`,
                }}
            >
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(${withAlpha(safePageText, 0.18)} 1px, transparent 1px), linear-gradient(90deg, ${withAlpha(safePageText, 0.18)} 1px, transparent 1px)`, backgroundSize: compact ? '28px 28px' : '48px 48px' }} />
                <div className={`${compact ? 'p-4' : 'p-7 sm:p-9'} relative z-10 flex min-h-0 flex-1 flex-col`}>
                    <p className={`${compact ? 'text-[9px]' : 'text-xs'} font-black uppercase tracking-[0.28em]`} style={{ color: mutedPageText }}>
                        @{linkPage.username}
                    </p>
                    <div className={`${compact ? 'mt-8' : 'mt-20'} max-w-lg`}>
                        <h1 className={`${fontClass} ${compact ? 'text-4xl' : 'text-7xl'} break-words font-black uppercase leading-[0.86]`} style={{ color: safePageText }}>
                            {linkPage.display_name}
                        </h1>
                        {linkPage.bio && <p className={`${compact ? 'mt-3 line-clamp-2 text-[10px]' : 'mt-6 text-base'} max-w-sm leading-relaxed`} style={{ color: mutedPageText }}>{linkPage.bio}</p>}
                    </div>
                    <div className={`${compact ? 'mt-auto pt-5' : 'mt-auto pt-16'}`}>{linkList}</div>
                </div>
            </div>
        );
    }

    if (layout === 'portrait') {
        return (
            <div
                className={containerClass}
                style={{
                    ...baseStyle,
                    backgroundImage: `radial-gradient(circle at 50% 38%, ${withAlpha(settings.button_background_color, 0.18)} 0, ${withAlpha(settings.button_background_color, 0.18)} 27%, transparent 27.5%)`,
                }}
            >
                <div className={`${compact ? 'px-4 pb-4 pt-8' : 'px-7 pb-9 pt-14 sm:px-9'} flex-1`}>
                    <Identity linkPage={linkPage} compact={compact} textColor={safePageText} mutedColor={mutedPageText} fontClass={fontClass} />
                    <div className={compact ? 'mt-6' : 'mt-10'}>{linkList}</div>
                </div>
            </div>
        );
    }

    if (layout === 'gallery') {
        return (
            <div className={containerClass} style={baseStyle}>
                <div className={compact ? 'px-4 pb-3 pt-5' : 'px-7 pb-5 pt-9 sm:px-9'}>
                    <Identity linkPage={linkPage} compact={compact} textColor={safePageText} mutedColor={mutedPageText} showAvatar={false} fontClass={fontClass} />
                </div>
                <div className={`${compact ? 'h-32 gap-2 px-3' : 'h-64 gap-3 px-5 sm:px-7'} grid shrink-0 grid-cols-[0.72fr_1.3fr_0.72fr] overflow-hidden`}>
                    {['left center', 'center center', 'right center'].map((position) => (
                        <div key={position} className="overflow-hidden rounded-xl">
                            <CoverImage source={coverImage} alt="" position={position} />
                        </div>
                    ))}
                </div>
                <div className={compact ? 'p-4' : 'p-7 sm:p-9'}>{linkList}</div>
            </div>
        );
    }

    return (
        <div className={containerClass} style={{ ...baseStyle, backgroundColor: surfaceColor }}>
            <div className={`${compact ? 'h-[48%]' : 'h-80 sm:h-96'} relative shrink-0 overflow-hidden`}>
                <CoverImage source={coverImage} alt="" />
                {!coverImage && <div className="h-full w-full" style={{ background: `linear-gradient(145deg, ${settings.button_background_color}, ${settings.background_color})` }} />}
            </div>
            <div className={`${compact ? 'p-4' : 'p-7 sm:p-9'} flex-1`} style={{ backgroundColor: settings.background_color }}>
                <Identity linkPage={linkPage} compact={compact} textColor={safePageText} mutedColor={mutedPageText} align="left" showAvatar={false} fontClass={fontClass} />
                <div className={compact ? 'mt-4' : 'mt-7'}>{linkList}</div>
            </div>
        </div>
    );
}
