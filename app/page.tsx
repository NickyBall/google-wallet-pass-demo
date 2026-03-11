"use client";

import { useState } from "react";

const SAVE_URL = "https://pay.google.com/gp/v/save/";

export default function Home() {
  const [accountName, setAccountName] = useState("Jane Doe");
  const [accountId, setAccountId] = useState("member-001");
  const [points, setPoints] = useState(1500);
  const [saveUrl, setSaveUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Update points ──────────────────────────────────────────────────────────
  const [updateAccountId, setUpdateAccountId] = useState("member-001");
  const [updatePoints, setUpdatePoints] = useState(2000);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateResult, setUpdateResult] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function patchPoints() {
    setUpdateLoading(true);
    setUpdateResult(null);
    setUpdateError(null);
    try {
      const res = await fetch("/api/wallet/points", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: updateAccountId, points: updatePoints }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update points");
      setUpdateResult(`Updated: ${data.id} → ${JSON.stringify(data.loyaltyPoints?.balance)}`);
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdateLoading(false);
    }
  }

  async function generatePass() {
    setLoading(true);
    setError(null);
    setSaveUrl(null);

    try {
      const res = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountName, accountId, points }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to generate pass");
      }

      setSaveUrl(`${SAVE_URL}${data.token}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Google Wallet Demo
          </h1>
          <p className="text-sm text-gray-500">
            Generate a loyalty pass and save it to Google Wallet.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Name
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account ID
            </label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Points
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Generate button */}
        <button
          onClick={generatePass}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
        >
          {loading ? "Generating..." : "Generate Pass JWT"}
        </button>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Save to Google Wallet button */}
        {saveUrl && (
          <div className="space-y-3">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Save URL (first 80 chars)
              </p>
              <p className="text-xs text-gray-700 break-all font-mono">
                {saveUrl.slice(0, 80)}…
              </p>
            </div>

            <a
              href={saveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-black hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="white"
                className="w-5 h-5"
              >
                <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
              </svg>
              Save to Google Wallet
            </a>
          </div>
        )}

        {/* Update points */}
        <div className="border-t pt-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Update Points</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Adjust points on an existing pass (user must have already saved it).
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Account ID"
              value={updateAccountId}
              onChange={(e) => setUpdateAccountId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Points"
              value={updatePoints}
              onChange={(e) => setUpdatePoints(Number(e.target.value))}
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={patchPoints}
            disabled={updateLoading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
          >
            {updateLoading ? "Updating..." : "Update Points"}
          </button>

          {updateResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 font-mono break-all">
              {updateResult}
            </div>
          )}
          {updateError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {updateError}
            </div>
          )}
        </div>

        {/* Setup guide */}
        <details className="text-xs text-gray-500 border-t pt-4">
          <summary className="cursor-pointer font-medium text-gray-600 mb-2">
            Setup instructions
          </summary>
          <ol className="list-decimal list-inside space-y-1 leading-relaxed mt-2">
            <li>Create a project in Google Cloud Console.</li>
            <li>Enable the Google Wallet API.</li>
            <li>Create a Service Account and download the JSON key.</li>
            <li>
              Register as an issuer in the Google Pay &amp; Wallet Console and
              note your Issuer ID.
            </li>
            <li>
              Copy <code className="bg-gray-100 px-1 rounded">.env.local.example</code> to{" "}
              <code className="bg-gray-100 px-1 rounded">.env.local</code> and fill in your
              credentials.
            </li>
          </ol>
        </details>
      </div>
    </main>
  );
}
