import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, KeyRound } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { activateAccessKey, bootstrapFirstAdmin, loginWithEmail } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import { isMobileDevice } from "@/utils/device";
import { isExclusiveAdmin } from "@/config/admin";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [mode, setMode] = useState<"email" | "key" | "bootstrap">("email");
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("Empresa Demo");
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
      navigate("/mobile", { replace: true });
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
      setError("Credenciais inválidas");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessKeyActivation = async () => {
    if (!accessKey.trim() || !email.trim() || !password.trim() || !name.trim()) {
      setError("Informe chave, nome, email e senha");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await activateAccessKey(accessKey.trim(), {
        name: name.trim(),
        email: email.trim(),
        password,
      });
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

  const handleBootstrapAdmin = async () => {
    if (!email.trim() || !password.trim() || !name.trim() || !companyName.trim()) {
      setError("Preencha nome, empresa, email e senha");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await bootstrapFirstAdmin({
        name: name.trim(),
        email: email.trim(),
        password,
        companyName: companyName.trim(),
      });

      if (!result.success) {
        setError(result.error || "Não foi possível criar o primeiro admin");
        return;
      }

      setMode("email");
      setError("Admin criado. Entre com o email e senha cadastrados.");
    } catch {
      setError("Não foi possível criar o primeiro admin agora");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "email") void handleEmailLogin();
    if (mode === "key") void handleAccessKeyActivation();
    if (mode === "bootstrap") void handleBootstrapAdmin();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            {mode === "email" ? <Lock className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            <CardTitle>
              {mode === "email" ? "Login" : mode === "key" ? "Ativar Chave" : "Primeiro Admin"}
            </CardTitle>
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
              <>
                {mode === "key" && (
                  <Input
                    type="text"
                    placeholder="Digite sua chave de acesso"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
                    disabled={isLoading}
                  />
                )}
                <Input
                  type="text"
                  placeholder="Nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
                {mode === "bootstrap" && (
                  <Input
                    type="text"
                    placeholder="Empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={isLoading}
                  />
                )}
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
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aguarde...
                </>
              ) : mode === "email" ? (
                "Entrar"
              ) : mode === "bootstrap" ? (
                "Criar admin"
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

            {mode === "email" && (
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setMode("bootstrap");
                  setError("");
                }}
                disabled={isLoading}
              >
                Criar primeiro admin
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
