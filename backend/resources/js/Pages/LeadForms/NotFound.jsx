import { Head, Link } from '@inertiajs/react';

export default function NotFound({ public_id }) {
    return (
        <>
            <Head title="Form Not Found" />

            <main className="min-h-screen bg-slate-50 px-4 py-10">
                <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">404</p>
                    <h1 className="mt-2 text-2xl font-bold text-slate-900">Form not found</h1>
                    <p className="mt-3 text-sm text-slate-600">
                        The form link is invalid, unpublished, or no longer available.
                    </p>

                    {public_id && (
                        <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                            Public ID: <span className="font-semibold text-slate-800">{public_id}</span>
                        </p>
                    )}

                    <div className="mt-6">
                        <Link
                            href="/"
                            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
}
