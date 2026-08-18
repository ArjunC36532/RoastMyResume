import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-orange-400">
        Resume feedback
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-100">
        Roast my resume
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-zinc-400">
        Upload a PDF and get direct, in-text edit suggestions instead of generic
        advice.
      </p>
      <Link
        href="/roast"
        className="mt-8 inline-flex w-fit rounded-md bg-orange-500 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-orange-400"
      >
        Roast a resume
      </Link>
    </main>
  );
}
