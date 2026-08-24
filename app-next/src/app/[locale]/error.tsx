"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCw } from "lucide-react";
import { Link } from "@/config/routing";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="bg-destructive/10 flex size-16 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          We hit an unexpected error loading this page. Try again, or head back
          to safety.
        </p>
        {error.digest && (
          <p className="text-muted-foreground/70 font-mono text-xs">
            Ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()}>
          <RotateCw className="size-4" />
          Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">
            <Home className="size-4" />
            Go home
          </Link>
        </Button>
      </div>
    </div>
  );
}
