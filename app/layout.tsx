import type { Metadata } from "next";
import type { ReactNode } from "react";

// Minimal root layout so the backend runs on its own.
// The frontend team replaces this (navbar, Tailwind globals, footer).
export const metadata: Metadata = {
  title: "Community Store",
  description: "Buy and sell within the university community.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
