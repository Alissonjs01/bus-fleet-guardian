import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { UserRole } from "@/types/auth";

export function RoleGuard({ children, roles }: { children: ReactNode; roles: UserRole[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (!roles.includes(user.role)) {
    return <Navigate to={user.role === "motorista" ? "/mobile" : "/admin"} replace />;
  }

  return <>{children}</>;
}
