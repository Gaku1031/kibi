import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { RecoilProvider } from "./RecoilProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "kibi - 感情の機微を発見する日記サービス",
  description: "Notionのような快適な書き心地で、日記を書くとその文面からそのときの感情を分析してくれる日記サービス",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${inter.variable} ${playfair.variable} antialiased`}
        suppressHydrationWarning
      >
        <RecoilProvider>{children}</RecoilProvider>
      </body>
    </html>
  );
}
