import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{"title": "Terms of Service — XAUT.trade"}, {"name": "description", "content": "Read the terms and conditions governing use of the XAUT.trade platform."}, {"property": "og:title", "content": "Terms of Service — XAUT.trade"}, {"property": "og:description", "content": "Read the terms and conditions governing use of the XAUT.trade platform."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary_large_image"}] }),
  component: TermsPage,
});

function TermsPage() {
  const updated = "June 1, 2026";
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Logo />
          <Link to="/signup" className="text-sm text-gold hover:underline">Back to sign up</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-10 md:py-14">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Terms and Conditions</h1>
        <p className="text-sm text-muted-foreground mt-2">Last updated: {updated}</p>

        <div className="prose prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground/90 space-y-6">
          <Section title="1. Introduction">
            <p>
              These Terms and Conditions (the "<strong>Terms</strong>") govern your access to and use of
              the XAUT.trade platform (the "<strong>Platform</strong>", "we", "us", or "our"), which
              facilitates the purchase, sale, custody, and redemption of Tether Gold ("<strong>XAUT</strong>"),
              a digital token whose value is intended to represent ownership of a fraction of one fine
              troy ounce of gold on a specified gold bar. By creating an account, accessing, or using the
              Platform, you ("<strong>you</strong>" or the "<strong>User</strong>") accept and agree to be
              bound by these Terms. If you do not agree, you must not use the Platform.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>You represent and warrant that you:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>are at least 18 years of age (or the age of majority in your jurisdiction);</li>
              <li>have the legal capacity to enter into a binding agreement;</li>
              <li>are not a resident of, citizen of, or located in a Prohibited Jurisdiction (including but not limited to the United States of America, Cuba, Iran, North Korea, Syria, the Crimea region, the so-called Donetsk and Luhansk People's Republics, and any other jurisdiction subject to comprehensive sanctions by the United Nations, the European Union, the United Kingdom, or the United States);</li>
              <li>are not listed on any sanctions list, including OFAC's SDN List;</li>
              <li>will use the Platform solely for lawful purposes and in compliance with all applicable laws.</li>
            </ul>
          </Section>

          <Section title="3. About Tether Gold (XAUT)">
            <p>
              XAUT is a digital asset issued by TG Commodities Limited. Each XAUT token is intended to
              represent ownership of one fine troy ounce of physical gold on a specific gold bar, held
              in a Swiss vault. XAUT is not legal tender, is not backed by any government, and is not
              insured by any deposit insurance scheme. Holding XAUT does not entitle you to any
              dividend, interest, voting right, or other distribution. Redemption of XAUT for physical
              gold (where available) is governed solely by the issuer's published policies and may be
              subject to minimum quantities, fees, identity verification, and geographic restrictions.
            </p>
          </Section>

          <Section title="4. Account Registration & Security">
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate, current, and complete information during registration and keep it updated.</li>
              <li>You are solely responsible for safeguarding your password, two-factor authentication, and any device used to access the Platform.</li>
              <li>You must notify us immediately of any unauthorized access or suspected security breach.</li>
              <li>We may suspend or terminate accounts that contain false information, show suspicious activity, or violate these Terms.</li>
            </ul>
          </Section>

          <Section title="5. KYC, AML & CTF Compliance">
            <p>
              We are committed to preventing money laundering, terrorist financing, and other financial
              crimes. You agree to complete identity verification (KYC) and provide any source-of-funds
              or source-of-wealth documentation we may request. We may, in our sole discretion, refuse,
              freeze, reverse, or report any transaction or account that we believe may be linked to
              fraud, sanctions evasion, market manipulation, or other illicit activity. By using the
              Platform you authorize us to share your information with regulators, law enforcement, and
              service providers as required by law.
            </p>
          </Section>

          <Section title="6. Trading, Pricing & Execution">
            <ul className="list-disc pl-5 space-y-1">
              <li>All trades are executed at the price displayed at the moment of order confirmation. Prices may change rapidly due to market volatility.</li>
              <li>We do not guarantee any specific price, liquidity, execution speed, or yield.</li>
              <li>Orders may be rejected, partially filled, cancelled, or rolled back due to market conditions, technical issues, or compliance reviews.</li>
              <li>Spreads, fees, and slippage are disclosed inside the trade interface and may be updated from time to time.</li>
            </ul>
          </Section>

          <Section title="7. Deposits & Withdrawals">
            <p>
              Deposits and withdrawals are processed on supported blockchain networks (e.g. Ethereum,
              Tron). Sending unsupported assets, or sending to or from a contract address that does not
              accept the token, may result in permanent loss of funds — for which we accept no liability.
              Withdrawals may be delayed or denied where required for AML/CTF screening, security
              review, or to comply with a lawful request.
            </p>
          </Section>

          <Section title="8. Risk Disclosure">
            <p>
              You acknowledge that trading digital assets including XAUT carries substantial risk,
              including but not limited to: high price volatility, loss of private keys, smart-contract
              bugs, blockchain reorganizations, regulatory changes, custodian insolvency, and total loss
              of capital. The price of gold may rise or fall; past performance is not indicative of
              future results. <strong>You should not deposit or trade with funds you cannot afford to
              lose.</strong> Nothing on the Platform constitutes financial, investment, tax, or legal
              advice.
            </p>
          </Section>

          <Section title="9. Prohibited Conduct">
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>use the Platform for any unlawful purpose or in furtherance of any criminal activity;</li>
              <li>engage in market manipulation, wash trading, spoofing, layering, or front-running;</li>
              <li>operate multiple accounts to circumvent limits, fees, or promotional rules;</li>
              <li>attempt to gain unauthorized access to any account, system, or data;</li>
              <li>introduce malware, scrape data, or interfere with the operation of the Platform;</li>
              <li>misrepresent your identity, residence, or beneficial ownership.</li>
            </ul>
          </Section>

          <Section title="10. Fees & Taxes">
            <p>
              You are responsible for all taxes, duties, and levies arising from your use of the
              Platform. We may withhold or report information to tax authorities where required by law.
              Platform fees are displayed before each transaction and may change with prior notice.
            </p>
          </Section>

          <Section title="11. Intellectual Property">
            <p>
              All content, trademarks, logos, software, and design elements on the Platform are owned
              by us or our licensors and are protected by applicable intellectual property laws. You
              are granted a limited, non-exclusive, revocable license to use the Platform for its
              intended purpose only.
            </p>
          </Section>

          <Section title="12. Suspension & Termination">
            <p>
              We may suspend, restrict, or terminate your access to the Platform at any time, with or
              without notice, including where we suspect violation of these Terms, applicable law, or
              risk to other users. Upon termination, you remain liable for any open positions, debts,
              or pending compliance reviews.
            </p>
          </Section>

          <Section title="13. Disclaimer of Warranties">
            <p>
              The Platform is provided on an "<strong>AS IS</strong>" and "<strong>AS AVAILABLE</strong>"
              basis without warranties of any kind, whether express, implied, statutory, or otherwise.
              We do not warrant that the Platform will be uninterrupted, secure, error-free, or that
              defects will be corrected.
            </p>
          </Section>

          <Section title="14. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, in no event shall the Platform, its affiliates,
              officers, employees, or agents be liable for any indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits, revenue, data, or goodwill,
              arising out of or related to your use of the Platform. Our aggregate liability shall not
              exceed the fees you paid to us in the 3 months preceding the event giving rise to the
              claim.
            </p>
          </Section>

          <Section title="15. Indemnity">
            <p>
              You agree to indemnify and hold harmless the Platform and its affiliates from any claim,
              demand, loss, or expense (including reasonable legal fees) arising out of your breach of
              these Terms, your misuse of the Platform, or your violation of any law or third-party
              right.
            </p>
          </Section>

          <Section title="16. Changes to the Terms">
            <p>
              We may update these Terms from time to time. Material changes will be notified through
              the Platform or by email. Your continued use after the effective date constitutes
              acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="17. Governing Law & Dispute Resolution">
            <p>
              These Terms are governed by the laws of the British Virgin Islands, without regard to
              conflict-of-law principles. Any dispute arising out of or relating to these Terms shall
              be resolved by binding arbitration administered under the BVI International Arbitration
              Centre Rules, seated in Road Town, Tortola, and conducted in English. You waive any
              right to participate in a class action.
            </p>
          </Section>

          <Section title="18. Contact">
            <p>
              For questions about these Terms, please reach our support team through the in-app Support
              section.
            </p>
          </Section>
        </div>

        <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} XAUT.trade. All rights reserved.</p>
          <Link to="/signup" className="text-sm rounded-lg bg-gradient-gold px-4 py-2 font-semibold text-primary-foreground shadow-gold">
            Continue to sign up
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-display font-semibold text-gold">{title}</h2>
      <div className="text-foreground/80">{children}</div>
    </section>
  );
}
