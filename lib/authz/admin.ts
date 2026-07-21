import type { User } from "@/lib/server-auth";
import { insforgeQuery } from "@/lib/insforge-db";
import { InsforgeBookServiceError } from "@/lib/books/insforge-book-service";

function readAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAuthorizedBookAdmin(user: User | null) {
  if (!user?.id) {
    return false;
  }

  const normalizedRole = user.role?.trim().toLowerCase();
  if (normalizedRole === "admin" || normalizedRole === "staff" || normalizedRole === "moderator") {
    return true;
  }

  if (user.email && readAdminEmails().includes(user.email.toLowerCase())) {
    return true;
  }

  try {
    const result = await insforgeQuery<{ is_admin: boolean }>(
      `select public.has_admin_role($1::uuid) as is_admin`,
      [user.id],
    );

    return Boolean(result.rows[0]?.is_admin);
  } catch {
    return false;
  }
}

export async function requireAuthorizedBookAdmin(user: User | null) {
  if (!(await isAuthorizedBookAdmin(user))) {
    throw new InsforgeBookServiceError("FORBIDDEN", "Admin access is required.");
  }
}
