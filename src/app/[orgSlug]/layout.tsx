import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OrgSidebar } from "@/components/layout/OrgSidebar";

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  // Fetch organization by slug
  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (!organization) {
    notFound();
  }

  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        // Set org primary color as CSS variable
        "--color-org-primary": organization.primary_color || "#1e3a5f",
        "--color-org-primary-light": organization.primary_color 
          ? adjustColor(organization.primary_color, 20) 
          : "#2d4a6f",
        "--color-org-primary-dark": organization.primary_color 
          ? adjustColor(organization.primary_color, -20) 
          : "#0f2a4f",
      } as React.CSSProperties}
    >
      <OrgSidebar organization={organization} />
      <main className="ml-64 p-8">
        {children}
      </main>
    </div>
  );
}

// Helper function to lighten/darken a hex color
function adjustColor(hex: string, amount: number): string {
  const clamp = (num: number) => Math.min(255, Math.max(0, num));
  
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color.split("").map(c => c + c).join("");
  }
  
  const num = parseInt(color, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00FF) + amount);
  const b = clamp((num & 0x0000FF) + amount);
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

