import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rivera — Where brands and creators connect",
  description: "Rivera connects businesses and content creators through better campaign collaborations, worldwide.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
