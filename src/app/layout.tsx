import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Preference Center | Klaviyo Demo",
  description: "Manage your email preferences with Klaviyo Events API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
