"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccess } from "@/lib/permissions";
import type { UserRole } from "@/types/database";
import { NAV } from "@/components/nav-config";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Hamburger + slide-out drawer shown only on mobile (the Sidebar is hidden < md).
export function MobileNav({
  role,
  businessName,
  logoUrl,
}: {
  role: UserRole;
  businessName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((i) => canAccess(role, i.module));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <BrandMark logoUrl={logoUrl} businessName={businessName} />
          <SheetTitle className="truncate text-sm">{businessName}</SheetTitle>
        </div>
        <nav className="space-y-1 p-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-3 text-xs text-muted-foreground">
          Role: <span className="font-medium capitalize text-foreground">{role}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
