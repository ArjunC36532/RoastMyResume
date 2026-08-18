"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import ResumeDropzone from "../components/ResumeDropzone";
import RoastLoadingState from "../components/RoastLoadingState";
import type { RoastReview } from "../components/ResumeResults";

const ResumeResults = dynamic(
  () => import("../components/ResumeResults"),
  {
  ssr: false,
  },
);

export default function RoastPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<RoastReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelected(selectedFile: File | null) {
    setFile(selectedFile);
    setShowResults(false);
    setResult(null);
    setError(null);
  }

  async function handleRoast() {
    if (!file) {
      return;
    }

    setLoading(true);
    setShowResults(false);
    setResult(null);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file, file.name);

      const response = await fetch("/api/roast", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? `Request failed with ${response.status}.`);
        return;
      }

      setResult(payload.review);
      setShowResults(true);
    } catch (cause) {
      console.error("Roast request failed", cause);
      setError("Something went wrong sending the request.");
    } finally {
      setLoading(false);
    }
  }

  if (showResults && file && result) {
    return (
      <main className="mx-auto w-full max-w-5xl px-6 py-10">
        <button
          type="button"
          onClick={() => handleFileSelected(null)}
          className="mb-6 text-sm text-zinc-400 transition-colors hover:text-orange-400"
        >
          &larr; Roast another resume
        </button>
        <ResumeResults file={file} review={result} />
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
        Roast my resume
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Upload your resume to get direct, in-text edit suggestions and feedback.
      </p>

      <div className="mt-8">
        <ResumeDropzone onFileSelected={handleFileSelected} />
      </div>

      <button
        type="button"
        onClick={handleRoast}
        disabled={!file || loading}
        className="mt-4 w-full rounded-md bg-orange-500 py-2.5 text-sm font-medium text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        {loading ? "Roasting..." : "Roast it"}
      </button>

      <div className="mt-8 rounded-md border border-white/10 bg-zinc-950 p-6">
        {loading ? (
          <RoastLoadingState />
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <p className="text-sm text-zinc-500">
            Your roast will appear here once you upload a resume and hit Roast
            it.
          </p>
        )}
      </div>
    </div>
  );
}
