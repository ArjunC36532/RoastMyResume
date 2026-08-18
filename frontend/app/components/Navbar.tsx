import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight text-zinc-100">
          roastmyresume
        </Link>

        <div className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
          <Link href="/roast" className="transition-colors hover:text-zinc-100">
            Roast
          </Link>
          <Link href="/saved" className="transition-colors hover:text-zinc-100">
            Saved
          </Link>
          <Link href="/tailor" className="transition-colors hover:text-zinc-100">
            Tailor
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="rounded-md px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:text-zinc-100">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-md bg-orange-500 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-orange-400">
                Get started
              </button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
          </SignedIn>
        </div>
      </nav>
    </header>
  );
}
