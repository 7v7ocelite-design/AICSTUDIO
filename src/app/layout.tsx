import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AiC Content Studio",
  description: "AI Video Production Dashboard for Athletes in Control",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-brand-bg`}>
        <Sidebar />
        <main className="lg:pl-64">
          <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1E293B",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0",
            },
          }}
        />
      </body>
    </html>
  );
}
