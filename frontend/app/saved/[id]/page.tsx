"use client";

import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { RoastReview } from "../../components/ResumeResults";
import { createClient } from "@/utils/supabase/client";

const ResumeResults = dynamic(
  () => import("../../components/ResumeResults"),
  { ssr: false },
);

type SavedReview = {
  original_filename: string;
  file_storage_key: string;
  review_data: RoastReview;
};

export default function SavedReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken, isLoaded, userId } = useAuth();
  const supabase = useMemo(() => createClient(getToken), [getToken]);
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<RoastReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId || !id) {
      return;
    }

    let cancelled = false;

    async function loadSavedReview() {
      setLoading(true);
      setError(null);

      const { data, error: reviewError } = await supabase
        .from("resume_reviews")
        .select("original_filename, file_storage_key, review_data")
        .eq("id", id)
        .single();

      if (cancelled) {
        return;
      }
      if (reviewError || !data) {
        setError(reviewError?.message ?? "Saved review not found.");
        setLoading(false);
        return;
      }

      const savedReview = data as SavedReview;
      const { data: pdf, error: downloadError } = await supabase.storage
        .from("Resume's")
        .download(savedReview.file_storage_key);

      if (cancelled) {
        return;
      }
      if (downloadError || !pdf) {
        setError(downloadError?.message ?? "The saved PDF could not be loaded.");
        setLoading(false);
        return;
      }

      setFile(
        new File([pdf], savedReview.original_filename, {
          type: pdf.type || "application/pdf",
        }),
      );
      setReview(savedReview.review_data);
      setLoading(false);
    }

    void loadSavedReview();

    return () => {
      cancelled = true;
    };
  }, [id, isLoaded, supabase, userId]);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/saved"
        className="mb-6 inline-block text-sm text-zinc-400 transition-colors hover:text-orange-400"
      >
        &larr; Back to saved results
      </Link>

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-zinc-950 px-6 py-20 text-center">
          <p className="text-sm text-zinc-400">Loading saved review...</p>
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-16 text-center">
          <h1 className="text-lg font-semibold text-zinc-100">
            We could not load this review
          </h1>
          <p className="mt-2 text-sm text-red-300">{error}</p>
        </div>
      ) : file && review ? (
        <ResumeResults
          file={file}
          review={review}
          showSaveAction={false}
        />
      ) : null}
    </main>
  );
}
