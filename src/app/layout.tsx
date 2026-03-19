import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AiC Studio",
  description: "AI-powered video generation platform for athletes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-brand-bg min-h-screen`}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 md:ml-0 overflow-x-hidden">
            <div className="p-4 md:p-8 pt-16 md:pt-8">{children}</div>
          </main>
        </div>
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#1E293B",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "white",
            },
          }}
        />
      </body>
    </html>
  );
}
