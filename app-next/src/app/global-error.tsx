"use client";

import "./globals.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center antialiased">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.2em] uppercase">
          OpenML
        </p>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          The application failed to load. Please try again, or come back in a
          few minutes.
        </p>
        <button
          onClick={() => reset()}
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
