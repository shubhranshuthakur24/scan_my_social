/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useSyncExternalStore } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';

const subscribe = () => () => {};
function useIsMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
import {
  WebPageSection,
  WebPageGalleryImage,
  WebPagePricingPlan,
  WebPageSocialLink,
} from '@/lib/api/webPagesService';
import { uploadMediaAsset } from '@/lib/api/instagramService';
import WebPageImageCropModal from './WebPageImageCropModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  Video,
  MousePointerClick,
  Link as LinkIcon,
  CircleHelp,
  Quote,
  Mail,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  ChevronRight,
  AlertCircle,
  Upload,
  Sparkles,
  BarChart3,
  Images,
  CreditCard,
  User,
  Clock,
} from 'lucide-react';

interface WebPageBuilderProps {
  sections: WebPageSection[];
  onChange: (sections: WebPageSection[]) => void;
}

interface BuilderLinkItem {
  label: string;
  url: string;
}

interface BuilderFaqItem {
  question: string;
  answer: string;
}

interface BuilderTestimonialItem {
  quote: string;
  name: string;
}

interface BuilderFieldItem {
  key: string;
  label: string;
  type: string;
  required: boolean;
}

export const BLOCK_DEFINITIONS = [
  { type: 'hero' as const, label: 'Hero', icon: LayoutTemplate, description: 'High-impact top headline & CTAs' },
  { type: 'text' as const, label: 'Text', icon: Type, description: 'Narrative copy & explanation' },
  { type: 'image' as const, label: 'Image', icon: ImageIcon, description: 'Feature visual with caption' },
  { type: 'video' as const, label: 'Video', icon: Video, description: 'YouTube or Vimeo embed' },
  { type: 'cta' as const, label: 'Call to Action', icon: MousePointerClick, description: 'Conversion trigger block' },
  { type: 'link_list' as const, label: 'Links List', icon: LinkIcon, description: 'Curated external links' },
  { type: 'faq' as const, label: 'FAQ', icon: CircleHelp, description: 'Questions & answers accordion' },
  { type: 'testimonials' as const, label: 'Testimonials', icon: Quote, description: 'Client quotes & social proof' },
  { type: 'contact_form' as const, label: 'Contact Form', icon: Mail, description: 'Lead capture & messaging' },
  { type: 'features' as const, label: 'Features', icon: Sparkles, description: 'Benefits & services card grid' },
  { type: 'stats' as const, label: 'Stats', icon: BarChart3, description: 'Numeric proof & achievements' },
  { type: 'gallery' as const, label: 'Gallery', icon: Images, description: 'Multi-image visual showcase' },
  { type: 'pricing' as const, label: 'Pricing', icon: CreditCard, description: 'Commercial offers & tiers' },
  { type: 'profile' as const, label: 'Profile', icon: User, description: 'Bio, credentials & social links' },
  { type: 'timeline' as const, label: 'Timeline', icon: Clock, description: 'Schedule, process & milestones' },
];

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createDefaultSection(type: string): WebPageSection {
  const id = generateUuid();
  switch (type) {
    case 'hero':
      return {
        id,
        type: 'hero',
        content: {
          eyebrow: 'Welcome',
          heading: 'Build Something Remarkable',
          body: 'Create stunning, high-converting standalone mini-websites and landing pages directly from ScanMySocial.',
          primary_label: 'Get Started',
          primary_url: '#contact',
          secondary_label: 'Learn More',
          secondary_url: '#',
          image_url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80',
        },
      };
    case 'text':
      return {
        id,
        type: 'text',
        content: {
          heading: 'Our Mission & Story',
          body: 'We empower creators, consultants, and brands with actionable social intelligence and modular high-converting web pages.\n\nEvery section is customizable, responsive, and performance-optimized.',
        },
      };
    case 'image':
      return {
        id,
        type: 'image',
        content: {
          image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
          heading: 'Visual Showcase',
          body: 'Highlight your latest projects, product mockups, or event photographs with clean typography.',
        },
      };
    case 'video':
      return {
        id,
        type: 'video',
        content: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          heading: 'Watch Our Presentation',
        },
      };
    case 'cta':
      return {
        id,
        type: 'cta',
        content: {
          heading: 'Ready to scale your social reach?',
          body: 'Join thousands of creators using Viralyzer to grow faster and convert audiences into leads.',
          primary_label: 'Claim Your Strategy Call',
          primary_url: '#contact',
        },
      };
    case 'link_list':
      return {
        id,
        type: 'link_list',
        content: {
          heading: 'Featured Resources',
          links: [
            { label: 'Official Documentation', url: 'https://scanmysocial.com' },
            { label: 'Follow on Instagram', url: 'https://instagram.com' },
            { label: 'Join Private Community', url: 'https://discord.com' },
          ],
        },
      };
    case 'faq':
      return {
        id,
        type: 'faq',
        content: {
          heading: 'Frequently Asked Questions',
          items: [
            { question: 'How quickly can I publish a page?', answer: 'Within seconds. Pick a template, customize your copy, and click Publish.' },
            { question: 'Can I connect my own custom domain?', answer: 'Custom domains and canonical link routing are fully supported in your account settings.' },
            { question: 'Where do form submissions go?', answer: 'Form leads are securely recorded in your Web Page submissions tab and synced directly to your CRM leads pipeline.' },
          ],
        },
      };
    case 'testimonials':
      return {
        id,
        type: 'testimonials',
        content: {
          heading: 'What Clients Say',
          items: [
            { quote: 'Viralyzer helped us 3x our inbound consultation bookings in the first month.', name: 'Sarah Jenkins, Brand Strategist' },
            { quote: 'The cleanest landing page builder for creators. Fast, beautiful, and zero bloat.', name: 'Alex Rivera, Agency Director' },
          ],
        },
      };
    case 'contact_form':
      return {
        id,
        type: 'contact_form',
        content: {
          heading: 'Send a Message',
          button_label: 'Send Inquiry',
          fields: [
            { key: 'name', label: 'Your Name', type: 'text', required: true },
            { key: 'email', label: 'Email Address', type: 'email', required: true },
            { key: 'phone', label: 'Phone Number (optional)', type: 'phone', required: false },
            { key: 'message', label: 'How can we help?', type: 'textarea', required: true },
          ],
        },
      };
    case 'features':
      return {
        id,
        type: 'features',
        content: {
          heading: 'Engineered for Performance',
          subheading: 'Everything you need to turn visitors into leads and clients.',
          columns: 3,
          items: [
            { icon: 'Zap', title: 'Lightning Fast', description: 'Optimized assets and instant page load speeds across all modern devices.' },
            { icon: 'Shield', title: 'Secure & Compliant', description: 'Automated SSL certificates, spam protection, and privacy-first data handling.' },
            { icon: 'Sparkles', title: 'Custom Aesthetic', description: 'Tailored typography, colors, and layouts that elevate your personal brand.' },
          ],
        },
      };
    case 'stats':
      return {
        id,
        type: 'stats',
        content: {
          heading: 'Proven Results at Scale',
          items: [
            { value: '10M+', label: 'Total Impressions', description: 'Delivered across campaigns' },
            { value: '4.8x', label: 'Conversion Lift', description: 'Higher click-through from bio links' },
            { value: '99.9%', label: 'Uptime Reliability', description: 'High-availability global CDN' },
            { value: '25K+', label: 'Active Creators', description: 'Growing with ScanMySocial' },
          ],
        },
      };
    case 'gallery':
      return {
        id,
        type: 'gallery',
        content: {
          heading: 'Selected Work & Visuals',
          layout: 'grid',
          images: [
            { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80', alt: 'Studio workspace', caption: 'Creative direction & strategy' },
            { url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80', alt: 'Analytics report', caption: 'Performance dashboards' },
            { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80', alt: 'Team collaboration', caption: 'Creator community sessions' },
          ],
        },
      };
    case 'pricing':
      return {
        id,
        type: 'pricing',
        content: {
          heading: 'Simple, Transparent Pricing',
          plans: [
            {
              name: 'Starter',
              price: '$29',
              billing_period: '/month',
              description: 'Essential growth tools for independent creators.',
              features: ['1 Instagram Account', 'Unlimited AutoDMs', 'Web Page Builder', 'Community Support'],
              cta_label: 'Get Started',
              cta_url: '#contact',
              is_popular: false,
            },
            {
              name: 'Pro Growth',
              price: '$79',
              billing_period: '/month',
              description: 'Advanced analytics and multi-page publishing for pros.',
              features: ['Up to 5 Accounts', 'Priority DM Automation', 'Custom Domains & SSL', 'Advanced Funnel Analytics', 'VIP Email Support'],
              cta_label: 'Start Free Trial',
              cta_url: '#contact',
              is_popular: true,
            },
            {
              name: 'Agency',
              price: '$199',
              billing_period: '/month',
              description: 'Dedicated infrastructure for teams and agencies.',
              features: ['Unlimited Accounts', 'White-label Dashboards', 'Dedicated Account Manager', 'Custom API Webhooks'],
              cta_label: 'Contact Sales',
              cta_url: '#contact',
              is_popular: false,
            },
          ],
        },
      };
    case 'profile':
      return {
        id,
        type: 'profile',
        content: {
          name: 'Alex Rivera',
          role: 'Growth Strategist & Creative Director',
          bio: 'Helping ambitious creators and brands turn attention into lasting enterprise value. Over 10 years of experience leading organic campaigns and digital storytelling.',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          social_links: [
            { label: 'Instagram', url: 'https://instagram.com' },
            { label: 'YouTube', url: 'https://youtube.com' },
            { label: 'LinkedIn', url: 'https://linkedin.com' },
          ],
        },
      };
    case 'timeline':
      return {
        id,
        type: 'timeline',
        content: {
          heading: 'Event Schedule & Roadmap',
          steps: [
            { time_or_step: '09:00 AM', title: 'Welcome & Keynote', description: 'Opening remarks on the future of creator monetization and social workflows.' },
            { time_or_step: '11:00 AM', title: 'Hands-on Growth Workshop', description: 'Step-by-step funnel architecture, AutoDM setups, and live campaign optimization.' },
            { time_or_step: '02:00 PM', title: 'Breakout Sessions', description: 'Small-group strategy teardowns and 1-on-1 workflow feedback.' },
            { time_or_step: '04:30 PM', title: 'Live Q&A & Wrap Up', description: 'Open community discussion and resource roadmap releases.' },
          ],
        },
      };
    default:
      return { id, type: 'text', content: { heading: 'New Section', body: '' } };
  }
}

export default function WebPageBuilder({ sections, onChange }: WebPageBuilderProps) {
  const isMounted = useIsMounted();
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(() =>
    sections.length > 0 ? sections[0].id : null
  );
  const [builderWarning, setBuilderWarning] = useState<string | null>(null);
  const [sectionToDelete, setSectionToDelete] = useState<WebPageSection | null>(null);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(sections);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    onChange(items);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sections.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const items = [...sections];
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    onChange(items);
  };

  const handleAddSection = (type: string) => {
    const newSec = createDefaultSection(type);
    onChange([...sections, newSec]);
    setExpandedSectionId(newSec.id);
  };

  const confirmDeleteSection = (section: WebPageSection) => {
    if (sections.length <= 1) {
      setBuilderWarning('A web page must contain at least one section.');
      setTimeout(() => setBuilderWarning(null), 3500);
      return;
    }
    setSectionToDelete(section);
  };

  const handleDeleteSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
    if (expandedSectionId === id) {
      setExpandedSectionId(null);
    }
  };

  const handleUpdateSectionContent = (id: string, newContent: Record<string, unknown>) => {
    onChange(
      sections.map((s) => (s.id === id ? { ...s, content: { ...s.content, ...newContent } } : s))
    );
  };

  return (
    <div className="space-y-6">
      {/* Builder Feedback Notification */}
      {builderWarning && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4">
          <AlertCircle size={16} className="text-amber-400 shrink-0" />
          <span>{builderWarning}</span>
        </div>
      )}

      {/* 1. Add Block Palette */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <Plus size={14} className="text-primary-600" />
          <span>Add Page Section</span>
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {BLOCK_DEFINITIONS.map((block) => {
            const Icon = block.icon;
            return (
              <button
                key={block.type}
                id={`add-section-${block.type}`}
                data-testid={`add-section-${block.type}`}
                type="button"
                onClick={() => handleAddSection(block.type)}
                className="flex flex-col items-center justify-center p-2.5 min-h-[44px] rounded-xl border border-slate-200/70 hover:border-primary-300 hover:bg-primary-50/40 text-slate-700 transition group text-center cursor-pointer"
                title={block.description}
              >
                <Icon size={18} className="text-slate-500 group-hover:text-primary-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-tight truncate w-full">
                  {block.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sections Reordering & Inspector */}
      {isMounted ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="web-page-sections">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {sections.map((section, index) => {
                  const def = BLOCK_DEFINITIONS.find((b) => b.type === section.type);
                  const Icon = def?.icon || LayoutTemplate;
                  const isExpanded = expandedSectionId === section.id;

                  return (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`bg-white rounded-2xl border transition-all ${
                            snapshot.isDragging
                              ? 'border-primary-500 shadow-lg scale-[1.01] z-20'
                              : isExpanded
                              ? 'border-primary-200/80 shadow-xs'
                              : 'border-slate-200/80 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          {/* Section Card Header */}
                          <div className="flex items-center justify-between p-3 select-none">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div
                                {...dragProvided.dragHandleProps}
                                className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-grab active:cursor-grabbing rounded"
                                title="Drag to reorder"
                                aria-label="Drag to reorder section"
                              >
                                <GripVertical size={16} />
                              </div>

                              <div
                                onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                              >
                                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                                  <Icon size={14} />
                                </div>
                                <div className="truncate">
                                  <span className="text-xs font-black text-slate-900 block truncate">
                                    {section.content?.heading || def?.label || section.type}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    {def?.label || section.type}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Actions: Up, Down, Delete, Expand */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => handleMove(index, 'up')}
                                className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                                title="Move up"
                                aria-label="Move section up"
                              >
                                <ChevronUp size={15} />
                              </button>
                              <button
                                type="button"
                                disabled={index === sections.length - 1}
                                onClick={() => handleMove(index, 'down')}
                                className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                                title="Move down"
                                aria-label="Move section down"
                              >
                                <ChevronDown size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => confirmDeleteSection(section)}
                                className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Delete section"
                                aria-label="Delete section"
                              >
                                <Trash2 size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedSectionId(isExpanded ? null : section.id)}
                                className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900"
                                aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                              >
                                <ChevronRight
                                  size={16}
                                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              </button>
                            </div>
                          </div>

                          {/* Section Edit Inspector Form */}
                          {isExpanded && (
                            <div className="p-4 pt-1 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl">
                              <SectionInspector
                                section={section}
                                onChange={(content) => handleUpdateSectionContent(section.id, content)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 font-bold">Loading sections...</div>
      )}

      {/* Delete Section Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(sectionToDelete)}
        onClose={() => setSectionToDelete(null)}
        onConfirm={() => {
          if (sectionToDelete) {
            handleDeleteSection(sectionToDelete.id);
            setSectionToDelete(null);
          }
        }}
        title="Delete Section?"
        description={`Are you sure you want to remove this ${sectionToDelete?.type ? `"${sectionToDelete.type}"` : ''} section? All content inside this section will be removed.`}
        confirmText="Delete Section"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}

// -------------------------------------------------------------
// SECTION INSPECTOR (FORM EDITORS PER BLOCK)
// -------------------------------------------------------------
// Image Upload & Cropping Field for Sections
// -------------------------------------------------------------

function SectionImageUploadField({
  label = 'Image URL',
  value,
  defaultAspect = 16 / 9,
  onChange,
}: {
  label?: string;
  value: string;
  defaultAspect?: number;
  onChange: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropState, setCropState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    fileName: string;
  }>({
    isOpen: false,
    imageUrl: null,
    fileName: 'section_image.jpg',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a JPG, PNG, or WebP image.');
      return;
    }

    setUploadError(null);
    const objectUrl = URL.createObjectURL(file);
    setCropState({
      isOpen: true,
      imageUrl: objectUrl,
      fileName: file.name,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const asset = await uploadMediaAsset(croppedFile);
      if (asset?.url) {
        onChange(asset.url);
      }
    } catch (err: unknown) {
      console.error('Image upload failed:', err);
      setUploadError(err instanceof Error ? err.message : 'Failed to upload cropped image.');
    } finally {
      setIsUploading(false);
      handleCloseModal();
    }
  };

  const handleCloseModal = () => {
    if (cropState.imageUrl) {
      URL.revokeObjectURL(cropState.imageUrl);
    }
    setCropState((prev) => ({ ...prev, isOpen: false, imageUrl: null }));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black uppercase text-slate-500">{label}</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 transition cursor-pointer"
        >
          <Upload size={12} />
          {isUploading ? 'Uploading...' : 'Upload & Crop Image'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/... or https://..."
          className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
        />
        {value && (
          <div className="w-9 h-9 rounded-lg border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-[11px] text-rose-600 font-medium">{uploadError}</p>
      )}

      <WebPageImageCropModal
        isOpen={cropState.isOpen}
        onClose={handleCloseModal}
        imageUrl={cropState.imageUrl}
        fileName={cropState.fileName}
        defaultAspect={defaultAspect}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

function SectionInspector({
  section,
  onChange,
}: {
  section: WebPageSection;
  onChange: (content: Record<string, unknown>) => void;
}) {
  const content = section.content || {};

  const handleChange = (key: string, val: unknown) => {
    onChange({ [key]: val });
  };

  switch (section.type) {
    case 'hero':
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Eyebrow</label>
            <input
              type="text"
              value={content.eyebrow || ''}
              onChange={(e) => handleChange('eyebrow', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Body Text</label>
            <textarea
              rows={2}
              value={content.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <SectionImageUploadField
            label="Hero Image"
            value={String(content.image_url || '')}
            defaultAspect={16 / 9}
            onChange={(url) => handleChange('image_url', url)}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Primary CTA Label</label>
              <input
                type="text"
                value={content.primary_label || ''}
                onChange={(e) => handleChange('primary_label', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Primary CTA URL</label>
              <input
                type="text"
                value={content.primary_url || ''}
                onChange={(e) => handleChange('primary_url', e.target.value)}
                placeholder="#contact or https://..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Secondary CTA Label</label>
              <input
                type="text"
                value={content.secondary_label || ''}
                onChange={(e) => handleChange('secondary_label', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Secondary CTA URL</label>
              <input
                type="text"
                value={content.secondary_url || ''}
                onChange={(e) => handleChange('secondary_url', e.target.value)}
                placeholder="#about or https://..."
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Section Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Body Text</label>
            <textarea
              rows={4}
              value={content.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3 text-xs">
          <SectionImageUploadField
            label="Section Image"
            value={String(content.image_url || '')}
            defaultAspect={4 / 3}
            onChange={(url) => handleChange('image_url', url)}
          />
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Caption / Description</label>
            <textarea
              rows={2}
              value={content.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
        </div>
      );

    case 'video':
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
              Video URL (YouTube or Vimeo)
            </label>
            <input
              type="text"
              value={content.url || ''}
              onChange={(e) => handleChange('url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Supports standard YouTube, youtu.be, and Vimeo video links.
            </p>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Body Text</label>
            <textarea
              rows={2}
              value={content.body || ''}
              onChange={(e) => handleChange('body', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Button Label</label>
              <input
                type="text"
                value={content.primary_label || ''}
                onChange={(e) => handleChange('primary_label', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Button URL</label>
              <input
                type="text"
                value={content.primary_url || ''}
                onChange={(e) => handleChange('primary_url', e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
              />
            </div>
          </div>
        </div>
      );

    case 'link_list': {
      const links: BuilderLinkItem[] = Array.isArray(content.links) ? (content.links as BuilderLinkItem[]) : [];
      const moveLink = (index: number, dir: 'up' | 'down') => {
        if (dir === 'up' && index === 0) return;
        if (dir === 'down' && index === links.length - 1) return;
        const target = dir === 'up' ? index - 1 : index + 1;
        const next = [...links];
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
        handleChange('links', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Links</label>
            {links.map((link: BuilderLinkItem, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Link #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLink(idx, 'up')}
                      aria-label="Move link up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === links.length - 1}
                      onClick={() => moveLink(idx, 'down')}
                      aria-label="Move link down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('links', links.filter((_unused, i: number) => i !== idx))}
                      aria-label="Delete link"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg shrink-0"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Label"
                    value={link.label || ''}
                    onChange={(e) => {
                      const next = [...links];
                      next[idx] = { ...next[idx], label: e.target.value };
                      handleChange('links', next);
                    }}
                    className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 bg-white"
                  />
                  <input
                    type="text"
                    placeholder="https://..."
                    value={link.url || ''}
                    onChange={(e) => {
                      const next = [...links];
                      next[idx] = { ...next[idx], url: e.target.value };
                      handleChange('links', next);
                    }}
                    className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleChange('links', [...links, { label: 'New Link', url: 'https://' }])}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Link
            </button>
          </div>
        </div>
      );
    }

    case 'faq': {
      const items: BuilderFaqItem[] = Array.isArray(content.items) ? (content.items as BuilderFaqItem[]) : [];
      const moveFaq = (index: number, dir: 'up' | 'down') => {
        if (dir === 'up' && index === 0) return;
        if (dir === 'down' && index === items.length - 1) return;
        const target = dir === 'up' ? index - 1 : index + 1;
        const next = [...items];
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
        handleChange('items', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">FAQ Items</label>
            {items.map((faq: BuilderFaqItem, idx: number) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Item #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveFaq(idx, 'up')}
                      aria-label="Move FAQ item up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveFaq(idx, 'down')}
                      aria-label="Move FAQ item down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('items', items.filter((_unused, i: number) => i !== idx))}
                      aria-label="Delete FAQ item"
                      className="text-rose-500 hover:bg-rose-50 p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Question"
                  value={faq.question || ''}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], question: e.target.value };
                    handleChange('items', next);
                  }}
                  className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 font-bold"
                />
                <textarea
                  rows={2}
                  placeholder="Answer"
                  value={faq.answer || ''}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], answer: e.target.value };
                    handleChange('items', next);
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleChange('items', [...items, { question: 'New Question', answer: 'New answer details.' }])}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add FAQ Item
            </button>
          </div>
        </div>
      );
    }

    case 'testimonials': {
      const items: BuilderTestimonialItem[] = Array.isArray(content.items) ? (content.items as BuilderTestimonialItem[]) : [];
      const moveTestimonial = (index: number, dir: 'up' | 'down') => {
        if (dir === 'up' && index === 0) return;
        if (dir === 'down' && index === items.length - 1) return;
        const target = dir === 'up' ? index - 1 : index + 1;
        const next = [...items];
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
        handleChange('items', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Testimonials</label>
            {items.map((t: BuilderTestimonialItem, idx: number) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Quote #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveTestimonial(idx, 'up')}
                      aria-label="Move testimonial up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveTestimonial(idx, 'down')}
                      aria-label="Move testimonial down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('items', items.filter((_unused, i: number) => i !== idx))}
                      aria-label="Delete testimonial"
                      className="text-rose-500 hover:bg-rose-50 p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Quote"
                  value={t.quote || ''}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], quote: e.target.value };
                    handleChange('items', next);
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 italic"
                />
                <input
                  type="text"
                  placeholder="Attribution (e.g. John D., Founder)"
                  value={t.name || ''}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx] = { ...next[idx], name: e.target.value };
                    handleChange('items', next);
                  }}
                  className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 font-bold"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => handleChange('items', [...items, { quote: 'Great product.', name: 'Customer' }])}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Testimonial
            </button>
          </div>
        </div>
      );
    }

    case 'contact_form': {
      const fields: BuilderFieldItem[] = Array.isArray(content.fields) ? (content.fields as BuilderFieldItem[]) : [];
      const moveField = (index: number, dir: 'up' | 'down') => {
        if (dir === 'up' && index === 0) return;
        if (dir === 'down' && index === fields.length - 1) return;
        const target = dir === 'up' ? index - 1 : index + 1;
        const next = [...fields];
        const temp = next[index];
        next[index] = next[target];
        next[target] = temp;
        handleChange('fields', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Button Label</label>
            <input
              type="text"
              value={content.button_label || ''}
              onChange={(e) => handleChange('button_label', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Form Fields</label>
            {fields.map((field: BuilderFieldItem, idx: number) => (
              <div key={idx} className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Field #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveField(idx, 'up')}
                      aria-label="Move field up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === fields.length - 1}
                      onClick={() => moveField(idx, 'down')}
                      aria-label="Move field down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('fields', fields.filter((_unused, i: number) => i !== idx))}
                      aria-label="Delete field"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-6">
                    <input
                      type="text"
                      placeholder="Field label"
                      value={field.label || ''}
                      onChange={(e) => {
                        const next = [...fields];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleChange('fields', next);
                      }}
                      className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <select
                      value={field.type || 'text'}
                      onChange={(e) => {
                        const next = [...fields];
                        next[idx] = { ...next[idx], type: e.target.value };
                        handleChange('fields', next);
                      }}
                      className="w-full text-xs p-2 min-h-[38px] rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="textarea">Textarea</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-start sm:justify-center">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 select-none min-h-[38px] w-full sm:w-auto justify-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(field.required)}
                        onChange={(e) => {
                          const next = [...fields];
                          next[idx] = { ...next[idx], required: e.target.checked };
                          handleChange('fields', next);
                        }}
                        className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                      />
                      Req
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                const key = `field_${Date.now()}`;
                handleChange('fields', [...fields, { key, label: 'New Field', type: 'text', required: false }]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Field
            </button>
          </div>
        </div>
      );
    }

    case 'features': {
      const items = Array.isArray(content.items) ? (content.items as Record<string, string>[]) : [];
      const moveItem = (index: number, direction: 'up' | 'down') => {
        const next = [...items];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('items', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={(content.heading as string) || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Subheading</label>
            <input
              type="text"
              value={(content.subheading as string) || ''}
              onChange={(e) => handleChange('subheading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Columns</label>
            <select
              value={Number(content.columns) || 3}
              onChange={(e) => handleChange('columns', Number(e.target.value))}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Feature Cards</label>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Card #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      aria-label="Move item up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      aria-label="Move item down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('items', items.filter((_, i) => i !== idx))}
                      aria-label="Delete item"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Icon</label>
                    <select
                      value={item.icon || 'Sparkles'}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], icon: e.target.value };
                        handleChange('items', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="Sparkles">Sparkles</option>
                      <option value="Zap">Zap (Lightning)</option>
                      <option value="Shield">Shield (Security)</option>
                      <option value="TrendingUp">Trending Up (Growth)</option>
                      <option value="Star">Star</option>
                      <option value="Award">Award</option>
                      <option value="Check">Checkmark</option>
                      <option value="Clock">Clock</option>
                      <option value="User">User</option>
                      <option value="Layers">Layers</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Title</label>
                    <input
                      type="text"
                      placeholder="Card Title"
                      value={item.title || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], title: e.target.value };
                        handleChange('items', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Description text"
                    value={item.description || ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], description: e.target.value };
                      handleChange('items', next);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('items', [...items, { icon: 'Sparkles', title: 'New Feature', description: 'Describe this feature or benefit here.' }]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Feature Card
            </button>
          </div>
        </div>
      );
    }

    case 'stats': {
      const items = Array.isArray(content.items) ? (content.items as Record<string, string>[]) : [];
      const moveItem = (index: number, direction: 'up' | 'down') => {
        const next = [...items];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('items', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading (Optional)</label>
            <input
              type="text"
              value={(content.heading as string) || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Stat Items</label>
            {items.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Stat #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      aria-label="Move stat up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      aria-label="Move stat down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('items', items.filter((_, i) => i !== idx))}
                      aria-label="Delete stat"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Value</label>
                    <input
                      type="text"
                      placeholder="e.g. 100K+ or 4.9/5"
                      value={item.value || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], value: e.target.value };
                        handleChange('items', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-black text-primary-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Active Users"
                      value={item.label || ''}
                      onChange={(e) => {
                        const next = [...items];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleChange('items', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Short context note"
                    value={item.description || ''}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], description: e.target.value };
                      handleChange('items', next);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('items', [...items, { value: '10K+', label: 'New Metric', description: 'Brief description' }]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Stat Item
            </button>
          </div>
        </div>
      );
    }

    case 'gallery': {
      const images: WebPageGalleryImage[] = Array.isArray(content.images)
        ? (content.images as WebPageGalleryImage[])
        : [];
      const moveItem = (index: number, direction: 'up' | 'down') => {
        const next = [...images];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('images', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={(content.heading as string) || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Layout</label>
            <select
              value={(content.layout as string) || 'grid'}
              onChange={(e) => handleChange('layout', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            >
              <option value="grid">Grid (Equal Aspect)</option>
              <option value="masonry">Masonry</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Gallery Images</label>
            {images.map((img, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Image #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveItem(idx, 'up')}
                      aria-label="Move image up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveItem(idx, 'down')}
                      aria-label="Move image down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('images', images.filter((_, i) => i !== idx))}
                      aria-label="Delete image"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <SectionImageUploadField
                  label="Image"
                  value={img.url || ''}
                  defaultAspect={4 / 3}
                  onChange={(url) => {
                    const next = [...images];
                    next[idx] = { ...next[idx], url };
                    handleChange('images', next);
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Alt Text</label>
                    <input
                      type="text"
                      placeholder="Descriptive alt text"
                      value={img.alt || ''}
                      onChange={(e) => {
                        const next = [...images];
                        next[idx] = { ...next[idx], alt: e.target.value };
                        handleChange('images', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Caption (Optional)</label>
                    <input
                      type="text"
                      placeholder="Visible caption"
                      value={img.caption || ''}
                      onChange={(e) => {
                        const next = [...images];
                        next[idx] = { ...next[idx], caption: e.target.value };
                        handleChange('images', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('images', [
                  ...images,
                  {
                    url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
                    alt: 'New gallery visual',
                    caption: '',
                  },
                ]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Gallery Image
            </button>
          </div>
        </div>
      );
    }

    case 'pricing': {
      const plans: WebPagePricingPlan[] = Array.isArray(content.plans)
        ? (content.plans as WebPagePricingPlan[])
        : [];
      const movePlan = (index: number, direction: 'up' | 'down') => {
        const next = [...plans];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('plans', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={(content.heading as string) || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Pricing Plans</label>
            {plans.map((plan, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Plan #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => movePlan(idx, 'up')}
                      aria-label="Move plan up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === plans.length - 1}
                      onClick={() => movePlan(idx, 'down')}
                      aria-label="Move plan down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('plans', plans.filter((_, i) => i !== idx))}
                      aria-label="Delete plan"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 select-none cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(plan.is_popular)}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], is_popular: e.target.checked };
                        handleChange('plans', next);
                      }}
                      className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4"
                    />
                    Featured / Popular Tag
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Plan Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Starter"
                      value={(plan.name as string) || ''}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], name: e.target.value };
                        handleChange('plans', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Price</label>
                    <input
                      type="text"
                      placeholder="e.g. $49"
                      value={(plan.price as string) || ''}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], price: e.target.value };
                        handleChange('plans', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Billing Period</label>
                    <input
                      type="text"
                      placeholder="e.g. /month"
                      value={(plan.billing_period as string) || ''}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], billing_period: e.target.value };
                        handleChange('plans', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Description</label>
                  <input
                    type="text"
                    placeholder="Short description of audience or tier"
                    value={(plan.description as string) || ''}
                    onChange={(e) => {
                      const next = [...plans];
                      next[idx] = { ...next[idx], description: e.target.value };
                      handleChange('plans', next);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">
                    Features (One per line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Feature 1&#10;Feature 2&#10;Feature 3"
                    value={Array.isArray(plan.features) ? plan.features.join('\n') : ''}
                    onChange={(e) => {
                      const next = [...plans];
                      const feats = e.target.value
                        .split('\n')
                        .map((f) => f.trim())
                        .filter(Boolean);
                      next[idx] = { ...next[idx], features: feats };
                      handleChange('plans', next);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">CTA Button Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Get Started"
                      value={(plan.cta_label as string) || ''}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], cta_label: e.target.value };
                        handleChange('plans', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">CTA Button URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://... or #contact"
                      value={(plan.cta_url as string) || ''}
                      onChange={(e) => {
                        const next = [...plans];
                        next[idx] = { ...next[idx], cta_url: e.target.value };
                        handleChange('plans', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('plans', [
                  ...plans,
                  {
                    name: 'New Tier',
                    price: '$49',
                    billing_period: '/month',
                    description: 'Plan tier description',
                    features: ['Feature 1', 'Feature 2', 'Feature 3'],
                    cta_label: 'Select Plan',
                    cta_url: '#contact',
                    is_popular: false,
                  },
                ]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Pricing Plan
            </button>
          </div>
        </div>
      );
    }

    case 'profile': {
      const socialLinks: WebPageSocialLink[] = Array.isArray(content.social_links)
        ? (content.social_links as WebPageSocialLink[])
        : [];
      const moveLink = (index: number, direction: 'up' | 'down') => {
        const next = [...socialLinks];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('social_links', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Full Name</label>
            <input
              type="text"
              value={(content.name as string) || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Role / Subtitle</label>
            <input
              type="text"
              value={(content.role as string) || ''}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Biography</label>
            <textarea
              rows={4}
              value={(content.bio as string) || ''}
              onChange={(e) => handleChange('bio', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white leading-relaxed"
            />
          </div>
          <SectionImageUploadField
            label="Avatar Photo"
            value={(content.avatar_url as string) || ''}
            defaultAspect={1}
            onChange={(url) => handleChange('avatar_url', url)}
          />
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Social / External Links</label>
            {socialLinks.map((link, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Link #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLink(idx, 'up')}
                      aria-label="Move link up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === socialLinks.length - 1}
                      onClick={() => moveLink(idx, 'down')}
                      aria-label="Move link down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('social_links', socialLinks.filter((_, i) => i !== idx))}
                      aria-label="Delete link"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Platform / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Instagram"
                      value={link.label || ''}
                      onChange={(e) => {
                        const next = [...socialLinks];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleChange('social_links', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">URL</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={link.url || ''}
                      onChange={(e) => {
                        const next = [...socialLinks];
                        next[idx] = { ...next[idx], url: e.target.value };
                        handleChange('social_links', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('social_links', [...socialLinks, { label: 'Instagram', url: 'https://instagram.com' }]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Social Link
            </button>
          </div>
        </div>
      );
    }

    case 'timeline': {
      const steps = Array.isArray(content.steps) ? (content.steps as Record<string, string>[]) : [];
      const moveStep = (index: number, direction: 'up' | 'down') => {
        const next = [...steps];
        const target = direction === 'up' ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return;
        const [removed] = next.splice(index, 1);
        next.splice(target, 0, removed);
        handleChange('steps', next);
      };

      return (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Heading</label>
            <input
              type="text"
              value={(content.heading as string) || ''}
              onChange={(e) => handleChange('heading', e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500">Timeline Steps / Milestones</label>
            {steps.map((step, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400">Step #{idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveStep(idx, 'up')}
                      aria-label="Move step up"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === steps.length - 1}
                      onClick={() => moveStep(idx, 'down')}
                      aria-label="Move step down"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('steps', steps.filter((_, i) => i !== idx))}
                      aria-label="Delete step"
                      className="p-1 min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Time or Step</label>
                    <input
                      type="text"
                      placeholder="e.g. 09:00 AM or Step 1"
                      value={step.time_or_step || ''}
                      onChange={(e) => {
                        const next = [...steps];
                        next[idx] = { ...next[idx], time_or_step: e.target.value };
                        handleChange('steps', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Title</label>
                    <input
                      type="text"
                      placeholder="Step Title"
                      value={step.title || ''}
                      onChange={(e) => {
                        const next = [...steps];
                        next[idx] = { ...next[idx], title: e.target.value };
                        handleChange('steps', next);
                      }}
                      className="w-full text-xs p-2 rounded-lg border border-slate-200 font-bold"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Step details or agenda description"
                    value={step.description || ''}
                    onChange={(e) => {
                      const next = [...steps];
                      next[idx] = { ...next[idx], description: e.target.value };
                      handleChange('steps', next);
                    }}
                    className="w-full text-xs p-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                handleChange('steps', [...steps, { time_or_step: 'Step Next', title: 'New Milestone', description: 'Describe what happens here.' }]);
              }}
              className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-2 min-h-[44px]"
            >
              <Plus size={15} /> Add Timeline Step
            </button>
          </div>
        </div>
      );
    }

    default:
      return <div className="text-xs text-slate-400">No inspector available for this block.</div>;
  }
}
