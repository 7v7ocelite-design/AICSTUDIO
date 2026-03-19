import type { Metadata } from "next";
import "@/app/globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "AiC Content Studio",
  description: "AI video production dashboard for Athletes in Control"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased">
        <Providers>
          <AppSidebar />
          <main className="min-h-screen px-4 pb-12 pt-20 md:ml-72 md:px-8 md:pt-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
