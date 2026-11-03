import { Head, Link } from '@inertiajs/react';
import { ChevronRight, FileText, Mail, ShieldCheck } from 'lucide-react';
import PublicNavbar from '@/Components/PublicNavbar';
import PublicFooter from '@/Components/PublicFooter';

function LegalSection({ children, title }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-950">{title}</h2>
            <div className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
                {children}
            </div>
        </section>
    );
}

const legalLinkClasses = 'rounded-md text-sm font-semibold text-primary-700 transition hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2';

export default function Terms({ auth }) {
    const lastUpdated = 'March 13, 2026';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-primary-100">
            <Head title="AutoDM Terms of Service - ScanMySocial">
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
            </Head>

            <PublicNavbar auth={auth} />

            <header className="px-6 pb-10 pt-24">
                <div className="mx-auto max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-3 py-1.5 text-sm font-semibold text-primary-700 shadow-sm">
                        <FileText className="h-4 w-4" />
                        <span>AutoDM Terms of Service</span>
                    </div>
                    <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 md:text-5xl">
                        Terms of Service
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                        These terms govern your use of ScanMySocial AutoDM and related Instagram automation features.
                    </p>
                    <p className="mt-5 text-sm font-medium text-slate-500">Last Updated: {lastUpdated}</p>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-6 pb-24">
                <div className="space-y-4">
                    <LegalSection title="1. Acceptance of Terms">
                        <p>
                            By accessing or using ScanMySocial AutoDM, you agree to these terms. If you do not agree, do not use the service.
                        </p>
                    </LegalSection>

                    <LegalSection title="2. Service Description">
                        <p>
                            AutoDM helps eligible users automate responses to Instagram comments and messages based on configured triggers, keywords, and account permissions.
                        </p>
                    </LegalSection>

                    <LegalSection title="3. User Responsibilities">
                        <ul className="list-disc space-y-2 pl-6">
                            <li>You must comply with Meta Platform Terms and Instagram policies.</li>
                            <li>You are responsible for all content sent through your automations.</li>
                            <li>You must not use the service for spam, abuse, harassment, or unlawful activity.</li>
                        </ul>
                    </LegalSection>

                    <LegalSection title="4. Account Access and Tokens">
                        <p>
                            To provide automation, we store and process Meta-issued access tokens and account identifiers. You may disconnect your account at any time.
                        </p>
                    </LegalSection>

                    <LegalSection title="5. Data and Privacy">
                        <p>
                            Our data handling practices are described in our Privacy Policy. Data deletion instructions are available at our Data Deletion page.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link href={route('privacy-policy')} className={legalLinkClasses}>
                                Privacy Policy
                            </Link>
                            <Link href={`${route('privacy-policy')}#data-deletion`} className={legalLinkClasses}>
                                Data Deletion Instructions
                            </Link>
                        </div>
                    </LegalSection>

                    <LegalSection title="6. Limitation of Liability">
                        <p>
                            The service is provided on an "as is" basis. We are not liable for indirect, incidental, or consequential damages arising from service use.
                        </p>
                    </LegalSection>

                    <LegalSection title="7. Contact">
                        <p>
                            For legal, compliance, or support inquiries, contact us at support@scanmysocial.com.
                        </p>
                    </LegalSection>
                </div>

                <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-700">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div className="min-w-0">
                                <h3 className="text-lg font-bold tracking-tight text-slate-950">
                                    Need help with compliance?
                                </h3>
                                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                                    We can help with webhook setup, terms review, and data deletion request configuration for Meta App Review.
                                </p>
                            </div>
                        </div>
                        <a
                            href="mailto:support@scanmysocial.com"
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                        >
                            <Mail className="h-4 w-4" />
                            Contact Support
                            <ChevronRight className="h-4 w-4" />
                        </a>
                    </div>
                </section>
            </main>

            <PublicFooter />
        </div>
    );
}
