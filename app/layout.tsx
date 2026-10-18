import type { Metadata } from "next";
import { Fraunces, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const sans = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-app-sans",
  display: "swap",
  preload: false,
});

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-app-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "旅遊足跡",
  description: "在世界地圖上記下每一次出國的路線、停留與照片。",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${sans.variable} ${display.variable} h-full antialiased`}>
      <body className="h-dvh overflow-hidden">{children}</body>
    </html>
  );
}
