import { NextRequest, NextResponse } from "next/server";
import { buildLoyaltyObjectPayload, buildSaveJwt } from "@/lib/google-wallet";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountName, accountId, points } = body;

    if (!accountName || !accountId) {
      return NextResponse.json(
        { error: "accountName and accountId are required" },
        { status: 400 }
      );
    }

    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    if (!issuerId) {
      return NextResponse.json(
        { error: "GOOGLE_WALLET_ISSUER_ID is not configured" },
        { status: 500 }
      );
    }

    // Class must already exist (pre-created via API or Console).
    const classId = `${issuerId}.loyalty-demo-class`;
    const objectId = `${issuerId}.loyalty-${accountId}`;

    const loyaltyObject = buildLoyaltyObjectPayload(classId, objectId, {
      id: objectId,
      programName: "NextJS Demo Rewards",
      accountName,
      accountId,
      points,
    });

    const token = buildSaveJwt(loyaltyObject);

    return NextResponse.json({ token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
