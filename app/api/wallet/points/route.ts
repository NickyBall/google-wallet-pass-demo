import { NextRequest, NextResponse } from "next/server";
import { updateLoyaltyPoints } from "@/lib/google-wallet";

export async function PATCH(req: NextRequest) {
  try {
    const { accountId, points } = await req.json();

    if (!accountId || points === undefined) {
      return NextResponse.json(
        { error: "accountId and points are required" },
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

    const objectId = `${issuerId}.loyalty-${accountId}`;
    const updated = await updateLoyaltyPoints(objectId, Number(points));

    return NextResponse.json({
      id: updated.id,
      loyaltyPoints: updated.loyaltyPoints,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
