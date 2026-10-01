import type { Metadata } from "next";
import HomeClient from "@/components/app/HomeClient";
import HomeSeoContent from "@/components/seo/HomeSeoContent";
import JsonLd from "@/components/seo/JsonLd";
import {
  createPageMetadata,
  createSoftwareApplicationJsonLd,
  SITE_DESCRIPTION,
  SITE_HOME_TITLE,
  SITE_NAME,
  absoluteUrl,
} from "@/lib/seo/site";
import { tools } from "@/lib/tools/registry";

export const metadata: Metadata = createPageMetadata({
  title: SITE_HOME_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
});

const homeJsonLd = createSoftwareApplicationJsonLd({
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  url: absoluteUrl("/"),
  featureList: tools.map((tool) => tool.name),
});

export default function Home() {
  return (
    <>
      <JsonLd data={homeJsonLd} />
      <HomeSeoContent />
      <HomeClient />
    </>
  );
}
