import { rankSponsors } from "./ranking";
import type { SponsorRecord, SponsorStatus } from "./types";

function hasBaseConfig(): boolean {
  return Boolean(
    process.env.APPWRITE_ENDPOINT
    && process.env.APPWRITE_PROJECT_ID
    && process.env.APPWRITE_API_KEY
    && process.env.APPWRITE_DATABASE_ID
    && process.env.APPWRITE_SPONSORS_TABLE_ID,
  );
}

export function appwriteIsConfigured(): boolean {
  return hasBaseConfig();
}

export function appwriteClaimsAreConfigured(): boolean {
  return hasBaseConfig() && Boolean(process.env.APPWRITE_CLAIMS_TABLE_ID);
}

type AppwriteRow = {
  $id: string;
  [key: string]: unknown;
};

type QueryValue = {
  method: string;
  attribute?: string;
  values?: unknown[];
};

const Query = {
  equal: (attribute: string, value: unknown) => ({
    method: "equal",
    attribute,
    values: [value],
  }),
  limit: (value: number) => ({
    method: "limit",
    values: [value],
  }),
};

const uniqueId = () => crypto.randomUUID();

function appwriteUrl(path: string) {
  const endpoint = process.env.APPWRITE_ENDPOINT!.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${endpoint}${path}`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", process.env.APPWRITE_PROJECT_ID!);
  headers.set("X-Appwrite-Key", process.env.APPWRITE_API_KEY!);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(appwriteUrl(path), { ...init, headers });
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`Appwrite request failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`);
  }
  return body as T;
}

function rowPath(tableId: string, rowId?: string) {
  const suffix = rowId ? `/${encodeURIComponent(rowId)}` : "";
  return `/v1/tablesdb/${encodeURIComponent(process.env.APPWRITE_DATABASE_ID!)}/tables/${encodeURIComponent(tableId)}/rows${suffix}`;
}

function services() {
  if (!appwriteIsConfigured()) {
    throw new Error("Appwrite sponsor storage is not configured.");
  }

  const tables = {
    listRows: async ({ tableId, queries = [], transactionId }: {
      databaseId?: string;
      tableId: string;
      queries?: QueryValue[];
      transactionId?: string;
    }) => {
      const params = new URLSearchParams();
      queries.forEach((query, index) => params.set(`queries[${index}]`, JSON.stringify(query)));
      if (transactionId) params.set("transactionId", transactionId);
      return request<{ rows: AppwriteRow[] }>(`${rowPath(tableId)}?${params}`);
    },
    createRow: ({ tableId, rowId, data, transactionId }: {
      databaseId?: string;
      tableId: string;
      rowId: string;
      data: Record<string, unknown>;
      transactionId?: string;
    }) => request<AppwriteRow>(rowPath(tableId), {
      method: "POST",
      body: JSON.stringify({ rowId, data, ...(transactionId ? { transactionId } : {}) }),
    }),
    getRow: ({ tableId, rowId, transactionId }: {
      databaseId?: string;
      tableId: string;
      rowId: string;
      transactionId?: string;
    }) => request<AppwriteRow>(`${rowPath(tableId, rowId)}${transactionId ? `?transactionId=${encodeURIComponent(transactionId)}` : ""}`),
    updateRow: ({ tableId, rowId, data, transactionId }: {
      databaseId?: string;
      tableId: string;
      rowId: string;
      data: Record<string, unknown>;
      transactionId?: string;
    }) => request<AppwriteRow>(rowPath(tableId, rowId), {
      method: "PATCH",
      body: JSON.stringify({ data, ...(transactionId ? { transactionId } : {}) }),
    }),
  };

  const databases = {
    createTransaction: (options?: { ttl?: number }) => request<{ $id: string }>("/v1/tablesdb/transactions", {
      method: "POST",
      body: JSON.stringify({ ttl: options?.ttl ?? 60 }),
    }),
    updateTransaction: ({ transactionId, commit, rollback }: {
      transactionId: string;
      commit?: boolean;
      rollback?: boolean;
    }) => request(`/v1/tablesdb/transactions/${encodeURIComponent(transactionId)}`, {
      method: "PATCH",
      body: JSON.stringify({ commit, rollback }),
    }),
  };

  const storage = {
    createFile: async ({ bucketId, fileId, bytes, filename, contentType }: {
      bucketId: string;
      fileId: string;
      bytes: Uint8Array;
      filename: string;
      contentType: string;
    }) => {
      const form = new FormData();
      form.append("fileId", fileId);
      form.append("file", new Blob([bytes.buffer as ArrayBuffer], { type: contentType }), filename);
      return request<{ $id: string }>(`/v1/storage/buckets/${encodeURIComponent(bucketId)}/files`, {
        method: "POST",
        body: form,
      });
    },
  };

  return { databases, tables, storage };
}

function fromRow(row: AppwriteRow): SponsorRecord {
  const data = row as Record<string, unknown>;
  return {
    bidCents: Number(data.bidCents),
    category: data.category as SponsorRecord["category"],
    companyName: String(data.companyName),
    description: String(data.description),
    destinationUrl: String(data.destinationUrl),
    handle: data.handle ? String(data.handle) : undefined,
    id: row.$id,
    logoUrl: data.logoUrl ? String(data.logoUrl) : undefined,
    paidAt: String(data.paidAt),
    status: data.status as SponsorStatus,
  };
}

export async function listActiveSponsors(): Promise<SponsorRecord[]> {
  const { tables } = services();
  const result = await tables.listRows({
    tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    queries: [Query.equal("status", "active"), Query.limit(100)],
  });
  return result.rows.map(fromRow);
}

export async function createPendingClaim(data: Record<string, unknown>) {
  const { tables } = services();
  return tables.createRow({
    tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    rowId: uniqueId(),
    data,
  });
}

export async function findClaimById(claimId: string) {
  const { tables } = services();
  return tables.getRow({
    tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    rowId: claimId,
  });
}

export async function markClaimPaid(claimId: string, paymentId: string) {
  const { tables } = services();
  return tables.updateRow({
    tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    rowId: claimId,
    data: { paymentId, status: "paid" },
  });
}

export async function createActiveSponsor(data: Record<string, unknown>) {
  const { tables } = services();
  return tables.createRow({
    tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    rowId: uniqueId(),
    data: { ...data, status: "active" satisfies SponsorStatus },
  });
}

export async function markSponsorsOutbid(ids: string[]) {
  if (!ids.length) return;
  const { tables } = services();
  for (const rowId of ids) {
    await tables.updateRow({
      tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      rowId,
      data: { status: "outbid" satisfies SponsorStatus },
    });
  }
}

export async function activateClaim(claimId: string, paymentId: string) {
  const { databases, tables } = services();
  const claim = await tables.getRow({
    tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
    databaseId: process.env.APPWRITE_DATABASE_ID!,
    rowId: claimId,
  });
  const claimData = claim as unknown as Record<string, unknown>;

  if (claimData.status === "activated") {
    if (claimData.paymentId && claimData.paymentId !== paymentId) {
      throw new Error("Claim is already activated by a different payment.");
    }
    return;
  }
  if (claimData.status !== "pending" && claimData.status !== "paid") {
    throw new Error("Claim is not eligible for activation.");
  }

  const transaction = await databases.createTransaction({ ttl: 60 });
  try {
    const transactionalClaim = await tables.getRow({
      tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      rowId: claimId,
      transactionId: transaction.$id,
    });
    const transactionalClaimData = transactionalClaim as unknown as Record<string, unknown>;
    if (transactionalClaimData.status === "activated") {
      if (transactionalClaimData.paymentId && transactionalClaimData.paymentId !== paymentId) {
        throw new Error("Claim is already activated by a different payment.");
      }
      await databases.updateTransaction({ commit: true, transactionId: transaction.$id });
      return;
    }

    const activeRows = await tables.listRows({
      tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      queries: [Query.equal("status", "active"), Query.limit(100)],
      transactionId: transaction.$id,
    });
    const activeSponsors = activeRows.rows.map(fromRow);
    const sponsorId = uniqueId();
    const paidAt = new Date().toISOString();
    const newSponsor: SponsorRecord = {
      bidCents: Number(claimData.bidCents),
      category: claimData.category as SponsorRecord["category"],
      companyName: String(claimData.companyName),
      description: String(claimData.description),
      destinationUrl: String(claimData.destinationUrl),
      handle: claimData.handle ? String(claimData.handle) : undefined,
      id: sponsorId,
      logoUrl: claimData.logoUrl ? String(claimData.logoUrl) : undefined,
      paidAt,
      status: "active",
    };
    const ranked = rankSponsors([...activeSponsors, newSponsor]);
    const visibleIds = new Set(ranked.map((sponsor) => sponsor.id));
    const displacedIds = activeSponsors
      .filter((sponsor) => !visibleIds.has(sponsor.id))
      .map((sponsor) => sponsor.id);

    await tables.createRow({
      tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      rowId: sponsorId,
      data: {
        bidCents: newSponsor.bidCents,
        category: newSponsor.category,
        claimId,
        companyName: newSponsor.companyName,
        description: newSponsor.description,
        destinationUrl: newSponsor.destinationUrl,
        handle: newSponsor.handle ?? "",
        logoUrl: newSponsor.logoUrl ?? "",
        paidAt,
        paymentId,
        status: "active",
      },
      transactionId: transaction.$id,
    });

    for (const documentId of displacedIds) {
      await tables.updateRow({
        tableId: process.env.APPWRITE_SPONSORS_TABLE_ID!,
        databaseId: process.env.APPWRITE_DATABASE_ID!,
        rowId: documentId,
        data: { status: "outbid" satisfies SponsorStatus },
        transactionId: transaction.$id,
      });
    }

    await tables.updateRow({
      tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      rowId: claimId,
      data: { paymentId, sponsorId, status: "activated" },
      transactionId: transaction.$id,
    });
    await databases.updateTransaction({ commit: true, transactionId: transaction.$id });
  } catch (error) {
    await databases.updateTransaction({ rollback: true, transactionId: transaction.$id }).catch(() => undefined);
    const latestClaim = await tables.getRow({
      tableId: process.env.APPWRITE_CLAIMS_TABLE_ID!,
      databaseId: process.env.APPWRITE_DATABASE_ID!,
      rowId: claimId,
    }).catch(() => undefined);
    const latestClaimData = latestClaim as unknown as Record<string, unknown> | undefined;
    if (latestClaimData?.status === "activated") {
      if (latestClaimData.paymentId && latestClaimData.paymentId !== paymentId) {
        throw new Error("Claim is already activated by a different payment.");
      }
      return;
    }
    throw error;
  }
}

export async function uploadSponsorLogo(dataUrl: string, claimId: string): Promise<string | undefined> {
  const bucketId = process.env.APPWRITE_SPONSOR_BUCKET_ID;
  if (!bucketId) return undefined;

  const match = /^data:(image\/(png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return undefined;
  const extension = match[2] === "jpeg" ? "jpg" : match[2];
  const binary = atob(match[3]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const { storage } = services();
  const file = await storage.createFile({
    bucketId,
    bytes,
    contentType: match[1],
    filename: `${claimId}.${extension}`,
    fileId: uniqueId(),
  });
  return `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${file.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
}
