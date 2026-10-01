import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";
import ThemeToggle from "@/components/app/ThemeToggle";
import { createPageMetadata, createSoftwareApplicationJsonLd, SITE_NAME, absoluteUrl } from "@/lib/seo/site";
import { getAllToolSeo } from "@/lib/seo/tool-seo";
import { tools } from "@/lib/tools/registry";

export const metadata: Metadata = createPageMetadata({
  title: "All file tools · StayLokal",
  description:
    "Browse every StayLokal PDF, image, video, audio, document, and ZIP tool. Private in-browser processing—no upload, no account.",
  path: "/tools",
});

const categories = ["PDF", "Image", "Video", "Audio", "Other"] as const;

export default function AllToolsPage() {
  const jsonLd = createSoftwareApplicationJsonLd({
    name: `${SITE_NAME} — all tools`,
    description: "Directory of local-first file tools for PDF, image, video, audio, documents, and archives.",
    url: absoluteUrl("/tools"),
    featureList: tools.map((tool) => tool.name),
  });

  const seoById = new Map(getAllToolSeo().map((entry) => [entry.id, entry.seo]));

  return (
    <main className="rules-page">
      <JsonLd data={jsonLd} />
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
        <p className="eyebrow">Tools</p>
        <h1>All StayLokal tools</h1>
        <p className="rules-intro">
          Every tool runs in your browser on the files you choose. Nothing is uploaded for processing; no account is required.
        </p>
        {categories.map((category) => {
          const categoryTools = tools.filter((tool) => tool.category === category);
          if (!categoryTools.length) return null;
          return (
            <section key={category}>
              <h2>{category}</h2>
              <ul className="tool-seo-directory">
                {categoryTools.map((tool) => {
                  const seo = seoById.get(tool.id);
                  return (
                    <li key={tool.id}>
                      <Link href={`/tools/${tool.id}`}>{tool.name}</Link>
                      <p>{seo?.description ?? tool.description}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        <footer className="legal-card-footer">
          <nav aria-label="Site policies" className="legal-inline-nav">
            <Link href="/privacy">Privacy</Link>
            <Link href="/rules">Sponsor rules</Link>
            <Link href="/donate">Donate</Link>
          </nav>
          <Link className="rules-cta" href="/">Open StayLokal</Link>
        </footer>
      </article>
    </main>
  );
}
