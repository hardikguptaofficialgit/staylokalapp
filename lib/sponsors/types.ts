export const SPONSOR_SLOT_COUNT = 5;
export const MINIMUM_SPONSOR_BID_CENTS = 100;

export const SPONSOR_CATEGORIES = [
  "AI Agents & Infrastructure",
  "SEO & AI Visibility",
  "Marketing & Advertising",
  "Analytics",
  "Crypto, Web3 & Investing",
  "Developer Tools",
  "Business, Finance & Legal",
  "Security, Privacy & Compliance",
  "Health, Fitness & Wellness",
  "Social Media & Creator Tools",
  "Leaderboards & Attention Markets",
  "Hiring, Jobs & Careers",
  "Education & Learning",
  "Agencies, Studios & Services",
  "Ecommerce & Retail",
  "Domains & Web Assets",
  "Games & Entertainment",
  "People & Profiles",
  "Productivity & Personal Tools",
  "Design & Creative",
  "Writing & Content",
  "Directories, Launch & Discovery",
  "AI Media Generation",
  "Audio, Voice & Podcasting",
  "Sales & Lead Generation",
  "Travel, Local & Lifestyle",
  "Real Estate & Property",
  "Media & News",
  "Other",
] as const;

export type SponsorCategory = (typeof SPONSOR_CATEGORIES)[number];

export type SponsorStatus = "active" | "outbid";

export type SponsorRecord = {
  id: string;
  companyName: string;
  destinationUrl: string;
  handle?: string;
  category: SponsorCategory;
  description: string;
  logoUrl?: string;
  bidCents: number;
  paidAt: string;
  status: SponsorStatus;
};

export type RankedSponsor = SponsorRecord & { rank: number };

export type SponsorClaimInput = {
  companyName?: unknown;
  destination?: unknown;
  category?: unknown;
  description?: unknown;
  bidCents?: unknown;
  logoDataUrl?: unknown;
};

export type ValidatedSponsorClaim = {
  companyName: string;
  destinationUrl: string;
  handle?: string;
  category: SponsorCategory;
  description: string;
  bidCents: number;
  logoDataUrl?: string;
};
