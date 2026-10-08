import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { LearningProvider } from "@/components/learning-provider";
import { AppShell } from "@/components/app-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "모루 · 배움이 자라는 곳", template: "%s · 모루" },
  description: "믿을 수 있는 자료로 나만의 학습 코스를 만들고, 짧은 레슨과 퀴즈로 한 걸음씩 배워보세요.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><LearningProvider><AppShell>{children}</AppShell></LearningProvider></body>
    </html>
  );
}
