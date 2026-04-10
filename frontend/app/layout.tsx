import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SearchX — Privacy-respecting search",
  description:
    "A minimalist, privacy-first search engine powered by SearXNG. No tracking, no profiling.",
  keywords: ["search engine", "privacy", "searxng", "searchx"],
  openGraph: {
    title: "SearchX",
    description: "Privacy-respecting search powered by SearXNG.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-base-200 text-base-content antialiased">
        {children}
      </body>
    </html>
  );
}
