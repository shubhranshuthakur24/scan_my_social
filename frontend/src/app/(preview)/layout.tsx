import type { Metadata } from 'next';
import PreviewAuthGuard from './PreviewAuthGuard';

export const metadata: Metadata = {
  title: 'Web Page Preview | Scan My Social',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StandalonePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PreviewAuthGuard>{children}</PreviewAuthGuard>;
}
