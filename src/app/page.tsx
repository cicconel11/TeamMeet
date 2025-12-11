import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  
  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .order("name");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative max-w-6xl mx-auto px-6 py-24 sm:py-32">
          <div className="text-center animate-fade-in">
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 tracking-tight">
              Team<span className="text-emerald-400">Network</span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              Your multi-organization hub for member directories, events, donations, and community engagement.
            </p>
            <Link
              href="#organizations"
              className="inline-flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              Explore Organizations
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div id="organizations" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-foreground mb-8">Organizations</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
          {organizations?.map((org) => (
            <Link
              key={org.id}
              href={`/${org.slug}`}
              className="card card-interactive p-6 group"
            >
              <div className="flex items-center gap-4 mb-4">
                {org.logo_url ? (
                  <div className="relative h-14 w-14 rounded-xl overflow-hidden">
                    <Image
                      src={org.logo_url}
                      alt={org.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  </div>
                ) : (
                  <div
                    className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: org.primary_color || "#1e3a5f" }}
                  >
                    {org.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-org-primary transition-colors">
                    {org.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">/{org.slug}</p>
                </div>
              </div>
              {org.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {org.description}
                </p>
              )}
              <div className="mt-4 flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                <span>View Dashboard</span>
                <svg className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {(!organizations || organizations.length === 0) && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No organizations found.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} TeamNetwork. Built with Next.js and Supabase.</p>
        </div>
      </footer>
    </div>
  );
}
