import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <div className="offline-page-card">
        <Image
          alt=""
          className="offline-page-logo"
          height={56}
          priority
          src="/images/pwa/icon-192.png"
          width={56}
        />
        <h1>You&apos;re offline</h1>
        <p>
          StayLokal can still run file tools from cache after you&apos;ve opened the app online at least once. Sponsor,
          donate, and checkout need a connection.
        </p>
        <Link className="offline-page-link" href="/">Back to StayLokal</Link>
      </div>
    </main>
  );
}
