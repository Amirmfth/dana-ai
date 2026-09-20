import { redirect } from "next/navigation";

import { getCurrentUser, type DanaAuthUser } from "@/lib/auth/server";

export function isAdminUser(user: DanaAuthUser | null) {
  return user?.app_metadata?.role === "admin";
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!isAdminUser(user)) {
    redirect("/");
  }

  return user;
}
