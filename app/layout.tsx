import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Serenity Chat",
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
          // Manually define the CSS variables that were previously set by the Google Font module.
          // This ensures Tailwind and all components that reference these variables use local system fonts.
          // Using system-ui ensures the font matches the user's OS look and feel (e.g., San Francisco on macOS, Segoe UI on Windows).
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