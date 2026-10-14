import cors from "cors";
import express, { Request, Response } from "express";
import { TransactionService } from "./modules/transactions/transaction.service";
import { MidtransPaymentService } from "./modules/payments/midtrans.service";
import { ScannerService } from "./modules/checkin/scanner.service";
import { ReportService } from "./modules/reports/report.service";

export const app = express();

app.use(
  cors({
    origin: process.env.WEB_ORIGIN ?? "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// -----------------------------------------------------------------------------
// HEALTH CHECK
// -----------------------------------------------------------------------------
app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "eticket-api-2026",
  });
});

// -----------------------------------------------------------------------------
// 1. INFO KUOTA & EVENT
// -----------------------------------------------------------------------------
app.get("/api/quota", async (_req: Request, res: Response) => {
  try {
    const quota = await TransactionService.getQuotaInfo();
    res.json({ success: true, data: quota });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 2. GUEST CHECKOUT (PESSIMISTIC LOCKING)
// -----------------------------------------------------------------------------
app.post("/api/checkout", async (req: Request, res: Response) => {
  try {
    const { nama, email, noWhatsapp, jumlahTiket, kuotaId } = req.body;
    const result = await TransactionService.checkoutGuest({
      nama,
      email,
      noWhatsapp,
      jumlahTiket: Number(jumlahTiket),
      kuotaId: kuotaId ? Number(kuotaId) : 1,
    });

    res.status(201).json({
      success: true,
      message: "Checkout berhasil dibuat. Menunggu pembayaran QRIS.",
      data: result,
    });
  } catch (error: any) {
    console.error("[Checkout Error]", error);
    const isConflict = error.message?.includes("tidak mencukupi");
    res.status(isConflict ? 409 : 400).json({
      success: false,
      error: error.message || "Gagal memproses checkout",
    });
  }
});

// -----------------------------------------------------------------------------
// 3. STATUS TRANSAKSI & DETAIL TIKET
// -----------------------------------------------------------------------------
app.get("/api/transactions/:id", async (req: Request, res: Response) => {
  try {
    const trx = await TransactionService.getTransactionStatus(String(req.params.id));
    res.json({ success: true, data: trx });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

app.get("/api/tickets/:uuid", async (req: Request, res: Response) => {
  try {
    const ticket = await TransactionService.getTicketById(String(req.params.uuid));
    res.json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 4. MIDTRANS QRIS WEBHOOK CALLBACK
// -----------------------------------------------------------------------------
app.post("/api/payments/webhook", async (req: Request, res: Response) => {
  try {
    const notification = req.body;
    console.log("[Midtrans Webhook Received]:", notification);

    const orderId = notification.order_id;
    const statusCode = notification.status_code;
    const grossAmount = notification.gross_amount;
    const signatureKey = notification.signature_key;
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;

    // Verifikasi Keaslian Signature
    const isValid = MidtransPaymentService.verifySignature(
      orderId,
      statusCode,
      grossAmount,
      signatureKey
    );

    if (!isValid) {
      console.warn("[Webhook Warning] Tanda tangan signature Midtrans tidak valid!");
      return res.status(403).json({ message: "Invalid signature" });
    }

    // Status QRIS Midtrans sukses: 'settlement' atau ('capture' dan fraud 'accept')
    const isSuccess =
      transactionStatus === "settlement" ||
      (transactionStatus === "capture" && fraudStatus === "accept");

    if (isSuccess) {
      await TransactionService.confirmPaymentAndIssueTickets(
        orderId,
        notification.transaction_id
      );
      console.log(`[Webhook Success] Pembayaran untuk ${orderId} terverifikasi lunas.`);
    }

    res.status(200).json({ status: "OK" });
  } catch (error: any) {
    console.error("[Webhook Error]:", error);
    res.status(500).json({ status: "Error", message: error.message });
  }
});

// Endpoint Pembantu Testing: Simulasi Pembayaran QRIS Berhasil (Development)
app.post("/api/payments/simulate-success/:id", async (req: Request, res: Response) => {
  try {
    const result = await TransactionService.confirmPaymentAndIssueTickets(
      String(req.params.id),
      `SIM-${Date.now()}`
    );
    res.json({
      success: true,
      message: "Simulasi pembayaran QRIS berhasil. Tiket telah diterbitkan!",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// 5. VALIDASI SCAN CHECK-IN (QR SCANNER)
// -----------------------------------------------------------------------------
app.post("/api/scan", async (req: Request, res: Response) => {
  try {
    const { ticketUuid, scannedBy } = req.body;

    if (!ticketUuid) {
      return res.status(400).json({
        success: false,
        error: "ticketUuid wajib disertakan dalam request body",
      });
    }

    const result = await ScannerService.validateAndCheckIn(
      ticketUuid,
      scannedBy || "Panitia Gate"
    );

    const httpStatus =
      result.status === "VALID"
        ? 200
        : result.status === "ALREADY_SCANNED"
        ? 409
        : 404;

    res.status(httpStatus).json({
      success: result.status === "VALID",
      ...result,
    });
  } catch (error: any) {
    console.error("[Scan Error]", error);
    res.status(500).json({
      success: false,
      status: "ERROR",
      pesan: error.message || "Gagal memproses validasi tiket",
    });
  }
});

// -----------------------------------------------------------------------------
// 6. EXPORT EXCEL BACKUP UNTUK PANITIA
// -----------------------------------------------------------------------------
app.get("/api/reports/export-excel", async (_req: Request, res: Response) => {
  try {
    const excelBuffer = await ReportService.generateExcelBackup();
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Backup_Etiket_Acara_${timestamp}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error: any) {
    console.error("[Export Error]", error);
    res.status(500).json({
      success: false,
      error: error.message || "Gagal membuat file export Excel",
    });
  }
});
