import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { activateAccessKey, loginWithEmail } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { isMobileViewport } from "@/services/deviceService";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [mode, setMode] = useState<"email" | "key">("email");
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

    navigate(isMobileViewport() ? "/mobile" : "/admin", { replace: true });
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
      setError("Credenciais inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessKeyActivation = async () => {
    if (!accessKey.trim()) {
      setError("Informe a chave de acesso");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await activateAccessKey(accessKey.trim());
      if (!result.success) {
        setError(result.error || "Chave inválida");
        return;
      }

      setMode("email");
      setEmail(result.email || "");
      setError("Chave ativada. Entre com a senha enviada/cadastrada para o usuário.");
    } catch {
      setError("Não foi possível ativar a chave agora");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void (mode === "email" ? handleEmailLogin() : handleAccessKeyActivation());
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            {mode === "email" ? <Lock className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            <CardTitle>{mode === "email" ? "Login" : "Ativar Chave"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}

            {mode === "email" ? (
              <>
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
              </>
            ) : (
              <Input
                type="text"
                placeholder="Digite sua chave de acesso"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                disabled={isLoading}
              />
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : mode === "email" ? (
                "Entrar"
              ) : (
                "Ativar"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setMode(mode === "email" ? "key" : "email");
                setError("");
              }}
              disabled={isLoading}
            >
              {mode === "email" ? "Usar chave de acesso" : "Voltar para login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
