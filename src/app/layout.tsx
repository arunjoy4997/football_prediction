import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0f1a",
};

export const metadata: Metadata = {
  title: "FootballPredict — Smart Match Predictions",
  description:
    "AI-powered football match predictions for Champions League, Premier League, La Liga, Serie A, Bundesliga, and more.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FootballPredict",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased safe-bottom">{children}</body>
    </html>
  );
}
