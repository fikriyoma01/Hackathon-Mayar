import Image from "next/image";
import Link from "next/link";

import { MerchantProfileEditor } from "@/components/dashboard/merchant-profile-editor";
import { NetworkControlCenter } from "@/components/dashboard/network-control-center";
import { NodeProfileEditor } from "@/components/dashboard/node-profile-editor";
import { StatusToggleButton } from "@/components/dashboard/status-toggle-button";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";
import { formatCurrency, formatNumber } from "@/lib/format";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const scopeFilter = params.scope ?? "all";
  const merchants = snapshot.merchants.filter((merchant) => {
    const matchesScope = scopeFilter === "all" || scopeFilter === "merchant";
    const matchesQuery =
      query.length === 0
        ? true
        : merchant.name.toLowerCase().includes(query) ||
          merchant.area.toLowerCase().includes(query) ||
          merchant.ownerName.toLowerCase().includes(query);

    return matchesScope && matchesQuery;
  });
  const nodes = snapshot.nodes.filter((node) => {
    const matchesScope = scopeFilter === "all" || scopeFilter === "node";
    const matchesQuery =
      query.length === 0
        ? true
        : node.name.toLowerCase().includes(query) ||
          node.area.toLowerCase().includes(query) ||
          node.contactName.toLowerCase().includes(query);

    return matchesScope && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {user.role === "admin" ? (
        <Panel
          title="Pusat mitra"
          description="Tambah merchant dan lokasi penyaluran baru tanpa keluar dari dashboard."
        >
          <NetworkControlCenter />
        </Panel>
      ) : null}

      <Panel
        title="Merchant dan lokasi penyaluran"
        description="Kelola mitra yang terlibat dalam pembayaran, voucher, dan penyaluran bantuan."
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Merchant terlihat</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatNumber(merchants.length)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Lokasi terlihat</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatNumber(nodes.length)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Merchant aktif</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatNumber(merchants.filter((merchant) => merchant.active).length)}
            </p>
          </div>
          <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
            <p className="text-sm text-[var(--ink-soft)]">Lokasi aktif</p>
            <p className="mt-2 text-2xl font-black text-[var(--foreground)]">
              {formatNumber(nodes.filter((node) => node.active).length)}
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-3 rounded-[24px] border border-[var(--line)] bg-white/70 p-4 md:grid-cols-[1fr_220px_auto]">
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Cari merchant, lokasi penyaluran, area, atau kontak"
            className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          />
          <select
            name="scope"
            defaultValue={scopeFilter}
            className="rounded-[18px] border border-[var(--line)] bg-white px-4 py-3 text-sm outline-none"
          >
            <option value="all">Semua mitra</option>
            <option value="merchant">Merchant</option>
            <option value="node">Lokasi penyaluran</option>
          </select>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white"
            >
              Terapkan
            </button>
            <Link
              href="/dashboard/network"
              className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-semibold text-[var(--foreground)]"
            >
              Reset
            </Link>
          </div>
        </form>
      </Panel>

      <Panel
        title="Merchant"
        description="Edit detail merchant, pantau performa, dan kelola status operasionalnya."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {merchants.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Tidak ada merchant yang cocok dengan filter ini.
            </div>
          ) : (
            merchants.map((merchant) => {
              const merchantPortions = snapshot.portions.filter(
                (portion) => portion.merchantId === merchant.id,
              );
              const merchantPortionIds = new Set(merchantPortions.map((portion) => portion.id));
              const merchantTransactions = snapshot.transactions.filter((transaction) =>
                merchantPortionIds.has(transaction.portionId),
              );
              const canManage =
                user.role === "admin" ||
                (user.role === "merchant" && user.merchantId === merchant.id);

              return (
                <article
                  key={merchant.id}
                  className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/80"
                >
                  <Image
                    src={merchant.imageUrl ?? "/images/food-package.png"}
                    alt={merchant.name}
                    width={960}
                    height={640}
                    className="h-52 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="display-font text-2xl font-bold text-[var(--foreground)]">
                          {merchant.name}
                        </p>
                        <p className="mt-2 text-sm text-[var(--ink-soft)]">
                          {merchant.area} / {merchant.ownerName}
                        </p>
                      </div>
                      <StatusBadge
                        status={merchant.active ? "active" : "expired"}
                        label={merchant.active ? "Aktif" : "Nonaktif"}
                      />
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Paket terhubung</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatNumber(merchantPortions.length)}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Dana terkumpul</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatCurrency(
                            sum(
                              merchantTransactions
                                .filter((transaction) => transaction.status === "paid")
                                .map((transaction) => transaction.amount),
                            ),
                          )}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Porsi tersalurkan</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatNumber(
                            sum(merchantPortions.map((portion) => portion.distributedPortions)),
                          )}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Kontak</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {merchant.phone}
                        </p>
                      </div>
                    </div>

                    {canManage ? (
                      <div className="mt-4 space-y-3">
                        <MerchantProfileEditor merchant={merchant} />
                        <StatusToggleButton
                          endpoint={`/api/merchants/${merchant.id}/status`}
                          active={merchant.active}
                          inactiveLabel="Jeda"
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>

      <Panel
        title="Lokasi penyaluran"
        description="Edit detail lokasi, pantau tugas terbuka, dan kelola kesiapan pengalihan."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {nodes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
              Tidak ada lokasi penyaluran yang cocok dengan filter ini.
            </div>
          ) : (
            nodes.map((node) => {
              const nodeActivities = snapshot.distributions.filter(
                (activity) => activity.nodeId === node.id,
              );
              const canManage =
                user.role === "admin" || (user.role === "operator" && user.nodeId === node.id);

              return (
                <article
                  key={node.id}
                  className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-white/80"
                >
                  <Image
                    src={node.imageUrl ?? "/images/delivery-map.png"}
                    alt={node.name}
                    width={960}
                    height={640}
                    className="h-52 w-full object-cover"
                  />
                  <div className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="display-font text-2xl font-bold text-[var(--foreground)]">
                          {node.name}
                        </p>
                        <p className="mt-2 text-sm text-[var(--ink-soft)]">
                          {node.area} / {node.contactName}
                        </p>
                      </div>
                      <StatusBadge
                        status={node.active ? "active" : "expired"}
                        label={node.active ? "Aktif" : "Nonaktif"}
                      />
                    </div>

                    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Tugas tercatat</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatNumber(nodeActivities.length)}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Tugas terbuka</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {formatNumber(
                            nodeActivities.filter((activity) => activity.status !== "completed")
                              .length,
                          )}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Kontak</p>
                        <p className="mt-1 font-semibold text-[var(--foreground)]">
                          {node.contactPhone}
                        </p>
                      </div>
                      <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                        <p className="text-[var(--ink-soft)]">Tipe</p>
                        <p className="mt-1 font-semibold capitalize text-[var(--foreground)]">
                          {node.type}
                        </p>
                      </div>
                    </div>

                    {canManage ? (
                      <div className="mt-4 space-y-3">
                        <NodeProfileEditor node={node} />
                        <StatusToggleButton
                          endpoint={`/api/nodes/${node.id}/status`}
                          active={node.active}
                          inactiveLabel="Jeda"
                        />
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );
}
