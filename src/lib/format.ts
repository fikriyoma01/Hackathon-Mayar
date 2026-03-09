import type {
  ApprovalActionType,
  ApprovalStatus,
  DistributionPriority,
  DistributionStatus,
  PortionStatus,
  TransactionStatus,
  UserRole,
  VoucherStatus,
} from "@/lib/types";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("id-ID");

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatNumber(value: number) {
  return compactFormatter.format(value);
}

export function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  return `${startDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${endDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function roleLabel(role: UserRole) {
  switch (role) {
    case "admin":
      return "Pengelola pusat";
    case "merchant":
      return "Merchant";
    case "operator":
      return "Petugas lapangan";
  }
}

export function portionStatusLabel(status: PortionStatus) {
  switch (status) {
    case "available":
      return "Tersedia";
    case "sponsored":
      return "Sudah didukung";
    case "distributing":
      return "Sedang disalurkan";
    case "rerouted":
      return "Dialihkan";
    case "completed":
      return "Selesai";
  }
}

export function transactionStatusLabel(status: TransactionStatus) {
  switch (status) {
    case "pending":
      return "Menunggu pembayaran";
    case "paid":
      return "Lunas";
    case "failed":
      return "Gagal";
    case "expired":
      return "Kedaluwarsa";
  }
}

export function voucherStatusLabel(status: VoucherStatus) {
  switch (status) {
    case "active":
      return "Aktif";
    case "redeemed":
      return "Sudah digunakan";
    case "rerouted":
      return "Dialihkan";
    case "expired":
      return "Kedaluwarsa";
  }
}

export function distributionStatusLabel(status: DistributionStatus) {
  switch (status) {
    case "queued":
      return "Menunggu diambil";
    case "on-route":
      return "Dalam perjalanan";
    case "verified":
      return "Terverifikasi";
    case "completed":
      return "Selesai";
    case "rerouted":
      return "Dialihkan";
  }
}

export function distributionPriorityLabel(priority: DistributionPriority) {
  switch (priority) {
    case "critical":
      return "Sangat tinggi";
    case "high":
      return "Tinggi";
    case "normal":
      return "Normal";
  }
}

export function approvalStatusLabel(status: ApprovalStatus) {
  switch (status) {
    case "pending":
      return "Menunggu persetujuan";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
  }
}

export function approvalActionLabel(action: ApprovalActionType) {
  switch (action) {
    case "portion-status":
      return "Perubahan status paket";
    case "distribution-reroute":
      return "Pengalihan penyaluran";
  }
}
