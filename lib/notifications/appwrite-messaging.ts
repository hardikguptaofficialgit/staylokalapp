import { createHash } from "node:crypto";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function appwriteMessagingIsConfigured(): boolean {
  return Boolean(
    process.env.APPWRITE_ENDPOINT
    && process.env.APPWRITE_PROJECT_ID
    && process.env.APPWRITE_API_KEY,
  );
}

function appwriteUrl(path: string) {
  const endpoint = process.env.APPWRITE_ENDPOINT!.replace(/\/+$/, "").replace(/\/v1$/, "");
  return `${endpoint}${path}`;
}

type AppwriteErrorBody = {
  type?: string;
  code?: number;
  message?: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("X-Appwrite-Project", process.env.APPWRITE_PROJECT_ID!);
  headers.set("X-Appwrite-Key", process.env.APPWRITE_API_KEY!);
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(appwriteUrl(path), { ...init, headers });
  const text = await response.text();
  let body: unknown = undefined;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const error = new Error(
      `Appwrite request failed (${response.status}): ${typeof body === "string" ? body : JSON.stringify(body)}`,
    ) as Error & { status?: number; appwrite?: AppwriteErrorBody };
    error.status = response.status;
    if (body && typeof body === "object") error.appwrite = body as AppwriteErrorBody;
    throw error;
  }

  return body as T;
}

function isConflict(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { status?: number }).status === 409);
}

function isNotFound(error: unknown) {
  return Boolean(error && typeof error === "object" && (error as { status?: number }).status === 404);
}

export function messagingUserIdForEmail(email: string) {
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  return `sl_${digest.slice(0, 33)}`;
}

export function messagingTargetIdForEmail(email: string) {
  const digest = createHash("sha256").update(`target:${email.trim().toLowerCase()}`).digest("hex");
  return `tgt_${digest.slice(0, 32)}`;
}

export function messagingMessageId(idempotencyKey: string) {
  const digest = createHash("sha256").update(idempotencyKey).digest("hex");
  return `msg_${digest.slice(0, 32)}`;
}

type TargetRow = {
  $id: string;
  identifier?: string;
};

type UserRow = {
  $id: string;
  email?: string;
  emailCanonical?: string;
  targets?: TargetRow[];
};

type ProviderRow = {
  $id: string;
  enabled?: boolean;
  type?: string;
};

let cachedEmailProviderId: string | null | undefined;

async function resolveEmailProviderId(): Promise<string | undefined> {
  const configured = process.env.APPWRITE_MESSAGING_EMAIL_PROVIDER_ID?.trim();
  if (configured) return configured;

  if (cachedEmailProviderId !== undefined) {
    return cachedEmailProviderId ?? undefined;
  }

  try {
    const listed = await request<{ providers: ProviderRow[] }>("/v1/messaging/providers?total=false");
    const provider = listed.providers?.find((row) => row.enabled && row.type === "email");
    cachedEmailProviderId = provider?.$id ?? null;
  } catch {
    cachedEmailProviderId = null;
  }

  return cachedEmailProviderId ?? undefined;
}

function matchesEmail(user: UserRow, email: string) {
  const normalized = email.toLowerCase();
  if (user.email?.toLowerCase() === normalized || user.emailCanonical?.toLowerCase() === normalized) {
    return true;
  }
  return user.targets?.some((target) => target.identifier?.toLowerCase() === normalized) ?? false;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let cursor: string | undefined;

  for (;;) {
    const params = new URLSearchParams();
    params.set("queries[0]", JSON.stringify({ method: "limit", values: [100] }));
    if (cursor) {
      params.set("queries[1]", JSON.stringify({ method: "cursorAfter", values: [cursor] }));
    }

    const listed = await request<{ users: UserRow[] }>(`/v1/users?${params.toString()}`);
    const users = listed.users ?? [];
    const match = users.find((user) => matchesEmail(user, normalized));
    if (match?.$id) return match.$id;

    if (users.length < 100) break;
    cursor = users.at(-1)?.$id;
    if (!cursor) break;
  }

  return null;
}

function isEmailAlreadyExistsConflict(error: unknown) {
  return Boolean(
    error
    && typeof error === "object"
    && (error as { appwrite?: AppwriteErrorBody }).appwrite?.type === "user_email_already_exists",
  );
}

async function createMessagingUserWithoutEmail(userId: string, name: string) {
  await request(`/v1/users`, {
    method: "POST",
    body: JSON.stringify({
      userId,
      name,
    }),
  });
}

async function resolveMessagingUserId(email: string): Promise<string> {
  const existingId = await findUserIdByEmail(email);
  if (existingId) return existingId;

  const preferredId = messagingUserIdForEmail(email);
  const displayName = email.split("@")[0] ?? "Sponsor";

  try {
    await request(`/v1/users`, {
      method: "POST",
      body: JSON.stringify({
        userId: preferredId,
        email,
        name: displayName,
      }),
    });
    return preferredId;
  } catch (error) {
    if (!isConflict(error)) throw error;

    const resolvedId = await findUserIdByEmail(email);
    if (resolvedId) return resolvedId;

    if (isEmailAlreadyExistsConflict(error)) {
      try {
        await createMessagingUserWithoutEmail(preferredId, displayName);
        return preferredId;
      } catch (inner) {
        if (!isConflict(inner)) throw inner;
      }
    }
  }

  const resolvedAfterConflict = await findUserIdByEmail(email);
  if (resolvedAfterConflict) return resolvedAfterConflict;

  try {
    await request(`/v1/users/${encodeURIComponent(preferredId)}`);
    return preferredId;
  } catch (error) {
    if (isNotFound(error)) {
      throw new Error(`Appwrite user for ${email} could not be created or resolved.`);
    }
    throw error;
  }
}

async function ensureEmailTarget(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const userId = await resolveMessagingUserId(normalized);
  const targetId = messagingTargetIdForEmail(normalized);
  const providerId = await resolveEmailProviderId();

  const targetBody: Record<string, string> = {
    targetId,
    providerType: "email",
    identifier: normalized,
  };
  if (providerId) targetBody.providerId = providerId;

  try {
    const created = await request<TargetRow>(`/v1/users/${encodeURIComponent(userId)}/targets`, {
      method: "POST",
      body: JSON.stringify(targetBody),
    });
    return created.$id;
  } catch (error) {
    if (!isConflict(error)) throw error;
  }

  const params = new URLSearchParams();
  params.set("queries[0]", JSON.stringify({ method: "limit", values: [25] }));
  const listed = await request<{ targets: TargetRow[] }>(
    `/v1/users/${encodeURIComponent(userId)}/targets?${params.toString()}`,
  );
  const existing = listed.targets?.find((target) => target.identifier?.toLowerCase() === normalized);
  if (existing?.$id) return existing.$id;

  throw new Error("Appwrite email target exists but could not be resolved.");
}

export async function sendAppwriteHtmlEmail(payload: {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
}) {
  if (!appwriteMessagingIsConfigured()) {
    throw new Error("Appwrite Messaging is not configured.");
  }
  if (!validEmail(payload.to)) {
    throw new Error("A valid recipient email is required.");
  }

  const targetId = await ensureEmailTarget(payload.to);
  const messageId = messagingMessageId(payload.idempotencyKey);

  try {
    await request(`/v1/messaging/messages/email`, {
      method: "POST",
      body: JSON.stringify({
        messageId,
        subject: payload.subject,
        content: payload.html,
        html: true,
        targets: [targetId],
      }),
    });
  } catch (error) {
    if (isConflict(error)) return;
    throw error;
  }
}
