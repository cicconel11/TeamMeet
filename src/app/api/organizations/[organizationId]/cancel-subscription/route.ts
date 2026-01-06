import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit, buildRateLimitResponse } from "@/lib/security/rate-limit";
import { baseSchemas } from "@/lib/security/validation";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ organizationId: string }>;
}

export async function POST(_req: Request, { params }: RouteParams) {
  const { organizationId } = await params;
  const orgIdParsed = baseSchemas.uuid.safeParse(organizationId);
  if (!orgIdParsed.success) {
    return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const rateLimit = checkRateLimit(_req, {
    userId: user?.id ?? null,
    feature: "subscription cancellation",
    limitPerIp: 20,
    limitPerUser: 10,
  });

  if (!rateLimit.ok) {
    return buildRateLimitResponse(rateLimit);
  }

  const respond = (payload: unknown, status = 200) =>
    NextResponse.json(payload, { status, headers: rateLimit.headers });

  if (!user) {
    return respond({ error: "Unauthorized" }, 401);
  }

  // Require admin role in the organization
  const { data: role } = await supabase
    .from("user_organization_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (role?.role !== "admin") {
    return respond({ error: "Forbidden" }, 403);
  }

  const serviceSupabase = createServiceClient();
  type OrgSubTable = Database["public"]["Tables"]["organization_subscriptions"];
  type OrgSubUpdate = OrgSubTable["Update"];

  const { data: subscription } = await serviceSupabase
    .from("organization_subscriptions")
    .select("stripe_subscription_id, status")
    .eq("organization_id", organizationId)
    .maybeSingle();

  const sub = subscription as { stripe_subscription_id: string | null; status?: string | null } | null;

  if (!sub) {
    return respond({ error: "Subscription not found" }, 404);
  }

  try {
    if (sub.stripe_subscription_id) {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    }

    const payload: OrgSubUpdate = {
      status: "canceled",
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    };

    const table = "organization_subscriptions" as const;
    await serviceSupabase.from(table).update(payload).eq("organization_id", organizationId);

    return respond({ status: "canceled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to cancel subscription";
    return respond({ error: message }, 400);
  }
}

