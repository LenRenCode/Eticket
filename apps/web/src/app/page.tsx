"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function GuestCheckoutPage() {
  const router = useRouter();

  const [quotaData, setQuotaData] = useState({
    namaEvent: "2026 Grand Tech & Music Fest",
    kategori: "VIP Festival Pass",
    harga: 250000,
    totalKuota: 300,
    sisaKuota: 142,
  });

  const [form, setForm] = useState({
    nama: "",
    email: "",
    noWhatsapp: "",
    jumlahTiket: 1,
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    // Fetch live quota dari API backend
    api
      .getQuota()
      .then((res) => {
        if (res.data) {
          setQuotaData({
            namaEvent: res.data.namaEvent,
            kategori: res.data.kategori,
            harga: Number(res.data.harga),
            totalKuota: Number(res.data.totalKuota),
            sisaKuota: Number(res.data.sisaKuota),
          });
        }
      })
      .catch((err) => {
        console.warn("Gagal memuat kuota live:", err.message);
      });
  }, []);

  const totalBayar = form.jumlahTiket * quotaData.harga;

  const handleQtyChange = (delta: number) => {
    const nextVal = form.jumlahTiket + delta;
    if (nextVal >= 1 && nextVal <= 5) {
      setForm({ ...form, jumlahTiket: nextVal });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!form.nama.trim() || !form.email.trim() || !form.noWhatsapp.trim()) {
      setErrorMessage("Mohon lengkapi seluruh kolom formulir.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.checkout({
        nama: form.nama,
        email: form.email,
        noWhatsapp: form.noWhatsapp,
        jumlahTiket: form.jumlahTiket,
      });

      if (response.success && response.data?.transaksiId) {
        router.push(`/payment/${response.data.transaksiId}`);
      } else {
        throw new Error(response.message || "Gagal membuat transaksi");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || "Terjadi kesalahan saat memproses checkout."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-container">
      {/* HERO EVENT BANNER (Responsive Mobile & Desktop) */}
      <div className="hero-card">
        <div className="hero-layout">
          <div className="hero-info">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
              <span className="badge badge-primary">Edisi Eksklusif 2026</span>
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
                Tersisa {quotaData.sisaKuota} Tiket
              </span>
            </div>
            <h1>{quotaData.namaEvent}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
              📍 Indonesia Convention Exhibition (ICE BSD) &bull; 🗓️ 28 November 2026
            </p>
          </div>

          <div className="hero-price-box">
            <div style={{ fontSize: "11px", color: "var(--text-subtle)", textTransform: "uppercase", fontWeight: 700 }}>
              Kategori Tiket
            </div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: "#a5b4fc", marginTop: "2px" }}>
              {quotaData.kategori}
            </div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>
              Rp {quotaData.harga.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>

      {/* 2-COLUMN CHECKOUT LAYOUT */}
      <div className="checkout-grid">
        {/* CHECKOUT FORM CARD */}
        <div className="glass-card">
          <div style={{ marginBottom: "22px" }}>
            <h2 style={{ fontSize: "20px", marginBottom: "4px" }}>Guest Checkout</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "13.5px" }}>
              Beli tiket instan tanpa registrasi akun atau login kata sandi.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.4)",
                color: "#fca5a5",
                padding: "12px 16px",
                borderRadius: "12px",
                fontSize: "13.5px",
                marginBottom: "18px",
              }}
            >
              ⚠️ {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nama Lengkap (Sesuai KTP / Paspor)</label>
              <input
                type="text"
                className="form-input"
                placeholder="cth: Dimas Pratama"
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Alamat Email Aktif</label>
              <input
                type="email"
                className="form-input"
                placeholder="cth: dimas@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <span style={{ fontSize: "11.5px", color: "var(--text-subtle)", marginTop: "4px", display: "block" }}>
                Barcode e-tiket akan otomatis dikirimkan ke email ini setelah lunas.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Nomor WhatsApp Aktif</label>
              <input
                type="tel"
                className="form-input"
                placeholder="cth: 081234567890"
                value={form.noWhatsapp}
                onChange={(e) => setForm({ ...form, noWhatsapp: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Jumlah Tiket (Maks. 5 Tiket)</label>
              <div className="qty-stepper">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => handleQtyChange(-1)}
                  disabled={form.jumlahTiket <= 1}
                  aria-label="Kurang tiket"
                >
                  -
                </button>
                <span className="qty-value">{form.jumlahTiket}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => handleQtyChange(1)}
                  disabled={form.jumlahTiket >= 5}
                  aria-label="Tambah tiket"
                >
                  +
                </button>
              </div>
            </div>

            {/* RINGKASAN PEMBAYARAN */}
            <div
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.22)",
                padding: "16px 18px",
                borderRadius: "14px",
                marginBottom: "22px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "var(--text-muted)" }}>
                  {form.jumlahTiket}x {quotaData.kategori}
                </span>
                <span style={{ fontWeight: 600 }}>Rp {totalBayar.toLocaleString("id-ID")}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13.5px" }}>
                <span style={{ color: "var(--text-muted)" }}>Biaya Transaksi QRIS</span>
                <span style={{ color: "#34d399", fontWeight: 700 }}>GRATIS (Rp 0)</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  paddingTop: "10px",
                  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                  fontSize: "17px",
                  fontWeight: "bold",
                }}
              >
                <span>Total Tagihan</span>
                <span style={{ color: "#818cf8" }}>Rp {totalBayar.toLocaleString("id-ID")}</span>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Mengunci Kuota Tiket..." : "Lanjut ke Pembayaran QRIS Dinamis ⚡"}
            </button>
          </form>
        </div>

        {/* BENEFIT & SECURITY GUARANTEE CARD */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div className="glass-card">
            <h3 style={{ fontSize: "17px", marginBottom: "14px" }}>🔒 Jaminan Keamanan Sistem 2026</h3>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "12px" }}>
              <li style={{ display: "flex", gap: "10px", fontSize: "13.5px", color: "var(--text-muted)" }}>
                <span style={{ color: "#10b981", fontSize: "16px", fontWeight: 800 }}>✓</span>
                <span>
                  <strong style={{ color: "#fff" }}>Pessimistic Row-Locking:</strong> Tidak ada risiko double-booking
                  meskipun ribuan peserta checkout di detik yang sama.
                </span>
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "13.5px", color: "var(--text-muted)" }}>
                <span style={{ color: "#10b981", fontSize: "16px", fontWeight: 800 }}>✓</span>
                <span>
                  <strong style={{ color: "#fff" }}>QRIS Dinamis Otomatis:</strong> Mendukung semua m-Banking (BCA,
                  Mandiri, BRI) & E-Wallet (GoPay, OVO, ShopeePay, Dana).
                </span>
              </li>
              <li style={{ display: "flex", gap: "10px", fontSize: "13.5px", color: "var(--text-muted)" }}>
                <span style={{ color: "#10b981", fontSize: "16px", fontWeight: 800 }}>✓</span>
                <span>
                  <strong style={{ color: "#fff" }}>UUID v4 Scannable QR:</strong> Barcode unik terenkripsi yang hanya
                  bisa dipindai 1 kali di gerbang masuk.
                </span>
              </li>
            </ul>
          </div>

          <div
            className="glass-card"
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(236, 72, 153, 0.08) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
            }}
          >
            <h3 style={{ fontSize: "15px", marginBottom: "6px" }}>Bantuan & Hotline Tiket</h3>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "10px", lineHeight: "1.5" }}>
              Panitia siap membantu konfirmasi transaksi jika ada pertanyaan sebelum atau saat hari-H.
            </p>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#34d399",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              Hubungi WhatsApp Panitia &rarr;
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
