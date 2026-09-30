import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/app/ThemeToggle";
import { FOUNDER_X_HANDLE, FOUNDER_X_URL } from "@/lib/app/site-links";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  intro: ReactNode;
  children: ReactNode;
};

export default function LegalPageShell({ eyebrow, title, intro, children }: LegalPageShellProps) {
  return (
    <main className="rules-page">
      <header className="rules-header">
        <Link className="rules-brand" href="/">
          <Image alt="" className="brand-logo" height={30} src="/images/logo.png" width={34} />
          <span>StayLokal</span>
        </Link>
        <div className="rules-header-actions">
          <ThemeToggle />
          <Link className="rules-back" href="/">← Back</Link>
        </div>
      </header>
      <article className="rules-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="rules-intro">{intro}</p>
        {children}
        <footer className="legal-card-footer">
          <nav aria-label="Site policies" className="legal-inline-nav">
            <Link href="/privacy">Privacy</Link>
            <Link href="/rules">Sponsor rules</Link>
            <Link href="/donate">Donate</Link>
          </nav>
          <p className="rules-note legal-contact-note">
            Questions or support?{" "}
            <a href={FOUNDER_X_URL} rel="noreferrer noopener" target="_blank">
              Contact {FOUNDER_X_HANDLE} on X
            </a>
            .
          </p>
          <Link className="rules-cta" href="/">Return to StayLokal</Link>
        </footer>
      </article>
    </main>
  );
}
