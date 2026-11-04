import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-control";
import { safeTheme } from "@/lib/theme";
import "./globals.css";
export const metadata: Metadata = {
  title: "NenSync — make space for your best work",
  description:
    "Your daily standup, three priorities and next focus interval. A private workspace for a calmer workday.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e8f6ff" },
    { media: "(prefers-color-scheme: dark)", color: "#07162b" },
  ],
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = safeTheme((await cookies()).get("nensync-theme")?.value);
  return (
    <html lang="en" data-theme={theme}>
      <body>
        <ThemeProvider initial={theme}>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
