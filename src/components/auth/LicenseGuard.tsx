import { useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, WifiOff } from 'lucide-react';
import { 
  checkAndValidateLicense, 
  getCurrentLicenseState,
  validateLicense 
} from '@/services/licenseService';
import { getGracePeriodRemainingHours, needsOnlineValidation } from '@/utils/licenseStorage';

interface LicenseGuardProps {
  children: ReactNode;
}

export function LicenseGuard({ children }: LicenseGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isOfflineGrace, setIsOfflineGrace] = useState(false);
  const [graceHoursRemaining, setGraceHoursRemaining] = useState(0);

  useEffect(() => {
    const validateOnMount = async () => {
      setIsValidating(true);

      const state = getCurrentLicenseState();

      // Se não está ativado, redireciona para ativação
      if (!state.isActivated) {
        navigate('/activation', { replace: true });
        return;
      }

      // Verifica e valida a licença
      const valid = await checkAndValidateLicense();

      if (!valid) {
        navigate('/activation', { replace: true });
        return;
      }

      // Verifica se está em modo offline grace
      const needsValidation = needsOnlineValidation();
      const currentState = getCurrentLicenseState();

      if (needsValidation && currentState.offlineGracePeriod) {
        setIsOfflineGrace(true);
        setGraceHoursRemaining(getGracePeriodRemainingHours());
      }

      setIsValid(true);
      setIsValidating(false);
    };

    validateOnMount();
  }, [navigate, location.pathname]);

  // Validação periódica a cada 1 hora enquanto app está aberto
  useEffect(() => {
    if (!isValid) return;

    const intervalId = setInterval(async () => {
      if (needsOnlineValidation()) {
        const result = await validateLicense();
        
        if (!result.valid) {
          const state = getCurrentLicenseState();
          if (!state.isValid) {
            navigate('/activation', { replace: true });
          } else if (state.offlineGracePeriod) {
            setIsOfflineGrace(true);
            setGraceHoursRemaining(getGracePeriodRemainingHours());
          }
        } else {
          setIsOfflineGrace(false);
        }
      }
    }, 60 * 60 * 1000); // 1 hora

    return () => clearInterval(intervalId);
  }, [isValid, navigate]);

  // Tela de carregamento durante validação
  if (isValidating) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Verificando licença...</p>
      </div>
    );
  }

  // Se válido, renderiza o conteúdo com aviso de offline se necessário
  if (isValid) {
    return (
      <>
        {/* Banner de modo offline */}
        {isOfflineGrace && (
          <div className="fixed top-0 left-0 right-0 bg-warning/10 border-b border-warning z-50 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-warning text-sm">
              <WifiOff className="h-4 w-4" />
              <span>
                Modo offline - {graceHoursRemaining}h restantes para reconectar
              </span>
            </div>
          </div>
        )}
        <div className={isOfflineGrace ? 'pt-10' : ''}>
          {children}
        </div>
      </>
    );
  }

  // Fallback - não deveria chegar aqui
  return null;
}
