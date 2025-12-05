"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card } from "@/components/ui";

function JoinOrgForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const codeFromUrl = searchParams.get("code");
  
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Auto-fill code from URL and optionally auto-submit
  useEffect(() => {
    if (codeFromUrl && !code) {
      setCode(codeFromUrl.toUpperCase());
      setAutoSubmitting(true);
    }
  }, [codeFromUrl, code]);

  // Auto-submit when code is filled from URL
  useEffect(() => {
    if (autoSubmitting && code) {
      const form = document.getElementById("join-form") as HTMLFormElement;
      if (form) {
        form.requestSubmit();
      }
      setAutoSubmitting(false);
    }
  }, [autoSubmitting, code]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to join an organization");
      setIsLoading(false);
      return;
    }

    // Look up the invite code
    const { data: inviteData, error: inviteError } = await supabase
      .from("organization_invites")
      .select(`
        *,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq("code", code.trim().toUpperCase())
      .single();

    if (inviteError || !inviteData) {
      setError("Invalid invite code. Please check and try again.");
      setIsLoading(false);
      return;
    }

    // Type assertion for the joined data
    const invite = inviteData as {
      id: string;
      organization_id: string;
      code: string;
      role: string;
      uses_remaining: number | null;
      expires_at: string | null;
      organizations: { id: string; name: string; slug: string };
    };

    // Check if invite has expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      setError("This invite code has expired.");
      setIsLoading(false);
      return;
    }

    // Check if invite has uses remaining
    if (invite.uses_remaining !== null && invite.uses_remaining <= 0) {
      setError("This invite code has no uses remaining.");
      setIsLoading(false);
      return;
    }

    // Check if user is already a member
    const { data: existingRole } = await supabase
      .from("user_organization_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", invite.organization_id)
      .single();

    if (existingRole) {
      setError("You are already a member of this organization.");
      // Redirect them anyway after a short delay
      setTimeout(() => router.push(`/${invite.organizations.slug}`), 1500);
      setIsLoading(false);
      return;
    }

    // Add user to organization with the role specified in the invite
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: roleError } = await (supabase
      .from("user_organization_roles") as any)
      .insert({
        user_id: user.id,
        organization_id: invite.organization_id,
        role: invite.role || "member",
      });

    if (roleError) {
      setError("Failed to join organization. Please try again.");
      setIsLoading(false);
      return;
    }

    // Decrement uses_remaining if it's set
    if (invite.uses_remaining !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("organization_invites") as any)
        .update({ uses_remaining: invite.uses_remaining - 1 })
        .eq("id", invite.id);
    }

    // Success! Redirect to the organization
    router.push(`/${invite.organizations.slug}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/app">
            <h1 className="text-2xl font-bold text-foreground">
              Team<span className="text-emerald-500">Network</span>
            </h1>
          </Link>
          <form action="/auth/signout" method="POST">
            <Button variant="ghost" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back
          </Link>
        </div>

        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Join an Organization</h2>
            <p className="text-muted-foreground">
              Enter the invite code you received from an organization admin.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form id="join-form" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Input
                label="Invite Code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                className="text-center text-2xl tracking-widest font-mono"
                required
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                Join Organization
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Want to create your own organization instead?
            </p>
            <Link href="/app/create-org">
              <Button variant="secondary" size="sm">
                Create Organization
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}

export default function JoinOrgPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-muted rounded-xl" />
        </div>
      </div>
    }>
      <JoinOrgForm />
    </Suspense>
  );
}

