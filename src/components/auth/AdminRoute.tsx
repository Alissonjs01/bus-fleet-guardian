import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { isExclusiveAdmin } from "@/config/admin";
import { useAuth } from "@/contexts/AuthContext";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!isExclusiveAdmin(user.email, user.role)) return <Navigate to="/gestor" replace />;

  return <>{children}</>;
}
