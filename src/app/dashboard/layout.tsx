import type { ReactNode } from "react";

import { DashboardShell } from "@/components/app/dashboard-shell";
import { requireSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireSessionUser();

  return <DashboardShell user={user}>{children}</DashboardShell>;
}
