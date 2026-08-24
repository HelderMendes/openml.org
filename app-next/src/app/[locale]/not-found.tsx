import { SearchX, Home } from "lucide-react";
import { Link } from "@/config/routing";
import { Button } from "@/components/ui/button";

export default function LocaleNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <SearchX className="text-muted-foreground size-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-foreground text-2xl font-semibold">
          Page not found
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you&apos;re looking for doesn&apos;t exist, or may have been
          moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="size-4" />
          Go home
        </Link>
      </Button>
    </div>
  );
}
