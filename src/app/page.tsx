import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

// Root: bounce to dashboard (authenticated) or login (guest).
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
