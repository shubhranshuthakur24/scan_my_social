export default function InstagramNotConnectedEmptyState({
    title = 'No connected Instagram account',
    description = 'Connect an Instagram account first to get started.',
    connectHref = null,
    className = '',
}) {
    const targetConnectHref = connectHref || route('settings', { tab: 'integration' }, false);

    return (
        <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`.trim()}>
            <picture className="block">
                <source
                    media="(min-width: 768px)"
                    srcSet="/images/empty-states/instagram-not-connected-desktop.png"
                />
                <img
                    src="/images/empty-states/instagram-not-connected-mobile.png"
                    alt="No Instagram account connected"
                    className="h-auto w-full object-cover"
                    loading="lazy"
                />
            </picture>
            <div className="px-6 py-7 text-center sm:px-8 sm:py-8">
                <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                    {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 max-w-md mx-auto">
                    {description}
                </p>
                <a
                    href={targetConnectHref}
                    className="mt-5 inline-flex rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 hover:scale-[1.01] active:scale-95"
                >
                    Connect Instagram
                </a>
            </div>
        </section>
    );
}
