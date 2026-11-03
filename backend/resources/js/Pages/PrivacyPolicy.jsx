import { Head, Link } from '@inertiajs/react';
import { Shield, Lock, Eye, FileText, ChevronRight, Mail } from 'lucide-react';
import PublicNavbar from '@/Components/PublicNavbar';
import PublicFooter from '@/Components/PublicFooter';

const PrivacyPolicy = ({ auth }) => {
    const lastUpdated = 'May 26, 2026';

    const sections = [
        {
            title: '1. Information We Collect',
            icon: <Eye className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We collect information needed to provide ScanMySocial and AutoDM features. Depending on how you use the product, this may include:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li><strong>Account Data:</strong> Name, email, authentication data, and profile details you provide during registration or sign-in.</li>
                        <li><strong>Meta/Instagram Data:</strong> Instagram professional account identifiers (such as account/user IDs and username), profile metadata, and data required to run connected automation and scheduling workflows.</li>
                        <li><strong>Automation and Content Data:</strong> Flow configuration, keywords, scheduled content metadata, notes, and operational logs generated while you use product features.</li>
                        <li><strong>Message and Comment Events:</strong> Events from Instagram comments/messages that are required to trigger and execute configured automations.</li>
                        <li><strong>Billing and Transaction Data:</strong> Subscription and payment metadata from our payment providers (we do not store full card numbers on our servers).</li>
                        <li><strong>Technical and Usage Data:</strong> Device, browser, IP address, pages/features used, timestamps, and diagnostics needed to secure and improve the service.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '2. How We Use Information',
            icon: <FileText className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We use collected information for legitimate business and service purposes, including to:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>Provide, maintain, and secure your account and connected workflows.</li>
                        <li>Run Instagram automations and scheduling features you configure (for example comment-triggered responses, direct message flows, and related analytics).</li>
                        <li>Process payments, subscriptions, invoices, and fraud prevention checks.</li>
                        <li>Send operational communications such as service notices, support responses, and security alerts.</li>
                        <li>Improve product quality, reliability, and user experience through diagnostics and aggregate usage analysis.</li>
                        <li>Comply with legal obligations and enforce our terms, policies, and platform safety controls.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '3. Legal Bases For Processing (EEA/UK)',
            icon: <FileText className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">Where GDPR/UK GDPR applies, we process personal data under one or more legal bases:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li><strong>Contract:</strong> To provide and operate the services you request.</li>
                        <li><strong>Legitimate Interests:</strong> To secure, improve, and support our platform.</li>
                        <li><strong>Legal Obligation:</strong> To comply with applicable laws, regulatory requirements, and lawful requests.</li>
                        <li><strong>Consent:</strong> Where required, including certain communications and optional processing activities.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '4. Sharing And Third-Party Services',
            icon: <Shield className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We do not sell personal data. We may share information with service providers and partners only as needed to operate the service:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li><strong>Meta (Facebook/Instagram):</strong> For account connection, automation events, messaging, and related platform APIs.</li>
                        <li><strong>Authentication and Platform Services:</strong> Providers used for sign-in, account integrity, and core infrastructure operations.</li>
                        <li><strong>AI Providers:</strong> OpenRouter/OpenAI/Google Gemini integrations for AI-enabled product features you choose to use.</li>
                        <li><strong>Payments:</strong> Razorpay and related payment processors for subscription billing and transaction handling.</li>
                        <li><strong>Legal and Safety Disclosures:</strong> When required by law, or necessary to protect rights, security, and users.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '5. International Data Transfers',
            icon: <Shield className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">ScanMySocial operates globally, and your information may be processed in countries other than your own.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>When required, we use appropriate safeguards for cross-border transfers under applicable law.</li>
                        <li>By using our services, you acknowledge that data may be transferred to and processed in jurisdictions with different data protection laws.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '6. Data Retention and Security',
            icon: <Lock className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We retain information only as long as reasonably necessary for service delivery, legal compliance, and dispute resolution.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li><strong>Retention:</strong> Account and workflow data is generally retained while your account is active, then deleted or anonymized per operational and legal requirements.</li>
                        <li><strong>Security Controls:</strong> We use administrative, technical, and organizational safeguards to protect personal data.</li>
                        <li><strong>Token Protection:</strong> Sensitive integration credentials, including Instagram access tokens, are encrypted at rest in our application.</li>
                        <li><strong>Access Limitation:</strong> Internal access is restricted to personnel and systems with a legitimate business need.</li>
                    </ul>
                </>
            ),
        },
        {
            title: '7. Your Privacy Rights',
            icon: <Eye className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">Depending on your location, you may have rights over your personal data, including:</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>Access, correction, updating, and deletion/erasure of personal data.</li>
                        <li>Objection to certain processing, restriction requests, or withdrawal of consent where applicable.</li>
                        <li>Data portability rights where legally required.</li>
                        <li>Complaint rights with your local supervisory authority/data protection regulator.</li>
                    </ul>
                    <p className="mt-4 text-slate-600">For India-based users, we support rights and grievance redressal processes aligned with the Digital Personal Data Protection Act, 2023, where applicable.</p>
                </>
            ),
        },
        {
            title: '8. Cookies and Similar Technologies',
            icon: <Lock className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We may use cookies and related technologies for authentication, security, analytics, and product functionality.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>Some cookies are required for core product functions and account sessions.</li>
                        <li>Analytics and performance tools help us understand and improve service quality.</li>
                        <li>You can manage many cookie preferences through your browser settings.</li>
                    </ul>
                </>
            ),
        },
        {
            title: "9. Children's Privacy",
            icon: <Shield className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">Our services are intended for businesses and creators, not children.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>We do not knowingly collect personal data directly from children where prohibited by applicable law.</li>
                        <li>If you believe a child has provided data to us inappropriately, contact us so we can investigate and take action.</li>
                    </ul>
                </>
            ),
        },
        {
            id: 'data-deletion',
            title: '10. Data Deletion Requests',
            icon: <FileText className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">You can request deletion of your ScanMySocial and AutoDM data at any time.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li><strong>Email Request:</strong> Send an email to support@scanmysocial.com from your registered email with subject <strong>"Data Deletion Request"</strong>.</li>
                        <li><strong>Include Details:</strong> Include your app account email and connected Instagram username for verification.</li>
                        <li><strong>Processing Time:</strong> Verified requests are processed within 7 business days.</li>
                        <li><strong>What We Delete:</strong> Connected Instagram account data, automation flows, logs, and related account data, except records we are legally required to retain.</li>
                    </ul>
                    <p className="mt-4 text-slate-600">For Meta platform requests, we also support registered deauthorization and data deletion callback flows required by Meta policies.</p>
                </>
            ),
        },
        {
            title: '11. Updates and Contact',
            icon: <Mail className="w-5 h-5" />,
            content: (
                <>
                    <p className="mb-4">We may update this policy to reflect legal, product, or operational changes.</p>
                    <ul className="list-disc pl-6 space-y-2 text-slate-600">
                        <li>When required, we will provide notice of material changes in-app, by email, or via website updates.</li>
                        <li>Questions, privacy requests, or complaints can be sent to <strong>support@scanmysocial.com</strong>.</li>
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <Link href={route('autodm.terms')} className="rounded-md text-sm font-semibold text-primary-700 transition hover:text-primary-800">
                            Terms of Service
                        </Link>
                        <Link href={route('autodm.data-deletion')} className="rounded-md text-sm font-semibold text-primary-700 transition hover:text-primary-800">
                            Data Deletion Instructions
                        </Link>
                    </div>
                </>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-primary-100">
            <Head title="Privacy Policy - ScanMySocial">
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
            </Head>

            {/* Background Decorations */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-200/40 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-accent-200/40 blur-[120px] rounded-full" />
            </div>

            {/* Top Navigation Bar */}
            <PublicNavbar auth={auth} />

            {/* Header Section */}
            <header className="pt-24 pb-16 px-6 relative overflow-hidden">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-600 text-sm font-medium mb-8">
                        <Lock className="w-4 h-4" />
                        <span>Security & Privacy First</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight text-slate-900">
                        Privacy Policy
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        At ScanMySocial, we are committed to protecting your privacy and ensuring the security of your data.
                    </p>
                    <div className="mt-8 text-slate-500 text-sm font-medium">
                        Last Updated: {lastUpdated}
                    </div>
                </div>
            </header>

            {/* Main Content Sections */}
            <main className="max-w-4xl mx-auto px-6 pb-32">
                <div className="space-y-12">
                    {sections.map((section, idx) => (
                        <section id={section.id || undefined} key={idx} className="group p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:border-primary-300/60 transition-all duration-500">
                            <div className="flex items-start gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-600 shrink-0 group-hover:scale-110 transition-transform duration-500">
                                    {section.icon}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 group-hover:text-primary-600 transition-colors text-slate-900">
                                        {section.title}
                                    </h2>
                                    <div className="text-slate-600 leading-relaxed text-lg">
                                        {section.content}
                                    </div>
                                </div>
                            </div>
                        </section>
                    ))}
                </div>

                {/* Closing Statement */}
                <div className="mt-20 p-10 rounded-3xl bg-linear-to-br from-primary-600 to-primary-800 text-center shadow-2xl shadow-primary-500/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 transform translate-x-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="w-64 h-64" />
                    </div>
                    <h2 className="text-3xl font-bold mb-4 relative z-10 text-white font-montserrat">Questions about our privacy?</h2>
                    <p className="text-white/90 mb-8 max-w-xl mx-auto text-lg relative z-10">
                        If you have any questions, requests, or concerns regarding this policy, reach out and our team will help.
                    </p>
                    <a href="mailto:support@scanmysocial.com" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary-900 rounded-full font-bold hover:bg-white/90 active:scale-95 transition-all relative z-10 font-montserrat">
                        <Mail className="w-4 h-4" />
                        Contact Support
                        <ChevronRight className="w-5 h-5" />
                    </a>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
};

export default PrivacyPolicy;
