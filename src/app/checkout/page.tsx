"use client";

import { useState } from "react";
import Link from "next/link";

const CATEGORIES = ["Electronics", "Fashion", "Home", "Beauty", "Sports"];

type StatusType = "success" | "error" | "loading" | "";

export default function CheckoutPage() {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState(50);
  const [category, setCategory] = useState("Electronics");
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({
    type: "",
    message: "",
  });
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    amount: number;
    category: string;
  } | null>(null);

  async function handleSimulatePurchase() {
    if (!email) {
      setStatus({ type: "error", message: "Please enter your email address" });
      return;
    }

    setStatus({ type: "loading", message: "Processing purchase..." });
    setOrderResult(null);

    try {
      // First, send checkout started event
      await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amountCents: amount * 100,
          category,
          action: "start",
        }),
      });

      // Small delay to simulate checkout flow
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Complete the purchase
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          amountCents: amount * 100,
          category,
          action: "complete",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process purchase");
      }

      setOrderResult(data.order);

      let message = `Order ${data.order.orderId} completed!`;
      if (data.klaviyo) {
        message += " Events sent to Klaviyo.";
      } else if (data.klaviyoError) {
        message += " (Saved locally, Klaviyo sync pending)";
      }

      setStatus({ type: "success", message });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setStatus({ type: "error", message });
    }
  }

  function handleReset() {
    setEmail("");
    setAmount(50);
    setCategory("Electronics");
    setStatus({ type: "", message: "" });
    setOrderResult(null);
  }

  return (
    <main className="max-w-lg mx-auto p-8 py-12">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Simulator</h1>
          <p className="text-gray-600">Simulate purchases to test Klaviyo revenue tracking</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Customer Email
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status.type === "loading"}
            />
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Purchase Amount: <span className="text-green-600 font-bold">${amount}</span>
            </label>
            <input
              id="amount"
              type="range"
              min="5"
              max="500"
              step="5"
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={status.type === "loading"}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>$5</span>
              <span>$500</span>
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Product Category
            </label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition ${
                    category === cat
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300"
                  } ${status.type === "loading" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat}
                    className="sr-only"
                    checked={category === cat}
                    onChange={() => setCategory(cat)}
                    disabled={status.type === "loading"}
                  />
                  <span className="font-medium">{cat}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Order Summary</div>
            <div className="flex justify-between items-center">
              <span className="font-medium">{category} Purchase</span>
              <span className="text-xl font-bold text-green-600">${amount.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleSimulatePurchase}
            disabled={status.type === "loading"}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            {status.type === "loading" ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              "Simulate Purchase"
            )}
          </button>

          {status.message && (
            <div
              className={`p-4 rounded-lg ${
                status.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : status.type === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-blue-50 text-blue-800 border border-blue-200"
              }`}
            >
              <div className="flex items-start gap-3">
                {status.type === "success" && (
                  <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {status.type === "error" && (
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                <div className="flex-1">
                  <p>{status.message}</p>
                </div>
              </div>
            </div>
          )}

          {orderResult && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Order Details</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Order ID:</span>
                  <span className="font-mono">{orderResult.orderId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span>${orderResult.amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span>{orderResult.category}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Klaviyo Events: <span className="text-green-600">Checkout Started</span>,{" "}
                  <span className="text-green-600">Order Completed</span>
                </div>
              </div>
            </div>
          )}

          {orderResult && (
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center"
              >
                View Dashboard
              </Link>
              <button
                onClick={handleReset}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition"
              >
                New Purchase
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          <p>Test mode - no real charges</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/" className="text-blue-600 hover:underline">
              Preference Center
            </Link>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
