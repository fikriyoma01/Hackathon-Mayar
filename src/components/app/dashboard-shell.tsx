"use client";

import {
  BarChart3,
  CheckCheck,
  Home,
  Layers3,
  Package,
  Receipt,
  Smartphone,
  Store,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/app/logout-button";
import { roleLabel } from "@/lib/format";
import type { AppUser } from "@/lib/types";
import { cx } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Ringkasan", icon: Home },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3 },
  { href: "/dashboard/portions", label: "Paket makanan", icon: Package },
  { href: "/dashboard/approvals", label: "Persetujuan", icon: CheckCheck },
  { href: "/dashboard/network", label: "Merchant & lokasi", icon: Store },
  { href: "/dashboard/donors", label: "Donatur", icon: Users },
  { href: "/dashboard/transactions", label: "Transaksi", icon: Receipt },
  { href: "/dashboard/vouchers", label: "Voucher", icon: Ticket },
  { href: "/dashboard/distribution", label: "Distribusi", icon: Layers3 },
];

export function DashboardShell({
  user,
  children,
}: {
  user: AppUser;
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="app-shell min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[1440px] gap-6 px-4 py-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-6">
        <aside className="surface-card-strong rounded-[32px] p-5 text-white lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:overflow-hidden">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#1b6b55,#0f3f33)] p-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col">
            <p className="text-xs uppercase tracking-[0.3em] text-white/65">
              Iftar Relay
            </p>
            <h1 className="display-font mt-3 text-3xl font-black tracking-tight">
              Dashboard pengelola Ramadan
            </h1>
            <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-4">
              <p className="text-sm text-white/65">{roleLabel(user.role)}</p>
              <p className="mt-1 text-xl font-bold">{user.name}</p>
              <p className="mt-1 text-sm text-white/75">{user.email}</p>
            </div>
            <nav className="mt-8 space-y-2 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {links.map(({ href, label, icon: Icon }) => {
                const isActive =
                  pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

                return (
                  <Link
                    key={href}
                    href={href}
                    className={cx(
                      "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold",
                      isActive
                        ? "bg-white text-[var(--brand-strong)]"
                        : "text-white/80 hover:bg-white/12 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
              <Link
                href="/mobile"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/12 hover:text-white"
              >
                <Smartphone className="h-4 w-4" />
                Tampilan seluler
              </Link>
            </nav>
            <div className="mt-8 flex items-center justify-between rounded-[24px] border border-white/15 bg-white/10 p-4">
              <div>
                <p className="text-sm text-white/70">Akses cepat</p>
                <p className="text-sm font-semibold text-white">
                  Pembayaran, voucher, dan dokumentasi
                </p>
              </div>
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="space-y-6 pb-12">{children}</main>
      </div>
    </div>
  );
}
