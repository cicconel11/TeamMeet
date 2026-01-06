import Link from "next/link";
import { Button } from "@/components/ui";

type TermsSection = {
  number: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

const termsSections: TermsSection[] = [
  {
    number: "1",
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing or using TeamNetwork (\"the Service\"), operated by McKillop LLC, you agree to comply with and be bound by these Terms of Service (\"Terms\"). If you do not agree, you may not use the Service.",
    ],
  },
  {
    number: "2",
    title: "Eligibility",
    paragraphs: [
      "You must be at least 16 years old to use the Service. By using the Service, you represent and warrant that you meet this age requirement.",
    ],
  },
  {
    number: "3",
    title: "Account Registration",
    paragraphs: [
      "Users must provide accurate, complete, and current information.",
    ],
    bullets: [
      "You are responsible for maintaining the confidentiality of your account credentials.",
      "You are fully responsible for all activity occurring under your account.",
    ],
  },
  {
    number: "4",
    title: "User Conduct",
    paragraphs: [
      "You agree not to:",
      "Violation of these rules may result in immediate suspension or termination of your account.",
    ],
    bullets: [
      "Violate any applicable laws or regulations.",
      "Upload or transmit content that is illegal, harmful, threatening, abusive, harassing, defamatory, obscene, infringing, or otherwise objectionable.",
      "Attempt to access accounts, systems, or data not authorized to you.",
      "Reverse engineer, copy, modify, or exploit any portion of the Service or its technology.",
    ],
  },
  {
    number: "5",
    title: "Intellectual Property & License",
    paragraphs: [
      "TeamNetwork and its licensors retain all rights, title, and interest in the Service, including software, content, designs, trademarks, and logos.",
      "Users may not copy, modify, distribute, create derivative works, or reverse engineer any part of the Service.",
      "By submitting content, you grant TeamNetwork a non-exclusive, worldwide, royalty-free license to display and use your content solely to provide the Service.",
      "TeamNetwork reserves the right to remove any content that violates intellectual property rights or these Terms.",
    ],
  },
  {
    number: "6",
    title: "Payments and Subscriptions",
    paragraphs: [
      "Certain features may require payment; all fees are non-refundable unless required by law.",
      "TeamNetwork may adjust fees with notice.",
      "Unauthorized use or sharing of paid content is strictly prohibited.",
    ],
  },
  {
    number: "7",
    title: "Donations and Mentorship",
    paragraphs: [
      "The Service may include options to donate to teams or programs, or participate in mentorship opportunities. Users understand that all donations are voluntary and may be subject to separate terms and conditions.",
      "TeamNetwork does not guarantee mentorship outcomes or engagement levels; participation is at the discretion of mentors and teams.",
    ],
  },
  {
    number: "8",
    title: "Termination",
    paragraphs: [
      "TeamNetwork may suspend or terminate accounts at any time for violations of these Terms.",
      "Upon termination, your access to content and the Service is revoked, and no refunds will be provided.",
    ],
  },
  {
    number: "9",
    title: "Disclaimers",
    paragraphs: [
      "The Service is provided \"as is\" and \"as available\" without warranties of any kind.",
      "TeamNetwork disclaims all warranties, including merchantability, fitness for a particular purpose, and non-infringement.",
      "Use of the Service is at your own risk.",
    ],
  },
  {
    number: "10",
    title: "Limitation of Liability",
    paragraphs: [
      "To the fullest extent permitted by law, TeamNetwork shall not be liable for:",
    ],
    bullets: [
      "Any direct, indirect, incidental, special, consequential, or punitive damages.",
      "Loss of profits, data, goodwill, or other intangible losses.",
      "Any claim arising from user content or user conduct.",
    ],
  },
  {
    number: "11",
    title: "Indemnification",
    paragraphs: [
      "You agree to indemnify, defend, and hold harmless TeamNetwork, McKillop LLC, and their affiliates from any claims, damages, or expenses arising from:",
    ],
    bullets: [
      "Your use of the Service.",
      "Your violation of these Terms.",
      "Your violation of intellectual property or other rights.",
    ],
  },
  {
    number: "12",
    title: "Dispute Resolution and Arbitration",
    paragraphs: [],
    bullets: [
      "Binding Arbitration: Any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Service shall be resolved exclusively through final and binding arbitration under the rules of the American Arbitration Association (AAA).",
      "Waiver of Class Actions: You agree that any arbitration shall be conducted only on an individual basis and not as a class, collective, or representative action, and you expressly waive the right to participate in any class, collective, or representative proceeding.",
      "No Jury Trial: You waive any right to a jury trial for any claims related to these Terms or the Service.",
      "Location and Costs: The arbitration will take place in New York, NY, unless we agree otherwise in writing. Each party will bear its own costs and fees, except as provided under the AAA rules.",
      "Enforceability: If any portion of this arbitration clause is found unenforceable, the remaining provisions shall remain in full force and effect.",
    ],
  },
  {
    number: "13",
    title: "Changes to Terms",
    paragraphs: [
      "TeamNetwork may modify these Terms at any time. Changes will be effective when posted. Continued use of the Service constitutes acceptance of the updated Terms.",
    ],
  },
  {
    number: "14",
    title: "Governing Law",
    paragraphs: [
      "These Terms are governed by the laws of the State of New York, without regard to conflict of law principles.",
    ],
  },
  {
    number: "15",
    title: "Contact Information",
    paragraphs: [
      "Email: mckillopm25@gmail.com",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black opacity-80" />
      <div className="relative z-10">
        <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-white hover:text-emerald-300 transition-colors">
              Team<span className="text-emerald-400">Network</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm text-slate-200 hover:text-white">
                Back to landing
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>

        <main id="top" className="max-w-6xl mx-auto px-6 py-12 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Legal</p>
              <h1 className="text-3xl sm:text-4xl font-bold">TeamNetwork Terms of Service</h1>
              <p className="text-sm text-slate-400">Last Updated: December 8, 2025</p>
            </div>
            <Link href="#top">
              <Button variant="secondary" className="bg-white/10 text-white hover:bg-white/20">
                Back to top
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {termsSections.map((section) => (
              <div key={section.number} className="bg-white/[0.04] backdrop-blur-sm rounded-2xl p-5 border border-white/10">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-300 flex items-center justify-center font-semibold">
                    {section.number}
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                    {section.paragraphs.map((paragraph, index) => (
                      <p key={`${section.number}-paragraph-${index}`} className="text-sm text-slate-300 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc list-inside text-sm text-slate-300 space-y-1 pl-1">
                        {section.bullets.map((bullet, index) => (
                          <li key={`${section.number}-bullet-${index}`}>{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>

        <footer className="bg-slate-950/80 border-t border-slate-900 py-8">
          <div className="max-w-6xl mx-auto px-6 text-center text-sm text-slate-400">
            <p>© {new Date().getFullYear()} TeamNetwork. Built with Next.js and Supabase.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
