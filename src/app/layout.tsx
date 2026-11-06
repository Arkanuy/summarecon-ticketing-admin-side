import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: "Admin Dashboard | Summarecon Ticketing", template: "%s | Admin Summarecon Ticketing" },
  description: "Dashboard internal mengelola venue, event, kursi, booking, refund, check-in, dan laporan tiket Summarecon.",
};

const themeScript = `try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t;}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
