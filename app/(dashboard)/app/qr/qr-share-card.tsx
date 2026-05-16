"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

interface Props {
  shareUrl: string;
  agentName: string;
  shortCode: string;
}

export function QrShareCard({ shareUrl, agentName, shortCode }: Props) {
  const [copied, setCopied] = useState(false);

  // QR rendered server-side by quickchart.io (no API key required, free tier).
  // For a self-hosted swap, replace with /api/qr/[code] backed by `qrcode` npm.
  const qrSrc = `https://quickchart.io/qr?size=480&margin=2&text=${encodeURIComponent(shareUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("clipboard write failed:", err);
    }
  };

  const handleDownload = () => {
    // quickchart.io serves the PNG directly; just open in a new tab for save.
    window.open(`${qrSrc}&format=png&download=qr-${shortCode}.png`, "_blank");
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrSrc}
            alt={`${agentName} 的 LINE QR Code`}
            className="h-60 w-60 sm:h-72 sm:w-72"
          />
        </div>

        <div className="w-full">
          <label className="text-xs font-medium text-slate-500">分享連結</label>
          <div className="mt-1 flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  已複製
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  複製
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex w-full gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            下載 QR 圖
          </button>
        </div>
      </div>
    </section>
  );
}
