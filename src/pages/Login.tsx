import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ✅ Exporta como padrão
const Login = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    const correctPassword = "8912"; // Nova senha fixa

    if (password === correctPassword) {
      navigate("/");
    } else {
      setError("Senha incorreta");
    }
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
          {error && <p className="text-sm text-destructive mb-4">{error}</p>}

          <Input
            type="password"
            placeholder="Digite sua senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4"
          />

          <Button
            onClick={handleLogin}
            className="w-full"
          >
            Entrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login; // ✅ Exportação padrão