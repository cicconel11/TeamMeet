"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, Textarea } from "@/components/ui";

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1e3a5f");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    // Generate slug: lowercase, replace spaces with hyphens, remove special chars
    const generatedSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to create an organization");
      setIsLoading(false);
      return;
    }

    // Check if slug is already taken
    const { data: existing } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      setError("This URL slug is already taken. Please choose a different one.");
      setIsLoading(false);
      return;
    }

    // Create the organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug,
        description: description || null,
        primary_color: primaryColor,
      })
      .select()
      .single();

    if (orgError) {
      setError(orgError.message);
      setIsLoading(false);
      return;
    }

    // Add user as admin of the new organization
    const { error: roleError } = await supabase
      .from("user_organization_roles")
      .insert({
        user_id: user.id,
        organization_id: org.id,
        role: "admin",
      });

    if (roleError) {
      // Rollback: delete the org if we couldn't add the role
      await supabase.from("organizations").delete().eq("id", org.id);
      setError("Failed to set up organization admin. Please try again.");
      setIsLoading(false);
      return;
    }

    // Success! Redirect to the new org
    router.push(`/${slug}`);
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
      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link href="/app" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Organizations
          </Link>
        </div>

        <Card className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Create a New Organization</h2>
            <p className="text-muted-foreground">
              Set up your team, club, or group. You&apos;ll be the admin and can invite members later.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Input
                label="Organization Name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Stanford Crew, The Whiffenpoofs"
                required
              />

              <div>
                <Input
                  label="URL Slug"
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="my-organization"
                  helperText={`Your organization will be at: teamnetwork.app/${slug || "your-slug"}`}
                  required
                />
              </div>

              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people about your organization..."
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Brand Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-12 w-20 rounded-xl border border-border cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#1e3a5f"
                    className="flex-1"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  This color will be used for your organization&apos;s branding
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <Link href="/app" className="flex-1">
                  <Button type="button" variant="secondary" className="w-full">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" isLoading={isLoading}>
                  Create Organization
                </Button>
              </div>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}

