import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Serenity Chat 💫",
  description: "Aesthetically Pleasing Front-end UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        style={{
          "--font-geist-sans": "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          "--font-geist-mono": "Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          fontFamily: "var(--font-geist-sans)",
        } as React.CSSProperties}
      >
        {children}
      </body>
    </html>
  );
}