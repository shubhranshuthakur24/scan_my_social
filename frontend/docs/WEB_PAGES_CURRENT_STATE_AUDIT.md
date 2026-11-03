# Scan My Social — Web Pages Current State Audit Report
**Target Scope:** `/app` (Next.js 15 App Router Frontend) & `/api` (Laravel REST API Backend)  
**Excluded:** Legacy monolith `/sms`  
**Date of Audit:** October 2026  
**Auditor:** Antigravity (Google DeepMind Team)  
**Audit Protocol:** DIAGNOSE → PLAN → IMPLEMENT → VERIFY (Inspection Phase — Zero Changes Made)

---

## 1. Executive Summary

This audit evaluates the current state of the **Web Pages & Routing Architecture** of the decoupled **Scan My Social** platform, comprising the Next.js 15 App Router frontend (`/app`) and the Laravel 11 REST API backend (`/api`). 

### Key Metrics Discovered
* **Total Next.js App Router Routes:** 67 route definitions discovered in `app/src/app`.
* **Public Web Pages:** 13 pages (Landing page, Auth screens, Public Bio Links, Public Web Pages, Public Lead Forms, and Free Media Tools).
* **Authenticated Web Pages:** 47 pages (Dashboard, Content Library, Instagram Suite, Bio Links, Web Pages, Forms, CRM, Settings, and Video/Audio Tools).
* **Super Admin Pages:** 7 pages (`/admin/*`).
* **Redirect / Deprecated Routes:** 7 routes (e.g. `/content-library` → `/content-library/videos`, `/instagram` → `/instagram/profile`, `/settings` → `/settings/profile`, `/instagram/scheduler` → `/instagram/calendar/scheduler`).
* **Backend REST API Endpoints:** 65+ endpoints in `api/routes/api.php` under `/api/v1/*` covering authentication, content library, social bio links, web pages, lead forms, subscriptions, and Meta Graph API integration.

### Major Page Groups
1. **Public Marketing & Auth:** Marketing Homepage (`/`), Auth Screens (`/login`, `/register`, `/forgot-password`).
2. **Public Creator Micro-Sites & Lead Ingestion:** Public Bio Link profiles (`/bio/[username]`, `/bio/[username]/[slug]`), Custom Web Pages (`/pages/[username]/[slug]`), Standalone Lead Forms (`/f/[publicId]`).
3. **Public Client-Side Growth Tools:** Browser-based Watermark Remover (`/tools/watermark-remover`, `/batch`, `/image`) and Audio Noise Remover (`/tools/audio-noise-remover`).
4. **Content Library:** Videos Discovery (`/content-library/videos`), Video Detail (`/videos/[id]`), Script Refinement (`/videos/[id]/refine`), Tracked Channels (`/channels`), Channel Detail (`/channels/[id]`), Watchlists (`/watchlists`).
5. **Instagram Automation & Publishing Suite:** Profile & Outlier Analysis (`/instagram/profile`), Publishing Calendar (`/instagram/calendar`), Multi-Format Post Scheduler (`/instagram/calendar/scheduler`), AutoDM Campaign Manager (`/instagram/autodm`), Visual Funnel Builder (`/instagram/autodm/create`), Growth Analytics (`/instagram/analytics`).
6. **Social Bio Links & Web Pages:** Link in Bio Builder (`/social-bio-links`, `/create`, `/[id]/edit`), Bio Analytics (`/analytics`, `/[id]/analytics`), Link Shortener (`/linkshort`, `/[id]/analytics`), Custom Web Page Builder (`/web-pages`, `/create`, `/[id]/edit`, `/[id]/preview`).
7. **Lead Capture & Mini CRM:** Lead Forms Management (`/lead-forms`, `/[id]`), CRM Pipeline (`/crm`).
8. **Consultation Calendar & Scripting:** Calendar View (`/calendar`), AI Scripting Studio (`/scripting`).
9. **Account Settings & Affiliate:** Settings Tabs (`/settings/profile`, `/integrations`, `/subscription`, `/notifications`, `/api`), Affiliate Dashboard (`/affiliate`).
10. **Super Admin Console:** Admin Overview (`/admin/home`), Channels Apify Health (`/admin/channels`), Affiliate Approvals (`/admin/affiliates`), Payout Requests (`/admin/payouts`), Push Notifications (`/admin/notifications`), Script Intelligence Prompts (`/admin/script-intelligence`, `/admin/prompts`).

### Overall Implementation State
The platform is in a **transitional architecture**. Multiple primary modules (Instagram Suite, Content Library, Social Bio Links, Web Pages, Lead Forms, Client Media Tools) are **100% production-ready** and integrated with the `/api/v1` backend via strongly typed services and stores. However, several other modules (`/crm`, `/calendar`, `/scripting`, `/affiliate`, and all 7 `/admin/*` pages) are currently **prototype placeholders using hardcoded mock data** with no real API integration. Furthermore, critical public marketing routes (`/pricing`, `/privacy-policy`) and SEO assets (`robots.txt`, `sitemap.xml`) are missing.

---

## 2. Complete Route Inventory

| Route | Page / View Name | Access | Status | Main Component / File | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | Landing Page | Public | EXISTING | `app/src/app/page.tsx` | Marketing landing page with hero, outlier value props, FAQ accordion, and studio launch CTAs. |
| `/login` | Sign In | Public / Guest | EXISTING | `app/src/app/(auth)/login/page.tsx` | Email/password sign-in form with remember me, error handling, and Sanctum session dispatch. |
| `/register` | Sign Up | Public / Guest | EXISTING | `app/src/app/(auth)/register/page.tsx` | User onboarding registration form with password confirmation. |
| `/forgot-password` | Forgot Password | Public / Guest | EXISTING | `app/src/app/(auth)/forgot-password/page.tsx` | Password reset link request form. |
| `/bio/[username]` | Public Bio Link Profile | Public | EXISTING | `app/src/app/(public)/bio/[username]/page.tsx` | Public creator link-in-bio card with dynamic theme rendering, social icons, and outbound click tracking. |
| `/bio/[username]/[slug]` | Public Secondary Bio Card | Public | EXISTING | `app/src/app/(public)/bio/[username]/[slug]/page.tsx` | Categorized secondary link-in-bio page for creators with multiple profiles. |
| `/pages/[username]/[slug]` | Public Web Page Mini-Site | Public | EXISTING | `app/src/app/(public)/pages/[username]/[slug]/page.tsx` | High-converting public block-based mini-site (hero, features, forms, testimonials, CTAs). |
| `/tools/watermark-remover` | Public Video Watermark Remover | Public | EXISTING | `app/src/app/(public)/tools/watermark-remover/page.tsx` | Free client-side video watermark remover tool utilizing WebCodecs / WebWorkers. |
| `/tools/watermark-remover/batch` | Public Batch Watermark Tool | Public | EXISTING | `app/src/app/(public)/tools/watermark-remover/batch/page.tsx` | Multi-file queue processing tool for bulk reel watermark removal. |
| `/tools/watermark-remover/image` | Public Image Watermark Tool | Public | EXISTING | `app/src/app/(public)/tools/watermark-remover/image/page.tsx` | Canvas-based image inpainting and watermark eraser. |
| `/tools/audio-noise-remover` | Public Audio Noise Remover | Public | EXISTING | `app/src/app/(public)/tools/audio-noise-remover/page.tsx` | Client-side DSP noise cancellation tool for voiceover audio tracks. |
| `/f/[publicId]` | Public Lead Form | Public | EXISTING | `app/src/app/f/[publicId]/page.tsx` | Standalone full-page public lead capture form with multi-field validation. |
| `/social-integrations/instagram/callback` | Meta OAuth Callback | Authenticated | EXISTING | `app/src/app/social-integrations/instagram/callback/page.tsx` | Client callback receiver completing Instagram Graph API OAuth handshake. |
| `/dashboard` | Main App Dashboard | Authenticated | PLACEHOLDER | `app/src/app/(app)/dashboard/page.tsx` | Overview cards showing tracked profiles, localized reels, and AutoDM sent count (hardcoded mock values). |
| `/content-library` | Content Library Root | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/content-library/page.tsx` | Server redirect to `/content-library/videos`. |
| `/content-library/videos` | Video Content Library | Authenticated | EXISTING | `app/src/app/(app)/content-library/videos/page.tsx` | Filterable masonry grid of scraped competitor reels, transcripts, and outlier scores. |
| `/content-library/videos/[id]` | Video Analysis Studio | Authenticated | EXISTING | `app/src/app/(app)/content-library/videos/[id]/page.tsx` | Deep analysis modal/view showing video metadata, hook breakdown, and engagement statistics. |
| `/content-library/videos/[id]/refine` | Script Refinement Studio | Authenticated | EXISTING | `app/src/app/(app)/content-library/videos/[id]/refine/page.tsx` | Side-by-side editor adapting competitor viral frameworks into custom scripts. |
| `/content-library/channels` | Competitor Channels | Authenticated | EXISTING | `app/src/app/(app)/content-library/channels/page.tsx` | Tracked competitor profiles grid with follower metrics, scrape health, and search modal. |
| `/content-library/channels/[id]` | Channel Detail Feed | Authenticated | EXISTING | `app/src/app/(app)/content-library/channels/[id]/page.tsx` | Scraped video repository for a single tracked creator profile. |
| `/content-library/watchlists` | Watchlists Collections | Authenticated | EXISTING | `app/src/app/(app)/content-library/watchlists/page.tsx` | Grouped competitor folders for niche tracking. |
| `/instagram` | Instagram Suite Root | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/instagram/page.tsx` | Client redirect to `/instagram/profile`. |
| `/instagram/profile` | Connected Profile & Outliers | Authenticated | EXISTING | `app/src/app/(app)/instagram/profile/page.tsx` | Account sync status, token expiry health, follower metrics, and outlier reel table. |
| `/instagram/calendar` | Social Publishing Calendar | Authenticated | EXISTING | `app/src/app/(app)/instagram/calendar/page.tsx` | Multi-view calendar (`Month`, `Week`, `Day`) with strategy notes and scheduled post cards. |
| `/instagram/calendar/scheduler` | Multi-Format Post Publisher | Authenticated | EXISTING | `app/src/app/(app)/instagram/calendar/scheduler/page.tsx` | Post composer with ratio cropper, AutoDM trigger settings, and phone mockup preview. |
| `/instagram/scheduler` | Deprecated Scheduler Route | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/instagram/scheduler/page.tsx` | Client redirect to `/instagram/calendar/scheduler`. |
| `/instagram/autodm` | AutoDM Automation Rules | Authenticated | EXISTING | `app/src/app/(app)/instagram/autodm/page.tsx` | Active campaigns list, trigger keyword badges, delivery metrics, and status toggles. |
| `/instagram/autodm/create` | AutoDM Funnel Builder | Authenticated | EXISTING | `app/src/app/(app)/instagram/autodm/create/page.tsx` | Interactive visual automation builder configuring triggers, public replies, and private DMs. |
| `/instagram/analytics` | Instagram Growth Analytics | Authenticated | EXISTING | `app/src/app/(app)/instagram/analytics/page.tsx` | Graph API metrics charts (reach, impressions, follower growth, format mix over 30-90 days). |
| `/instagram/channels` | Instagram Channels Alias | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/instagram/channels/page.tsx` | Client redirect to `/content-library/channels`. |
| `/instagram/channels/[id]` | Instagram Channel Detail Alias | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/instagram/channels/[id]/page.tsx` | Client redirect to `/content-library/channels/[id]`. |
| `/instagram/watchlists` | Instagram Watchlists Alias | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/instagram/watchlists/page.tsx` | Client redirect to `/content-library/watchlists`. |
| `/social-bio-links` | Social Bio Links Manager | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/page.tsx` | Bio profiles manager with template picker, theme customizer, and link drag-and-drop. |
| `/social-bio-links/create` | Create Bio Profile | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/create/page.tsx` | Form to instantiate a new creator bio link card. |
| `/social-bio-links/[id]/edit` | Edit Bio Profile | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/[id]/edit/page.tsx` | Live interactive phone mockup editor customizing profile layout, avatar, and links. |
| `/social-bio-links/analytics` | Global Bio Analytics | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/analytics/page.tsx` | Aggregate view, click, and CTR metrics across all creator link cards. |
| `/social-bio-links/[id]/analytics` | Single Bio Card Analytics | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/[id]/analytics/page.tsx` | Detailed click distribution and referrer analytics for a specific bio page. |
| `/social-bio-links/linkshort` | Link Shortener Manager | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/linkshort/page.tsx` | URL shortener table with click tallies, QR code modals, and scheduling dates. |
| `/social-bio-links/linkshort/[id]/analytics` | Short Link Analytics | Authenticated | EXISTING | `app/src/app/(app)/social-bio-links/linkshort/[id]/analytics/page.tsx` | Historical click performance chart and device breakdown for a shortened link. |
| `/web-pages` | Web Pages Manager | Authenticated | EXISTING | `app/src/app/(app)/web-pages/page.tsx` | Listing of created mini-sites with view counts, conversion events, and quick builder links. |
| `/web-pages/create` | Create Web Page | Authenticated | EXISTING | `app/src/app/(app)/web-pages/create/page.tsx` | 3-step creation wizard choosing between 8 templates (Creator, Agency, Webinar, Product, etc.). |
| `/web-pages/[id]/edit` | Web Page Block Canvas Editor | Authenticated | EXISTING | `app/src/app/(app)/web-pages/[id]/edit/page.tsx` | Visual block builder customizing sections, headers, contact forms, testimonials, and color presets. |
| `/web-pages/[id]/preview` | Web Page Authenticated Preview | Authenticated | EXISTING | `app/src/app/(app)/web-pages/[id]/preview/page.tsx` | Renders the unpublished draft state of a custom web page with an administrative top banner. |
| `/lead-forms` | Lead Forms Dashboard | Authenticated | EXISTING | `app/src/app/(app)/lead-forms/page.tsx` | List of custom lead capture forms with status toggles, submission tallies, and direct links. |
| `/lead-forms/[id]` | Lead Form Builder | Authenticated | EXISTING | `app/src/app/(app)/lead-forms/[id]/page.tsx` | Drag-and-drop form schema builder (text, email, phone, dropdown, checkbox, cover upload). |
| `/crm` | CRM Leads Table | Authenticated | PLACEHOLDER | `app/src/app/(app)/crm/page.tsx` | Leads table rendering 3 hardcoded mock contacts (`mockLeads`) with no API calls. |
| `/calendar` | Appointments Strategy Calendar | Authenticated | PLACEHOLDER | `app/src/app/(app)/calendar/page.tsx` | Monthly calendar and consultation list displaying hardcoded mock bookings (`mockBookings`). |
| `/scripting` | AI Scripting Studio | Authenticated | PLACEHOLDER | `app/src/app/(app)/scripting/page.tsx` | Multi-hook script generator and teleprompter using hardcoded state and mock `setTimeout`. |
| `/affiliate` | Affiliate Partner Dashboard | Authenticated | PLACEHOLDER | `app/src/app/(app)/affiliate/page.tsx` | Partner commissions overview with hardcoded balances (`$588.00`) and mock referral links. |
| `/settings` | Settings Root | Authenticated | EXISTING (Redirect) | `app/src/app/(app)/settings/page.tsx` | Client redirect to `/settings/profile`. |
| `/settings/profile` | Profile & Password Settings | Authenticated | EXISTING | `app/src/app/(app)/settings/profile/page.tsx` | Form editing name, email, bio, avatar upload, and password update. |
| `/settings/integrations` | Connected Social Integrations | Authenticated | EXISTING | `app/src/app/(app)/settings/integrations/page.tsx` | Instagram Graph API connection card with welcome DM configuration. |
| `/settings/subscription` | Subscription & Billing History | Authenticated | EXISTING | `app/src/app/(app)/settings/subscription/page.tsx` | Subscription tier selector, credit allowance bar, and downloadable invoice archive. |
| `/settings/notifications` | Notification Preferences | Authenticated | EXISTING | `app/src/app/(app)/settings/notifications/page.tsx` | Checkbox toggles for email and in-app alerts (saved to user preferences). |
| `/settings/api` | API Keys & Webhooks | Authenticated | EXISTING | `app/src/app/(app)/settings/api/page.tsx` | API key generator and webhook secret management. |
| `/video-tools/watermark-remover` | In-App Video Watermark Tool | Authenticated | EXISTING | `app/src/app/(app)/video-tools/watermark-remover/page.tsx` | Re-exports client-side watermark remover inside authenticated dashboard shell. |
| `/video-tools/watermark-remover/batch` | In-App Batch Watermark Tool | Authenticated | EXISTING | `app/src/app/(app)/video-tools/watermark-remover/batch/page.tsx` | Batch video watermark removal within dashboard. |
| `/image-tools/watermark-remover` | In-App Image Watermark Tool | Authenticated | EXISTING | `app/src/app/(app)/image-tools/watermark-remover/page.tsx` | Canvas image watermark remover within dashboard. |
| `/audio-tools/noise-remover` | In-App Audio Noise Remover | Authenticated | EXISTING | `app/src/app/(app)/audio-tools/noise-remover/page.tsx` | Voice audio enhancement tool within dashboard. |
| `/components` | Design System Showcase | Authenticated | EXISTING | `app/src/app/(app)/components/page.tsx` | Component gallery showcasing buttons, badges, modals, and typography tokens. |
| `/admin/home` | Super Admin Home | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/home/page.tsx` | Admin overview rendering hardcoded stats (`stats = { channels_monitored: 842, ... }`). |
| `/admin/channels` | Admin Channels Monitor | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/channels/page.tsx` | Table of scraping worker jobs rendering hardcoded `mockJobs`. |
| `/admin/payouts` | Admin Affiliate Payouts | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/payouts/page.tsx` | Payout request queue rendering hardcoded `mockPayouts`. |
| `/admin/prompts` | Admin Prompts CMS | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/prompts/page.tsx` | Viral prompt editor rendering hardcoded `mockPrompts`. |
| `/admin/script-intelligence` | Script AI Configuration | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/script-intelligence/page.tsx` | AI angle taxonomy editor rendering hardcoded mock items. |
| `/admin/affiliates` | Admin Affiliate Applications | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/affiliates/page.tsx` | Affiliate application review table rendering hardcoded mock partners. |
| `/admin/notifications` | Admin Push Notifications | Super Admin | PLACEHOLDER | `app/src/app/(admin)/admin/notifications/page.tsx` | Broadcast push notification composer with mock dispatch. |

---

## 3. Page-by-Page Breakdown

### 1. Web Pages Manager
* **Route:** `/web-pages`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/web-pages/page.tsx`
* **Supporting Components:** `WebPagesSkeleton.tsx`, `WebPageTemplatePicker.tsx`, `ConfirmModal.tsx`, `Badge.tsx`, `Button.tsx`.
* **API Dependencies:** 
  * `GET /api/v1/web-pages` (`fetchWebPages`)
  * `PATCH /api/v1/web-pages/{id}/publish` (`togglePublishWebPage`)
  * `DELETE /api/v1/web-pages/{id}` (`deleteWebPage`)
* **State Dependencies:** React state (`webPages`, `summary`, `templates`, `search`, `status`, `isMutating`).
* **Current Functionality:** EXISTING (Fully Implemented). Lists creator mini-sites with view counts, conversion events, and published URLs. Supports search, status filtering, one-click unpublish/publish toggles, template preview cards, and deletion with confirmation dialog.
* **Loading State:** `WebPagesSkeleton.tsx` shown during initial data fetch.
* **Empty State:** Clean empty card with CTA pointing to `/web-pages/create`.
* **Error State:** Error banner with retry button.
* **Mobile Behavior:** Table cards reformat into vertical stack cards on viewports `<768px`.
* **SEO Status:** Authenticated no-index route.
* **Issues:** None. Fully wired to Laravel backend.

---

### 2. Web Page Block Canvas Editor
* **Route:** `/web-pages/[id]/edit`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/web-pages/[id]/edit/page.tsx`
* **Supporting Components:** `WebPageCanvas.tsx`, `WebPageBuilder.tsx`, `WebPageTemplatePicker.tsx`, `WebPageImageCropModal.tsx`, `ConfirmModal.tsx`.
* **API Dependencies:**
  * `GET /api/v1/web-pages/{id}` (`fetchWebPage`)
  * `PUT /api/v1/web-pages/{id}` (`updateWebPage`)
  * `PATCH /api/v1/web-pages/{id}/publish` (`togglePublishWebPage`)
  * `DELETE /api/v1/web-pages/{id}` (`deleteWebPage`)
* **State Dependencies:** `useForm`-like state managing `sections` array and `theme_settings` dictionary; live synchronization with side-by-side preview panel.
* **Current Functionality:** EXISTING (Fully Implemented). Comprehensive visual block builder allowing creators to construct mini-sites. Sections supported: Hero, Features, Video Embed, Testimonials, FAQ, Contact Form, CTA, Image Gallery.
* **Loading State:** Centered pulse spinner during initial fetch.
* **Empty State:** Pre-populated with default template sections.
* **Error State:** Field-level validation display and floating error toaster.
* **Mobile Behavior:** Viewport toggles between Desktop and Mobile preview frames (`PhoneMockupFrame`).
* **SEO Status:** Authenticated no-index route.
* **Issues:** On screen widths `<1280px`, the desktop phone preview drops below the form, requiring significant vertical scrolling.

---

### 3. Public Web Page Mini-Site
* **Route:** `/pages/[username]/[slug]`
* **Access:** Public
* **Main Component:** `app/src/app/(public)/pages/[username]/[slug]/page.tsx`
* **Supporting Components:** `WebPageCanvas.tsx`
* **API Dependencies:**
  * `GET /api/v1/public/web-pages/{username}/{slug}` (`getPublicWebPageServer`)
  * `GET /api/v1/public/web-pages/{username}/{slug}/click/{blockId}` (CTA conversion tracker)
  * `POST /api/v1/public/web-pages/{username}/{slug}/submit/{blockId}` (Form submission)
* **State Dependencies:** Next.js Server Component; contact forms utilize client-side submission hooks in `publicWebPagesClient.ts`.
* **Current Functionality:** EXISTING (Fully Implemented). Dynamic public website serving custom blocks with server-side metadata generation (`generateMetadata`). Ingests contact forms directly into backend lead store.
* **Loading State:** Next.js Server Streaming.
* **Empty State:** Returns `notFound()` if page is unpublished or non-existent.
* **Error State:** Triggers standard 404 response.
* **Mobile Behavior:** 100% fluid responsive styling across all block types.
* **SEO Status:** Dynamic title (`{page.title} — @{username}`), dynamic meta description, OpenGraph tags.
* **Issues:** Missing canonical URL and Twitter Card metadata.

---

### 4. Public Social Bio Links
* **Route:** `/bio/[username]` and `/bio/[username]/[slug]`
* **Access:** Public
* **Main Component:** `app/src/app/(public)/bio/[username]/page.tsx`
* **Supporting Components:** `PublicBioPage.tsx`, `PublicBioHeader.tsx`, `PublicBioLink.tsx`, `PublicBioThemeRenderer.tsx`.
* **API Dependencies:** `GET /api/v1/public/bio/{username}` (`getPublicBioServer`).
* **State Dependencies:** Server Component passing data into client theme renderer.
* **Current Functionality:** EXISTING (Fully Implemented). High-performance mobile-first link-in-bio page displaying avatar, bio, social icons, custom button links with click tracking, and custom themes (Glass, Minimal, Midnight, Pastel).
* **Loading State:** Server rendered.
* **Empty State:** `app/src/app/(public)/bio/not-found.tsx` renders a branded 404 page if username is invalid.
* **Error State:** Renders not-found boundary.
* **Mobile Behavior:** Centered single-column layout optimized for mobile screens (max-width 580px).
* **SEO Status:** Fully implemented: Dynamic title, meta description, OpenGraph with profile images, Twitter `summary_large_image`.
* **Issues:** None.

---

### 5. Content Library — Videos Discovery
* **Route:** `/content-library/videos`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/content-library/videos/page.tsx`
* **Supporting Components:** `ContentLibraryCard.tsx`, `VideoFilterBar.tsx`, `VideoFilterDrawer.tsx`, `ActiveFilterChips.tsx`, `VideoPagination.tsx`, `AddToProjectModal.tsx`.
* **API Dependencies:**
  * `GET /api/v1/posts` (`fetchPosts`)
  * `POST /api/v1/posts/{id}/analyze` (`analyzePost`)
  * `POST /api/v1/posts/{id}/transcribe` (`transcribePost`)
  * `GET /api/v1/saved-video-filters` (`fetchSavedFilters`)
* **State Dependencies:** URL query parameters (`searchParams`) for filters (minViews, outlierScore, dateRange, platform).
* **Current Functionality:** EXISTING (Fully Implemented). Scraped competitor video catalog with outlier score badges, sound tags, video duration, and bulk save to projects.
* **Loading State:** `ContentLibrarySkeleton.tsx` grid of pulse cards.
* **Empty State:** `VideoEmptyState.tsx` with reset filter button.
* **Error State:** Toast notifications on API failure.
* **Mobile Behavior:** Collapses from 4 columns to 1 column; filters collapse into a slide-over drawer (`VideoFilterDrawer`).
* **SEO Status:** Authenticated no-index route.
* **Issues:** None.

---

### 6. Instagram AutoDM Engine
* **Route:** `/instagram/autodm` & `/instagram/autodm/create`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/instagram/autodm/page.tsx` & `create/page.tsx`
* **Supporting Components:** `PreviewPhone.tsx`, `InstagramNav.tsx`, `Button.tsx`, `Badge.tsx`.
* **API Dependencies:**
  * `GET /api/v1/instagram/autodm`
  * `POST /api/v1/instagram/autodm`
  * `PATCH /api/v1/instagram/autodm/{id}`
  * `POST /api/v1/instagram/autodm/{id}/duplicate`
  * `GET /api/v1/instagram/autodm/media/{accountId}`
* **State Dependencies:** Complex funnel form state (trigger keywords, public replies, DM payloads, delivery delays).
* **Current Functionality:** EXISTING (Fully Implemented). Comment-to-DM automation builder with interactive mobile preview phone and trigger keyword simulation.
* **Loading State:** `AutoDmSkeleton` during campaign fetch.
* **Empty State:** Displays empty state with template shortcuts.
* **Error State:** Toast notifications and inline validation rings.
* **Mobile Behavior:** Preview phone hides on viewports `<1280px`.
* **SEO Status:** Authenticated no-index route.
* **Issues:** Must be wrapped in React `<Suspense>` because it accesses `useSearchParams()`.

---

### 7. Lead Forms Builder & Public Submissions
* **Route:** `/lead-forms`, `/lead-forms/[id]`, `/f/[publicId]`
* **Access:** Authenticated (Dashboard/Builder), Public (`/f/[publicId]`)
* **Main Components:** `app/src/app/(app)/lead-forms/page.tsx`, `[id]/page.tsx`, `app/src/app/f/[publicId]/page.tsx`
* **Supporting Components:** Form field toolbox, cover uploader, submission viewer.
* **API Dependencies:**
  * `GET /api/v1/lead-forms`
  * `POST /api/v1/lead-forms`
  * `GET /api/v1/lead-forms/{id}`
  * `PUT /api/v1/lead-forms/{id}`
  * `GET /api/v1/public/forms/{publicId}`
  * `POST /api/v1/public/forms/{publicId}/submit`
* **State Dependencies:** Dynamic JSON form schema array (`fields`) and settings object.
* **Current Functionality:** EXISTING (Fully Implemented). Drag-and-drop form creator supporting text, email, phone, dropdown, and file upload fields. Public submission endpoint logs leads directly to backend database.
* **Loading State:** Skeletons in dashboard; loader spinner in public form.
* **Empty State:** Pre-populated with default name + email fields.
* **Error State:** Field-level validation and submission error messages.
* **Mobile Behavior:** 100% responsive fluid form layout.
* **SEO Status:** Public form renders dynamic `<title>{form.title}</title>`.
* **Issues:** None.

---

### 8. CRM Pipeline
* **Route:** `/crm`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/crm/page.tsx`
* **API Dependencies:** None. (Does NOT call `/api/v1`).
* **State Dependencies:** Hardcoded `mockLeads` array in local component state.
* **Current Functionality:** PLACEHOLDER. Renders 3 static mock leads. Search filter only operates in-memory on the 3 dummy items. "Add Lead" button has no form or action.
* **Loading State:** None.
* **Empty State:** None.
* **Error State:** None.
* **Mobile Behavior:** Table scrolls horizontally on mobile.
* **SEO Status:** Authenticated no-index route.
* **Issues:** High architectural gap. Needs to be hooked up to `/api/v1/lead-forms` submissions or a dedicated leads endpoint.

---

### 9. Strategy Calendar
* **Route:** `/calendar`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/calendar/page.tsx`
* **API Dependencies:** None. (Does NOT call `/api/v1`).
* **State Dependencies:** Hardcoded `mockBookings` array in local component state.
* **Current Functionality:** PLACEHOLDER. Hardcoded grid representing September 2026 with 2 static appointments. "Public Booking Link" button has no destination.
* **Loading State:** None.
* **Empty State:** None.
* **Error State:** None.
* **Mobile Behavior:** Stacks calendar grid and appointment list vertically on mobile.
* **SEO Status:** Authenticated no-index route.
* **Issues:** Violates design system rules by using hardcoded `bg-purple-600` classes instead of `primary-*` tokens. Completely unlinked from backend booking availability service.

---

### 10. AI Scripting Studio
* **Route:** `/scripting`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/scripting/page.tsx`
* **API Dependencies:** None. (Does NOT call `/api/v1/scripts`).
* **State Dependencies:** Hardcoded `initialScripts` array; generation form simulates API delay with `setTimeout(..., 1200)`.
* **Current Functionality:** PLACEHOLDER / PROTOTYPE. Sophisticated client-side mockup with 3-hook A/B testing variations and auto-scrolling teleprompter, but all generated scripts are mock client-side objects that evaporate on page refresh.
* **Loading State:** Simulated button spinner.
* **Empty State:** Empty state with "Generate Script" button.
* **Error State:** None.
* **Mobile Behavior:** Teleprompter modal resizes to viewport; card grid collapses to single column.
* **SEO Status:** Authenticated no-index route.
* **Issues:** Must be integrated with `/api/v1/scripts/generate` and backend script batches.

---

### 11. Partner & Affiliate Program
* **Route:** `/affiliate`
* **Access:** Authenticated
* **Main Component:** `app/src/app/(app)/affiliate/page.tsx`
* **API Dependencies:** None.
* **State Dependencies:** Hardcoded stats (`$588.00` balance, `40 Creators` active, `$2,450.00` lifetime).
* **Current Functionality:** PLACEHOLDER. "Request Payout" button does nothing. Copy referral link copies a hardcoded string `https://viralyzer.io/?ref=alexjohnson`.
* **Loading State:** None.
* **Empty State:** None.
* **Error State:** None.
* **Mobile Behavior:** Metrics cards stack vertically on mobile.
* **SEO Status:** Authenticated no-index route.
* **Issues:** Pure prototype UI.

---

### 12. Super Admin Console Pages (7 Pages)
* **Routes:** `/admin/home`, `/admin/channels`, `/admin/payouts`, `/admin/prompts`, `/admin/script-intelligence`, `/admin/affiliates`, `/admin/notifications`
* **Access:** Super Admin (guarded by `currentUser.is_super_admin`)
* **Main Components:** Located in `app/src/app/(admin)/admin/*/page.tsx`
* **API Dependencies:** None.
* **State Dependencies:** Hardcoded mock arrays (`mockJobs`, `mockPayouts`, `mockPrompts`, `stats = { channels_monitored: 842 }`).
* **Current Functionality:** PLACEHOLDER. All 7 admin views are visual mockups with simulated timeouts for retries and approvals.
* **Loading State:** None.
* **Empty State:** None.
* **Error State:** None.
* **Mobile Behavior:** Responsive tables with horizontal scroll.
* **SEO Status:** Authenticated no-index route.
* **Issues:** Complete prototype status.

---

## 4. Shared Architecture

### Layout Hierarchy

```
app/src/app/layout.tsx (RootLayout)
│   ├── QueryProvider (@tanstack/react-query)
│   ├── Geist Sans & Geist Mono Font Variables
│   └── Global Styles (globals.css)
│
├── app/src/app/(auth)/layout.tsx (AuthLayout)
│   └── Centered minimalist auth card shell with branding
│
├── app/src/app/(admin)/layout.tsx (AdminLayout)
│   ├── Admin Sidebar (mode="admin")
│   └── Admin Topbar with Super Admin badge
│
├── app/src/app/(app)/layout.tsx (AppLayout)
│   ├── Session Guard (getAuthSession() -> /login redirect)
│   ├── Sidebar (mode="user", expandable desktop + mobile drawer)
│   ├── Header (breadcrumbs, notification bell, user avatar)
│   └── Main Workspace Container (lg:pl-72 / lg:pl-28)
│       │
│       └── app/src/app/(app)/settings/layout.tsx (SettingsLayout)
│           ├── Settings PageHeader
│           ├── Settings Tab Navigation (Profile, Integrations, Subscription, Notifications, API)
│           └── Settings Card Container
```

### Shared UI Components Inventory (`app/src/components/ui`)
* **`Button.tsx`**: Standardized button component supporting variants (`primary`, `secondary`, `outline`, `ghost`, `danger`, `gradient`) and sizes (`sm`, `md`, `lg`) with built-in loading spinners.
* **`Badge.tsx`**: Status indicator supporting tones (`neutral`, `primary`, `success`, `warning`, `danger`, `info`) and pulse animations.
* **`Input.tsx`**: Accessible text input with label, helper text, and error states.
* **`Modal.tsx` & `ConfirmModal.tsx`**: Radix Dialog wrappers with accessible focus management.
* **`PageHeader.tsx`**: Uniform page title, description, and action button bar.
* **`DataTable.tsx`**: Reusable generic tabular data grid with sorting, pagination, and empty states.
* **`Skeleton.tsx` & Skeletons**: Standard pulse skeleton loaders (`ContentLibrarySkeleton`, `WebPagesSkeleton`, `LinkShortSkeleton`, `SocialBioLinksSkeleton`).
* **Navigation Sub-Tabs (`app/src/components/ui/tabs`)**: `PrimaryNavTabs.tsx`, `ContentLibraryNav.tsx`, `InstagramNav.tsx`, `SocialBioLinksNav.tsx`, `WatermarkNav.tsx`.

---

## 5. Navigation & Information Architecture

### Global Routing Map

```
Public Marketing & Tools
├── / (Marketing Homepage)
├── /login (Sign In)
├── /register (Sign Up)
├── /forgot-password (Password Reset)
├── Public Creator Micro-Sites
│   ├── /bio/[username] (Link in Bio)
│   ├── /bio/[username]/[slug] (Secondary Bio Card)
│   ├── /pages/[username]/[slug] (Web Page Mini-Site)
│   └── /f/[publicId] (Standalone Lead Form)
└── Free Browser Media Tools
    ├── /tools/watermark-remover (Single Video)
    ├── /tools/watermark-remover/batch (Batch Videos)
    ├── /tools/watermark-remover/image (Single Image)
    └── /tools/audio-noise-remover (Audio Track)

Authenticated App Shell ((app)/layout.tsx)
├── /dashboard (Overview - Prototype)
├── Content Library
│   ├── /content-library/videos (Reels Discovery)
│   │   ├── /content-library/videos/[id] (Detail Analysis)
│   │   └── /content-library/videos/[id]/refine (Script Refinement)
│   ├── /content-library/channels (Tracked Profiles)
│   │   └── /content-library/channels/[id] (Profile Video Feed)
│   └── /content-library/watchlists (Folder Collections)
├── Instagram Suite
│   ├── /instagram/profile (Outlier Table & Account Sync)
│   ├── /instagram/calendar (Publishing Schedule)
│   ├── /instagram/calendar/scheduler (Post Composer)
│   ├── /instagram/autodm (AutoDM Campaigns)
│   │   └── /instagram/autodm/create (Funnel Builder)
│   └── /instagram/analytics (Growth Metrics)
├── Social Bio Links
│   ├── /social-bio-links (Profiles Manager)
│   ├── /social-bio-links/create (New Bio Card)
│   ├── /social-bio-links/[id]/edit (Live Card Editor)
│   ├── /social-bio-links/analytics (Global Bio Metrics)
│   ├── /social-bio-links/[id]/analytics (Card Metrics)
│   ├── /social-bio-links/linkshort (URL Shortener)
│   └── /social-bio-links/linkshort/[id]/analytics (Short Link Metrics)
├── Web Pages
│   ├── /web-pages (Mini-Sites List)
│   ├── /web-pages/create (Template Wizard)
│   ├── /web-pages/[id]/edit (Block Canvas Builder)
│   └── /web-pages/[id]/preview (Draft Preview)
├── Forms & CRM
│   ├── /lead-forms (Forms Manager)
│   ├── /lead-forms/[id] (Form Schema Builder)
│   └── /crm (Leads Pipeline - Prototype)
├── Creation & Booking
│   ├── /calendar (Strategy Calendar - Prototype)
│   └── /scripting (AI Scripting Studio - Prototype)
├── Video & Audio In-App Tools
│   ├── /video-tools/watermark-remover
│   ├── /video-tools/watermark-remover/batch
│   ├── /image-tools/watermark-remover
│   └── /audio-tools/noise-remover
├── Account Settings
│   ├── /settings/profile (User Profile & Password)
│   ├── /settings/integrations (Instagram Meta Connection)
│   ├── /settings/subscription (Plan & Invoices)
│   ├── /settings/notifications (Preferences)
│   └── /settings/api (Developer API Keys)
└── /affiliate (Partner Program - Prototype)

Super Admin Console ((admin)/layout.tsx)
├── /admin/home (System Health - Prototype)
├── /admin/channels (Apify Workers - Prototype)
├── /admin/payouts (Payout Approvals - Prototype)
├── /admin/prompts (Prompt CMS - Prototype)
├── /admin/script-intelligence (AI Taxonomy - Prototype)
├── /admin/affiliates (Partner Directory - Prototype)
└── /admin/notifications (Push Notifications - Prototype)
```

### Dead-End & Inconsistent Navigation Links
1. **Broken `/pricing` Link on Homepage:** `app/src/app/page.tsx:69` links to `/pricing` in the main header, but there is no `pricing/page.tsx` file in `app/src/app`. Clicking this link produces an unhandled 404 error.
2. **Conflicting Footer Pricing Link:** In `app/src/app/page.tsx:223`, the footer links "Pricing" to `/settings` instead of a public pricing page.
3. **Missing Public Legal Pages:** The footer has no links to `/privacy-policy` or `/terms`, which are required for Meta Graph API app verification.
4. **Calendar Booking Link Unbound:** In `app/src/app/(app)/calendar/page.tsx:65`, the button labeled "Public Booking Link" has no `href` and does nothing when clicked.

---

## 6. Responsive / UI Audit

### Viewport Breakpoints
* **Mobile (`<640px`):** Single column layouts, slide-over navigation drawer.
* **Tablet (`640px - 1024px`):** Two-column card grids, condensed tables.
* **Desktop (`1024px - 1440px`):** Full sidebar, split-screen editors.
* **Large Desktop (`>1440px`):** Multi-column canvas, simultaneous editor and preview phone.

### Concrete Issues Identified
1. **Scheduler Phone Mockup Overlap on Medium Screens:** In `/instagram/calendar/scheduler`, between `1024px` and `1279px`, the `SchedulerDeviceMockup` phone preview occupies 420px width while the form occupies the remaining width, causing caption textareas and hashtag chips to squish into a narrow, unreadable column.
2. **Web Page Canvas Mobile Collapse:** In `/web-pages/[id]/edit`, the interactive preview panel is hidden on viewports `<1280px` (`hidden xl:block`), leaving creators editing on iPads or laptops unable to see their page preview without toggling tabs.
3. **Hardcoded Purple Classes:** In `/calendar/page.tsx`, `/crm/page.tsx`, and `/scripting/page.tsx`, elements use hardcoded `border-purple-300`, `bg-purple-600`, and `text-purple-700` classes instead of the brand design tokens (`primary-50`, `primary-600`, `primary-700`), violating the design system rules defined in `AGENTS.md`.
4. **Horizontal Table Overflow on Small Devices:** The data tables in `/crm` and `/admin/payouts` do not wrap text or collapse columns on viewports `<480px`, causing horizontal scrolling across the entire page body.

---

## 7. SEO Audit

### Public / Indexable Pages Analysis

| Route | Page Title Defined | Meta Description | Canonical URL | Open Graph | Twitter Card | Robots.txt | Sitemap |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | `Scan My Social — AI Growth & Content Studio` (from RootLayout) | Root fallback | Missing | Missing | Missing | Missing | Missing |
| `/bio/[username]` | Dynamic: `{displayName} (@{username}) — Scan My Social` | Dynamic Bio | Missing | Dynamic Profile with Image | `summary_large_image` | Missing | Missing |
| `/bio/[username]/[slug]` | Dynamic: `{displayName} (@{username})` | Dynamic Bio | Missing | Dynamic Profile with Image | `summary_large_image` | Missing | Missing |
| `/pages/[username]/[slug]` | Dynamic: `{page.title} — @{username}` | Dynamic Page Description | Missing | Dynamic Title & Description | Missing | Missing |
| `/tools/watermark-remover` | Defined in component | Tool description | Missing | Missing | Missing | Missing | Missing |
| `/tools/audio-noise-remover`| Defined in component | Tool description | Missing | Missing | Missing | Missing | Missing |
| `/f/[publicId]` | Client Title: `{form.title}` | Missing | Missing | Missing | Missing | Missing | Missing |

### SEO Deficiencies Identified
1. **Total Absence of `robots.txt` and `sitemap.xml`:** The `/app` directory contains no `robots.ts`, `robots.txt`, `sitemap.ts`, or `sitemap.xml`. Search engines crawling the Next.js frontend receive a 404 for standard crawler configuration files.
2. **Missing Canonical URLs:** No canonical `<link rel="canonical">` or Next.js `metadata.alternates.canonical` is configured anywhere in `/app`.
3. **Missing Static Dedicated Pricing Page:** `/pricing` does not exist, preventing organic ranking for commercial queries.
4. **No JSON-LD Structured Data:** No `SoftwareApplication` or `Organization` schema exists on `/`.

---

## 8. Technical & API Dependencies

### Data Flow Architecture
```
Client Interaction -> Next.js Page / Component -> Zustand Store / React Query -> API Service 
                   -> fetch(http://localhost:8000/api/v1/*, Authorization: Bearer <token>) 
                   -> Laravel API Controller -> Eloquent Model / DB Query -> JSON Response
```

### Module Integration Status

| Module / Page | Service File | Backend Endpoints (`/api/v1/*`) | Status |
| :--- | :--- | :--- | :--- |
| Auth (`/login`, `/register`) | `lib/api/authService.ts` | `/auth/login`, `/auth/register`, `/auth/me`, `/auth/logout` | REAL API |
| Video Library (`/content-library/videos`) | `lib/api/contentLibraryService.ts` | `/posts`, `/posts/{id}/analyze`, `/posts/{id}/transcribe`, `/saved-video-filters` | REAL API |
| Channels (`/content-library/channels`) | `lib/api/contentLibraryService.ts` | `/channels`, `/channels/search`, `/channels/{id}/scrape` | REAL API |
| Watchlists (`/content-library/watchlists`) | `lib/api/contentLibraryService.ts` | `/watchlists`, `/watchlists/{id}/channels`, `/watchlists/{id}/favorite` | REAL API |
| Instagram Profile (`/instagram/profile`) | `lib/api/instagramService.ts` | `/instagram/profile`, `/instagram/profile/sync`, `/user/integrations/instagram` | REAL API |
| Publishing Calendar (`/instagram/calendar`) | `lib/api/instagramService.ts` | `/instagram/calendar`, `/instagram/media`, `/instagram/notes` | REAL API |
| Post Scheduler (`/instagram/calendar/scheduler`) | `lib/api/instagramService.ts` | `/instagram/scheduler`, `/instagram/media`, `/instagram/hashtags` | REAL API |
| AutoDM Campaigns (`/instagram/autodm`) | `lib/api/instagramService.ts` | `/instagram/autodm`, `/instagram/autodm/templates`, `/instagram/autodm/{id}/duplicate` | REAL API |
| Growth Analytics (`/instagram/analytics`) | `lib/api/instagramService.ts` | `/instagram/analytics`, `/instagram/analytics/sync` | REAL API |
| Social Bio Links (`/social-bio-links/*`) | `lib/api/socialBioLinksService.ts` | `/social-bio-links/cards`, `/social-bio-links/cards/{id}/links`, `/cards/{id}/avatar` | REAL API |
| Link Shortener (`/social-bio-links/linkshort`) | `lib/api/linkShortService.ts` | `/linkshort`, `/linkshort/{id}`, `/linkshort/{id}/toggle`, `/linkshort/analytics` | REAL API |
| Web Pages (`/web-pages/*`) | `lib/api/webPagesService.ts` | `/web-pages`, `/web-pages/{id}`, `/web-pages/{id}/publish` | REAL API |
| Public Web Pages (`/pages/*`) | `lib/api/publicWebPages.server.ts` | `/public/web-pages/{username}/{slug}`, `/click/{blockId}`, `/submit/{blockId}` | REAL API |
| Public Bio Links (`/bio/*`) | `lib/api/publicBio.server.ts` | `/public/bio/{username}`, `/public/bio/{username}/{slug}` | REAL API |
| Lead Forms (`/lead-forms/*`, `/f/*`) | `lib/api/leadFormsService.ts` | `/lead-forms`, `/lead-forms/{id}`, `/public/forms/{id}`, `/public/forms/{id}/submit` | REAL API |
| User Settings (`/settings/*`) | `lib/api/authService.ts` | `/user/settings`, `/user/profile`, `/user/password`, `/user/bank-details`, `/user/subscription` | REAL API |
| Main Dashboard (`/dashboard`) | None | None | MOCK DATA |
| CRM Pipeline (`/crm`) | None | None | MOCK DATA |
| Strategy Calendar (`/calendar`) | None | None | MOCK DATA |
| AI Scripting (`/scripting`) | None | None | MOCK DATA |
| Affiliate Dashboard (`/affiliate`) | None | None | MOCK DATA |
| Admin Console (`/admin/*`) | None | None | MOCK DATA |

---

## 9. Issues & Risks

### Critical (P0 / P1)
* **P0 — Broken Public `/pricing` Route:** The landing page header (`app/src/app/page.tsx:69`) explicitly navigates to `/pricing`. Because `pricing/page.tsx` does not exist in `app/src/app`, all marketing visitors clicking "Pricing" encounter an unstyled 404 page.
* **P1 — Mock Data in Core Revenue Workspaces:** Key revenue and workflow modules (`/crm`, `/calendar`, `/scripting`, `/affiliate`, and `/dashboard`) are operating entirely on hardcoded dummy arrays with zero persistence or backend API connectivity.

### High (P2)
* **P2 — Complete Lack of SEO Crawl Architecture:** `/app` completely lacks `robots.txt` and `sitemap.xml`, hindering search engine discovery of public bio pages, web pages, and free media tools.
* **P2 — Missing Global Root Error Boundary:** `/app` has no root `error.tsx` or `not-found.tsx` (only a single nested `(public)/bio/not-found.tsx` exists). Unhandled runtime exceptions or 404 routes cause Next.js to fall back to generic unstyled framework error screens.
* **P2 — Suspense Boundary Missing on Query Param Pages:** Next.js 15 requires all client components reading `useSearchParams()` to be wrapped in `<Suspense>`. While `/instagram/calendar/scheduler` and `/instagram/autodm/create` implement this, `/content-library/videos` reads search params without an explicit suspense boundary, risking SSR de-opt.

### Medium (P3)
* **P3 — Design System Non-Compliance in Mock Modules:** `/calendar/page.tsx`, `/crm/page.tsx`, and `/scripting/page.tsx` use hardcoded `purple-*` classes, directly violating the brand theme rules defined in `AGENTS.md`.
* **P3 — Incomplete Administrative Console:** All 7 `/admin/*` routes operate on client-side state with no connection to backend Apify scraping jobs or real payout workflows.

### Low (P4)
* **P4 — Unhandled Touch Targets on Mobile Tables:** Action icons in the CRM and Admin tables measure under 28px, failing WCAG 44px mobile touch standards.

---

## 10. Missing / Incomplete Work (Codebase Evidence)

1. **Missing Public Routes in `/app`:**
   * `app/src/app/pricing/page.tsx` (Targeted by landing page header).
   * `app/src/app/privacy-policy/page.tsx` (Required for Meta App Review).
   * `app/src/app/terms/page.tsx` (Required for Meta App Review).
2. **Missing SEO Configuration:**
   * `app/src/app/robots.ts`
   * `app/src/app/sitemap.ts`
3. **Missing Global Boundaries:**
   * `app/src/app/not-found.tsx`
   * `app/src/app/error.tsx`
4. **Backend API Endpoints Needed for Mock Pages:**
   * `/api/v1/crm/leads` (To replace `mockLeads` in `/crm`).
   * `/api/v1/appointments` (To replace `mockBookings` in `/calendar`).
   * `/api/v1/scripts` hookup in `app` (To connect `/scripting` to backend AI generation).
   * `/api/v1/affiliate` (To replace hardcoded balances in `/affiliate`).
   * `/api/v1/admin/*` (To power administrative console screens).

---

## 11. Recommended Implementation Order

To transition `/app` and `/api` into a cohesive, production-ready system without regressions:

1. **Fix Critical Public Broken Links & Legal Routes**
   * Create `app/src/app/pricing/page.tsx` with production pricing tier components and checkout triggers.
   * Create `app/src/app/privacy-policy/page.tsx` and `terms/page.tsx` to satisfy Meta compliance and legal requirements.
   * Update header and footer links in `app/src/app/page.tsx` to point to valid routes.

2. **Establish Global Error Boundaries & SEO Infrastructure**
   * Create `app/src/app/not-found.tsx` and `app/src/app/error.tsx` using brand design tokens (`primary-*`).
   * Create `app/src/app/robots.ts` allowing public tools, bio links, and web pages while disallowing `/(app)/*` and `/(admin)/*`.
   * Create `app/src/app/sitemap.ts` dynamically indexing public tools and landing pages.

3. **Wire Mock Modules to Real Backend Endpoints**
   * Connect `app/src/app/(app)/dashboard/page.tsx` to `/api/v1/instagram/profile` and `/api/v1/posts` for dynamic statistics.
   * Implement `/api/v1/crm/leads` in `api/routes/api.php` and connect `app/src/app/(app)/crm/page.tsx` via `leadFormsService.ts`.
   * Connect `app/src/app/(app)/scripting/page.tsx` to `/api/v1/scripts/generate` using `contentLibraryService.ts`.
   * Refactor `/calendar` to connect to `api/app/Http/Controllers/Appointments/*` services.
   * Refactor `/affiliate` to consume authenticated affiliate wallet data from `/api/v1/user/settings`.

4. **Design Token Normalization**
   * Remove all hardcoded `purple-*` classes from `/calendar/page.tsx`, `/crm/page.tsx`, and `/scripting/page.tsx`, replacing them with `primary-50`, `primary-600`, and `primary-700`.

5. **Admin Console API Integration**
   * Implement `/api/v1/admin/*` endpoints in Laravel guarded by `EnsureSuperAdmin` middleware.
   * Connect `app/src/app/(admin)/admin/*` pages to live worker queues and affiliate payout logs.

---

## 12. Files Reviewed

### Next.js App Router (`/app`)
* `app/src/app/layout.tsx`
* `app/src/app/page.tsx`
* `app/src/app/(app)/layout.tsx`
* `app/src/app/(admin)/layout.tsx`
* `app/src/app/(auth)/layout.tsx`
* `app/src/app/(app)/settings/layout.tsx`
* All 67 `page.tsx` files located across `app/src/app`
* Navigation & Layout Components: `Sidebar.tsx`, `Header.tsx`, `PreviewPhone.tsx`, `PhoneMockupFrame.tsx`
* Service Layer: `authService.ts`, `contentLibraryService.ts`, `instagramService.ts`, `leadFormsService.ts`, `linkShortService.ts`, `webPagesService.ts`, `socialBioLinksService.ts`, `publicBio.server.ts`, `publicWebPages.server.ts`
* State Stores: `useAuthStore.ts`, `useSocialBioStore.ts`, `useLinkShortStore.ts`, `useSocialBioAnalyticsStore.ts`

### Laravel REST API (`/api`)
* `api/routes/api.php`
* Controllers: `AuthApiController.php`, `ContentSchedulerApiController.php`, `InstagramProfileApiController.php`, `InstagramAnalyticsApiController.php`, `AutoDmApiController.php`, `LeadFormApiController.php`, `LinkPageApiController.php`, `LinkShortApiController.php`, `WebPageApiController.php`, `PublicBioApiController.php`, `PublicFormApiController.php`, `PublicWebPageApiController.php`, `PostController.php`, `ChannelController.php`, `WatchlistController.php`, `ProjectController.php`, `ScriptController.php`, `SettingsApiController.php`, `SubscriptionApiController.php`

---
*Report stored permanently at `app/docs/WEB_PAGES_CURRENT_STATE_AUDIT.md`.*
