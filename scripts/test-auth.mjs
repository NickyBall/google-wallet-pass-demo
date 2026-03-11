/**
 * Run: node scripts/test-auth.mjs
 * Tests: 1) JWT signing  2) Google OAuth token  3) List all classes  4) Wallet API – get/create loyalty class
 */
import fs from "fs";
import path from "path";
import { createSign } from "crypto";
import { GoogleAuth } from "google-auth-library";

// ── Load .env / .env.local manually ────────────────────────────────────────
function loadEnv(...files) {
  for (const file of files) {
    const full = path.resolve(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    const lines = fs.readFileSync(full, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] ??= val.replace(/\\n/g, "\n");
    }
  }
}

loadEnv(".env.local", ".env");

const EMAIL      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const ISSUER_ID  = process.env.GOOGLE_WALLET_ISSUER_ID;

console.log("=== Step 1: Env vars ===");
console.log("  EMAIL     :", EMAIL ?? "MISSING");
console.log("  ISSUER_ID :", ISSUER_ID ?? "MISSING");
console.log("  KEY starts:", PRIVATE_KEY?.slice(0, 40) ?? "MISSING");

if (!EMAIL || !PRIVATE_KEY || !ISSUER_ID) {
  console.error("\nAbort: missing env vars.");
  process.exit(1);
}

// ── Step 2: verify the key can sign ────────────────────────────────────────
console.log("\n=== Step 2: Test RSA signing ===");
try {
  const sign = createSign("RSA-SHA256");
  sign.update("test");
  const sig = sign.sign(PRIVATE_KEY, "base64");
  console.log("  OK — signature length:", sig.length);
} catch (e) {
  console.error("  FAIL:", e.message);
  console.error("  Hint: check that the private key is PKCS#8 (BEGIN PRIVATE KEY) and newlines are correct.");
  process.exit(1);
}

// ── Step 3: get an OAuth2 access token ─────────────────────────────────────
console.log("\n=== Step 3: Obtain Google access token ===");
const auth = new GoogleAuth({
  credentials: { client_email: EMAIL, private_key: PRIVATE_KEY },
  scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
});

let accessToken;
try {
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  accessToken = tokenRes.token;
  console.log("  OK — token prefix:", accessToken?.slice(0, 20) + "…");
} catch (e) {
  console.error("  FAIL:", e.message);
  process.exit(1);
}

// ── Step 4: list all classes for this issuer ───────────────────────────────
console.log("\n=== Step 4: List all classes (loyalty + generic) ===");

const [loyaltyList, genericList] = await Promise.all([
  fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass?issuerId=${ISSUER_ID}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  ).then((r) => r.json()),
  fetch(
    `https://walletobjects.googleapis.com/walletobjects/v1/genericClass?issuerId=${ISSUER_ID}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  ).then((r) => r.json()),
]);

const loyaltyClasses = loyaltyList.resources ?? [];
const genericClasses = genericList.resources ?? [];

if (loyaltyClasses.length === 0 && genericClasses.length === 0) {
  console.log("  No classes found yet.");
} else {
  if (loyaltyClasses.length > 0) {
    console.log(`  Loyalty classes (${loyaltyClasses.length}):`);
    for (const c of loyaltyClasses) {
      console.log(`    [loyalty]  id=${c.id}  status=${c.reviewStatus}`);
    }
  }
  if (genericClasses.length > 0) {
    console.log(`  Generic classes (${genericClasses.length}):`);
    for (const c of genericClasses) {
      console.log(`    [generic]  id=${c.id}  status=${c.reviewStatus}`);
    }
  }
}

// ── Step 5: call Wallet API — get loyalty class ────────────────────────────
const CLASS_ID = `${ISSUER_ID}.loyalty-demo-class`;
const CLASS_URL = `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(CLASS_ID)}`;

console.log("\n=== Step 5: GET loyalty class ===");
console.log("  URL:", CLASS_URL);

const getRes = await fetch(CLASS_URL, {
  headers: { Authorization: `Bearer ${accessToken}` },
});

const getBody = await getRes.json();
console.log("  HTTP", getRes.status);

if (getRes.status === 404) {
  // Class doesn't exist yet → create it
  console.log("  Class not found — creating it…");

  const classBody = {
    id: CLASS_ID,
    issuerName: "NextJS Demo Rewards",
    programName: "NextJS Demo Rewards",
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: "#1a73e8",
    programLogo: {
      sourceUri: {
        uri: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png",
      },
      contentDescription: {
        defaultValue: { language: "en-US", value: "Logo" },
      },
    },
  };

  const postRes = await fetch(
    "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(classBody),
    }
  );

  const postBody = await postRes.json();
  console.log("  POST HTTP", postRes.status);

  if (postRes.ok) {
    console.log("  OK — class created:", postBody.id);
  } else {
    console.error("  FAIL creating class:");
    console.error(JSON.stringify(postBody, null, 2));
  }
} else if (getRes.ok) {
  console.log("  OK — class already exists:", getBody.id);
  console.log("  reviewStatus:", getBody.reviewStatus);
} else {
  console.error("  FAIL:");
  console.error(JSON.stringify(getBody, null, 2));
}
