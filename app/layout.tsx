import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/rivera/auth-provider";
import { ThemeProvider } from "@/components/rivera/theme-provider";

export const metadata: Metadata = {
  title: "Rivera — Make work people feel",
  description: "Rivera helps thoughtful brands and distinctive creators find each other and build meaningful campaigns together.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
