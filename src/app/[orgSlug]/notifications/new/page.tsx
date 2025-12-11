 "use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, Button, Input, Textarea, Select } from "@/components/ui";
import { PageHeader } from "@/components/layout";

type Channel = "email" | "sms" | "both";
type Audience = "members" | "alumni" | "all";

export default function NewNotificationPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [audience, setAudience] = useState<Audience>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get organization ID
      const { data: org } = await supabase
        .from("organizations")
        .select("id")
        .eq("slug", orgSlug)
        .single();

      if (!org) {
        throw new Error("Organization not found");
      }

      const { error: insertError } = await supabase.from("notifications").insert({
        organization_id: org.id,
        title,
        body: body || null,
        channel,
        audience,
        sent_at: null,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      router.push(`/${orgSlug}/notifications`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send Notification"
        description="Create and send a notification to your organization"
      />

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <Input
            label="Title"
            placeholder="Team meeting tomorrow"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <Textarea
            label="Message"
            placeholder="Add more details for your members..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
          />

          <Select
            label="Channel"
            value={channel}
            onChange={(e) => setChannel(e.target.value as Channel)}
            options={[
              { label: "Email", value: "email" },
              { label: "SMS", value: "sms" },
              { label: "Email + SMS", value: "both" },
            ]}
          />

          <Select
            label="Audience"
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            options={[
              { label: "Members + Alumni", value: "all" },
              { label: "Members only", value: "members" },
              { label: "Alumni only", value: "alumni" },
            ]}
          />

          <div className="flex gap-3">
            <Link href={`/${orgSlug}/notifications`} className="flex-1">
              <Button type="button" variant="secondary" className="w-full">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="flex-1" isLoading={isLoading}>
              Send Notification
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

