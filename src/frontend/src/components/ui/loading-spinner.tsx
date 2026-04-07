import { cn } from "@/lib/utils";

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className="flex items-center justify-center">
      <div
        className={cn(
          "animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent",
          className
        )}
      />
    </div>
  );
}

export function FullPageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <LoadingSpinner className="h-12 w-12 border-6 mb-4" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}