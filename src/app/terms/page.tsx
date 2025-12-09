import Link from "next/link";
import { Button } from "@/components/ui";

export const metadata = {
  title: "Terms of Service | TeamNetwork",
  description: "TeamNetwork Terms of Service - Read our terms and conditions for using the platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <header className="p-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-white">
              Team<span className="text-emerald-400">Network</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <div className="py-16 px-6 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-slate-300">
            Last Updated: December 8, 2025
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          
          <Section number="1" title="Acceptance of Terms">
            <p>
              By accessing or using TeamNetwork (&quot;the Service&quot;), operated by McKillop LLC, you agree to
              comply with and be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree, you may
              not use the Service.
            </p>
          </Section>

          <Section number="2" title="Eligibility">
            <p>
              You must be at least 16 years old to use the Service. By using the Service, you represent and
              warrant that you meet this age requirement.
            </p>
          </Section>

          <Section number="3" title="Account Registration">
            <ul>
              <li>Users must provide accurate, complete, and current information.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are fully responsible for all activity occurring under your account.</li>
            </ul>
          </Section>

          <Section number="4" title="User Conduct">
            <p>You agree not to:</p>
            <ul>
              <li>Violate any applicable laws or regulations.</li>
              <li>Upload or transmit content that is illegal, harmful, threatening, abusive, harassing,
                defamatory, obscene, infringing, or otherwise objectionable.</li>
              <li>Attempt to access accounts, systems, or data not authorized to you.</li>
              <li>Reverse engineer, copy, modify, or exploit any portion of the Service or its technology.</li>
            </ul>
            <p className="mt-4 font-medium text-amber-600 dark:text-amber-400">
              Violation of these rules may result in immediate suspension or termination of your account.
            </p>
          </Section>

          <Section number="5" title="Intellectual Property & License">
            <ul>
              <li>TeamNetwork and its licensors retain all rights, title, and interest in the Service, including
                software, content, designs, trademarks, and logos.</li>
              <li>Users may not copy, modify, distribute, create derivative works, or reverse engineer any
                part of the Service.</li>
              <li>By submitting content, you grant TeamNetwork a non-exclusive, worldwide, royalty-free
                license to display and use your content solely to provide the Service.</li>
              <li>TeamNetwork reserves the right to remove any content that violates intellectual property
                rights or these Terms.</li>
            </ul>
          </Section>

          <Section number="6" title="Payments and Subscriptions">
            <ul>
              <li>Certain features may require payment; all fees are non-refundable unless required by law.</li>
              <li>TeamNetwork may adjust fees with notice.</li>
              <li>Unauthorized use or sharing of paid content is strictly prohibited.</li>
            </ul>
          </Section>

          <Section number="7" title="Donations and Mentorship">
            <ul>
              <li>The Service may include options to donate to teams or programs, or participate in
                mentorship opportunities. Users understand that all donations are voluntary and may be
                subject to separate terms and conditions.</li>
              <li>TeamNetwork does not guarantee mentorship outcomes or engagement levels;
                participation is at the discretion of mentors and teams.</li>
            </ul>
          </Section>

          <Section number="8" title="Termination">
            <ul>
              <li>TeamNetwork may suspend or terminate accounts at any time for violations of these Terms.</li>
              <li>Upon termination, your access to content and the Service is revoked, and no refunds will
                be provided.</li>
            </ul>
          </Section>

          <Section number="9" title="Disclaimers">
            <ul>
              <li>The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind.</li>
              <li>TeamNetwork disclaims all warranties, including merchantability, fitness for a particular
                purpose, and non-infringement.</li>
              <li>Use of the Service is at your own risk.</li>
            </ul>
          </Section>

          <Section number="10" title="Limitation of Liability">
            <p>To the fullest extent permitted by law, TeamNetwork shall not be liable for:</p>
            <ul>
              <li>Any direct, indirect, incidental, special, consequential, or punitive damages.</li>
              <li>Loss of profits, data, goodwill, or other intangible losses.</li>
              <li>Any claim arising from user content or user conduct.</li>
            </ul>
          </Section>

          <Section number="11" title="Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless TeamNetwork, McKillop LLC, and their
              affiliates from any claims, damages, or expenses arising from:
            </p>
            <ul>
              <li>Your use of the Service.</li>
              <li>Your violation of these Terms.</li>
              <li>Your violation of intellectual property or other rights.</li>
            </ul>
          </Section>

          <Section number="12" title="Dispute Resolution and Arbitration">
            <ul>
              <li>
                <strong>Binding Arbitration:</strong> Any dispute, claim, or controversy arising out of or relating to these
                Terms or your use of the Service shall be resolved exclusively through final and binding
                arbitration under the rules of the American Arbitration Association (AAA).
              </li>
              <li>
                <strong>Waiver of Class Actions:</strong> You agree that any arbitration shall be conducted only on an
                individual basis and not as a class, collective, or representative action, and you
                expressly waive the right to participate in any class, collective, or representative
                proceeding.
              </li>
              <li>
                <strong>No Jury Trial:</strong> You waive any right to a jury trial for any claims related to these Terms or
                the Service.
              </li>
              <li>
                <strong>Location and Costs:</strong> The arbitration will take place in New York, NY, unless we agree
                otherwise in writing. Each party will bear its own costs and fees, except as provided
                under the AAA rules.
              </li>
              <li>
                <strong>Enforceability:</strong> If any portion of this arbitration clause is found unenforceable, the
                remaining provisions shall remain in full force and effect.
              </li>
            </ul>
          </Section>

          <Section number="13" title="Changes to Terms">
            <p>
              TeamNetwork may modify these Terms at any time. Changes will be effective when posted.
              Continued use of the Service constitutes acceptance of the updated Terms.
            </p>
          </Section>

          <Section number="14" title="Governing Law">
            <p>
              These Terms are governed by the laws of the State of New York, without regard to conflict of law
              principles.
            </p>
          </Section>

          <Section number="15" title="Contact Information">
            <p>
              Email: <a href="mailto:mckillopm25@gmail.com" className="text-emerald-600 dark:text-emerald-400 hover:underline">mckillopm25@gmail.com</a>
            </p>
          </Section>

        </div>

        {/* Back to Home */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <Link href="/">
            <Button variant="secondary">
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-slate-400">
          <p>© {new Date().getFullYear()} TeamNetwork. Operated by McKillop LLC.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-3">
        <span className="flex-shrink-0 h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold flex items-center justify-center">
          {number}
        </span>
        {title}
      </h2>
      <div className="text-muted-foreground leading-relaxed pl-11">
        {children}
      </div>
    </section>
  );
}

