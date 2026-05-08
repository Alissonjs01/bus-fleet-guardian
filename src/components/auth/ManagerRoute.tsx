import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function ManagerRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "motorista") return <Navigate to="/mobile" replace />;
  if (!["admin", "gestor"].includes(user.role)) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
