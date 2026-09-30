import type { Metadata } from "next";
import Link from "next/link";
import LegalPageShell from "@/components/app/LegalPageShell";

export const metadata: Metadata = {
  title: "Sponsor rules · StayLokal",
  description:
    "How StayLokal sponsor leaderboard ranking, bidding, payments, content eligibility, and charity pledge work.",
};

export default function RulesPage() {
  return (
    <LegalPageShell
      eyebrow="Sponsor leaderboard"
      title="Placement rules"
      intro={
        <>
          A clear, limited placement system for companies that want to support StayLokal and be seen by its
          users. File tools on StayLokal remain local; sponsor listings are the only paid, server-visible
          promotion surface.
        </>
      }
    >
      <section>
        <h2>How ranking works</h2>
        <p>
          There are five sponsor positions. Sponsors are ranked from highest to lowest bid. The highest bid is
          rank #1, and each following bid occupies the next available position. Ties break by earlier verified
          payment, then stable sponsor ID.
        </p>
      </section>

      <section>
        <h2>How to claim a position</h2>
        <ol>
          <li>Choose an available position or select a sponsor to outbid.</li>
          <li>Enter company details and a bid that meets the minimum shown at checkout.</li>
          <li>Complete payment through Dodo Payments hosted checkout.</li>
          <li>Your placement becomes active only after the payment webhook is verified on our servers.</li>
        </ol>
        <p>No account is required. If you are already on the board, enter the same site URL or X handle again with a higher <strong>total</strong> bid. Checkout charges only the difference from your current amount (minimum $1.00 payment).</p>
      </section>

      <section>
        <h2>Raising your existing placement</h2>
        <p>
          Example: you are on the board at <strong>$20</strong> and you want your listing to show <strong>$30</strong>.
          Open the sponsor form again, use the same link or handle, set your bid to <strong>$30</strong>, and pay
          <strong> $10</strong> at checkout. Your displayed total becomes $30 and your rank is recalculated when payment
          is confirmed.
        </p>
        <p>
          Final rank is decided at payment confirmation. If someone else pays more while you are checking out, you may
          land lower than the rank you were aiming for.
        </p>
      </section>

      <section>
        <h2>Bid and replacement rules</h2>
        <ul>
          <li>A bid must meet the current minimum for its selected rank (at least one cent above the incumbent when outbidding).</li>
          <li>Higher bids rank above lower bids automatically.</li>
          <li>When a new sponsor enters the top five, the lowest-ranked placement is removed from the active leaderboard.</li>
          <li>Payments are one-time sponsor placement payments; they do not create a recurring subscription.</li>
          <li>Sponsor bids and donations are subject to published minimum and maximum amounts at checkout.</li>
        </ul>
      </section>

      <section>
        <h2>Content and eligibility</h2>
        <p>
          Sponsor names, descriptions, destinations, and logos must be accurate and lawful. StayLokal may reject
          or remove content that is deceptive, illegal, harmful, infringing, or unrelated to a legitimate product
          or service.
        </p>
        <ul>
          <li>Destination links must be valid HTTPS URLs or supported social handles as shown in the form.</li>
          <li>Logos must be PNG, JPEG, or WebP and within the size limit shown in the sponsor flow.</li>
          <li>Do not upload another party&apos;s trademark or imagery without permission.</li>
        </ul>
      </section>

      <section>
        <h2>Payment and activation</h2>
        <p>
          Dodo Payments handles checkout and payment receipts. A browser return does not activate a placement by
          itself; activation occurs only after a verified payment event is received and processed.
        </p>
        <p>
          Failed, disputed, or reversed payments may result in a listing not going live or being removed after
          review. StayLokal does not guarantee refunds for completed sponsor placements except where required by
          law or explicitly agreed in writing.
        </p>
      </section>

      <section>
        <h2>Charity pledge</h2>
        <p>
          StayLokal pledges that <strong>50% of net amounts received from donations and sponsor placement
          payments</strong> will go to charitable causes. Nonprofit partners may change over time. If you know a
          charitable organization we should consider, please reach out on X (see contact below).
        </p>
        <p>
          This pledge is a commitment of the project operator, not a separate legal entity or donor-advised fund.
          For how we handle personal data in payments, see our <Link href="/privacy">privacy policy</Link>.
        </p>
      </section>

      <section>
        <h2>No traffic guarantee</h2>
        <p className="rules-note">
          StayLokal does not guarantee traffic, conversions, clicks, or a specific number of impressions from a
          sponsor placement. Placements are visible on the public site when active; actual views depend on normal
          site usage.
        </p>
      </section>
    </LegalPageShell>
  );
}
