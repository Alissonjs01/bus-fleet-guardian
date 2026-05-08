export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || "admin@sistemadefrota.com";

export function isExclusiveAdmin(email?: string, role?: string) {
  return role === "admin" && !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}
