"use client";

import { useState } from "react";
import { Card, CardTitle, CardDescription, Button, Input, Select } from "@/components/ui";

interface PhilanthropyEvent {
  id: string;
  title: string;
}

interface DonationFormProps {
  organizationId: string;
  organizationName: string;
  philanthropyEvents?: PhilanthropyEvent[];
}

export function DonationForm({ organizationId, organizationName, philanthropyEvents = [] }: DonationFormProps) {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [purpose, setPurpose] = useState("general");
  const [customPurpose, setCustomPurpose] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetAmounts = [10, 25, 50, 100];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 1) {
      setError("Please enter a valid amount ($1 minimum)");
      return;
    }

    setIsLoading(true);

    try {
      // Determine event_id and purpose text
      let eventId: string | undefined;
      let purposeText: string | undefined;

      if (purpose === "general") {
        purposeText = customPurpose || "General Donation";
      } else if (purpose === "other") {
        purposeText = customPurpose || "Other";
      } else {
        // It's an event ID
        eventId = purpose;
        const event = philanthropyEvents.find(e => e.id === purpose);
        purposeText = event?.title || "Event Donation";
      }

      const res = await fetch("/api/donations/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          amountCents: Math.round(amountNum * 100),
          donorName: name || undefined,
          donorEmail: email || undefined,
          eventId,
          purpose: purposeText,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
        <CardTitle>Make a Donation</CardTitle>
        <CardDescription>Support {organizationName} with a one-time donation</CardDescription>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Donation Purpose */}
        <div>
          <Select
            label="What is this donation for?"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            options={[
              { value: "general", label: "General Donation" },
              ...philanthropyEvents.map((event) => ({
                value: event.id,
                label: event.title,
              })),
              { value: "other", label: "Other (specify below)" },
            ]}
          />
        </div>

        {/* Custom Purpose (shown for general or other) */}
        {(purpose === "general" || purpose === "other") && (
          <Input
            label={purpose === "other" ? "Please specify" : "Add a note (optional)"}
            type="text"
            placeholder={purpose === "other" ? "What should this go towards?" : "e.g., In memory of..."}
            value={customPurpose}
            onChange={(e) => setCustomPurpose(e.target.value)}
          />
        )}

        {/* Preset Amount Buttons */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Select Amount
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presetAmounts.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(preset.toString())}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  amount === preset.toString()
                    ? "bg-org-primary text-white"
                    : "bg-muted text-foreground hover:bg-border"
                }`}
              >
                ${preset}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div>
          <Input
            label="Custom Amount ($)"
            type="number"
            min="1"
            step="0.01"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {/* Optional Name */}
        <Input
          label="Your Name (optional)"
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Optional Email */}
        <Input
          label="Email (optional)"
          type="email"
          placeholder="john@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="For donation receipt"
        />

        {error && (
          <p className="text-sm text-error">{error}</p>
        )}

        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!amount || parseFloat(amount) < 1}
          className="w-full"
        >
          {isLoading ? "Processing..." : `Donate${amount ? ` $${amount}` : ""}`}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Secure payment processed by Stripe
        </p>
      </form>
    </Card>
  );
}
