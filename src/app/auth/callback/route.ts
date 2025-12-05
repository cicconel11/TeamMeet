import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/app";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (e.g., user denied access)
  if (errorParam) {
    console.error("OAuth error:", errorParam, errorDescription);
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(errorDescription || errorParam)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Successful auth - redirect to /app (org picker) or specified redirect
      // The /app page will handle checking if user has orgs
      return NextResponse.redirect(`${origin}${redirect}`);
    }
    
    console.error("Auth callback error:", error.message);
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/error`);
}
