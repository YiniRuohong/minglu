import type { Metadata } from "next";
import "lxgw-wenkai-webfont/style.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "明命录",
  description: "结合八字与卦象的高设计感命理网页，支持 OpenAI 兼容 API 配置。",
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
