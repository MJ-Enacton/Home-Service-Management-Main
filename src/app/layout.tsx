import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { ProfileCheck } from "@/components/ProfileCheck";
import { Navbar } from "@/components/Navbar";
import { BanGate } from "@/components/BanGate";
import { Footer } from "@/components/Footer";
import { BookingChatWidget } from "@/components/chat/BookingChatWidget";
import { Toaster } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HandyHub — Trusted Home Services",
  description:
    "Book trusted local pros for plumbing, cleaning, electrical and more. Real pros, real reviews, on your schedule.",
  icons: {
    icon: "/HandyHub_logo.png",
    apple: "/HandyHub_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased selection:bg-primary/10">
        <ProfileCheck />
        <Navbar />
        <main className="flex-1 flex flex-col">
          <BanGate>{children}</BanGate>
        </main>
        <Footer />
        <BookingChatWidget />
        <Toaster />
      </body>
    </html>
  );
}
