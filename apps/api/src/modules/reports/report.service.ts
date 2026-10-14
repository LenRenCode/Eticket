import * as XLSX from "xlsx";
import { pool } from "../db";

export class ReportService {
  /**
   * Menghasilkan Buffer file Excel (.xlsx) dari seluruh transaksi dan tiket di PostgreSQL
   * sebagai backup offline panitia pada hari H acara.
   */
  static async generateExcelBackup(): Promise<Buffer> {
    const query = `
      SELECT 
        tr.kode_transaksi AS "Kode Transaksi",
        tr.created_at AS "Waktu Transaksi",
        tr.status_pembayaran AS "Status Pembayaran",
        p.nama AS "Nama Pembeli",
        p.email AS "Email",
        p.no_whatsapp AS "WhatsApp",
        k.nama_event AS "Nama Event",
        k.kategori AS "Kategori",
        COALESCE(t.kode_tiket, '-') AS "Kode Tiket",
        COALESCE(t.id::text, '-') AS "UUID QR Code (Scan String)",
        COALESCE(t.status_kehadiran::text, 'BELUM TERBIT') AS "Status Kehadiran",
        t.waktu_scan AS "Waktu Check-In",
        t.scanned_by AS "Petugas Gate",
        tr.total_bayar::numeric AS "Total Bayar (IDR)"
      FROM transaksi tr
      JOIN pembeli p ON tr.pembeli_id = p.id
      JOIN kuota_tiket k ON tr.kuota_id = k.id
      LEFT JOIN tiket t ON tr.id = t.transaksi_id
      ORDER BY tr.created_at DESC, t.kode_tiket ASC;
    `;

    const res = await pool.query(query);
    const rows = res.rows;

    // Hitung ringkasan statistik
    const totalTransaksi = rows.length;
    const transaksiLunas = rows.filter(
      (r) => r["Status Pembayaran"] === "PAID"
    ).length;
    const tiketHadir = rows.filter(
      (r) => r["Status Kehadiran"] === "SCANNED"
    ).length;
    const totalTiketTerbit = rows.filter(
      (r) => r["Kode Tiket"] !== "-"
    ).length;

    // Buat Workbook baru
    const wb = XLSX.utils.book_new();

    // Sheet 1: Master Data Check-in
    const wsMaster = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, wsMaster, "Master Data Tiket");

    // Sheet 2: Ringkasan
    const summaryData = [
      { Parameter: "Total Transaksi Tercatat", Nilai: totalTransaksi },
      { Parameter: "Transaksi Terkonfirmasi (PAID)", Nilai: transaksiLunas },
      { Parameter: "Total Tiket Diterbitkan", Nilai: totalTiketTerbit },
      { Parameter: "Total Peserta Hadir (Scanned)", Nilai: tiketHadir },
      {
        Parameter: "Tingkat Kehadiran (Attendance Rate)",
        Nilai:
          totalTiketTerbit > 0
            ? `${((tiketHadir / totalTiketTerbit) * 100).toFixed(1)}%`
            : "0%",
      },
      {
        Parameter: "Waktu Ekspor Dibuat",
        Nilai: new Date().toLocaleString("id-ID"),
      },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan Acara");

    // Konversi ke Buffer format XLSX
    const excelBuffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    return excelBuffer;
  }
}
