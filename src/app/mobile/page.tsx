import { MobileConsole } from "@/components/mobile/mobile-console";
import { requireSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function MobilePage() {
  const user = await requireSessionUser();
  const snapshot = await getDashboardSnapshot(user.id);
  const pickupStart = new Date();
  const pickupEnd = new Date(pickupStart.getTime() + 45 * 60 * 1000);

  return (
    <main className="mx-auto max-w-3xl px-4 py-4">
      <MobileConsole
        actorName={user.name}
        role={user.role}
        merchants={snapshot.merchants}
        nodes={snapshot.nodes}
        portions={snapshot.portions}
        tasks={snapshot.openTasks}
        vouchers={snapshot.vouchers}
        defaultPickupStart={pickupStart.toISOString().slice(0, 16)}
        defaultPickupEnd={pickupEnd.toISOString().slice(0, 16)}
      />
    </main>
  );
}
