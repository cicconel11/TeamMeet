import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { isOrgAdmin } from "@/lib/auth";
import { ConnectSetup, DonationForm } from "@/components/donations";
import type { Organization } from "@/types/database";

interface PhilanthropyPageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ 
    view?: string;
    onboarding?: string;
    donation?: string;
  }>;
}

interface EventWithDonations {
  id: string;
  title: string;
  totalDonations: number;
}

export default async function PhilanthropyPage({ params, searchParams }: PhilanthropyPageProps) {
  const { orgSlug } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  // Fetch organization
  const { data, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", orgSlug)
    .single();

  if (!data || orgError) return null;

  const org = data as Organization;
  const isAdmin = await isOrgAdmin(org.id);
  const isDonationsEnabled = !!org.stripe_connect_account_id;

  // Fetch philanthropy events (events where is_philanthropy = true or event_type = philanthropy)
  let query = supabase
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .is("deleted_at", null)
    .or("is_philanthropy.eq.true,event_type.eq.philanthropy");

  if (filters.view === "past") {
    query = query.lt("start_date", new Date().toISOString()).order("start_date", { ascending: false });
  } else {
    query = query.gte("start_date", new Date().toISOString()).order("start_date");
  }

  const { data: events } = await query;

  // Calculate event stats
  const { data: allPhilanthropyEvents } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .is("deleted_at", null)
    .or("is_philanthropy.eq.true,event_type.eq.philanthropy");

  const totalEvents = allPhilanthropyEvents?.length || 0;
  const upcomingCount = events?.filter(e => new Date(e.start_date) >= new Date()).length || 0;
  const pastCount = totalEvents - upcomingCount;

  // Fetch donation stats (for admins and when donations are enabled)
  let donationStats = { totalCents: 0, count: 0 };
  let recentDonations: Array<{
    id: string;
    donor_name: string | null;
    amount_cents: number;
    created_at: string;
    event_id: string | null;
    purpose: string | null;
  }> = [];
  let eventDonationTotals: EventWithDonations[] = [];

  if (isDonationsEnabled) {
    // Get all donations (succeeded only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allDonations } = await (supabase as any)
      .from("organization_donations")
      .select("amount_cents, event_id")
      .eq("organization_id", org.id)
      .eq("status", "succeeded");

    if (allDonations) {
      donationStats = {
        totalCents: allDonations.reduce((sum: number, d: { amount_cents: number }) => sum + d.amount_cents, 0),
        count: allDonations.length,
      };

      // Calculate per-event totals (only for donations with event_id)
      const eventTotalsMap: Record<string, number> = {};
      for (const donation of allDonations) {
        if (donation.event_id) {
          eventTotalsMap[donation.event_id] = (eventTotalsMap[donation.event_id] || 0) + donation.amount_cents;
        }
      }

      // Map event IDs to event titles
      if (allPhilanthropyEvents) {
        eventDonationTotals = allPhilanthropyEvents
          .filter(event => eventTotalsMap[event.id])
          .map(event => ({
            id: event.id,
            title: event.title,
            totalDonations: eventTotalsMap[event.id],
          }))
          .sort((a, b) => b.totalDonations - a.totalDonations);
      }
    }

    // Get recent donations for admin view
    if (isAdmin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: recent } = await (supabase as any)
        .from("organization_donations")
        .select("id, donor_name, amount_cents, created_at, event_id, purpose")
        .eq("organization_id", org.id)
        .eq("status", "succeeded")
        .order("created_at", { ascending: false })
        .limit(10);

      recentDonations = recent || [];
    }
  }

  // Prepare philanthropy events for donation form
  const philanthropyEventsForForm = allPhilanthropyEvents?.map(e => ({
    id: e.id,
    title: e.title,
  })) || [];

  // Helper to get event title by ID
  const getEventTitle = (eventId: string | null): string | null => {
    if (!eventId) return null;
    const event = allPhilanthropyEvents?.find(e => e.id === eventId);
    return event?.title || null;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Philanthropy & Donations"
        description="Community service, volunteer events, and donations"
        actions={
          isAdmin && (
            <Link href={`/${orgSlug}/philanthropy/new`}>
              <Button>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Event
              </Button>
            </Link>
          )
        }
      />

      {/* Status Messages */}
      {filters.onboarding === "success" && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-emerald-800 dark:text-emerald-200 font-medium">
            Stripe Connect setup complete! Your organization can now receive donations.
          </p>
        </div>
      )}
      {filters.onboarding === "retry" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            Please complete your Stripe Connect setup to enable donations.
          </p>
        </div>
      )}
      {filters.donation === "success" && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-emerald-800 dark:text-emerald-200 font-medium">
            Thank you for your donation! Your support means a lot.
          </p>
        </div>
      )}
      {filters.donation === "cancel" && (
        <div className="mb-6 p-4 rounded-xl bg-muted border border-border">
          <p className="text-muted-foreground">
            Donation cancelled. Feel free to try again when you&apos;re ready.
          </p>
        </div>
      )}

      {/* Admin: Connect Setup / Status */}
      {isAdmin && (
        <div className="mb-8">
          <ConnectSetup organizationId={org.id} isConnected={isDonationsEnabled} />
        </div>
      )}

      {/* Donation Stats (when enabled) */}
      {isDonationsEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">
                  ${(donationStats.totalCents / 100).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Raised</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{donationStats.count}</p>
                <p className="text-sm text-muted-foreground">Donations</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Event Stats (when donations NOT enabled - show original 3-col layout) */}
      {!isDonationsEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{totalEvents}</p>
                <p className="text-sm text-muted-foreground">Total Events</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{upcomingCount}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-mono">{pastCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Per-Event Donation Totals (Only show totals for philanthropy events, not general donations) */}
      {isDonationsEnabled && eventDonationTotals.length > 0 && (
        <Card className="p-6 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Fundraising by Event</h3>
          <div className="space-y-3">
            {eventDonationTotals.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <svg className="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </div>
                  <span className="text-foreground font-medium">{event.title}</span>
                </div>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ${(event.totalDonations / 100).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main Content: Events + Donations */}
      <div className={`grid gap-6 ${isDonationsEnabled ? "lg:grid-cols-3" : ""}`}>
        {/* Events Column */}
        <div className={isDonationsEnabled ? "lg:col-span-2" : ""}>
          {/* Filters */}
          <div className="flex gap-2 mb-6">
            <Link
              href={`/${orgSlug}/philanthropy`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                !filters.view
                  ? "bg-org-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Upcoming
            </Link>
            <Link
              href={`/${orgSlug}/philanthropy?view=past`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filters.view === "past"
                  ? "bg-org-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Past
            </Link>
          </div>

          {/* Events List */}
          {events && events.length > 0 ? (
            <div className="space-y-4 stagger-children">
              {events.map((event) => {
                // Find donation total for this event
                const eventTotal = eventDonationTotals.find(e => e.id === event.id);
                
                return (
                  <Link key={event.id} href={`/${orgSlug}/events/${event.id}`}>
                    <Card interactive className="p-5">
                      <div className="flex items-start gap-4">
                        {/* Date Block */}
                        <div className="h-16 w-16 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex flex-col items-center justify-center text-center flex-shrink-0">
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase">
                            {new Date(event.start_date).toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 leading-none">
                            {new Date(event.start_date).getDate()}
                          </span>
                        </div>

                        {/* Event Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-foreground">{event.title}</h3>
                            <div className="flex items-center gap-2">
                              {eventTotal && (
                                <Badge variant="success">
                                  ${(eventTotal.totalDonations / 100).toLocaleString()} raised
                                </Badge>
                              )}
                              <Badge variant="success">Philanthropy</Badge>
                            </div>
                          </div>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {new Date(event.start_date).toLocaleTimeString("en-US", { 
                                hour: "numeric", 
                                minute: "2-digit" 
                              })}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1.5">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                </svg>
                                {event.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card>
              <EmptyState
                icon={
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                }
                title={filters.view === "past" ? "No past philanthropy events" : "No upcoming philanthropy events"}
                description="Philanthropy and volunteer events will appear here"
                action={
                  isAdmin && (
                    <Link href={`/${orgSlug}/philanthropy/new`}>
                      <Button>Create Philanthropy Event</Button>
                    </Link>
                  )
                }
              />
            </Card>
          )}

          {/* Recent Donations (Admin Only) */}
          {isAdmin && isDonationsEnabled && recentDonations.length > 0 && (
            <Card className="mt-6 p-0 overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Recent Donations</h3>
              </div>
              <div className="divide-y divide-border">
                {recentDonations.map((donation) => {
                  const eventTitle = getEventTitle(donation.event_id);
                  const displayPurpose = eventTitle || donation.purpose || "General Donation";
                  
                  return (
                    <div key={donation.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {donation.donor_name || "Anonymous"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {displayPurpose}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(donation.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <span className="font-mono font-bold text-foreground">
                        ${(donation.amount_cents / 100).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Donation Form Column */}
        {isDonationsEnabled && (
          <div className="lg:col-span-1">
            <DonationForm 
              organizationId={org.id} 
              organizationName={org.name} 
              philanthropyEvents={philanthropyEventsForForm}
            />
          </div>
        )}
      </div>
    </div>
  );
}
