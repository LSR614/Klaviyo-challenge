"use client";

import { useState } from "react";
import Link from "next/link";

const INTERESTS = ["Tech", "Fashion", "Fitness", "Travel", "Skincare"];

type StatusType = "success" | "error" | "loading" | "";

interface ApiResponse {
  ok?: boolean;
  error?: string;
  id?: number;
  klaviyo?: { event: { success: boolean }; profile: { success: boolean } };
  klaviyoError?: string;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("weekly");
  const [status, setStatus] = useState<{ type: StatusType; message: string }>({
    type: "",
    message: "",
  });
  const [showDashboardLink, setShowDashboardLink] = useState(false);

  function toggleInterest(i: string) {
    setInterests((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      setStatus({ type: "error", message: "Please enter your email address" });
      return;
    }

    if (interests.length === 0) {
      setStatus({ type: "error", message: "Please select at least one interest" });
      return;
    }

    setStatus({ type: "loading", message: "Saving preferences..." });
    setShowDashboardLink(false);

    try {
      const res = await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, interests, frequency }),
      });

      const data: ApiResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save preferences");
      }

      let message = "Preferences saved!";
      if (data.klaviyo) {
        message += " Event tracked & profile updated in Klaviyo.";
      } else if (data.klaviyoError) {
        message += " (Saved locally, Klaviyo sync pending)";
      }

      setStatus({ type: "success", message });
      setShowDashboardLink(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setStatus({ type: "error", message });
    }
  }

  function handleReset() {
    setEmail("");
    setInterests([]);
    setFrequency("weekly");
    setStatus({ type: "", message: "" });
    setShowDashboardLink(false);
  }

  return (
    <main className="max-w-lg mx-auto p-8 py-12">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Preference Center</h1>
          <p className="text-gray-600">Manage your email preferences and interests</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status.type === "loading"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Interests <span className="text-gray-400">(select at least one)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {INTERESTS.map((interest) => (
                <label
                  key={interest}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                    interests.includes(interest)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  } ${status.type === "loading" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={interests.includes(interest)}
                    onChange={() => toggleInterest(interest)}
                    disabled={status.type === "loading"}
                  />
                  <span className="font-medium">{interest}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Email Frequency
            </label>
            <select
              id="frequency"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              disabled={status.type === "loading"}
            >
              <option value="daily">Daily Digest</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Roundup</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={status.type === "loading"}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
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
                Saving...
              </>
            ) : (
              "Save Preferences"
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

          {showDashboardLink && (
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition text-center"
              >
                View Dashboard
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition"
              >
                Submit Another
              </button>
            </div>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-500">
          <p>Powered by Klaviyo Events + Profiles API</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/checkout" className="text-green-600 hover:underline">
              Purchase Simulator
            </Link>
            <Link href="/dashboard" className="text-blue-600 hover:underline">
              Analytics Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
