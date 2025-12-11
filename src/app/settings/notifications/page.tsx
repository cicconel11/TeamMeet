import Link from "next/link";
import { Card, Button, Badge } from "@/components/ui";

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        <p className="text-muted-foreground">
          Personal notification settings. Organization announcements are managed per-organization.
        </p>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Announcements</p>
            <p className="text-sm text-muted-foreground">Receive announcements sent to your organizations.</p>
          </div>
          <Badge variant="muted">Managed per org</Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>To manage or send notifications, open an organization</span>
          <Link href="/app">
            <Button size="sm" variant="secondary">Go to Organizations</Button>
          </Link>
        </div>
      </Card>

      <Card className="p-5 space-y-3">
        <div>
          <p className="font-medium text-foreground">Email updates</p>
          <p className="text-sm text-muted-foreground">
            Account and billing emails are always sent to your account email.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="success">Enabled</Badge>
          <span>Critical account and billing notices</span>
        </div>
      </Card>
    </div>
  );
}

