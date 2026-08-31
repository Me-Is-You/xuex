import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "学学 2027 Pro · 智能化备考平台",
  description: "AI 智能推荐、知识图谱、自适应测评、学情预警、多端协同的一体化智能学习平台",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
