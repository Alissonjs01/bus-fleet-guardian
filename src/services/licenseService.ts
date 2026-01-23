// Serviço de licenciamento
// Gerencia ativação, validação e estado da licença

import { supabase } from '@/integrations/supabase/client';
import { generateFingerprint } from './fingerprint';
import {
  saveLicenseToken,
  getLicenseToken,
  saveLastValidation,
  saveFingerprintHash,
  saveExpiresAt,
  clearLicenseData,
  getLicenseState,
  needsOnlineValidation,
  hasGracePeriodExpired,
} from '@/utils/licenseStorage';
import type { ActivationResponse, ValidationResponse, LicenseState } from '@/types/license';

/**
 * Ativa uma licença com a chave fornecida
 * @param licenseKey - Chave de licença fornecida pelo usuário
 * @returns Promise<ActivationResponse>
 */
export async function activateLicense(licenseKey: string): Promise<ActivationResponse> {
  try {
    const fingerprintHash = await generateFingerprint();

    const { data, error } = await supabase.functions.invoke('activate-license', {
      body: {
        license_key: licenseKey.trim().toUpperCase(),
        fingerprint_hash: fingerprintHash,
      },
    });

    if (error) {
      console.error('Erro na ativação:', error);
      return {
        success: false,
        error: 'Erro de conexão com o servidor',
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Erro desconhecido',
      };
    }

    // Salva dados da licença localmente
    saveLicenseToken(data.token);
    saveFingerprintHash(fingerprintHash);
    saveExpiresAt(data.expiresAt);

    return {
      success: true,
      token: data.token,
      expiresAt: data.expiresAt,
    };
  } catch (err) {
    console.error('Erro na ativação:', err);
    return {
      success: false,
      error: 'Sem conexão com o servidor',
    };
  }
}

/**
 * Valida a licença atual com o servidor
 * @returns Promise<ValidationResponse>
 */
export async function validateLicense(): Promise<ValidationResponse> {
  try {
    const token = getLicenseToken();
    if (!token) {
      return { valid: false, error: 'Licença não encontrada' };
    }

    const fingerprintHash = await generateFingerprint();

    const { data, error } = await supabase.functions.invoke('validate-license', {
      body: {
        token,
        fingerprint_hash: fingerprintHash,
      },
    });

    if (error) {
      console.error('Erro na validação:', error);
      // Em caso de erro de rede, verificar período de carência
      if (!hasGracePeriodExpired()) {
        return { valid: true, error: 'Modo offline - período de carência ativo' };
      }
      return { valid: false, error: 'Erro de conexão e período de carência expirado' };
    }

    if (!data.valid) {
      // Limpa dados locais se licença inválida
      if (data.error !== 'Erro de rede') {
        clearLicenseData();
      }
      return { valid: false, error: data.error || 'Licença inválida' };
    }

    // Atualiza dados locais
    if (data.token) {
      saveLicenseToken(data.token);
    }
    if (data.expiresAt) {
      saveExpiresAt(data.expiresAt);
    }
    saveLastValidation();

    return {
      valid: true,
      token: data.token,
      expiresAt: data.expiresAt,
    };
  } catch (err) {
    console.error('Erro na validação:', err);
    // Em caso de erro de rede, verificar período de carência
    if (!hasGracePeriodExpired()) {
      return { valid: true, error: 'Modo offline - período de carência ativo' };
    }
    return { valid: false, error: 'Sem conexão e período de carência expirado' };
  }
}

/**
 * Verifica se a licença precisa ser validada e realiza validação se necessário
 * @returns Promise<boolean> - true se licença válida
 */
export async function checkAndValidateLicense(): Promise<boolean> {
  const state = getLicenseState();

  // Se não está ativado, não é válido
  if (!state.isActivated) {
    return false;
  }

  // Se precisa de validação online
  if (needsOnlineValidation()) {
    const result = await validateLicense();
    return result.valid;
  }

  // Licença está válida localmente
  return state.isValid;
}

/**
 * Retorna o estado atual da licença
 */
export function getCurrentLicenseState(): LicenseState {
  return getLicenseState();
}

/**
 * Remove a licença atual (logout)
 */
export function deactivateLicense(): void {
  clearLicenseData();
}

/**
 * Verifica se existe uma licença ativada
 */
export function hasActiveLicense(): boolean {
  const state = getLicenseState();
  return state.isActivated && state.isValid;
}
