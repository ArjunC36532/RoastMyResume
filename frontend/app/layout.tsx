import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "./components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "roastmyresume",
  description: "Direct, in-text resume feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-zinc-950">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 antialiased">
        <ClerkProvider>
          <Navbar />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
