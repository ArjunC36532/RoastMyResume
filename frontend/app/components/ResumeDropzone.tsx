"use client";

import { useRef, useState } from "react";

type Props = {
  onFileSelected?: (file: File | null) => void;
};

export default function ResumeDropzone({ onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | null) {
    if (
      file &&
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setFileName(null);
      setFileError("Please choose a PDF file.");
      onFileSelected?.(null);
      return;
    }

    setFileName(file?.name ?? null);
    setFileError(null);
    onFileSelected?.(file);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={`flex flex-col items-center justify-center rounded-md border border-dashed border-white/15 bg-zinc-950 px-6 py-10 text-center transition-colors ${
        dragging ? "border-white/40 bg-white/5" : ""
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      {fileName ? (
        <p className="text-sm text-zinc-100">{fileName}</p>
      ) : (
        <>
          <p className="text-sm text-zinc-300">Drop your resume here</p>
          <p className="mt-1 text-xs text-zinc-500">PDF only</p>
        </>
      )}
      {fileError && <p className="mt-2 text-xs text-red-400">{fileError}</p>}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-4 rounded-md border border-white/15 px-3 py-1.5 text-sm text-zinc-100 transition-colors hover:bg-white/5"
      >
        {fileName ? "Choose a different file" : "Browse files"}
      </button>
    </div>
  );
}
