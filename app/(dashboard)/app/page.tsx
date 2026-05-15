import { DashboardClient } from "./dashboard-client";
import { ProfilePromptServer } from "./profile-prompt-server";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <ProfilePromptServer />
      <DashboardClient />
    </div>
  );
}
