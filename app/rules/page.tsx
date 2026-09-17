import Link from "next/link";

export default function RulesPage() {
  return (
    <main className="rules-page">
      <header className="rules-header">
        <Link className="rules-brand" href="/">
          <img src="/images/logo.png" alt="" />
          <span>StayLokal</span>
        </Link>
        <Link className="rules-back" href="/">← Back to StayLokal</Link>
      </header>
      <article className="rules-card">
        <p className="eyebrow">Sponsor leaderboard</p>
        <h1>Placement rules</h1>
        <p className="rules-intro">A clear, limited placement system for companies that want to support StayLokal and be seen by its users.</p>
        <section>
          <h2>How ranking works</h2>
          <p>There are five sponsor positions. Sponsors are ranked from highest to lowest bid. The highest bid is rank #1, and each following bid occupies the next available position.</p>
        </section>
        <section>
          <h2>How to claim a position</h2>
          <ol>
            <li>Choose an available position or select a sponsor to outbid.</li>
            <li>Enter a bid that meets the minimum shown at checkout.</li>
            <li>Complete payment through Dodo Payments.</li>
            <li>Your placement becomes active after the payment webhook is verified.</li>
          </ol>
        </section>
        <section>
          <h2>Bid and replacement rules</h2>
          <ul>
            <li>A bid must meet the current minimum for its selected rank.</li>
            <li>Higher bids rank above lower bids automatically.</li>
            <li>When a new sponsor enters the top five, the lowest-ranked placement is removed from the active leaderboard.</li>
            <li>Payments are one-time sponsor placement payments; they do not create a recurring subscription.</li>
          </ul>
        </section>
        <section>
          <h2>Content and eligibility</h2>
          <p>Sponsor names, descriptions, destinations, and logos must be accurate and lawful. StayLokal may reject or remove content that is deceptive, illegal, harmful, infringing, or unrelated to a legitimate product or service.</p>
        </section>
        <section>
          <h2>Payment and activation</h2>
          <p>Dodo Payments handles checkout and payment receipts. A browser return does not activate a placement by itself; activation occurs only after a verified payment event is received and processed.</p>
        </section>
        <p className="rules-note">StayLokal does not guarantee traffic, conversions, or a specific number of impressions from a sponsor placement.</p>
        <Link className="rules-cta" href="/">Return to StayLokal</Link>
      </article>
    </main>
  );
}
