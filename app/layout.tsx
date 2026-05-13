import type { Metadata } from "next";
import "lxgw-wenkai-webfont/style.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "明命录",
  description: "以子平八字为主线的命理网页，侧重四柱、月令、十神与大运的结构化展示。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
