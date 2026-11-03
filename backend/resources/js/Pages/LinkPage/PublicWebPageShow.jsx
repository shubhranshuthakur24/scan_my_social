import WebPageCanvas from '@/Pages/LinkPage/Partials/WebPageCanvas';
import { Head } from '@inertiajs/react';

export default function PublicWebPageShow({ web_page, is_preview = false }) {
    return (
        <>
            <Head title={web_page.title}>
                <meta name="description" content={web_page.description || web_page.title} />
            </Head>
            {is_preview && (
                <div className="sticky top-0 z-50 bg-slate-950 px-4 py-2 text-center text-xs font-black uppercase tracking-wider text-white">
                    Preview mode
                </div>
            )}
            <main className="min-h-screen">
                <WebPageCanvas webPage={web_page} />
            </main>
        </>
    );
}
