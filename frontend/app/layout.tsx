import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'HealthVault | AI Personal Health Record Assistant',
  description: 'Multimodal clinical history, OCR document extraction, and hybrid AI Q&A health assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#070a11] text-gray-100 antialiased flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-[96%] xl:max-w-[1650px] w-full mx-auto px-4 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-800/80 py-6 text-center text-xs text-gray-500">
          <p>© 2026 HealthVault Personal Health Platform. Powered by FastAPI, Supabase, Groq & ChromaDB.</p>
        </footer>
      </body>
    </html>
  );
}
