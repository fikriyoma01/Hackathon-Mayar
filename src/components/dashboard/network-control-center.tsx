"use client";

import { Building2, MapPinned, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

const merchantImageOptions = [
  "/images/merchant.png",
  "/images/food-package.png",
  "/images/charity-box.png",
];

const nodeImageOptions = [
  "/images/mosque.png",
  "/images/charity-box.png",
  "/images/delivery-map.png",
];

export function NetworkControlCenter() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [merchantForm, setMerchantForm] = useState({
    name: "",
    ownerName: "",
    area: "",
    phone: "",
    etaMinutes: 15,
    specialty: "",
    imageUrl: merchantImageOptions[0],
  });
  const [nodeForm, setNodeForm] = useState({
    name: "",
    type: "masjid" as "masjid" | "komunitas",
    area: "",
    contactName: "",
    contactPhone: "",
    imageUrl: nodeImageOptions[0],
  });

  const clearFlash = () => {
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Tambah merchant</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Tambahkan merchant baru agar paket bantuan bisa langsung masuk ke alur yang sama.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Nama merchant"
              value={merchantForm.name}
              onChange={(event) =>
                setMerchantForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Nama pemilik"
              value={merchantForm.ownerName}
              onChange={(event) =>
                setMerchantForm((current) => ({
                  ...current,
                  ownerName: event.target.value,
                }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Area layanan"
              value={merchantForm.area}
              onChange={(event) =>
                setMerchantForm((current) => ({ ...current, area: event.target.value }))
              }
            />
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Nomor telepon"
              value={merchantForm.phone}
              onChange={(event) =>
                setMerchantForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Keunggulan menu"
              value={merchantForm.specialty}
              onChange={(event) =>
                setMerchantForm((current) => ({
                  ...current,
                  specialty: event.target.value,
                }))
              }
            />
            <input
              type="number"
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={merchantForm.etaMinutes}
              onChange={(event) =>
                setMerchantForm((current) => ({
                  ...current,
                  etaMinutes: Number(event.target.value),
                }))
              }
            />
          </div>
          <select
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={merchantForm.imageUrl}
            onChange={(event) =>
              setMerchantForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
          >
            {merchantImageOptions.map((imageUrl) => (
              <option key={imageUrl} value={imageUrl}>
                Gambar merchant: {imageUrl.split("/").pop()}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              clearFlash();
              startTransition(async () => {
                const response = await fetch("/api/merchants", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(merchantForm),
                });
                const data = (await response.json()) as { error?: string };

                if (!response.ok) {
                  setError(data.error ?? "Gagal menambahkan merchant.");
                  return;
                }

                setSuccess("Merchant baru berhasil ditambahkan.");
                setMerchantForm({
                  name: "",
                  ownerName: "",
                  area: "",
                  phone: "",
                  etaMinutes: 15,
                  specialty: "",
                  imageUrl: merchantImageOptions[0],
                });
                router.refresh();
              });
            }}
          >
            <Plus className="h-4 w-4" />
            {isPending ? "Menyimpan..." : "Tambah merchant"}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
            <MapPinned className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Tambah lokasi penyaluran</p>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">
              Lokasi baru langsung tersedia untuk penyaluran, pengambilan, dan pengalihan di dashboard.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Nama lokasi"
              value={nodeForm.name}
              onChange={(event) =>
                setNodeForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <select
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              value={nodeForm.type}
              onChange={(event) =>
                setNodeForm((current) => ({
                  ...current,
                  type: event.target.value as "masjid" | "komunitas",
                }))
              }
            >
              <option value="masjid">Masjid</option>
              <option value="komunitas">Komunitas</option>
            </select>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="Area lokasi"
              value={nodeForm.area}
              onChange={(event) =>
                setNodeForm((current) => ({ ...current, area: event.target.value }))
              }
            />
            <input
              className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
              placeholder="PIC / kontak"
              value={nodeForm.contactName}
              onChange={(event) =>
                setNodeForm((current) => ({
                  ...current,
                  contactName: event.target.value,
                }))
              }
            />
          </div>
          <input
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            placeholder="Nomor telepon PIC"
            value={nodeForm.contactPhone}
            onChange={(event) =>
              setNodeForm((current) => ({
                ...current,
                contactPhone: event.target.value,
              }))
            }
          />
          <select
            className="w-full rounded-[20px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
            value={nodeForm.imageUrl}
            onChange={(event) =>
              setNodeForm((current) => ({ ...current, imageUrl: event.target.value }))
            }
          >
            {nodeImageOptions.map((imageUrl) => (
              <option key={imageUrl} value={imageUrl}>
                Gambar lokasi: {imageUrl.split("/").pop()}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              clearFlash();
              startTransition(async () => {
                const response = await fetch("/api/nodes", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(nodeForm),
                });
                const data = (await response.json()) as { error?: string };

                if (!response.ok) {
                  setError(data.error ?? "Gagal menambahkan lokasi penyaluran.");
                  return;
                }

                setSuccess("Lokasi penyaluran baru berhasil ditambahkan.");
                setNodeForm({
                  name: "",
                  type: "masjid",
                  area: "",
                  contactName: "",
                  contactPhone: "",
                  imageUrl: nodeImageOptions[0],
                });
                router.refresh();
              });
            }}
          >
            <Plus className="h-4 w-4" />
            {isPending ? "Menyimpan..." : "Tambah lokasi"}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 xl:col-span-2">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 xl:col-span-2">
          {success}
        </p>
      ) : null}
    </div>
  );
}
