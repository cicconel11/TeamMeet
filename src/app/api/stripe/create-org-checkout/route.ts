import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { stripe, getPriceIds, isSalesLedBucket } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  claimPaymentAttempt,
  ensurePaymentAttempt,
  hashFingerprint,
  hasStripeResource,
  IdempotencyConflictError,
  updatePaymentAttempt,
  waitForExistingStripeResource,
} from "@/lib/payments/idempotency";
import type { AlumniBucket, SubscriptionInterval } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RequestBody {
  name: string;
  slug: string;
  description?: string;
  primaryColor?: string;
  billingInterval: SubscriptionInterval;
  alumniBucket: AlumniBucket;
  idempotencyKey?: string;
  paymentAttemptId?: string;
}

export async function POST(req: Request) {
  console.log("[create-org-checkout] Starting...");
  const supabase = await createClient();
  const serviceSupabase = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log("[create-org-checkout] Unauthorized - no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log("[create-org-checkout] User:", user.id, user.email);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { name, slug, description, primaryColor, billingInterval, alumniBucket } = body;
  const idempotencyKey = body.idempotencyKey?.trim() || null;
  const paymentAttemptId = body.paymentAttemptId?.trim() || null;

  const interval: SubscriptionInterval = billingInterval === "year" ? "year" : "month";
  const bucket: AlumniBucket = ["none", "0-200", "201-600", "601-1500", "1500+"].includes(alumniBucket)
    ? alumniBucket
    : "none";

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
  }

  if (isSalesLedBucket(bucket)) {
    let organizationId: string | null = null;

    try {
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name,
          slug,
          description: description || null,
          primary_color: primaryColor || "#1e3a5f",
        })
        .select()
        .single();

      if (orgError || !org) {
        throw new Error(orgError?.message || "Unable to create organization");
      }

      organizationId = org.id;

      const { error: roleError } = await supabase
        .from("user_organization_roles")
        .insert({
          user_id: user.id,
          organization_id: org.id,
          role: "admin",
        });

      if (roleError) {
        throw new Error(roleError.message);
      }

      const { error: subError } = await supabase
        .from("organization_subscriptions")
        .insert({
          organization_id: org.id,
          base_plan_interval: interval,
          alumni_bucket: bucket,
          alumni_plan_interval: null,
          status: "pending_sales",
        });

      if (subError) {
        throw new Error(subError.message);
      }

      return NextResponse.json({
        mode: "sales",
        organizationSlug: org.slug,
      });
    } catch (error) {
      const stripeErr = error as {
        type?: string;
        code?: string;
        message?: string;
        param?: string;
        statusCode?: number;
        raw?: { message?: string };
      };
      console.error("[create-org-checkout] Error details (sales-led):", {
        type: stripeErr?.type,
        code: stripeErr?.code,
        param: stripeErr?.param,
        statusCode: stripeErr?.statusCode,
        message: stripeErr?.message || stripeErr?.raw?.message || (error instanceof Error ? error.message : String(error)),
      });

      if (organizationId) {
        console.log("[create-org-checkout] Cleaning up org:", organizationId);
        await supabase.from("organization_subscriptions").delete().eq("organization_id", organizationId);
        await supabase.from("user_organization_roles").delete().eq("organization_id", organizationId).eq("user_id", user.id);
        await supabase.from("organizations").delete().eq("id", organizationId);
      }

      const message = error instanceof Error ? error.message : "Unable to start checkout";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  try {
    const { basePrice, alumniPrice } = getPriceIds(interval, bucket);
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;
    const pendingOrgIdSeed = randomUUID();
    const fingerprint = hashFingerprint({
      userId: user.id,
      name,
      slug,
      interval,
      bucket,
      primaryColor,
    });

    const attemptMetadata = {
      pending_org_id: pendingOrgIdSeed,
      slug,
      alumni_bucket: bucket,
      billing_interval: interval,
    };

    const { attempt } = await ensurePaymentAttempt({
      supabase: serviceSupabase,
      idempotencyKey,
      paymentAttemptId,
      flowType: "subscription_checkout",
      amountCents: 0,
      currency: "usd",
      userId: user.id,
      requestFingerprint: fingerprint,
      metadata: attemptMetadata,
    });

    const storedMetadata = (attempt.metadata as Record<string, string> | null) ?? {};
    const pendingOrgId = storedMetadata.pending_org_id || pendingOrgIdSeed;
    const metadata = {
      organization_id: pendingOrgId,
      organization_slug: slug,
      organization_name: name,
      organization_description: (description || "").slice(0, 500),
      organization_color: primaryColor || "#1e3a5f",
      alumni_bucket: bucket,
      created_by: user.id,
      base_interval: interval,
      payment_attempt_id: attempt.id,
    };

    const { attempt: claimedAttempt, claimed } = await claimPaymentAttempt({
      supabase: serviceSupabase,
      attempt,
      amountCents: 0,
      currency: "usd",
      requestFingerprint: fingerprint,
      stripeConnectedAccountId: null,
    });

    const respondWithExisting = (candidate: typeof claimedAttempt) => {
      if (candidate.stripe_checkout_session_id && candidate.checkout_url) {
        return NextResponse.json({
          url: candidate.checkout_url,
          idempotencyKey: candidate.idempotency_key,
          paymentAttemptId: candidate.id,
        });
      }
      return null;
    };

    if (!claimed) {
      const existingResponse = hasStripeResource(claimedAttempt)
        ? respondWithExisting(claimedAttempt)
        : null;
      if (existingResponse) return existingResponse;

      const awaited = await waitForExistingStripeResource(serviceSupabase, claimedAttempt.id);
      if (awaited && hasStripeResource(awaited)) {
        const awaitedResponse = respondWithExisting(awaited);
        if (awaitedResponse) return awaitedResponse;
      }

      return NextResponse.json(
        {
          error: "Checkout is already processing for this idempotency key. Retry shortly with the same key.",
          idempotencyKey: claimedAttempt.idempotency_key,
          paymentAttemptId: claimedAttempt.id,
        },
        { status: 409 },
      );
    }

    console.log("[create-org-checkout] Creating Stripe session with prices:", { basePrice, alumniPrice, origin, pendingOrgId });

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer_email: user.email || undefined,
        line_items: [
          { price: basePrice, quantity: 1 },
          ...(alumniPrice ? [{ price: alumniPrice, quantity: 1 }] : []),
        ],
        subscription_data: {
          metadata,
        },
        metadata,
        success_url: `${origin}/app?org=${slug}&checkout=success`,
        cancel_url: `${origin}/app?org=${slug}&checkout=cancel`,
      },
      { idempotencyKey: claimedAttempt.idempotency_key },
    );

    await updatePaymentAttempt(serviceSupabase, claimedAttempt.id, {
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      status: "processing",
    });

    console.log("[create-org-checkout] Success! Checkout URL:", session.url);
    return NextResponse.json({
      url: session.url,
      idempotencyKey: claimedAttempt.idempotency_key,
      paymentAttemptId: claimedAttempt.id,
    });
  } catch (error) {
    const stripeErr = error as {
      type?: string;
      code?: string;
      message?: string;
      param?: string;
      statusCode?: number;
      raw?: { message?: string };
    };

    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("[create-org-checkout] Error details:", {
      type: stripeErr?.type,
      code: stripeErr?.code,
      param: stripeErr?.param,
      statusCode: stripeErr?.statusCode,
      message: stripeErr?.message || stripeErr?.raw?.message || (error instanceof Error ? error.message : String(error)),
    });

    const lastError = stripeErr?.message || stripeErr?.raw?.message || "checkout_failed";
    if (paymentAttemptId) {
      await serviceSupabase.from("payment_attempts").update({ last_error: lastError }).eq("id", paymentAttemptId);
    } else if (idempotencyKey) {
      await serviceSupabase.from("payment_attempts").update({ last_error: lastError }).eq("idempotency_key", idempotencyKey);
    }

    const message = error instanceof Error ? error.message : "Unable to start checkout";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
