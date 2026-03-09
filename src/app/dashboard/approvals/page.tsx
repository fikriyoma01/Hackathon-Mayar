import { ApprovalReviewControls } from "@/components/dashboard/approval-review-controls";
import { Panel } from "@/components/shared/panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireSessionUser } from "@/lib/auth";
import { getApprovalQueue } from "@/lib/domain";
import {
  approvalActionLabel,
  approvalStatusLabel,
  formatDateTime,
  roleLabel,
} from "@/lib/format";

export default async function ApprovalsPage() {
  const user = await requireSessionUser();
  const approvals = await getApprovalQueue(user.id);
  const pendingCount = approvals.filter((approval) => approval.status === "pending").length;
  const approvedCount = approvals.filter((approval) => approval.status === "approved").length;
  const rejectedCount = approvals.filter((approval) => approval.status === "rejected").length;

  return (
    <Panel
      title="Persetujuan perubahan"
      description="Tinjau permintaan perubahan status paket atau pengalihan penyaluran sebelum dijalankan."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Menunggu persetujuan</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{pendingCount}</p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Disetujui</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{approvedCount}</p>
        </div>
        <div className="rounded-[24px] bg-[rgba(19,35,29,0.04)] p-4">
          <p className="text-sm text-[var(--ink-soft)]">Ditolak</p>
          <p className="mt-2 text-2xl font-black text-[var(--foreground)]">{rejectedCount}</p>
        </div>
      </div>

      <div className="grid gap-4">
        {approvals.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--line)] px-4 py-6 text-sm text-[var(--ink-soft)]">
            Belum ada permintaan perubahan pada cakupan ini.
          </div>
        ) : (
          approvals.map((approval) => (
            <article
              key={approval.id}
              className="rounded-[28px] border border-[var(--line)] bg-white/80 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="display-font text-xl font-bold text-[var(--foreground)]">
                    {approval.entityLabel}
                  </p>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    {approvalActionLabel(approval.actionType)}
                  </p>
                </div>
                <StatusBadge
                  status={approval.status}
                  label={approvalStatusLabel(approval.status)}
                />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                  <p className="text-sm text-[var(--ink-soft)]">Pengaju</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {approval.requestedByName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {roleLabel(approval.requestedByRole)}
                  </p>
                </div>
                <div className="rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                  <p className="text-sm text-[var(--ink-soft)]">Diajukan</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {formatDateTime(approval.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white p-4">
                <p className="text-sm text-[var(--ink-soft)]">Catatan pengajuan</p>
                <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                  {approval.requestNote ?? "Tidak ada catatan tambahan."}
                </p>
              </div>
              <div className="mt-4 rounded-[22px] border border-[var(--line)] bg-white p-4">
                <p className="text-sm text-[var(--ink-soft)]">Data permintaan</p>
                <pre className="mt-2 overflow-x-auto text-xs text-[var(--foreground)]">
                  {JSON.stringify(approval.payload, null, 2)}
                </pre>
              </div>
              {approval.status === "pending" && user.role === "admin" ? (
                <div className="mt-4">
                  <ApprovalReviewControls requestId={approval.id} />
                </div>
              ) : approval.reviewedAt ? (
                <div className="mt-4 rounded-[22px] bg-[rgba(19,35,29,0.04)] p-4">
                  <p className="text-sm text-[var(--ink-soft)]">Hasil review</p>
                  <p className="mt-1 font-semibold text-[var(--foreground)]">
                    {approval.reviewedByName ?? "-"}
                  </p>
                  <p className="mt-1 text-sm text-[var(--ink-soft)]">
                    {formatDateTime(approval.reviewedAt)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
                    {approval.reviewNote ?? "Tanpa catatan tambahan."}
                  </p>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </Panel>
  );
}
