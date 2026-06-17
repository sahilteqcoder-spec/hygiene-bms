import { cn } from "@/lib/utils";

// Renders the uploaded brand logo, falling back to an "HB" monogram tile.
export function BrandMark({
  logoUrl,
  businessName,
  className,
}: {
  logoUrl: string | null;
  businessName: string;
  className?: string;
}) {
  if (logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={logoUrl}
        alt={businessName}
        className={cn("h-8 w-8 rounded-md object-contain", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground",
        className
      )}
    >
      HB
    </div>
  );
}
