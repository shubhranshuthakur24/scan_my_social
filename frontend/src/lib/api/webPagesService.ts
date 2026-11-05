import { getAuthHeaders } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface WebPageThemeSettings {
  theme_key?: string;
  background_color?: string;
  text_color?: string;
  muted_text_color?: string;
  accent_color?: string;
  surface_color?: string;
  border_color?: string;
  button_style?: 'rounded' | 'pill' | 'sharp';
  radius_style?: 'rounded' | 'soft' | 'sharp';
  font_style?: 'sans' | 'serif';
}

export interface WebPageFeatureItem {
  icon?: string;
  title?: string;
  description?: string;
}

export interface WebPageStatItem {
  value?: string;
  label?: string;
  description?: string;
}

export interface WebPageGalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface WebPagePricingPlan {
  name: string;
  price: string;
  billing_period?: string;
  description?: string;
  features?: string[];
  cta_label?: string;
  cta_url?: string;
  is_popular?: boolean;
}

export interface WebPageSocialLink {
  label: string;
  url: string;
}

export interface WebPageTimelineStep {
  time_or_step?: string;
  title?: string;
  description?: string;
}

export interface WebPageSectionContent {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  body?: string;
  primary_label?: string;
  primary_url?: string;
  secondary_label?: string;
  secondary_url?: string;
  image_url?: string;
  url?: string;
  button_label?: string;
  links?: Array<{ label?: string; url?: string }>;
  items?: Array<{
    question?: string;
    answer?: string;
    quote?: string;
    name?: string;
    role?: string;
    avatar_url?: string;
    icon?: string;
    title?: string;
    description?: string;
    value?: string;
    label?: string;
  }>;
  fields?: Array<{ key: string; label: string; type?: string; required?: boolean }>;
  columns?: number;
  images?: WebPageGalleryImage[];
  layout?: 'grid' | 'masonry' | string;
  plans?: WebPagePricingPlan[];
  name?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  social_links?: WebPageSocialLink[];
  steps?: WebPageTimelineStep[];
  layout_style?: 'split' | 'immersive' | 'editorial' | 'centered';
  [key: string]: unknown;
}

export interface WebPageSection {
  id: string;
  type:
    | 'hero'
    | 'text'
    | 'image'
    | 'video'
    | 'cta'
    | 'link_list'
    | 'faq'
    | 'testimonials'
    | 'contact_form'
    | 'features'
    | 'stats'
    | 'gallery'
    | 'pricing'
    | 'profile'
    | 'timeline';
  content: WebPageSectionContent;
}

export interface WebPage {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  template_key: string;
  sections: WebPageSection[];
  theme_settings: WebPageThemeSettings;
  is_published: boolean;
  published_at?: string | null;
  public_url?: string | null;
  events_count?: number;
  submissions_count?: number;
  user?: { id: number; name: string; username?: string; email?: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface PublicWebPageDto {
  id: number;
  username: string;
  title: string;
  slug: string;
  description?: string | null;
  template_key: string;
  sections: WebPageSection[];
  theme_settings: WebPageThemeSettings;
  is_published: boolean;
}

export interface WebPageSummary {
  total_pages: number;
  published_pages: number;
  total_views: number;
  total_submissions: number;
}

export interface WebPageTemplate {
  key: string;
  name: string;
  category: string;
  description: string;
  theme_key: string;
  theme_settings: WebPageThemeSettings;
  preview_image: string;
  sections: WebPageSection[];
}

export interface WebPageThemePreset {
  key: string;
  label: string;
  description: string;
  settings: WebPageThemeSettings;
}

export interface WebPageAnalytics {
  total_views: number;
  total_cta_clicks: number;
  total_submissions: number;
  unique_visitors: number;
  daily_views: { date: string; views: number }[];
  cta_clicks: { block_id: string; clicks: number }[];
  recent_submissions: {
    id: number;
    block_id: string;
    data: Record<string, unknown>;
    submitted_at: string | null;
  }[];
}

export interface FetchWebPagesParams {
  search?: string;
  status?: 'all' | 'published' | 'draft';
}

export interface WebPagesResponse {
  web_pages: WebPage[];
  summary: WebPageSummary;
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
}

export interface WebPageDetailResponse {
  web_page: WebPage;
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
  analytics: WebPageAnalytics;
}

export interface WebPageCatalogResponse {
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
}

export const DEFAULT_THEME_PRESETS: WebPageThemePreset[] = [
  {
    key: 'studio',
    label: 'Studio',
    description: 'Clean white surfaces with a direct campaign accent.',
    settings: {
      theme_key: 'studio',
      background_color: '#f8fafc',
      text_color: '#0f172a',
      muted_text_color: '#64748b',
      accent_color: '#ef4444',
      surface_color: '#ffffff',
      border_color: '#e2e8f0',
      button_style: 'rounded',
      radius_style: 'rounded',
      font_style: 'sans',
    },
  },
  {
    key: 'midnight',
    label: 'Midnight',
    description: 'Dark, high-contrast pages for launches and drops.',
    settings: {
      theme_key: 'midnight',
      background_color: '#0f172a',
      text_color: '#f8fafc',
      muted_text_color: '#cbd5e1',
      accent_color: '#38bdf8',
      surface_color: '#1e293b',
      border_color: '#334155',
      button_style: 'pill',
      radius_style: 'rounded',
      font_style: 'sans',
    },
  },
  {
    key: 'sunrise',
    label: 'Sunrise',
    description: 'Warm editorial gradient tones for personal projects.',
    settings: {
      theme_key: 'sunrise',
      background_color: '#fffbeb',
      text_color: '#451a03',
      muted_text_color: '#92400e',
      accent_color: '#f59e0b',
      surface_color: '#ffffff',
      border_color: '#fde68a',
      button_style: 'rounded',
      radius_style: 'soft',
      font_style: 'serif',
    },
  },
  {
    key: 'ocean',
    label: 'Ocean',
    description: 'Deep navy and blue tones with crisp glassmorphism cards.',
    settings: {
      theme_key: 'ocean',
      background_color: '#0b132b',
      text_color: '#f1f5f9',
      muted_text_color: '#94a3b8',
      accent_color: '#06b6d4',
      surface_color: '#1c2541',
      border_color: '#3a506b',
      button_style: 'pill',
      radius_style: 'rounded',
      font_style: 'sans',
    },
  },
  {
    key: 'noir',
    label: 'Noir',
    description: 'Monochrome precision with razor-sharp borders.',
    settings: {
      theme_key: 'noir',
      background_color: '#0a0a0a',
      text_color: '#fafafa',
      muted_text_color: '#a1a1aa',
      accent_color: '#ffffff',
      surface_color: '#171717',
      border_color: '#262626',
      button_style: 'sharp',
      radius_style: 'sharp',
      font_style: 'sans',
    },
  },
  {
    key: 'forest',
    label: 'Forest',
    description: 'Earthy moss greens and organic paper surfaces.',
    settings: {
      theme_key: 'forest',
      background_color: '#f4f6f0',
      text_color: '#14281d',
      muted_text_color: '#415d43',
      accent_color: '#2d6a4f',
      surface_color: '#ffffff',
      border_color: '#d8e2dc',
      button_style: 'rounded',
      radius_style: 'soft',
      font_style: 'serif',
    },
  },
  {
    key: 'candy',
    label: 'Candy',
    description: 'Playful pastel surfaces with vibrant neon highlights.',
    settings: {
      theme_key: 'candy',
      background_color: '#fdf2f8',
      text_color: '#701a75',
      muted_text_color: '#a21caf',
      accent_color: '#ec4899',
      surface_color: '#ffffff',
      border_color: '#fbcfe8',
      button_style: 'pill',
      radius_style: 'rounded',
      font_style: 'sans',
    },
  },
  {
    key: 'hyper',
    label: 'Hyper',
    description: 'Futuristic high-voltage violet and lime accents.',
    settings: {
      theme_key: 'hyper',
      background_color: '#0f051d',
      text_color: '#f5f3ff',
      muted_text_color: '#c4b5fd',
      accent_color: '#a855f7',
      surface_color: '#1e0b36',
      border_color: '#3b0764',
      button_style: 'pill',
      radius_style: 'sharp',
      font_style: 'sans',
    },
  },
];

export const DEFAULT_TEMPLATES: WebPageTemplate[] = [
  {
    key: 'course_coaching',
    name: 'Course & Coaching',
    category: 'Education',
    description: 'A cohort-based curriculum and coaching page designed to enroll ambitious students.',
    theme_key: 'candy',
    theme_settings: DEFAULT_THEME_PRESETS[6].settings,
    preview_image: '/images/web-page-templates/course-coaching.jpg',
    sections: [
      {
        id: 'hero-course',
        type: 'hero',
        content: {
          eyebrow: 'Cohort 04 · Enrolling now',
          heading: 'Become a high-leverage creator and build systems that scale',
          body: 'A 6-week intensive cohort designed to help operators, founders, and creators turn attention into an enduring business.',
          image_url: '/images/web-page-templates/course-coaching.jpg',
          primary_label: 'Apply for next cohort',
          primary_url: '#contact',
          secondary_label: 'Explore the syllabus',
          secondary_url: '#syllabus',
        },
      },
      {
        id: 'features-course',
        type: 'features',
        content: {
          heading: 'What is inside the program',
          items: [
            { title: 'Live Strategy Sessions', description: 'Weekly breakdown sessions with direct feedback on your work.' },
            { title: 'Plug-and-play Templates', description: 'Battle-tested frameworks for high-converting content and landing pages.' },
            { title: 'Private Operator Community', description: 'Direct access to peer builders, alumni, and guest instructors.' },
          ],
        },
      },
      {
        id: 'timeline-course',
        type: 'timeline',
        content: {
          heading: '6-Week Curriculum',
          steps: [
            { time_or_step: 'Week 1-2', title: 'Positioning & Audience', description: 'Identify your niche advantage and craft an irresistible offer.' },
            { time_or_step: 'Week 3-4', title: 'Content & Distribution Engines', description: 'Build high-converting organic pipelines on Instagram and LinkedIn.' },
            { time_or_step: 'Week 5-6', title: 'Conversion & Scale', description: 'Automate inbound lead flows and launch high-ticket offers.' },
          ],
        },
      },
      {
        id: 'pricing-course',
        type: 'pricing',
        content: {
          heading: 'Tuition & Enrollment',
          plans: [
            { name: 'Self-Paced Core', price: '$499', description: 'Full access to recordings and templates.', features: ['All 6 modules', 'Resource templates', 'Community access'] },
            { name: 'Cohort VIP', price: '$1,299', description: 'Live sessions, direct reviews, and 1-on-1 mentorship.', features: ['Everything in Core', 'Weekly live sessions', '1-on-1 strategy call', 'Certificate'], is_popular: true },
          ],
        },
      },
      {
        id: 'testimonials-course',
        type: 'testimonials',
        content: {
          heading: 'Alumni Results',
          items: [{ quote: 'This cohort paid for itself within two weeks of implementing the playbook.', name: 'Alex Rivera', role: 'Founder, ScaleCraft' }],
        },
      },
      {
        id: 'instructor-course',
        type: 'profile',
        content: {
          heading: 'Meet your lead instructor',
          name: 'David Vance',
          role: 'Ex-Head of Growth, Creator of 100k+ Audience',
          bio: 'Trained over 1,500 builders and operators on scaling organic media into 7-figure businesses.',
        },
      },
      {
        id: 'faq-course',
        type: 'faq',
        content: {
          heading: 'Frequently Asked Questions',
          items: [{ question: 'How much weekly time commitment is required?', answer: 'Expect around 3-5 hours weekly including sessions and assignments.' }],
        },
      },
      {
        id: 'contact-course',
        type: 'contact_form',
        content: {
          heading: 'Apply for the next cohort',
          button_label: 'Submit Application',
        },
      },
    ],
  },
  {
    key: 'creator',
    name: 'Creator Studio',
    category: 'Personal brand',
    description: 'A visual home for your work, content, and next offer.',
    theme_key: 'studio',
    theme_settings: DEFAULT_THEME_PRESETS[0].settings,
    preview_image: '/images/web-page-templates/creator.jpg',
    sections: [
      {
        id: 'hero-creator',
        type: 'hero',
        content: {
          eyebrow: 'Independent creative',
          heading: 'Ideas, images, and work that moves people',
          body: 'A considered home for selected projects, new releases, and ways to collaborate.',
          image_url: '/images/web-page-templates/creator.jpg',
          primary_label: 'Work with me',
          primary_url: '/cal/@username',
          secondary_label: 'Explore the work',
          secondary_url: '#featured-video',
        },
      },
      {
        id: 'video-creator',
        type: 'video',
        content: {
          heading: 'Featured Video',
          url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        },
      },
      {
        id: 'links-creator',
        type: 'link_list',
        content: {
          heading: 'Start here',
          links: [{ label: 'Latest drop', url: 'https://example.com' }, { label: 'Newsletter', url: 'https://example.com/newsletter' }],
        },
      },
    ],
  },
  {
    key: 'launch',
    name: 'Signal Launch',
    category: 'Campaign',
    description: 'A high-impact launch page for waitlists, drops, and announcements.',
    theme_key: 'midnight',
    theme_settings: DEFAULT_THEME_PRESETS[1].settings,
    preview_image: '/images/web-page-templates/launch.jpg',
    sections: [
      {
        id: 'hero-launch',
        type: 'hero',
        content: {
          eyebrow: 'New release',
          heading: 'Small speaker. Serious presence.',
          body: 'A compact wireless speaker engineered for room-filling sound and everyday movement.',
          image_url: '/images/web-page-templates/launch.jpg',
          primary_label: 'Join the first drop',
          primary_url: '#contact',
          secondary_label: 'See what is new',
          secondary_url: '#why-it-matters',
        },
      },
      {
        id: 'text-launch',
        type: 'text',
        content: {
          heading: 'Why it matters',
          body: 'Use this space to make the offer obvious and memorable.',
        },
      },
      {
        id: 'contact-launch',
        type: 'contact_form',
        content: {
          heading: 'Join the waitlist',
          button_label: 'Join now',
        },
      },
    ],
  },
  {
    key: 'service',
    name: 'Consulting Practice',
    category: 'Services',
    description: 'A proof-led service page built to turn interest into inquiries.',
    theme_key: 'forest',
    theme_settings: DEFAULT_THEME_PRESETS[5].settings,
    preview_image: '/images/web-page-templates/service.jpg',
    sections: [
      {
        id: 'hero-service',
        type: 'hero',
        content: {
          eyebrow: 'Strategy and direction',
          heading: 'Make the next business decision with clarity',
          body: 'Focused advisory for teams navigating a launch, repositioning, or new stage of growth.',
          image_url: '/images/web-page-templates/service.jpg',
          primary_label: 'Book a working session',
          primary_url: '#contact',
        },
      },
      {
        id: 'testimonials-service',
        type: 'testimonials',
        content: {
          heading: 'Client Wins',
          items: [{ quote: 'Clear, fast, and exactly what we needed.', name: 'Happy Client' }],
        },
      },
      {
        id: 'contact-service',
        type: 'contact_form',
        content: {
          heading: 'Tell us what you need',
          button_label: 'Send request',
        },
      },
    ],
  },
  {
    key: 'waitlist',
    name: 'Viral Waitlist',
    category: 'Campaign',
    description: 'A high-converting waitlist page for upcoming product drops, apps, and communities.',
    theme_key: 'midnight',
    theme_settings: DEFAULT_THEME_PRESETS[1].settings,
    preview_image: '/images/web-page-templates/waitlist.jpg',
    sections: [
      {
        id: 'hero-waitlist',
        type: 'hero',
        content: {
          eyebrow: 'Early access open',
          heading: 'Be the first in line when we launch',
          body: 'Reserve your spot today to unlock VIP perks, beta access, and founder-only updates.',
          image_url: '/images/web-page-templates/waitlist.jpg',
          primary_label: 'Join the waitlist',
          primary_url: '#contact',
        },
      },
      {
        id: 'features-waitlist',
        type: 'features',
        content: {
          heading: 'Early Access Perks',
          items: [
            { title: 'Priority Onboarding', description: 'Skip the public queue and access features ahead of everyone else.' },
            { title: 'Lifetime Founder Discount', description: 'Lock in early supporter pricing before general availability.' },
          ],
        },
      },
      {
        id: 'contact-waitlist',
        type: 'contact_form',
        content: {
          heading: 'Request an invite',
          button_label: 'Reserve My Spot',
        },
      },
    ],
  },
  {
    key: 'portfolio',
    name: 'Selected Work',
    category: 'Portfolio',
    description: 'An editorial portfolio for visual work and project inquiries.',
    theme_key: 'noir',
    theme_settings: DEFAULT_THEME_PRESETS[4].settings,
    preview_image: '/images/web-page-templates/portfolio.jpg',
    sections: [
      {
        id: 'hero-portfolio',
        type: 'hero',
        content: {
          eyebrow: 'Art direction and image',
          heading: 'Selected work, 2024-2026',
          body: 'Campaigns, identities, and visual systems made with ambitious teams.',
          image_url: '/images/web-page-templates/portfolio.jpg',
          primary_label: 'Start a project',
          primary_url: '#contact',
        },
      },
      {
        id: 'contact-portfolio',
        type: 'contact_form',
        content: {
          heading: 'Project inquiry',
          button_label: 'Send inquiry',
        },
      },
    ],
  },
  {
    key: 'product',
    name: 'Object Store',
    category: 'Commerce',
    description: 'A polished product story with benefits, proof, and a clear purchase path.',
    theme_key: 'sunrise',
    theme_settings: DEFAULT_THEME_PRESETS[2].settings,
    preview_image: '/images/web-page-templates/product.jpg',
    sections: [
      {
        id: 'hero-product',
        type: 'hero',
        content: {
          eyebrow: 'Edition 01',
          heading: 'A warmer way to light the room',
          body: 'Sculptural ambient light in hand-finished amber glass and brushed steel.',
          image_url: '/images/web-page-templates/product.jpg',
          primary_label: 'Shop the lamp',
          primary_url: 'https://example.com/buy',
          secondary_label: 'View details',
          secondary_url: '#product-preview',
        },
      },
    ],
  },
  {
    key: 'event',
    name: 'Live Workshop',
    category: 'Events',
    description: 'A registration page for workshops, webinars, and live sessions.',
    theme_key: 'ocean',
    theme_settings: DEFAULT_THEME_PRESETS[3].settings,
    preview_image: '/images/web-page-templates/event.jpg',
    sections: [
      {
        id: 'hero-event',
        type: 'hero',
        content: {
          eyebrow: 'Live Workshop',
          heading: 'Build a brand people can feel',
          body: 'A hands-on one-day workshop for founders and creative teams ready to sharpen their point of view.',
          image_url: '/images/web-page-templates/event.jpg',
          primary_label: 'Reserve a seat',
          primary_url: 'https://example.com/register',
        },
      },
    ],
  },
  {
    key: 'newsletter',
    name: 'Field Notes',
    category: 'Newsletter',
    description: 'An editorial subscription page for ideas worth returning to.',
    theme_key: 'candy',
    theme_settings: DEFAULT_THEME_PRESETS[6].settings,
    preview_image: '/images/web-page-templates/newsletter.jpg',
    sections: [
      {
        id: 'hero-newsletter',
        type: 'hero',
        content: {
          eyebrow: 'A letter every other Friday',
          heading: 'Notes on making work that matters',
          body: 'Essays and observations on creativity, attention, and building an independent practice.',
          image_url: '/images/web-page-templates/newsletter.jpg',
          primary_label: 'Join the readership',
          primary_url: '#contact',
        },
      },
      {
        id: 'contact-newsletter',
        type: 'contact_form',
        content: {
          heading: 'Subscribe now',
          button_label: 'Subscribe',
        },
      },
    ],
  },
  {
    key: 'lead_magnet',
    name: 'Resource Drop',
    category: 'Lead generation',
    description: 'Exchange a useful guide, checklist, or toolkit for a new lead.',
    theme_key: 'royal',
    theme_settings: DEFAULT_THEME_PRESETS[0].settings,
    preview_image: '/images/web-page-templates/lead-magnet.jpg',
    sections: [
      {
        id: 'hero-lead-magnet',
        type: 'hero',
        content: {
          eyebrow: 'Free brand workbook',
          heading: 'Find the sharpest version of your idea',
          body: 'A practical 18-page workbook for turning scattered thoughts into a clear creative direction.',
          image_url: '/images/web-page-templates/lead-magnet.jpg',
          primary_label: 'Get the workbook',
          primary_url: '#contact',
        },
      },
      {
        id: 'contact-lead-magnet',
        type: 'contact_form',
        content: {
          heading: 'Send me the resource',
          button_label: 'Get access',
        },
      },
    ],
  },
  {
    key: 'conversion_landing',
    name: 'Conversion Landing',
    category: 'Marketing',
    description: 'A focused, high-conversion sales page built to turn visitors into buyers.',
    theme_key: 'ocean',
    theme_settings: DEFAULT_THEME_PRESETS[3].settings,
    preview_image: '/images/web-page-templates/conversion-landing.jpg',
    sections: [
      {
        id: 'hero-conversion',
        type: 'hero',
        content: {
          eyebrow: 'Turn traffic into revenue',
          heading: 'The complete system for scaling conversions',
          body: 'Deliver memorable customer journeys that drive engagement, retention, and repeat sales.',
          image_url: '/images/web-page-templates/conversion-landing.jpg',
          primary_label: 'Start free trial',
          primary_url: '#contact',
        },
      },
      {
        id: 'contact-conversion',
        type: 'contact_form',
        content: {
          heading: 'Get in touch',
          button_label: 'Get Started Today',
        },
      },
    ],
  },
  {
    key: 'product_landing',
    name: 'Product Landing',
    category: 'Commerce',
    description: 'Showcase a signature product with rich visuals, specs, and a frictionless checkout CTA.',
    theme_key: 'sunrise',
    theme_settings: DEFAULT_THEME_PRESETS[2].settings,
    preview_image: '/images/web-page-templates/product-landing.jpg',
    sections: [
      {
        id: 'hero-product-landing',
        type: 'hero',
        content: {
          eyebrow: 'Precision crafted',
          heading: 'Engineered for those who notice the details',
          body: 'An uncompromising balance of tactile materials, minimal form, and functional longevity.',
          image_url: '/images/web-page-templates/product-landing.jpg',
          primary_label: 'Order now',
          primary_url: '#contact',
        },
      },
      {
        id: 'contact-product-landing',
        type: 'contact_form',
        content: {
          heading: 'Inquire about availability',
          button_label: 'Place Order',
        },
      },
    ],
  },
];

let cachedCatalogPromise: Promise<WebPageCatalogResponse> | null = null;

export async function fetchWebPageCatalog(): Promise<WebPageCatalogResponse> {
  if (cachedCatalogPromise) {
    return cachedCatalogPromise;
  }

  cachedCatalogPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/web-pages/catalog`, {
        headers: {
          ...getAuthHeaders(),
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const serverTemplates = Array.isArray(data.templates)
          ? data.templates
          : Object.values(data.templates || {});
        const serverPresets = Array.isArray(data.theme_presets)
          ? data.theme_presets
          : Object.values(data.theme_presets || {});

        if (serverTemplates.length > 0) {
          return {
            templates: serverTemplates,
            theme_presets: serverPresets.length > 0 ? serverPresets : DEFAULT_THEME_PRESETS,
          };
        }
      }
    } catch {
      // Fallback below
    }

    // Always fallback safely so /web-pages/create never fails to load templates
    return {
      templates: DEFAULT_TEMPLATES,
      theme_presets: DEFAULT_THEME_PRESETS,
    };
  })();

  return cachedCatalogPromise;
}

export function clearWebPageCatalogCache(): void {
  cachedCatalogPromise = null;
}

export interface CreateWebPagePayload {
  title: string;
  slug?: string;
  description?: string;
  template_key?: string;
  sections?: WebPageSection[];
  theme_settings?: WebPageThemeSettings;
  is_published?: boolean;
}

export interface UpdateWebPagePayload {
  title: string;
  slug: string;
  description?: string;
  template_key?: string;
  sections: WebPageSection[];
  theme_settings?: WebPageThemeSettings;
  is_published?: boolean;
}

export async function fetchWebPages(params: FetchWebPagesParams = {}): Promise<WebPagesResponse> {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const res = await fetch(`${API_BASE_URL}/web-pages?${query.toString()}`, {
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to fetch web pages (${res.status})`);
  }

  const data = await res.json();
  return {
    ...data,
    web_pages: Array.isArray(data.web_pages) ? data.web_pages : Object.values(data.web_pages || {}),
    templates: Array.isArray(data.templates) ? data.templates : Object.values(data.templates || {}),
    theme_presets: Array.isArray(data.theme_presets) ? data.theme_presets : Object.values(data.theme_presets || {}),
  };
}

export async function getWebPage(id: number): Promise<WebPageDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to fetch web page (${res.status})`);
  }

  const data = await res.json();
  return {
    ...data,
    templates: Array.isArray(data.templates) ? data.templates : Object.values(data.templates || {}),
    theme_presets: Array.isArray(data.theme_presets) ? data.theme_presets : Object.values(data.theme_presets || {}),
  };
}

export async function createWebPage(payload: CreateWebPagePayload): Promise<{ message: string; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errorMsg = data.errors ? Object.values(data.errors).flat().join(', ') : data.message;
    throw new Error(errorMsg || `Failed to create web page (${res.status})`);
  }

  return res.json();
}

export async function updateWebPage(id: number, payload: UpdateWebPagePayload): Promise<{ message: string; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errorMsg = data.errors ? Object.values(data.errors).flat().join(', ') : data.message;
    throw new Error(errorMsg || `Failed to update web page (${res.status})`);
  }

  return res.json();
}

export async function togglePublishWebPage(
  id: number
): Promise<{ message: string; is_published: boolean; published_at?: string | null; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}/publish`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to toggle publish status (${res.status})`);
  }

  return res.json();
}

export async function deleteWebPage(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to delete web page (${res.status})`);
  }
}
