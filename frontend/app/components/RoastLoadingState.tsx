"use client";

import { useEffect, useState } from "react";
import { TailSpin } from "react-loader-spinner";

const PHRASES = [
  "Extracting your resume...",
  "Mapping your career trajectory...",
  "Detecting suspicious buzzwords...",
  "Benchmarking impact density...",
  "Locating weak bullet points...",
  "Measuring corporate fluff...",
  "Stress-testing your achievements...",
  "Interrogating your skill section...",
  "Searching for missing metrics...",
  "Calibrating roast intensity...",
  "Compiling brutally honest feedback...",
  "Applying emotional damage...",
];

type AnimationPhase = "typing" | "holding" | "fading";

export default function RoastLoadingState() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>("typing");

  const currentPhrase = PHRASES[phraseIndex];
  const visibleText = currentPhrase.slice(0, characterCount);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "typing") {
      if (characterCount < currentPhrase.length) {
        const nextCharacterCount = characterCount + 1;
        timeout = setTimeout(() => {
          setCharacterCount(nextCharacterCount);
          if (nextCharacterCount === currentPhrase.length) {
            setPhase("holding");
          }
        }, 35);
      }
    } else if (phase === "holding") {
      timeout = setTimeout(() => setPhase("fading"), 1300);
    } else {
      timeout = setTimeout(() => {
        setPhraseIndex((index) => (index + 1) % PHRASES.length);
        setCharacterCount(0);
        setPhase("typing");
      }, 250);
    }

    return () => clearTimeout(timeout);
  }, [characterCount, currentPhrase, phase]);

  return (
    <div className="flex min-h-28 flex-col items-center justify-center gap-5">
      <TailSpin
        height={48}
        width={48}
        color="#f97316"
        ariaLabel="roast-loading"
      />

      <p
        aria-hidden="true"
        className={`font-mono text-sm text-zinc-400 transition-all duration-250 ${
          phase === "fading"
            ? "-translate-y-1 opacity-0 blur-xs"
            : "translate-y-0 opacity-100 blur-none"
        }`}
      >
        <span className="text-orange-500">&gt;</span>{" "}
        <span>{visibleText}</span>
        <span className="ml-0.5 animate-pulse text-orange-500">▋</span>
      </p>

      <span className="sr-only" aria-live="polite">
        {phase === "holding" ? currentPhrase : ""}
      </span>
    </div>
  );
}
