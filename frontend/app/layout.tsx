import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Helix — Protein structure analysis",
  description:
    "Helix turns a protein structure into clear 3D visuals and quantitative reports: distance maps, Ramachandran plots, and backbone geometry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="aurora" aria-hidden />
        <div className="grid-veil" aria-hidden />
        {children}
      </body>
    </html>
  );
}
