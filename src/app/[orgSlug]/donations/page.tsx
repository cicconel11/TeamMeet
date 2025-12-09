import { redirect } from "next/navigation";

interface DonationsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function DonationsPage({ params }: DonationsPageProps) {
  const { orgSlug } = await params;
  
  // Redirect to combined Philanthropy & Donations page
  redirect(`/${orgSlug}/philanthropy`);
}
