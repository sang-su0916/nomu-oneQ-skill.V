import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import MobileTabBar from "@/components/MobileTabBar";
import FAB from "@/components/FAB";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import MigrationProvider from "@/components/MigrationProvider";
import GuestBanner from "@/components/GuestBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a5f",
};

export const metadata: Metadata = {
  title: {
    default: "노무원큐 - 소규모 사업장 노무관리 솔루션",
    template: "%s | 노무원큐",
  },
  description:
    "근로계약서, 급여명세서, 연차관리, 취업규칙 등 노무서류 30종을 원큐로 관리하세요. 5~50인 소규모 사업장을 위한 스마트 노무관리 SaaS.",
  keywords:
    "노무관리, 근로계약서, 급여명세서, 임금대장, 취업규칙, HR, 인사관리, SaaS, 4대보험, 퇴직금, 연차관리, 소규모사업장",
  authors: [{ name: "엘비즈파트너스", url: "https://lbiz-partners.com" }],
  creator: "엘비즈파트너스",
  publisher: "엘비즈파트너스",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "노무원큐",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://nomu-oneq.vercel.app",
    siteName: "노무원큐",
    title: "노무원큐 - 소규모 사업장 노무관리 솔루션",
    description:
      "근로계약서부터 퇴직금정산까지, 노무서류 30종을 원큐로 관리하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "노무원큐 - 소규모 사업장 노무관리 솔루션",
    description: "노무서류 30종을 원큐로 관리. 무료로 시작하세요.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://nomu-oneq.vercel.app",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "노무원큐",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "소규모 사업장을 위한 노무관리 SaaS. 근로계약서, 급여명세서 등 30종 노무서류 자동 생성.",
    url: "https://nomu-oneq.vercel.app",
    offers: {
      "@type": "AggregateOffer",
      lowPrice: "0",
      highPrice: "0",
      priceCurrency: "KRW",
      offerCount: 3,
    },
    creator: {
      "@type": "Organization",
      name: "엘비즈파트너스",
      url: "https://lbiz-partners.com",
    },
  };

  return (
    <html lang="ko">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="노무원큐" />
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          <ToastProvider>
            <MigrationProvider>
              <Navigation />
              <GuestBanner />
              <main className="pt-14 pb-20 md:pb-0">{children}</main>
              <MobileTabBar />
              <FAB />
            </MigrationProvider>
          </ToastProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `,
          }}
        />
      </body>
    </html>
  );
}
