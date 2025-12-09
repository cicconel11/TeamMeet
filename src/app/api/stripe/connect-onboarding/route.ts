import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Organization } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RequestBody {
  organizationId: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { organizationId } = body;

  if (!organizationId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
  }

  // Verify user is admin for this organization
  const { data: roleData } = await supabase
    .from("user_organization_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (roleData?.role !== "admin") {
    return NextResponse.json({ error: "Only admins can enable donations" }, { status: 403 });
  }

  // Fetch organization
  const serviceClient = createServiceClient();
  const { data, error: orgError } = await serviceClient
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (orgError || !data) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const org = data as Organization;

  try {
    let connectAccountId = org.stripe_connect_account_id;

    // Create Connect account if none exists
    if (!connectAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        metadata: {
          organization_id: org.id,
          organization_slug: org.slug,
        },
      });

      connectAccountId = account.id;

      // Save Connect account ID to organization
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (serviceClient.from("organizations") as any)
        .update({ stripe_connect_account_id: connectAccountId })
        .eq("id", org.id);

      if (updateError) {
        throw new Error("Failed to save Connect account ID");
      }
    }

    // Create account onboarding link
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const accountLink = await stripe.accountLinks.create({
      account: connectAccountId,
      refresh_url: `${origin}/${org.slug}/philanthropy?onboarding=retry`,
      return_url: `${origin}/${org.slug}/philanthropy?onboarding=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("[connect-onboarding] Error:", error);
    const message = error instanceof Error ? error.message : "Unable to start onboarding";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

