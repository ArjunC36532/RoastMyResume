"use client";

import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const resumeApiUrl = process.env.NEXT_PUBLIC_RESUME_API_URL;

if (!resumeApiUrl) {
  throw new Error("NEXT_PUBLIC_RESUME_API_URL is not set");
}

  type Props = {
    file: File;
    review: RoastReview;
    showSaveAction?: boolean;
  };

export type HighlightRect = {
  lineIndex: number;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type RoastSuggestion = {
  lineIndex: number;
  lineIndexes: number[];
  originalText: string;
  category: string;
  severity: "high" | "medium" | "low";
  issue: string;
  suggestedChange: string;
  reason: string;
  pageNumber: number;
  startingY: number;
  rects: HighlightRect[];
};

export type RoastScores = {
  overallScore: number;
  categories: {
    impactAndQuantification: number;
    technicalDepth: number;
    writingAndActionVerbs: number;
    clarityAndReadability: number;
    formattingAndAts: number;
    relevanceAndSeniority: number;
  };
};

export type OverallAssessment = {
  summary: string;
  strengths: string[];
  topPriorities: string[];
};

export type RoastReview = {
  scores: RoastScores;
  overallAssessment: OverallAssessment;
  suggestions: RoastSuggestion[];
};

const scoreCategories = [
  ["impactAndQuantification", "Impact & quantification"],
  ["technicalDepth", "Technical depth"],
  ["writingAndActionVerbs", "Writing & action verbs"],
  ["clarityAndReadability", "Clarity & readability"],
  ["formattingAndAts", "Formatting & ATS"],
  ["relevanceAndSeniority", "Relevance & seniority"],
] as const;

type PdfPageProps = {
  pageNumber: number;
  suggestions: RoastSuggestion[];
};

function PdfPage({ pageNumber, suggestions }: PdfPageProps) {
  return (
    <div className="relative w-[600px] max-w-none overflow-hidden shadow-xl">
      <Page
        pageNumber={pageNumber}
        width={600}
        renderAnnotationLayer={false}
        renderTextLayer={false}
      />

      <div className="pointer-events-none absolute inset-0">
        {suggestions.flatMap((suggestion) =>
          suggestion.rects
            .filter((rect) => rect.pageNumber === pageNumber)
            .map((rect, index) => (
              <div
                key={`${suggestion.lineIndex}-${rect.lineIndex}-${index}`}
                className="absolute rounded-sm border border-orange-500 bg-orange-400/25"
                style={{
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                }}
              />
            )),
        )}
      </div>
    </div>
  );
}

export default function ResumeResults({
  file,
  review,
  showSaveAction = true,
}: Props) {
  const { getToken } = useAuth();
  const [numPages, setNumPages] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSaveResume() {
    setSaving(true);
    setSaveError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const form = new FormData();
      form.append("file", file, file.name);
      form.append(
        "review",
        new Blob([JSON.stringify(review)], { type: "application/json" }),
      );

      const response = await fetch(
        `${resumeApiUrl.replace(/\/$/, "")}/api/resume/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: form,
        },
      );
      const payload = (await response.json().catch(() => ({}))) as {
        path?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "The resume could not be saved.");
      }
      if (!payload.path) {
        throw new Error("The upload completed without returning a file path.");
      }

      setSavedPath(payload.path);
    } catch (cause) {
      setSaveError(
        cause instanceof Error
          ? cause.message
          : "Something went wrong while saving your resume.",
      );
    } finally {
      setSaving(false);
    }
  }

  const suggestions = Array.isArray(review.suggestions)
    ? review.suggestions
        .map((suggestion) => ({
          ...suggestion,
          rects: Array.isArray(suggestion.rects) ? suggestion.rects : [],
        }))
        .sort(
          (first, second) =>
            first.pageNumber - second.pageNumber ||
            first.startingY - second.startingY,
        )
    : [];

  return (
    <section>
      <div className="mb-5">
        <p className="text-xs font-medium uppercase tracking-widest text-orange-500">
          Roast complete
        </p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-100">
          Your resume
        </h2>
        <p className="mt-1 text-sm text-zinc-400">{file.name}</p>
      </div>

      <div className="mb-8 space-y-5 rounded-md border border-white/10 bg-zinc-950 p-5">
        <div className="grid gap-5 md:grid-cols-[10rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-md border border-orange-500/20 bg-orange-500/5 p-5 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-orange-400">
              Overall score
            </p>
            <p className="mt-2 text-5xl font-semibold text-zinc-100">
              {review.scores.overallScore}
            </p>
            <p className="mt-1 text-xs text-zinc-500">out of 100</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {scoreCategories.map(([key, label]) => (
              <div
                key={key}
                className="rounded-md border border-white/10 bg-zinc-900/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-400">{label}</p>
                  <p className="text-sm font-semibold text-zinc-200">
                    {review.scores.categories[key]}
                  </p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{
                      width: `${review.scores.categories[key]}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <h3 className="text-sm font-semibold text-zinc-100">Summary</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            {review.overallAssessment.summary}
          </p>
        </div>

        <div className="grid gap-5 border-t border-white/10 pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Strengths</h3>
            <ul className="mt-3 space-y-2">
              {review.overallAssessment.strengths.map((strength, index) => (
                <li
                  key={`${strength}-${index}`}
                  className="flex gap-2 text-sm leading-5 text-zinc-300"
                >
                  <span className="text-orange-400">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Top priorities
            </h3>
            <ol className="mt-3 space-y-2">
              {review.overallAssessment.topPriorities.map((priority, index) => (
                <li
                  key={`${priority}-${index}`}
                  className="flex gap-2 text-sm leading-5 text-zinc-300"
                >
                  <span className="font-medium text-orange-400">
                    {index + 1}.
                  </span>
                  <span>{priority}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-h-[75vh] overflow-auto rounded-md bg-zinc-900 p-3">
          <Document
            file={file}
            onLoadSuccess={({ numPages: loadedPages }) =>
              setNumPages(loadedPages)
            }
            loading={
              <p className="py-12 text-center text-sm text-zinc-400">
                Loading your resume...
              </p>
            }
            error={
              <p className="py-12 text-center text-sm text-red-400">
                We could not display this PDF.
              </p>
            }
            className="flex flex-col items-center gap-3"
          >
            {Array.from({ length: numPages }, (_, index) => (
              <PdfPage
                key={`page-${index + 1}`}
                pageNumber={index + 1}
                suggestions={suggestions}
              />
            ))}
          </Document>
        </div>

        <aside className="max-h-[75vh] space-y-3 overflow-y-auto">
          <h3 className="text-sm font-semibold text-zinc-100">
            Feedback ({suggestions.length})
          </h3>

          {suggestions.map((suggestion, index) => (
            <article
              key={`${suggestion.lineIndex}-${index}`}
              className="rounded-md border border-white/10 bg-zinc-950 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-orange-400">
                  {suggestion.category.replace("_", " ")}
                </span>
                <span className="text-xs capitalize text-zinc-500">
                  {suggestion.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-200">{suggestion.issue}</p>
              <p className="mt-3 text-xs font-medium text-zinc-500">
                Suggested rewrite
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {suggestion.suggestedChange}
              </p>
              <p className="mt-3 text-xs font-medium text-zinc-500">
                Why this helps
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {suggestion.reason}
              </p>
            </article>
          ))}

          {suggestions.length === 0 && (
            <p className="rounded-md border border-white/10 bg-zinc-950 p-4 text-sm text-zinc-400">
              No line-specific feedback was returned.
            </p>
          )}
        </aside>
      </div>

      {showSaveAction && (
        <div className="mt-8 flex flex-col items-start gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              Save these results
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Store the original PDF and its review for future updates.
            </p>
            {savedPath && (
              <p className="mt-2 text-sm text-emerald-400">
                Resume and review saved successfully.
              </p>
            )}
            {saveError && (
              <p className="mt-2 text-sm text-red-400">{saveError}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveResume}
            disabled={saving || Boolean(savedPath)}
            className="shrink-0 rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving
              ? "Saving..."
              : savedPath
                ? "Results saved"
                : "Save results"}
          </button>
        </div>
      )}
    </section>
  );
}
