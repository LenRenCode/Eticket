import { v4 as uuidv4 } from "uuid";

export interface KuotaRecord {
  id: number;
  nama_event: string;
  kategori: string;
  harga: number;
  total_kuota: number;
  kuota_terjual: number;
  kuota_terpesan: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PembeliRecord {
  id: string;
  nama: string;
  email: string;
  no_whatsapp: string;
  created_at: Date;
  updated_at: Date;
}

export interface TransaksiRecord {
  id: string;
  kode_transaksi: string;
  pembeli_id: string;
  kuota_id: number;
  jumlah_tiket: number;
  harga_satuan: number;
  total_bayar: number;
  status_pembayaran: "PENDING" | "PAID" | "FAILED" | "EXPIRED";
  gateway_order_id: string | null;
  qris_payload: string | null;
  qris_url: string | null;
  expired_at: Date;
  paid_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TiketRecord {
  id: string;
  transaksi_id: string;
  kode_tiket: string;
  status_kehadiran: "AVAILABLE" | "SCANNED";
  waktu_scan: Date | null;
  scanned_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// In-Memory Tables
const kuotaTable: KuotaRecord[] = [
  {
    id: 1,
    nama_event: "2026 Grand Tech & Music Fest",
    kategori: "VIP Festival",
    harga: 250000,
    total_kuota: 300,
    kuota_terjual: 0,
    kuota_terpesan: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  },
];

const pembeliTable: PembeliRecord[] = [];
const transaksiTable: TransaksiRecord[] = [];
const tiketTable: TiketRecord[] = [];

// Mutex sederhana untuk Pessimistic Locking di level memory
let memoryLock = Promise.resolve();
export async function withMemoryLock<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void;
  const waitLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const prevLock = memoryLock;
  memoryLock = waitLock;
  await prevLock;
  try {
    return await fn();
  } finally {
    release!();
  }
}

export async function executeMemoryQuery(
  sql: string,
  params: any[] = []
): Promise<{ rows: any[] }> {
  const normalizedSql = sql.replace(/\s+/g, " ").trim();

  // 1. BEGIN / COMMIT / ROLLBACK
  if (
    normalizedSql === "BEGIN" ||
    normalizedSql === "COMMIT" ||
    normalizedSql === "ROLLBACK"
  ) {
    return { rows: [] };
  }

  // 2. getQuotaInfo: SELECT ... FROM kuota_tiket WHERE id = $1 AND is_active = TRUE
  if (
    normalizedSql.includes("FROM kuota_tiket") &&
    normalizedSql.includes("sisaKuota")
  ) {
    const kuotaId = Number(params[0] ?? 1);
    const k = kuotaTable.find((x) => x.id === kuotaId && x.is_active);
    if (!k) return { rows: [] };
    return {
      rows: [
        {
          id: k.id,
          namaEvent: k.nama_event,
          kategori: k.kategori,
          harga: k.harga,
          totalKuota: k.total_kuota,
          kuotaTerjual: k.kuota_terjual,
          kuotaTerpesan: k.kuota_terpesan,
          sisaKuota: k.total_kuota - k.kuota_terjual - k.kuota_terpesan,
        },
      ],
    };
  }

  // 3. Pessimistic Lock Kuota: SELECT ... FROM kuota_tiket WHERE id = $1 AND is_active = TRUE FOR UPDATE
  if (
    normalizedSql.includes("FROM kuota_tiket") &&
    normalizedSql.includes("FOR UPDATE") &&
    normalizedSql.includes("sisa_kuota")
  ) {
    const kuotaId = Number(params[0] ?? 1);
    const k = kuotaTable.find((x) => x.id === kuotaId && x.is_active);
    if (!k) return { rows: [] };
    return {
      rows: [
        {
          id: k.id,
          nama_event: k.nama_event,
          kategori: k.kategori,
          harga: String(k.harga),
          total_kuota: k.total_kuota,
          kuota_terjual: k.kuota_terjual,
          kuota_terpesan: k.kuota_terpesan,
          sisa_kuota: k.total_kuota - k.kuota_terjual - k.kuota_terpesan,
        },
      ],
    };
  }

  // 4. Update Kuota Terpesan (Hold): UPDATE kuota_tiket SET kuota_terpesan = kuota_terpesan + $1
  if (
    normalizedSql.includes("UPDATE kuota_tiket") &&
    normalizedSql.includes("kuota_terpesan + $1")
  ) {
    const qty = Number(params[0]);
    const kuotaId = Number(params[1]);
    const k = kuotaTable.find((x) => x.id === kuotaId);
    if (k) {
      k.kuota_terpesan += qty;
      k.updated_at = new Date();
    }
    return { rows: [] };
  }

  // 5. Insert Pembeli: INSERT INTO pembeli (nama, email, no_whatsapp) VALUES ($1, $2, $3) RETURNING id
  if (normalizedSql.includes("INSERT INTO pembeli")) {
    const id = uuidv4();
    pembeliTable.push({
      id,
      nama: String(params[0]),
      email: String(params[1]),
      no_whatsapp: String(params[2]),
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { rows: [{ id }] };
  }

  // 6. Insert Transaksi PENDING: INSERT INTO transaksi
  if (normalizedSql.includes("INSERT INTO transaksi")) {
    const id = uuidv4();
    const trxRecord: TransaksiRecord = {
      id,
      kode_transaksi: String(params[0]),
      pembeli_id: String(params[1]),
      kuota_id: Number(params[2]),
      jumlah_tiket: Number(params[3]),
      harga_satuan: Number(params[4]),
      total_bayar: Number(params[5]),
      status_pembayaran: "PENDING",
      gateway_order_id: params[6] ? String(params[6]) : null,
      qris_payload: params[7] ? String(params[7]) : null,
      qris_url: params[8] ? String(params[8]) : null,
      expired_at:
        params[9] instanceof Date ? params[9] : new Date(params[9]),
      paid_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    transaksiTable.push(trxRecord);
    return {
      rows: [
        {
          id: trxRecord.id,
          kode_transaksi: trxRecord.kode_transaksi,
          total_bayar: trxRecord.total_bayar,
          jumlah_tiket: trxRecord.jumlah_tiket,
          expired_at: trxRecord.expired_at,
          qris_payload: trxRecord.qris_payload,
          qris_url: trxRecord.qris_url,
        },
      ],
    };
  }

  // 7. Lock baris Transaksi untuk konfirmasi pembayaran
  if (
    normalizedSql.includes("FROM transaksi t") &&
    normalizedSql.includes("FOR UPDATE OF t")
  ) {
    const target = String(params[0]);
    const trx = transaksiTable.find(
      (t) =>
        t.id === target ||
        t.kode_transaksi === target ||
        t.gateway_order_id === target
    );
    if (!trx) return { rows: [] };
    const buyer = pembeliTable.find((p) => p.id === trx.pembeli_id);
    return {
      rows: [
        {
          id: trx.id,
          kode_transaksi: trx.kode_transaksi,
          pembeli_id: trx.pembeli_id,
          kuota_id: trx.kuota_id,
          jumlah_tiket: trx.jumlah_tiket,
          total_bayar: trx.total_bayar,
          status_pembayaran: trx.status_pembayaran,
          pembeli_nama: buyer?.nama || "Tamu",
          pembeli_email: buyer?.email || "",
          pembeli_phone: buyer?.no_whatsapp || "",
        },
      ],
    };
  }

  // 8. SELECT id FROM kuota_tiket WHERE id = $1 FOR UPDATE
  if (
    normalizedSql.includes("FROM kuota_tiket") &&
    normalizedSql.includes("FOR UPDATE") &&
    !normalizedSql.includes("sisa_kuota")
  ) {
    const k = kuotaTable.find((x) => x.id === Number(params[0]));
    return { rows: k ? [{ id: k.id }] : [] };
  }

  // 9. Update Kuota setelah bayar: SET kuota_terpesan = GREATEST(0, kuota_terpesan - $1), kuota_terjual = kuota_terjual + $1
  if (
    normalizedSql.includes("UPDATE kuota_tiket") &&
    normalizedSql.includes("kuota_terjual = kuota_terjual + $1")
  ) {
    const qty = Number(params[0]);
    const kuotaId = Number(params[1]);
    const k = kuotaTable.find((x) => x.id === kuotaId);
    if (k) {
      k.kuota_terpesan = Math.max(0, k.kuota_terpesan - qty);
      k.kuota_terjual += qty;
      k.updated_at = new Date();
    }
    return { rows: [] };
  }

  // 10. Update status transaksi PAID: SET status_pembayaran = 'PAID'
  if (
    normalizedSql.includes("UPDATE transaksi") &&
    normalizedSql.includes("status_pembayaran = 'PAID'")
  ) {
    const gwId = params[0] ? String(params[0]) : null;
    const tId = String(params[1]);
    const trx = transaksiTable.find((t) => t.id === tId);
    if (trx) {
      trx.status_pembayaran = "PAID";
      trx.paid_at = new Date();
      if (gwId) trx.gateway_order_id = gwId;
      trx.updated_at = new Date();
    }
    return { rows: [] };
  }

  // 11. Insert Tiket: INSERT INTO tiket
  if (normalizedSql.includes("INSERT INTO tiket")) {
    tiketTable.push({
      id: String(params[0]),
      transaksi_id: String(params[1]),
      kode_tiket: String(params[2]),
      status_kehadiran: "AVAILABLE",
      waktu_scan: null,
      scanned_by: null,
      created_at: new Date(),
      updated_at: new Date(),
    });
    return { rows: [] };
  }

  // 12. SELECT tiket WHERE transaksi_id = $1
  if (
    normalizedSql.includes("FROM tiket") &&
    normalizedSql.includes("transaksi_id = $1")
  ) {
    const list = tiketTable
      .filter((t) => t.transaksi_id === String(params[0]))
      .map((t) => ({
        id: t.id,
        kodeTiket: t.kode_tiket,
        kode_tiket: t.kode_tiket,
        statusKehadiran: t.status_kehadiran,
        status_kehadiran: t.status_kehadiran,
        waktuScan: t.waktu_scan,
      }));
    return { rows: list };
  }

  // 13. getTransactionStatus: Detail transaksi untuk layar payment & tiket
  if (
    normalizedSql.includes("FROM transaksi t") &&
    normalizedSql.includes("JOIN kuota_tiket k")
  ) {
    const target = String(params[0]);
    const trx = transaksiTable.find(
      (t) => t.id === target || t.kode_transaksi === target
    );
    if (!trx) return { rows: [] };
    const buyer = pembeliTable.find((p) => p.id === trx.pembeli_id);
    const k = kuotaTable.find((x) => x.id === trx.kuota_id);
    return {
      rows: [
        {
          transaksiId: trx.id,
          kodeTransaksi: trx.kode_transaksi,
          statusPembayaran: trx.status_pembayaran,
          totalBayar: trx.total_bayar,
          jumlahTiket: trx.jumlah_tiket,
          qrisPayload: trx.qris_payload,
          qrisUrl: trx.qris_url,
          expiredAt: trx.expired_at,
          paidAt: trx.paid_at,
          namaPembeli: buyer?.nama || "Tamu",
          email: buyer?.email || "",
          noWhatsapp: buyer?.no_whatsapp || "",
          namaEvent: k?.nama_event || "2026 Grand Tech & Music Fest",
          kategori: k?.kategori || "VIP Festival",
        },
      ],
    };
  }

  // 14. Scanner: SELECT ... FROM tiket t JOIN transaksi tr ... FOR UPDATE OF t
  if (
    normalizedSql.includes("FROM tiket t") &&
    normalizedSql.includes("FOR UPDATE OF t")
  ) {
    const ticketId = String(params[0]);
    const ticket = tiketTable.find((t) => t.id === ticketId);
    if (!ticket) return { rows: [] };
    const trx = transaksiTable.find((tr) => tr.id === ticket.transaksi_id);
    const buyer = trx ? pembeliTable.find((p) => p.id === trx.pembeli_id) : null;
    const k = trx ? kuotaTable.find((x) => x.id === trx.kuota_id) : null;
    return {
      rows: [
        {
          id: ticket.id,
          kode_tiket: ticket.kode_tiket,
          status_kehadiran: ticket.status_kehadiran,
          waktu_scan: ticket.waktu_scan,
          scanned_by: ticket.scanned_by,
          status_pembayaran: trx?.status_pembayaran || "PENDING",
          nama_pembeli: buyer?.nama || "Tamu",
          nama_event: k?.nama_event || "2026 Grand Tech & Music Fest",
          kategori: k?.kategori || "VIP Festival",
        },
      ],
    };
  }

  // 15. getTicketById: Detail satu tiket perorangan
  if (
    normalizedSql.includes("FROM tiket t") &&
    normalizedSql.includes("WHERE t.id = $1")
  ) {
    const ticketId = String(params[0]);
    const ticket = tiketTable.find((t) => t.id === ticketId);
    if (!ticket) return { rows: [] };
    const trx = transaksiTable.find((tr) => tr.id === ticket.transaksi_id);
    const buyer = trx ? pembeliTable.find((p) => p.id === trx.pembeli_id) : null;
    const k = trx ? kuotaTable.find((x) => x.id === trx.kuota_id) : null;
    return {
      rows: [
        {
          id: ticket.id,
          kodeTiket: ticket.kode_tiket,
          statusKehadiran: ticket.status_kehadiran,
          waktuScan: ticket.waktu_scan,
          kodeTransaksi: trx?.kode_transaksi || "",
          paidAt: trx?.paid_at || null,
          namaPembeli: buyer?.nama || "Tamu",
          email: buyer?.email || "",
          noWhatsapp: buyer?.no_whatsapp || "",
          namaEvent: k?.nama_event || "2026 Grand Tech & Music Fest",
          kategori: k?.kategori || "VIP Festival",
        },
      ],
    };
  }

  // 16. Scanner update: UPDATE tiket SET status_kehadiran = 'SCANNED'
  if (
    normalizedSql.includes("UPDATE tiket") &&
    normalizedSql.includes("status_kehadiran = 'SCANNED'")
  ) {
    const ticketId = String(params[0]);
    const staff = String(params[1]);
    const ticket = tiketTable.find((t) => t.id === ticketId);
    const now = new Date();
    if (ticket) {
      ticket.status_kehadiran = "SCANNED";
      ticket.waktu_scan = now;
      ticket.scanned_by = staff;
      ticket.updated_at = now;
    }
    return { rows: [{ waktu_scan: now }] };
  }

  // 17. Excel Report query
  if (
    normalizedSql.includes("FROM transaksi tr") &&
    normalizedSql.includes("LEFT JOIN tiket t")
  ) {
    const rows: any[] = [];
    for (const tr of transaksiTable) {
      const p = pembeliTable.find((x) => x.id === tr.pembeli_id);
      const k = kuotaTable.find((x) => x.id === tr.kuota_id);
      const tickets = tiketTable.filter((t) => t.transaksi_id === tr.id);

      if (tickets.length === 0) {
        rows.push({
          "Kode Transaksi": tr.kode_transaksi,
          "Waktu Transaksi": tr.created_at,
          "Status Pembayaran": tr.status_pembayaran,
          "Nama Pembeli": p?.nama || "Tamu",
          Email: p?.email || "-",
          WhatsApp: p?.no_whatsapp || "-",
          "Nama Event": k?.nama_event || "2026 Grand Tech & Music Fest",
          Kategori: k?.kategori || "VIP Festival",
          "Kode Tiket": "-",
          "UUID QR Code (Scan String)": "-",
          "Status Kehadiran": "BELUM TERBIT",
          "Waktu Check-In": "-",
          "Petugas Gate": "-",
          "Total Bayar (IDR)": tr.total_bayar,
        });
      } else {
        for (const t of tickets) {
          rows.push({
            "Kode Transaksi": tr.kode_transaksi,
            "Waktu Transaksi": tr.created_at,
            "Status Pembayaran": tr.status_pembayaran,
            "Nama Pembeli": p?.nama || "Tamu",
            Email: p?.email || "-",
            WhatsApp: p?.no_whatsapp || "-",
            "Nama Event": k?.nama_event || "2026 Grand Tech & Music Fest",
            Kategori: k?.kategori || "VIP Festival",
            "Kode Tiket": t.kode_tiket,
            "UUID QR Code (Scan String)": t.id,
            "Status Kehadiran": t.status_kehadiran,
            "Waktu Check-In": t.waktu_scan ? t.waktu_scan.toISOString() : "-",
            "Petugas Gate": t.scanned_by || "-",
            "Total Bayar (IDR)": tr.total_bayar,
          });
        }
      }
    }
    return { rows };
  }

  return { rows: [] };
}
