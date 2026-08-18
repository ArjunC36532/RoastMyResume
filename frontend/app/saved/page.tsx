"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type SavedResult = {
  id: string;
  original_filename: string;
  file_storage_key: string;
  status: "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default function SavedPage() {
  const { getToken, isLoaded, userId: clerkUserId } = useAuth();
  const supabase = useMemo(() => createClient(getToken), [getToken]);
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (!clerkUserId) {
      return;
    }

    let cancelled = false;

    async function loadSavedResults() {
      setLoading(true);
      setError(null);

      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("id")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();

      if (cancelled) {
        return;
      }
      if (accountError) {
        setError(accountError.message);
        setLoading(false);
        return;
      }
      if (!account) {
        setSavedResults([]);
        setLoading(false);
        return;
      }

      const { data: reviews, error: reviewsError } = await supabase
        .from("resume_reviews")
        .select(
          "id, original_filename, file_storage_key, status, created_at, updated_at",
        )
        .eq("account_id", account.id)
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }
      if (reviewsError) {
        setError(reviewsError.message);
        setLoading(false);
        return;
      }

      setSavedResults((reviews ?? []) as SavedResult[]);
      setLoading(false);
    }

    void loadSavedResults();

    return () => {
      cancelled = true;
    };
  }, [clerkUserId, isLoaded, reloadKey, supabase]);

  async function handleDelete(result: SavedResult) {
    const confirmed = window.confirm(
      `Delete ${result.original_filename}? This cannot be undone.`,
    );
    if (!confirmed) {
      return;
    }

    setDeletingId(result.id);
    setDeleteError(null);

    const { error: storageError } = await supabase.storage
      .from("Resume's")
      .remove([result.file_storage_key]);

    if (storageError) {
      setDeleteError(storageError.message);
      setDeletingId(null);
      return;
    }

    const { error: reviewError } = await supabase
      .from("resume_reviews")
      .delete()
      .eq("id", result.id);

    if (reviewError) {
      setDeleteError(reviewError.message);
      setDeletingId(null);
      return;
    }

    setSavedResults((results) =>
      results.filter((savedResult) => savedResult.id !== result.id),
    );
    setDeletingId(null);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-orange-500">
            Your library
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
            Saved results
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
            Return to past resume reviews and keep track of your progress.
          </p>
        </div>

        <p className="text-sm text-zinc-500">
          {isLoaded && !clerkUserId
            ? "Sign in to view saved resumes"
            : loading
            ? "Loading saved resumes..."
            : `${savedResults.length} saved ${
                savedResults.length === 1 ? "resume" : "resumes"
              }`}
        </p>
      </div>

      {isLoaded && !clerkUserId ? (
        <div className="mt-8 rounded-lg border border-white/10 bg-zinc-950 px-6 py-12 text-center">
          <h2 className="text-base font-medium text-zinc-100">
            Sign in to view saved results
          </h2>
        </div>
      ) : loading ? (
        <div className="mt-8 space-y-3" aria-label="Loading saved resumes">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-24 animate-pulse rounded-lg border border-white/10 bg-zinc-950"
            />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8 rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-12 text-center">
          <h2 className="text-base font-medium text-zinc-100">
            We could not load your saved results
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="mt-5 rounded-md border border-white/15 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/5"
          >
            Try again
          </button>
        </div>
      ) : savedResults.length > 0 ? (
        <div className="mt-8 space-y-3">
          {deleteError && (
            <p className="rounded-md border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {deleteError}
            </p>
          )}
          {savedResults.map((result) => (
            <article
              key={result.id}
              className="flex flex-col gap-5 rounded-lg border border-white/10 bg-zinc-950 p-5 transition-colors hover:border-white/20 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-medium text-zinc-100">
                    {result.original_filename}
                  </h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium capitalize text-zinc-300">
                    {result.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Saved {formatDate(result.created_at)}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Link
                  href={`/saved/${result.id}`}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5 hover:text-white"
                >
                  View results
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(result)}
                  disabled={deletingId === result.id}
                  className="rounded-md border border-red-500/20 px-3 py-2 text-sm text-red-400 transition-colors hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === result.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-lg border border-dashed border-white/15 bg-zinc-950 px-6 py-16 text-center">
          <h2 className="text-base font-medium text-zinc-100">
            No saved results yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
            Roast a resume and save the results to see them here.
          </p>
          <Link
            href="/roast"
            className="mt-5 inline-block rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-orange-400"
          >
            Roast a resume
          </Link>
        </div>
      )}
    </main>
  );
}
