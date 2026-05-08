import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { isMobileViewport } from "@/services/deviceService";

export function DeviceRedirect() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user.role === "motorista") {
      navigate("/mobile", { replace: true });
      return;
    }

    navigate(isMobileViewport() ? "/mobile" : "/admin", { replace: true });
  }, [loading, navigate, user]);

  return null;
}
