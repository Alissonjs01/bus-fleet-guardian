import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Key, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { activateLicense } from "@/services/licenseService";

type ActivationState = 'idle' | 'loading' | 'success' | 'error' | 'blocked';

interface ActivationError {
  message: string;
  type: 'invalid_key' | 'expired' | 'already_activated' | 'connection' | 'blocked';
}

const Activation = () => {
  const [licenseKey, setLicenseKey] = useState("");
  const [state, setState] = useState<ActivationState>('idle');
  const [error, setError] = useState<ActivationError | null>(null);
  const navigate = useNavigate();

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setError({ message: "Digite a chave de licença", type: 'invalid_key' });
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    const result = await activateLicense(licenseKey);

    if (result.success) {
      setState('success');
      // Redireciona após 2 segundos
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } else {
      setState('error');
      // Mapeia erros para tipos específicos
      const errorMessage = result.error || 'Erro desconhecido';
      let errorType: ActivationError['type'] = 'connection';

      if (errorMessage.includes('inválida') || errorMessage.includes('não encontrada')) {
        errorType = 'invalid_key';
      } else if (errorMessage.includes('expirada')) {
        errorType = 'expired';
      } else if (errorMessage.includes('ativada') || errorMessage.includes('outro computador')) {
        errorType = 'already_activated';
      } else if (errorMessage.includes('bloqueada') || errorMessage.includes('revogada')) {
        errorType = 'blocked';
        setState('blocked');
      }

      setError({ message: errorMessage, type: errorType });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && state !== 'loading') {
      handleActivate();
    }
  };

  const formatLicenseKey = (value: string) => {
    // Remove caracteres não alfanuméricos e converte para maiúsculo
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Adiciona hífen a cada 4 caracteres (XXXX-XXXX-XXXX-XXXX)
    const formatted = cleaned.match(/.{1,4}/g)?.join('-') || cleaned;
    return formatted.substring(0, 19); // Limita a 16 caracteres + 3 hífens
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(formatLicenseKey(e.target.value));
    if (state === 'error') {
      setState('idle');
      setError(null);
    }
  };

  // Tela de bloqueio
  if (state === 'blocked') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <CardTitle>Licença Bloqueada</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Esta licença foi bloqueada ou revogada. Entre em contato com o suporte para mais informações.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setState('idle');
                setError(null);
                setLicenseKey('');
              }}
              className="w-full"
            >
              Tentar outra chave
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-primary">
            <Key className="h-6 w-6" />
            <CardTitle>Ativação de Licença</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mensagem de sucesso */}
          {state === 'success' && (
            <div className="flex items-center gap-2 text-success mb-4 p-3 rounded-md bg-success/10">
              <CheckCircle2 className="h-5 w-5" />
              <span>Licença ativada com sucesso! Redirecionando...</span>
            </div>
          )}

          {/* Mensagem de erro */}
          {state === 'error' && error && (
            <div className="flex items-center gap-2 text-destructive mb-4 p-3 rounded-md bg-destructive/10">
              <XCircle className="h-5 w-5" />
              <span>{error.message}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="license-key" className="text-sm text-muted-foreground mb-2 block">
                Chave de Licença
              </label>
              <Input
                id="license-key"
                type="text"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                value={licenseKey}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={state === 'loading' || state === 'success'}
                className="font-mono text-center tracking-wider"
              />
            </div>

            <Button
              onClick={handleActivate}
              disabled={state === 'loading' || state === 'success' || !licenseKey.trim()}
              className="w-full"
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : state === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Ativado!
                </>
              ) : (
                'Ativar Licença'
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              A licença será vinculada a este computador. Para usar em outro dispositivo, 
              entre em contato com o suporte.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Activation;
