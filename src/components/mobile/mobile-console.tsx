"use client";

import {
  Camera,
  CheckCircle2,
  ClipboardList,
  MapPinned,
  QrCode,
  Send,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { VoucherScanner } from "@/components/mobile/voucher-scanner";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  distributionPriorityLabel,
  distributionStatusLabel,
  formatDateTime,
  formatTimeRange,
  portionStatusLabel,
} from "@/lib/format";
import type {
  DistributionActivity,
  DistributionNode,
  Merchant,
  Portion,
  UserRole,
  Voucher,
} from "@/lib/types";

type MobileSection = "tasks" | "batch" | "voucher" | "proof";
type TaskFilter = "all" | "urgent" | "queued" | "on-route" | "verified" | "rerouted";

interface MobileConsoleProps {
  actorName: string;
  role: UserRole;
  merchants: Merchant[];
  nodes: DistributionNode[];
  portions: Portion[];
  tasks: DistributionActivity[];
  vouchers: Voucher[];
  defaultPickupStart: string;
  defaultPickupEnd: string;
}

export function MobileConsole({
  actorName,
  role,
  merchants,
  nodes,
  portions,
  tasks,
  vouchers,
  defaultPickupStart,
  defaultPickupEnd,
}: MobileConsoleProps) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<MobileSection>("tasks");
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("all");
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [portionForm, setPortionForm] = useState({
    merchantId: merchants[0]?.id ?? "",
    title: "",
    description: "",
    totalPortions: 10,
    sponsorPrice: 25000,
    pickupStartAt: defaultPickupStart,
    pickupEndAt: defaultPickupEnd,
    assignedNodeId: nodes[0]?.id ?? "",
  });
  const [voucherCode, setVoucherCode] = useState(vouchers[0]?.code ?? "");
  const [proofForm, setProofForm] = useState({
    activityId: tasks[0]?.id ?? "",
    note: "Dokumentasi lapangan diterima dengan kondisi baik.",
    file: null as File | null,
  });

  const clearFlash = () => {
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (proofPreviewUrl) {
        URL.revokeObjectURL(proofPreviewUrl);
      }
    };
  }, [proofPreviewUrl]);

  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "all") {
      return true;
    }

    if (taskFilter === "urgent") {
      return new Date(task.taskDueAt).getTime() - currentTime <= 45 * 60 * 1000;
    }

    return task.status === taskFilter;
  });

  return (
    <div className="mx-auto max-w-md space-y-4 pb-24">
      <header className="glass-panel sticky top-4 z-10 rounded-[28px] px-5 py-4">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--ink-soft)]">
          Aplikasi lapangan
        </p>
        <div className="mt-2 flex items-center justify-between gap-4">
          <div>
            <h1 className="display-font text-2xl font-black tracking-tight text-[var(--foreground)]">
              Tugas lapangan
            </h1>
            <p className="text-sm text-[var(--ink-soft)]">
              {actorName} /{" "}
              {role === "merchant"
                ? "Merchant"
                : role === "admin"
                  ? "Pengelola"
                  : "Petugas"}
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">
            {tasks.length} tugas aktif
          </div>
        </div>
        <nav className="mt-4 grid grid-cols-4 gap-2">
          {[
            ["tasks", "Tugas"],
            ["batch", "Paket"],
            ["voucher", "Voucher"],
            ["proof", "Foto"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                activeSection === value
                  ? "rounded-[18px] bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                  : "rounded-[18px] bg-white/70 px-3 py-2 text-xs font-semibold text-[var(--ink-soft)]"
              }
              onClick={() => {
                clearFlash();
                setActiveSection(value as MobileSection);
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {error ? (
        <p className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {activeSection === "tasks" ? (
      <section className="surface-card rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Tugas yang harus dijalankan
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Perbarui status pengambilan, penyaluran, atau pengalihan langsung dari ponsel.
            </p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          {[
            ["all", "Semua"],
            ["urgent", "Prioritas"],
            ["queued", "Menunggu"],
            ["on-route", "Diantar"],
            ["verified", "Terkonfirmasi"],
            ["rerouted", "Dialihkan"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={
                taskFilter === value
                  ? "rounded-full bg-[var(--foreground)] px-3 py-2 font-semibold text-white"
                  : "rounded-full border border-[var(--line)] px-3 py-2 font-semibold text-[var(--ink-soft)]"
              }
              onClick={() => setTaskFilter(value as TaskFilter)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Tidak ada tugas untuk filter ini.
            </div>
          ) : (
            filteredTasks.map((task) => (
              <article
                key={task.id}
                className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/80"
              >
                {task.routeImageUrl ? (
                  <Image
                    src={task.routeImageUrl}
                    alt={task.locationLabel}
                    width={960}
                    height={540}
                    className="h-36 w-full object-cover"
                  />
                ) : null}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">
                        {task.locationLabel}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-soft)]">
                        Sebelum {formatDateTime(task.taskDueAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <PriorityBadge
                        priority={task.priorityLevel ?? "normal"}
                        label={distributionPriorityLabel(task.priorityLevel ?? "normal")}
                      />
                      <StatusBadge
                        status={task.status}
                        label={distributionStatusLabel(task.status)}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
                    {task.note}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="flex-1 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[var(--foreground)]"
                      disabled={isPending}
                      onClick={() => {
                        clearFlash();
                        startTransition(async () => {
                          const response = await fetch(
                            `/api/distribution/${task.id}/status`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                status: "on-route",
                                actorName,
                              }),
                            },
                          );
                          if (!response.ok) {
                            const data = (await response.json()) as { error?: string };
                            setError(data.error ?? "Gagal memperbarui status tugas.");
                            return;
                          }
                          setSuccess("Status tugas diperbarui menjadi dalam perjalanan.");
                          router.refresh();
                        });
                      }}
                    >
                      Mulai antar
                    </button>
                    <button
                      type="button"
                      className="flex-1 rounded-full bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white"
                      disabled={isPending}
                      onClick={() => {
                        clearFlash();
                        startTransition(async () => {
                          const response = await fetch(
                            `/api/distribution/${task.id}/status`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                status: "verified",
                                actorName,
                              }),
                            },
                          );
                          if (!response.ok) {
                            const data = (await response.json()) as { error?: string };
                            setError(data.error ?? "Gagal menandai tugas.");
                            return;
                          }
                          setSuccess("Tugas ditandai sudah terkonfirmasi.");
                          router.refresh();
                        });
                      }}
                    >
                      Tandai progres
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
      ) : null}

      {activeSection === "batch" ? (
      <section className="surface-card rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <Send className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Tambah paket makanan
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Merchant bisa menambahkan paket baru tanpa keluar dari tampilan seluler.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {role === "admin" ? (
            <select
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={portionForm.merchantId}
              onChange={(event) =>
                setPortionForm((current) => ({
                  ...current,
                  merchantId: event.target.value,
                }))
              }
            >
              {merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </select>
          ) : null}
          {role === "operator" ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Akun petugas lapangan fokus pada voucher dan dokumentasi. Penambahan paket hanya
              tersedia untuk merchant atau pengelola.
            </div>
          ) : null}
          {role !== "operator" ? (
            <>
            <input
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Nama paket makanan"
            value={portionForm.title}
            onChange={(event) =>
              setPortionForm((current) => ({ ...current, title: event.target.value }))
            }
          />
          <textarea
            className="min-h-24 w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            placeholder="Keterangan singkat paket"
            value={portionForm.description}
            onChange={(event) =>
              setPortionForm((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={portionForm.totalPortions}
              onChange={(event) =>
                setPortionForm((current) => ({
                  ...current,
                  totalPortions: Number(event.target.value),
                }))
              }
            />
            <input
              type="number"
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={portionForm.sponsorPrice}
              onChange={(event) =>
                setPortionForm((current) => ({
                  ...current,
                  sponsorPrice: Number(event.target.value),
                }))
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="datetime-local"
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={portionForm.pickupStartAt}
              onChange={(event) =>
                setPortionForm((current) => ({
                  ...current,
                  pickupStartAt: event.target.value,
                }))
              }
            />
            <input
              type="datetime-local"
              className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={portionForm.pickupEndAt}
              onChange={(event) =>
                setPortionForm((current) => ({
                  ...current,
                  pickupEndAt: event.target.value,
                }))
              }
            />
          </div>
          <select
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={portionForm.assignedNodeId}
            onChange={(event) =>
              setPortionForm((current) => ({
                ...current,
                assignedNodeId: event.target.value,
              }))
            }
          >
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
            disabled={isPending}
            onClick={() => {
              clearFlash();
              startTransition(async () => {
                const response = await fetch("/api/portions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(portionForm),
                });
                if (!response.ok) {
                  const data = (await response.json()) as { error?: string };
                  setError(data.error ?? "Gagal menambahkan paket baru.");
                  return;
                }
                setSuccess("Paket baru berhasil ditambahkan.");
                setPortionForm((current) => ({
                  ...current,
                  title: "",
                  description: "",
                }));
                router.refresh();
              });
            }}
          >
            Simpan paket
          </button>
            </>
          ) : null}
        </div>
      </section>
      ) : null}

      {activeSection === "voucher" ? (
      <section className="surface-card rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Scan atau verifikasi voucher
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Gunakan kode voucher untuk menyerahkan paket secara aman dan mudah dicatat.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <VoucherScanner
            onDetect={(code) => {
              clearFlash();
              setVoucherCode(code);
              setSuccess(`QR terbaca. Kode voucher ${code} siap diverifikasi.`);
            }}
          />
          <input
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            placeholder="Contoh: VCR-TEBET-598"
            value={voucherCode}
            onChange={(event) => setVoucherCode(event.target.value.toUpperCase())}
          />
          <div className="grid grid-cols-2 gap-2 text-xs text-[var(--ink-soft)]">
            {vouchers.slice(0, 4).map((voucher) => (
              <button
                key={voucher.id}
                type="button"
                className="rounded-full border border-[var(--line)] px-3 py-2 text-left font-semibold"
                onClick={() => setVoucherCode(voucher.code)}
              >
                {voucher.code}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
            disabled={isPending}
            onClick={() => {
              clearFlash();
              startTransition(async () => {
                const response = await fetch(`/api/vouchers/${voucherCode}/verify`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ actorName }),
                });
                const data = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(data.error ?? "Voucher gagal diverifikasi.");
                  return;
                }
                setSuccess(`Voucher ${voucherCode} berhasil ditebus.`);
                router.refresh();
              });
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            Verifikasi voucher
          </button>
        </div>
      </section>
      ) : null}

      {activeSection === "proof" ? (
      <section className="surface-card rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Unggah foto penyaluran
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Dokumentasikan pengambilan atau penyaluran untuk laporan.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <select
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={proofForm.activityId}
            onChange={(event) =>
              setProofForm((current) => ({ ...current, activityId: event.target.value }))
            }
          >
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.locationLabel}
              </option>
            ))}
          </select>
          <textarea
            className="min-h-24 w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={proofForm.note}
            onChange={(event) =>
              setProofForm((current) => ({ ...current, note: event.target.value }))
            }
          />
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;

              if (proofPreviewUrl) {
                URL.revokeObjectURL(proofPreviewUrl);
              }

              setProofPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : null);
              setProofForm((current) => ({
                ...current,
                file: nextFile,
              }));
            }}
            className="block w-full text-sm text-[var(--ink-soft)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--brand)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          {proofPreviewUrl ? (
            <div className="overflow-hidden rounded-[24px] border border-[var(--line)]">
              <Image
                src={proofPreviewUrl}
                alt="Preview bukti operasional"
                width={960}
                height={720}
                className="h-44 w-full object-cover"
                unoptimized
              />
            </div>
          ) : null}
          <button
            type="button"
            className="w-full rounded-full bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
            disabled={isPending}
            onClick={() => {
              clearFlash();
              startTransition(async () => {
                if (!proofForm.file) {
                  setError("Pilih foto bukti terlebih dahulu.");
                  return;
                }

                const formData = new FormData();
                formData.append("activityId", proofForm.activityId);
                formData.append("actorName", actorName);
                formData.append("note", proofForm.note);
                formData.append("file", proofForm.file);

                const response = await fetch("/api/distribution/proof", {
                  method: "POST",
                  body: formData,
                });

                const data = (await response.json()) as { error?: string };
                if (!response.ok) {
                  setError(data.error ?? "Upload bukti gagal.");
                  return;
                }
                setSuccess("Foto penyaluran berhasil diunggah.");
                router.refresh();
              });
            }}
          >
            Unggah foto
          </button>
        </div>
      </section>
      ) : null}

      {activeSection === "batch" ? (
      <section className="surface-card rounded-[28px] p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-indigo-100 p-3 text-indigo-700">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Paket yang dipantau
            </p>
            <p className="text-xs text-[var(--ink-soft)]">
              Ringkasan paket yang perlu dipantau saat penyaluran berjalan.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {portions.slice(0, 4).map((portion) => (
            <article
              key={portion.id}
              className="overflow-hidden rounded-[24px] border border-[var(--line)] bg-white/80"
            >
              <Image
                src={portion.imageUrl ?? "/images/food-package.png"}
                alt={portion.title}
                width={720}
                height={520}
                className="h-36 w-full object-cover"
              />
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {portion.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-soft)]">
                      Ambil {formatTimeRange(portion.pickupStartAt, portion.pickupEndAt)}
                    </p>
                  </div>
                  <StatusBadge
                    status={portion.status}
                    label={portionStatusLabel(portion.status)}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-[var(--ink-soft)]">
                    Sisa {portion.availablePortions} porsi
                  </span>
                  <span className="font-semibold text-[var(--foreground)]">
                    Tersalurkan {portion.distributedPortions}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      ) : null}

      <nav className="glass-panel fixed inset-x-4 bottom-4 mx-auto flex max-w-md items-center justify-between rounded-full px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-soft)]">
          Relay
        </span>
        <div className="flex items-center gap-3 text-xs text-[var(--ink-soft)]">
          <span>{tasks.length} tugas</span>
          <span>·</span>
          <span>{vouchers.length} voucher</span>
          <span>·</span>
          <span>{portions.length} paket</span>
        </div>
      </nav>
    </div>
  );
}
