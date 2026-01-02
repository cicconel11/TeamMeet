import { NextResponse } from "next/server";
import { stripe, getConnectAccountStatus } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import {
  claimPaymentAttempt,
  ensurePaymentAttempt,
  hashFingerprint,
  hasStripeResource,
  IdempotencyConflictError,
  normalizeCurrency,
  updatePaymentAttempt,
  waitForExistingStripeResource,
} from "@/lib/payments/idempotency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DonationMode = "checkout" | "payment_intent";

interface DonationRequest {
  organizationId?: string;
  organizationSlug?: string;
  amount: number;
  currency?: string;
  donorName?: string;
  donorEmail?: string;
  eventId?: string;
  purpose?: string;
  mode?: DonationMode;
  idempotencyKey?: string;
  paymentAttemptId?: string;
  platformFeeAmountCents?: number;
}

export async function POST(req: Request) {
  const supabase = createServiceClient();

  let body: DonationRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amountCents = Math.round(Number(body.amount || 0) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 100) {
    return NextResponse.json({ error: "Amount must be at least $1.00" }, { status: 400 });
  }

  const currency = normalizeCurrency(body.currency);
  const mode: DonationMode = body.mode === "payment_intent" ? "payment_intent" : "checkout";
  const platformFeeCentsRaw = Math.round(Number(body.platformFeeAmountCents ?? 0));
  const platformFeeCents = Math.max(
    0,
    Math.min(amountCents, Number.isFinite(platformFeeCentsRaw) ? platformFeeCentsRaw : 0),
  );
  const idempotencyKey = body.idempotencyKey?.trim() || null;
  const paymentAttemptId = body.paymentAttemptId?.trim() || null;

  const orgFilter = body.organizationId
    ? { column: "id", value: body.organizationId }
    : body.organizationSlug
      ? { column: "slug", value: body.organizationSlug }
      : null;

  if (!orgFilter) {
    return NextResponse.json({ error: "organizationId or organizationSlug is required" }, { status: 400 });
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, slug, name, stripe_connect_account_id")
    .eq(orgFilter.column as "id" | "slug", orgFilter.value)
    .maybeSingle();

  if (orgError || !org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!org.stripe_connect_account_id) {
    return NextResponse.json({ error: "Stripe is not connected for this organization" }, { status: 400 });
  }

  const connectStatus = await getConnectAccountStatus(org.stripe_connect_account_id);
  if (!connectStatus.isReady) {
    return NextResponse.json({ error: "Stripe onboarding is not completed for this organization" }, { status: 400 });
  }

  if (body.eventId) {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", body.eventId)
      .eq("organization_id", org.id)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: "Philanthropy event not found for this organization" }, { status: 404 });
    }
  }

  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const donorName = body.donorName?.trim();
  const donorEmail = body.donorEmail?.trim();
  const purpose = body.purpose?.trim();
  const stripeAccount = org.stripe_connect_account_id || undefined;
  const stripeOptions = stripeAccount ? { stripeAccount } : {};
  const fingerprint = hashFingerprint({
    orgId: org.id,
    amountCents,
    currency,
    mode,
    donorEmail,
    donorName,
    eventId: body.eventId || null,
    purpose: purpose || null,
    platformFeeCents,
  });
  const metadata: Record<string, string> = {
    organization_id: org.id,
    organization_slug: org.slug,
    flow: mode,
  };

  if (donorName) metadata.donor_name = donorName;
  if (donorEmail) metadata.donor_email = donorEmail;
  if (body.eventId) metadata.event_id = body.eventId;
  if (purpose) metadata.purpose = purpose;
  if (platformFeeCents) metadata.platform_fee_cents = String(platformFeeCents);

  try {
    const { attempt } = await ensurePaymentAttempt({
      supabase,
      idempotencyKey,
      paymentAttemptId,
      flowType: mode === "payment_intent" ? "donation_payment_intent" : "donation_checkout",
      amountCents,
      currency,
      organizationId: org.id,
      stripeConnectedAccountId: org.stripe_connect_account_id,
      requestFingerprint: fingerprint,
      metadata,
    });

    metadata.payment_attempt_id = attempt.id;

    const { attempt: claimedAttempt, claimed } = await claimPaymentAttempt({
      supabase,
      attempt,
      amountCents,
      currency,
      stripeConnectedAccountId: org.stripe_connect_account_id,
      requestFingerprint: fingerprint,
    });

    const respondWithExisting = async (candidate: typeof claimedAttempt) => {
      if (candidate.stripe_checkout_session_id && candidate.checkout_url) {
        return NextResponse.json({
          mode,
          sessionId: candidate.stripe_checkout_session_id,
          url: candidate.checkout_url,
          idempotencyKey: candidate.idempotency_key,
          paymentAttemptId: candidate.id,
        });
      }

      if (candidate.stripe_payment_intent_id) {
        const existingPi = await stripe.paymentIntents.retrieve(
          candidate.stripe_payment_intent_id,
          undefined,
          stripeOptions,
        );

        return NextResponse.json({
          mode: "payment_intent",
          paymentIntentId: existingPi.id,
          clientSecret: existingPi.client_secret,
          idempotencyKey: candidate.idempotency_key,
          paymentAttemptId: candidate.id,
        });
      }

      return null;
    };

    if (!claimed) {
      const existingResponse = hasStripeResource(claimedAttempt)
        ? await respondWithExisting(claimedAttempt)
        : null;

      if (existingResponse) {
        return existingResponse;
      }

      const awaited = await waitForExistingStripeResource(supabase, claimedAttempt.id);
      if (awaited && hasStripeResource(awaited)) {
        const awaitedResponse = await respondWithExisting(awaited);
        if (awaitedResponse) return awaitedResponse;
      }

      return NextResponse.json(
        {
          error: "Payment is already in progress for this idempotency key. Retry shortly with the same key.",
          idempotencyKey: claimedAttempt.idempotency_key,
          paymentAttemptId: claimedAttempt.id,
        },
        { status: 409 },
      );
    }

    if (mode === "payment_intent") {
      const paymentIntent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency,
          automatic_payment_methods: { enabled: true },
          receipt_email: donorEmail || undefined,
          description: purpose ? `Donation: ${purpose}` : `Donation to ${org.name}`,
          metadata,
          application_fee_amount: platformFeeCents || undefined,
        },
        { idempotencyKey: claimedAttempt.idempotency_key, ...stripeOptions },
      );

      await updatePaymentAttempt(supabase, claimedAttempt.id, {
        stripe_payment_intent_id: paymentIntent.id,
        status: "processing",
        stripe_connected_account_id: org.stripe_connect_account_id,
      });

      return NextResponse.json({
        mode,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        idempotencyKey: claimedAttempt.idempotency_key,
        paymentAttemptId: claimedAttempt.id,
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        submit_type: "donate",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: amountCents,
              product_data: {
                name: `Donation to ${org.name}`,
                metadata,
              },
            },
          },
        ],
        customer_email: donorEmail || undefined,
        metadata,
        payment_intent_data: {
          metadata,
          receipt_email: donorEmail || undefined,
          application_fee_amount: platformFeeCents || undefined,
        },
        success_url: `${origin}/${org.slug}/donations?donation=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/${org.slug}/donations?donation=cancelled`,
      },
      { idempotencyKey: claimedAttempt.idempotency_key, ...stripeOptions },
    );

    if (session.payment_intent && typeof session.payment_intent === "string") {
      await stripe.paymentIntents.update(
        session.payment_intent,
        { metadata: { ...metadata, checkout_session_id: session.id } },
        { idempotencyKey: claimedAttempt.idempotency_key, ...stripeOptions },
      );
    }

    await updatePaymentAttempt(supabase, claimedAttempt.id, {
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      stripe_checkout_session_id: session.id,
      checkout_url: session.url,
      status: "processing",
      stripe_connected_account_id: org.stripe_connect_account_id,
    });

    return NextResponse.json({
      mode,
      sessionId: session.id,
      url: session.url,
      idempotencyKey: claimedAttempt.idempotency_key,
      paymentAttemptId: claimedAttempt.id,
    });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Unable to start donation checkout";
    if (paymentAttemptId) {
      await supabase.from("payment_attempts").update({ last_error: message }).eq("id", paymentAttemptId);
    } else if (idempotencyKey) {
      await supabase.from("payment_attempts").update({ last_error: message }).eq("idempotency_key", idempotencyKey);
    }
    console.error("[create-donation] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
