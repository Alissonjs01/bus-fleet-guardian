import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithEmail } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { isMobileDevice } from "@/utils/device";
import { isExclusiveAdmin } from "@/config/admin";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();

  const redirectByRole = (role: string) => {
    const requestedPath = (location.state as { from?: string } | null)?.from;
    if (requestedPath && requestedPath !== "/login") {
      navigate(requestedPath, { replace: true });
      return;
    }

    if (role === "motorista") {
      navigate("/mobile", { replace: true });
      return;
    }

    if (isMobileDevice()) {
      navigate("/gestor-express", { replace: true });
      return;
    }

    navigate(isExclusiveAdmin(email, role) ? "/admin" : "/gestor", { replace: true });
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Preencha email e senha");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const profile = await loginWithEmail(email.trim(), password);
      setUser(profile);
      redirectByRole(profile.role);
    } catch {
      setError("Credenciais invalidas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void handleEmailLogin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Lock className="h-6 w-6" />
            <CardTitle>Login</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
