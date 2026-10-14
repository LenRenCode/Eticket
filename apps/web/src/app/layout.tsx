import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "E-Tiket QRIS 2026 - Official Ticketing Platform",
  description:
    "Pemesanan tiket online instant tanpa registrasi dengan barcode QRIS dinamis, e-tiket QR scannable, dan sistem check-in anti-duplikasi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body>
        <nav className="nav-container no-print">
          <div className="nav-content">
            <Link href="/" className="nav-brand">
              <span style={{ fontSize: "24px" }}>🎟️</span>
              <span>E-TIKET 2026</span>
            </Link>
            <div className="nav-links">
              <Link href="/" className="nav-link-btn">
                Beli Tiket
              </Link>
              <Link href="/admin/scanner" className="nav-link-btn" style={{ borderColor: "rgba(16, 185, 129, 0.4)" }}>
                📷 Scanner Gate
              </Link>
              <Link href="/admin" className="nav-link-btn">
                📊 Admin & Export
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
