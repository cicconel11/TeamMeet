import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import type { Organization } from "@/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RequestBody {
  organizationId: string;
  amountCents: number;
  donorName?: string;
  donorEmail?: string;
  eventId?: string;
  purpose?: string;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { organizationId, amountCents, donorName, donorEmail, eventId, purpose } = body;

  if (!organizationId) {
    return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
  }

  if (!amountCents || amountCents < 100) {
    return NextResponse.json({ error: "Minimum donation is $1.00" }, { status: 400 });
  }

  // Fetch organization with Connect account
  const supabase = createServiceClient();
  const { data, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (orgError || !data) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const org = data as Organization;

  if (!org.stripe_connect_account_id) {
    return NextResponse.json(
      { error: "Donations not enabled for this organization" },
      { status: 400 }
    );
  }

  try {
    const origin = req.headers.get("origin") ?? new URL(req.url).origin;

    // Build product name based on purpose
    let productName = `Donation to ${org.name}`;
    if (purpose && purpose !== "General Donation") {
      productName = `Donation to ${org.name} - ${purpose}`;
    }

    // Create Stripe Checkout Session with transfer to connected account
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: donorEmail || undefined,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        transfer_data: {
          destination: org.stripe_connect_account_id,
        },
        metadata: {
          organization_id: org.id,
          donor_name: donorName ?? "",
          event_id: eventId ?? "",
          purpose: purpose ?? "",
        },
      },
      metadata: {
        organization_id: org.id,
        donor_name: donorName ?? "",
        event_id: eventId ?? "",
        purpose: purpose ?? "",
      },
      success_url: `${origin}/${org.slug}/philanthropy?donation=success`,
      cancel_url: `${origin}/${org.slug}/philanthropy?donation=cancel`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[create-donation-checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Unable to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
