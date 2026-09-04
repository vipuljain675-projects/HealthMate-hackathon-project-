import type { Metadata, Viewport } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import HeaderBar from '@/components/HeaderBar';

export const metadata: Metadata = {
  title: 'HealthMate | AI Personal Health OS',
  description: 'Multimodal clinical history, OCR document extraction, and hybrid AI Q&A health assistant.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'HealthMate',
  },
};

export const viewport: Viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#070a11] text-gray-100 antialiased flex flex-row">
        {/* Left Fixed Sidebar Workspace Navigation */}
        <Sidebar />

        {/* Right Main Content Workspace */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#070a11]">
          {/* Top Header Bar with Breadcrumbs, Search, Notifications, Profile Avatar */}
          <HeaderBar />

          {/* Main Dashboard Pages */}
          <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-gray-800/60 py-5 text-center text-xs text-gray-500 bg-[#080d16]">
            <p>© 2026 HealthMate Personal Health Platform. Powered by FastAPI, Supabase, Groq & ChromaDB.</p>
          </footer>
        </div>
      </body>
    </html>
  );
}
