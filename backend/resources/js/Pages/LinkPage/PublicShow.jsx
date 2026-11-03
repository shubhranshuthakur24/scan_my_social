import { Head } from '@inertiajs/react';
import LinkInBioPublicCard from '@/Pages/LinkPage/Partials/LinkInBioPublicCard';
import { pickReadableText, withAlpha } from '@/Pages/LinkPage/Partials/themeColors';

export default function PublicShow({ link_page }) {
    const settings = {
        background_color: '#eadce5',
        text_color: '#35121e',
        button_background_color: '#6f1026',
        button_text_color: '#ffffff',
        button_style: 'rounded',
        layout: 'editorial',
        font_style: 'serif',
        cover_image: '/images/link-page-templates/atelier.jpg',
        ...(link_page.theme_settings || {}),
    };
    const safePageText = pickReadableText(settings.background_color, settings.text_color);

    return (
        <>
            <Head title={`${link_page.display_name} (@${link_page.username})`}>
                <meta name="description" content={link_page.bio || `${link_page.display_name}'s links`} />
                <meta property="og:title" content={`${link_page.display_name} (@${link_page.username})`} />
                <meta property="og:description" content={link_page.bio || `${link_page.display_name}'s links`} />
                {link_page.avatar_url && <meta property="og:image" content={link_page.avatar_url} />}
            </Head>
            <main className="flex min-h-screen items-center px-4 py-8" style={{ backgroundColor: settings.background_color, color: safePageText }}>
                <section className="mx-auto w-full max-w-xl">
                    {/* -------------------- */}
                    <LinkInBioPublicCard linkPage={link_page} settings={settings} links={link_page.links} />
                    {/* -------------------- */}
                    <p className="mt-6 text-center text-xs font-bold" style={{ color: withAlpha(safePageText, 0.62) }}>Powered by ScanMySocial</p>
                </section>
            </main>
        </>
    );
}
