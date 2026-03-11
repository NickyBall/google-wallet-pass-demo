import { GoogleAuth } from "google-auth-library";
import * as jwt from "jsonwebtoken";

const ISSUER_ID = process.env.GOOGLE_WALLET_ISSUER_ID!;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n"
)!;

export function getGoogleAuth() {
  return new GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
}

// ── Generic Pass (Loyalty) ──────────────────────────────────────────────────

export interface LoyaltyPassPayload {
  id: string; // unique per user, e.g. "member-001"
  programName: string;
  accountName: string;
  accountId: string;
  points?: number;
  logoUrl?: string;
  heroImageUrl?: string;
  backgroundColor?: string;
}

// Generic placeholder logo (publicly accessible square PNG, 512×512).
// Replace with your own branded logo URL in production.
const DEFAULT_LOGO_URL =
  "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png";

export function buildLoyaltyClassObject(classId: string, payload: LoyaltyPassPayload) {
  const logoUrl = payload.logoUrl ?? DEFAULT_LOGO_URL;
  return {
    id: classId,
    issuerName: payload.programName,
    programName: payload.programName,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: payload.backgroundColor ?? "#1a73e8",
    programLogo: {
      sourceUri: { uri: logoUrl },
      contentDescription: { defaultValue: { language: "en-US", value: "Logo" } },
    },
  };
}

export function buildLoyaltyObjectPayload(
  classId: string,
  objectId: string,
  payload: LoyaltyPassPayload
) {
  return {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountName: payload.accountName,
    accountId: payload.accountId,
    ...(payload.points !== undefined && {
      loyaltyPoints: {
        balance: { string: String(payload.points) },
        label: "Points",
      },
    }),
  };
}

// ── Update points on an existing loyalty object ────────────────────────────

const WALLET_API = "https://walletobjects.googleapis.com/walletobjects/v1";

export async function updateLoyaltyPoints(
  objectId: string,
  points: number
): Promise<{ id: string; loyaltyPoints: unknown }> {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const res = await fetch(
    `${WALLET_API}/loyaltyObject/${encodeURIComponent(objectId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loyaltyPoints: {
          balance: { string: String(points) },
          label: "Points",
        },
      }),
    }
  );

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }
  return body;
}

// ── JWT for "Save to Google Wallet" button ─────────────────────────────────
// Only the object is included — the class must already exist (pre-created via API).
// This keeps the JWT small and ensures class updates are made explicitly via PATCH.

export function buildSaveJwt(loyaltyObject: object): string {
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [loyaltyObject],
    },
  };

  return jwt.sign(payload, PRIVATE_KEY, { algorithm: "RS256" });
}
