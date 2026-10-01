import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LegalPageShell from "@/components/app/LegalPageShell";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl, createPageMetadata, createSoftwareApplicationJsonLd, SITE_NAME } from "@/lib/seo/site";
import { getToolSeo } from "@/lib/seo/tool-seo";
import { getTool, tools } from "@/lib/tools/registry";

type ToolPageProps = {
  params: Promise<{ toolId: string }>;
};

export function generateStaticParams() {
  return tools.map((tool) => ({ toolId: tool.id }));
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { toolId } = await params;
  const seo = getToolSeo(toolId);
  if (!seo) return {};
  return createPageMetadata({
    title: seo.title,
    description: seo.description,
    path: `/tools/${toolId}`,
  });
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { toolId } = await params;
  const tool = getTool(toolId);
  const seo = getToolSeo(toolId);
  if (!tool || !seo) notFound();

  const jsonLd = createSoftwareApplicationJsonLd({
    name: `${tool.name} · ${SITE_NAME}`,
    description: seo.description,
    url: absoluteUrl(`/tools/${toolId}`),
    featureList: [tool.name, tool.category, "Local browser processing", "No file upload"],
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <LegalPageShell
        eyebrow={tool.category}
        title={tool.name}
        intro={
          <>
            {tool.description} Use this tool privately in your browser—your files are processed on-device and are not uploaded to StayLokal servers.
          </>
        }
      >
        <section>
          <h2>Privacy-first processing</h2>
          <p>
            StayLokal runs {tool.name.toLowerCase()} entirely in your browser. Drop a compatible file on the home workspace,
            or open the tool directly to start with the right workflow selected.
          </p>
        </section>
        <p>
          <Link className="rules-cta" href={`/?tool=${tool.id}`}>Use {tool.name}</Link>
        </p>
        <p>
          <Link href="/tools">Browse all tools</Link>
        </p>
      </LegalPageShell>
    </>
  );
}
