import { getSession } from "./auth";

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized: admin session required");
  }
  return session;
}
