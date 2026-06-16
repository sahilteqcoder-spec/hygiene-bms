import { Skeleton } from "@/components/ui/skeleton";

// Shown while any authenticated route streams in (App Router Suspense boundary).
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-9 w-64" />
      <div className="rounded-lg border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-3 h-10 w-[calc(100%-1.5rem)]" />
        ))}
      </div>
    </div>
  );
}
