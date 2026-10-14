"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    namaEvent: "2026 Grand Tech & Music Fest",
    totalKuota: 300,
    kuotaTerjual: 0,
    kuotaTerpesan: 0,
    sisaKuota: 300,
    harga: 250000,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getQuota()
      .then((res) => {
        if (res.data) {
          setStats(res.data);
        }
      })
      .catch((err) => console.warn("Error fetching quota:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = stats.kuotaTerjual * stats.harga;
  const exportUrl = api.getExportExcelUrl();
  const soldPercent = Math.min(
    100,
    Math.round((stats.kuotaTerjual / (stats.totalKuota || 1)) * 100)
  );

  return (
    <main className="page-container">
      {/* HEADER SECTION (Responsive stack on Mobile, row on Desktop) */}
      <div className="admin-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span className="badge badge-primary">Panel Panitia & Operasional 2026</span>
            <span className="badge badge-success">
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 8px #10b981",
                  display: "inline-block",
                }}
              />
              Live Sync
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", marginTop: "10px" }}>
            Dashboard Acara & Laporan
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            {stats.namaEvent} &bull; Monitoring kuota & pencadangan offline hari-H.
          </p>
        </div>

        {/* BUTTON EXPORT EXCEL OFFLINE BACKUP */}
        <div>
          <a
            href={exportUrl}
            download="Backup_Etiket_Acara_2026.xlsx"
            className="btn-export"
          >
            <span style={{ fontSize: "18px" }}>📊</span>
            <span>Download Backup Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* METRIC KPI STATS GRID (1 col Mobile, 2 col Tablet, 4 col Desktop) */}
      <div className="admin-stats-grid">
        {/* CARD 1: TIKET TERJUAL */}
        <div className="stat-card">
          <div className="stat-label">Total Tiket Terjual</div>
          <div className="stat-value" style={{ color: "#818cf8" }}>
            {stats.kuotaTerjual}
          </div>
          <div className="stat-sub">
            dari kapasitas {stats.totalKuota} tiket ({soldPercent}%)
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                width: `${soldPercent}%`,
                height: "100%",
                background: "linear-gradient(90deg, #4f46e5, #818cf8)",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        {/* CARD 2: REVENUE */}
        <div className="stat-card">
          <div className="stat-label">Total Penerimaan</div>
          <div className="stat-value" style={{ color: "#34d399", fontSize: "clamp(20px, 2.5vw, 28px)" }}>
            Rp {totalRevenue.toLocaleString("id-ID")}
          </div>
          <div className="stat-sub">Settlement QRIS terverifikasi</div>
          <div
            style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, #059669, #34d399)",
              }}
            />
          </div>
        </div>

        {/* CARD 3: SISA KUOTA */}
        <div className="stat-card">
          <div className="stat-label">Sisa Kuota Tersedia</div>
          <div className="stat-value" style={{ color: "#fbbf24" }}>
            {stats.sisaKuota}
          </div>
          <div className="stat-sub">
            {stats.kuotaTerpesan} sedang dalam proses pembayaran
          </div>
          <div
            style={{
              height: "4px",
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: "4px",
              overflow: "hidden",
              marginTop: "12px",
            }}
          >
            <div
              style={{
                width: `${Math.max(5, 100 - soldPercent)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #d97706, #fbbf24)",
              }}
            />
          </div>
        </div>

        {/* CARD 4: GATE ACTION */}
        <div className="stat-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="stat-label">Pintu Masuk (Gate)</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "6px" }}>
              Validasi scan barcode penonton via kamera HP / Laptop
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <Link
              href="/admin/scanner"
              className="btn-secondary"
              style={{
                width: "100%",
                background: "rgba(99, 102, 241, 0.15)",
                borderColor: "rgba(99, 102, 241, 0.4)",
                color: "#a5b4fc",
                fontSize: "13px",
              }}
            >
              <span>📷</span>
              <span>Buka Scanner Kamera</span>
            </Link>
          </div>
        </div>
      </div>

      {/* OFFLINE CONTINGENCY EXPLANATION CARD */}
      <div
        className="glass-card"
        style={{
          border: "1px solid rgba(16, 185, 129, 0.3)",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(14, 19, 32, 0.85) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
          <span style={{ fontSize: "22px" }}>🛡️</span>
          <h2 style={{ fontSize: "17px" }}>
            Prosedur Failover & Kesiapsiagaan Hari-H Acara (Offline Contingency)
          </h2>
        </div>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: "1.7" }}>
          Sesuai spesifikasi business plan 2026: jika terjadi gangguan internet atau sinyal seluler drop
          di area venue (ICE BSD), panitia gate cukup membuka file <strong>Backup Excel (.xlsx)</strong> di atas.
          Seluruh data <em>UUID Barcode</em>, <em>Nama Lengkap</em>, <em>WhatsApp</em>, dan <em>Status Kehadiran</em>
          dapat diverifikasi secara offline dalam hitungan detik menggunakan tombol <code>Ctrl + F</code> pada laptop panitia.
        </p>
      </div>
    </main>
  );
}
