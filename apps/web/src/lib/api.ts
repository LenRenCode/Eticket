const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.pesan || `HTTP error ${res.status}`);
  }

  return data;
}

export const api = {
  getQuota: () => fetchApi("/api/quota"),
  checkout: (payload: {
    nama: string;
    email: string;
    noWhatsapp: string;
    jumlahTiket: number;
    kuotaId?: number;
  }) =>
    fetchApi("/api/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTransaction: (id: string) => fetchApi(`/api/transactions/${id}`),
  getTicket: (uuid: string) => fetchApi(`/api/tickets/${uuid}`),
  simulateSuccess: (id: string) =>
    fetchApi(`/api/payments/simulate-success/${id}`, { method: "POST" }),
  scanTicket: (ticketUuid: string, scannedBy?: string) =>
    fetchApi("/api/scan", {
      method: "POST",
      body: JSON.stringify({ ticketUuid, scannedBy }),
    }),
  getExportExcelUrl: () => `${API_BASE_URL}/api/reports/export-excel`,
};
