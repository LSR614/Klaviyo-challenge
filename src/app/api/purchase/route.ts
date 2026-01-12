import { NextResponse } from "next/server";
import { saveOrder, getOrdersByEmail } from "@/lib/db";
import {
  sendCheckoutStartedEvent,
  sendOrderCompletedEvent,
  updateProfileWithPurchase,
} from "@/lib/klaviyo";
import { randomUUID } from "crypto";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Sports"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, amountCents, category, action } = body;

    // Validation
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    if (!amountCents || typeof amountCents !== "number" || amountCents < 100) {
      return NextResponse.json({ error: "Amount must be at least $1.00" }, { status: 400 });
    }

    if (!category || !CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Category must be one of: ${CATEGORIES.join(", ")}` },
        { status: 400 }
      );
    }

    const validEmail = email.trim().toLowerCase();
    const currency = "usd";

    // Handle checkout started event
    if (action === "start") {
      let klaviyoResult = null;
      let klaviyoError = null;

      try {
        klaviyoResult = await sendCheckoutStartedEvent({
          email: validEmail,
          amountCents,
          currency,
          category,
        });
      } catch (err) {
        klaviyoError = err instanceof Error ? err.message : "Klaviyo API error";
        console.error("Klaviyo checkout started error:", klaviyoError);
      }

      return NextResponse.json({
        ok: true,
        action: "checkout_started",
        klaviyo: klaviyoResult,
        klaviyoError,
      });
    }

    // Complete purchase simulation
    const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Save to database
    const order = saveOrder({
      orderId,
      email: validEmail,
      amountCents,
      currency,
      category,
      status: "completed",
    });

    // Get total spent for profile update
    const allOrders = getOrdersByEmail(validEmail);
    const totalSpentCents = allOrders.reduce((sum, o) => sum + o.amountCents, 0);

    // Send Klaviyo events
    let klaviyoResult = null;
    let klaviyoError = null;

    try {
      const [orderEvent, profileUpdate] = await Promise.all([
        sendOrderCompletedEvent({
          email: validEmail,
          orderId,
          amountCents,
          currency,
          category,
        }),
        updateProfileWithPurchase({
          email: validEmail,
          totalSpentCents,
          orderCount: allOrders.length,
          lastCategory: category,
        }),
      ]);

      klaviyoResult = { orderEvent, profileUpdate };
    } catch (err) {
      klaviyoError = err instanceof Error ? err.message : "Klaviyo API error";
      console.error("Klaviyo order completed error:", klaviyoError);
    }

    return NextResponse.json({
      ok: true,
      action: "order_completed",
      order: {
        id: order.id,
        orderId: order.orderId,
        amount: amountCents / 100,
        currency,
        category,
      },
      klaviyo: klaviyoResult,
      klaviyoError,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Purchase API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Get available categories
export async function GET() {
  return NextResponse.json({
    categories: CATEGORIES,
    minAmount: 100,
    maxAmount: 50000,
    currency: "usd",
  });
}
