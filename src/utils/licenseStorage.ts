// Armazenamento local para dados de licença
// Gerencia token JWT, última validação e período de carência

import type { LicenseState } from '@/types/license';

const STORAGE_KEYS = {
  TOKEN: 'fleet_license_token',
  LAST_VALIDATION: 'fleet_license_last_validation',
  FINGERPRINT: 'fleet_license_fingerprint',
  EXPIRES_AT: 'fleet_license_expires_at',
} as const;

// Período de carência offline: 72 horas em milissegundos
export const GRACE_PERIOD_MS = 72 * 60 * 60 * 1000;

// Intervalo de validação: 24 horas em milissegundos
export const VALIDATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Salva o token de licença no localStorage
 */
export function saveLicenseToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  saveLastValidation();
}

/**
 * Recupera o token de licença do localStorage
 */
export function getLicenseToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Salva o timestamp da última validação
 */
export function saveLastValidation(): void {
  localStorage.setItem(STORAGE_KEYS.LAST_VALIDATION, Date.now().toString());
}

/**
 * Recupera o timestamp da última validação
 */
export function getLastValidation(): number | null {
  const timestamp = localStorage.getItem(STORAGE_KEYS.LAST_VALIDATION);
  return timestamp ? parseInt(timestamp, 10) : null;
}

/**
 * Salva o fingerprint hash
 */
export function saveFingerprintHash(hash: string): void {
  localStorage.setItem(STORAGE_KEYS.FINGERPRINT, hash);
}

/**
 * Recupera o fingerprint hash armazenado
 */
export function getFingerprintHash(): string | null {
  return localStorage.getItem(STORAGE_KEYS.FINGERPRINT);
}

/**
 * Salva a data de expiração da licença
 */
export function saveExpiresAt(expiresAt: string): void {
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt);
}

/**
 * Recupera a data de expiração da licença
 */
export function getExpiresAt(): string | null {
  return localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
}

/**
 * Remove todos os dados de licença do localStorage
 */
export function clearLicenseData(): void {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LAST_VALIDATION);
  localStorage.removeItem(STORAGE_KEYS.FINGERPRINT);
  localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
}

/**
 * Verifica se precisa de validação online (>24h desde última validação)
 */
export function needsOnlineValidation(): boolean {
  const lastValidation = getLastValidation();
  if (!lastValidation) return true;

  const timeSinceValidation = Date.now() - lastValidation;
  return timeSinceValidation >= VALIDATION_INTERVAL_MS;
}

/**
 * Verifica se está dentro do período de carência offline (72h)
 */
export function isWithinGracePeriod(): boolean {
  const lastValidation = getLastValidation();
  if (!lastValidation) return false;

  const timeSinceValidation = Date.now() - lastValidation;
  return timeSinceValidation < GRACE_PERIOD_MS;
}

/**
 * Verifica se o período de carência expirou (>72h)
 */
export function hasGracePeriodExpired(): boolean {
  const lastValidation = getLastValidation();
  if (!lastValidation) return true;

  const timeSinceValidation = Date.now() - lastValidation;
  return timeSinceValidation >= GRACE_PERIOD_MS;
}

/**
 * Retorna o estado atual da licença baseado no localStorage
 */
export function getLicenseState(): LicenseState {
  const token = getLicenseToken();
  const expiresAt = getExpiresAt();
  const lastValidation = getLastValidation();

  if (!token) {
    return {
      isActivated: false,
      isValid: false,
      token: null,
      expiresAt: null,
      lastValidation: null,
      offlineGracePeriod: false,
    };
  }

  const isWithinGrace = isWithinGracePeriod();
  const gracePeriodExpired = hasGracePeriodExpired();

  return {
    isActivated: true,
    isValid: !gracePeriodExpired,
    token,
    expiresAt,
    lastValidation: lastValidation ? new Date(lastValidation).toISOString() : null,
    offlineGracePeriod: isWithinGrace && needsOnlineValidation(),
  };
}

/**
 * Calcula horas restantes no período de carência
 */
export function getGracePeriodRemainingHours(): number {
  const lastValidation = getLastValidation();
  if (!lastValidation) return 0;

  const timeSinceValidation = Date.now() - lastValidation;
  const remainingMs = GRACE_PERIOD_MS - timeSinceValidation;

  return Math.max(0, Math.floor(remainingMs / (60 * 60 * 1000)));
}
