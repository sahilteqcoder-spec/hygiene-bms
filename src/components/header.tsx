"use client";

import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "@/app/login/actions";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AppUser } from "@/lib/auth";

function titleFromPath(path: string): string {
  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  return seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function Header({
  user,
  businessName,
  logoUrl,
}: {
  user: AppUser;
  businessName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-3 md:px-6">
      <div className="flex items-center gap-1">
        <MobileNav role={user.role} businessName={businessName} logoUrl={logoUrl} />
        <h1 className="text-base font-semibold md:text-lg">{titleFromPath(pathname)}</h1>
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm sm:inline">{user.name}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span>{user.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled className="capitalize">
            <UserIcon className="h-4 w-4" /> {user.role}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => signOut()}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
