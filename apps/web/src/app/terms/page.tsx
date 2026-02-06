import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Klippli Terms and Conditions of Service.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-12"
        >
          &larr; Back to home
        </Link>

        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-muted-foreground mb-12">
          Last updated: November 25, 2025
        </p>

        <article className="prose prose-invert prose-sm max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-4 [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_li]:text-muted-foreground [&_ul]:space-y-1">
          <h2>General Terms</h2>
          <p>
            By accessing Klippli, users agree to be bound by these terms. The
            service is provided &ldquo;as-is&rdquo; without warranties. Klippli
            disclaims liability for damages arising from service use, including
            loss of data or profit. The company reserves rights to modify pricing
            and usage policies without notice.
          </p>

          <h2>License</h2>
          <p>
            Klippli grants a revocable, non-exclusive, non-transferable, limited
            license to download and use the website per agreement terms. Users
            cannot transfer this license and must comply with all stated
            restrictions.
          </p>

          <h2>Definitions and Key Terms</h2>
          <ul className="list-disc pl-5">
            <li>
              <strong className="text-foreground">Cookie:</strong> Data stored by
              browsers for identification and analytics.
            </li>
            <li>
              <strong className="text-foreground">Company:</strong> PE Livshits
              Ilia Aleksandrovich, 1 Leo St, 85, Yerevan, 0015.
            </li>
            <li>
              <strong className="text-foreground">Device:</strong>{" "}
              Internet-connected equipment accessing the service.
            </li>
            <li>
              <strong className="text-foreground">Service:</strong>{" "}
              Klippli&apos;s platform offerings.
            </li>
            <li>
              <strong className="text-foreground">Third-party service:</strong>{" "}
              External partners and advertisers.
            </li>
            <li>
              <strong className="text-foreground">Website:</strong>{" "}
              klippli.com.
            </li>
            <li>
              <strong className="text-foreground">You:</strong> Registered
              service users.
            </li>
          </ul>

          <h2>Restrictions</h2>
          <p>
            Users cannot: license, sell, or commercially exploit the platform;
            modify or reverse-engineer components; or remove proprietary notices.
          </p>

          <h2>Return and Refund Policy</h2>
          <p>
            Dissatisfied customers should contact support to discuss concerns
            about products or services received.
          </p>

          <h2>Your Suggestions</h2>
          <p>
            User feedback becomes the sole and exclusive property of Klippli
            without compensation or attribution requirements.
          </p>

          <h2>Your Consent</h2>
          <p>
            By using the website or making purchases, users consent to these
            terms.
          </p>

          <h2>Links to Other Websites</h2>
          <p>
            Klippli isn&apos;t responsible for external sites&apos; content or
            accuracy. Third-party sites operate under separate rules and may use
            cookies.
          </p>

          <h2>Cookies</h2>
          <p>
            Klippli uses cookies for functionality and analytics. Users can
            disable cookies but may lose features like video playback and login
            persistence. No personally identifiable information is stored in
            cookies.
          </p>

          <h2>Changes to Terms &amp; Conditions</h2>
          <p>
            Klippli may discontinue services without notice. Changes posted here
            take effect upon publication.
          </p>

          <h2>Modifications and Updates</h2>
          <p>
            The company reserves rights to modify or discontinue services
            temporarily or permanently. Updates are integral to the platform and
            binding on users.
          </p>

          <h2>Third-Party Services</h2>
          <p>
            Klippli isn&apos;t responsible for third-party content accuracy,
            completeness, or legality. Users access these services entirely at
            their own risk.
          </p>

          <h2>Term and Termination</h2>
          <p>
            This agreement continues until either party terminates it. Klippli
            may suspend or terminate accounts for any reason without notice.
            Non-compliance triggers immediate termination.
          </p>

          <h2>Copyright Infringement Notice</h2>
          <p>
            Copyright owners claiming infringement must provide: signature,
            material identification, contact information, good-faith belief
            statement, and accuracy certification.
          </p>

          <h2>Indemnification</h2>
          <p>
            Users agree to indemnify Klippli and its affiliates from claims
            arising from user actions, agreement violations, or third-party
            rights breaches.
          </p>

          <h2>No Warranties</h2>
          <p>
            The website is provided &ldquo;AS IS&rdquo; and &ldquo;AS
            AVAILABLE&rdquo; with all faults. Klippli disclaims all
            warranties&mdash;express, implied, or statutory&mdash;regarding
            operation, accuracy, reliability, and security.
          </p>

          <h2>Limitation of Liability</h2>
          <p>
            Liability is limited to amounts paid for the website. Klippli
            isn&apos;t liable for special, incidental, indirect, or
            consequential damages, including lost profits or data.
          </p>

          <h2>Severability</h2>
          <p>
            Invalid provisions are reformed to maximum extent possible under law;
            remaining terms continue in effect. Users and Klippli agree disputes
            must commence within one (1) year or become permanently barred.
          </p>

          <h2>Waiver</h2>
          <p>
            Failure to exercise rights doesn&apos;t constitute waiver of future
            enforcement.
          </p>

          <h2>Amendments to This Agreement</h2>
          <p>
            Klippli may modify terms anytime, providing 30 days&apos; notice for
            material changes. Continued use constitutes acceptance; disagreement
            requires account deletion.
          </p>

          <h2>Entire Agreement</h2>
          <p>
            This agreement supersedes all prior understandings. Additional terms
            apply to specific service purchases.
          </p>

          <h2>Intellectual Property</h2>
          <p>
            Klippli owns all website content, features, and functionality,
            protected by international copyright and trademark law. Unauthorized
            copying or distribution is prohibited.
          </p>

          <h2>Agreement to Arbitrate</h2>
          <p>
            Disputes (except intellectual property claims) are resolved through
            binding arbitration under American Arbitration Association rules, not
            court litigation.
          </p>

          <h2>Notice of Dispute</h2>
          <p>
            Disputes require written notice via email detailing facts and relief
            sought. Parties attempt informal resolution within 60 days before
            arbitration.
          </p>

          <h2>Binding Arbitration</h2>
          <p>
            Unresolved disputes proceed to binding arbitration. Users waive jury
            trial rights. Prevailing parties recover legal and accounting costs.
          </p>

          <h2>Promotions</h2>
          <p>
            Klippli may conduct contests with separate eligibility rules. Users
            must comply with promotion-specific terms and rules.
          </p>

          <h2>Typographical Errors</h2>
          <p>
            Klippli may cancel orders with incorrect pricing or information
            without liability, issuing refunds immediately if charged.
          </p>

          <h2>Miscellaneous</h2>
          <p>
            If provisions are unenforceable, remaining terms persist. Klippli
            qualifies for injunctive relief for breaches. The service isn&apos;t
            intended for jurisdictions where distribution violates local law.
          </p>

          <h2>Disclaimer</h2>
          <p>
            Klippli isn&apos;t responsible for content imprecision or errors. The
            service is provided &ldquo;as is&rdquo; without warranties. Klippli
            acts as distributor, not publisher, and exercises no editorial
            control over third-party content.
          </p>

          <h2>Contact Us</h2>
          <p>
            For questions, contact us at{" "}
            <a
              href="mailto:support@klippli.com"
              className="text-primary hover:underline"
            >
              support@klippli.com
            </a>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
