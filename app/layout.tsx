import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Leanlet — Ship less AI. Build smarter.',
  description: 'An open-source framework for lightweight, intrinsic AI that runs entirely in the browser.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Leanlet — Ship less AI. Build smarter.',
    description: 'Small, task-specific AI shipped inside the software. No API required.',
    images: ['/leanlet-social-preview.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
