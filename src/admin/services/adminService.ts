// Serviço de autenticação e API do painel admin
// Gerencia login, sessão e operações CRUD de licenças

import { supabase } from '@/integrations/supabase/client';
import type { License, ActivityLog } from '@/types/license';

const ADMIN_TOKEN_KEY = 'fleet_admin_token';

// Tipos específicos do admin
export interface AdminLoginResponse {
  success: boolean;
  token?: string;
  error?: string;
}

export interface LicenseListResponse {
  success: boolean;
  licenses?: License[];
  error?: string;
}

export interface LicenseStats {
  total: number;
  active: number;
  expired: number;
  blocked: number;
  pending: number;
}

/**
 * Login do administrador
 */
export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { email, password, action: 'login' },
    });

    if (error) {
      console.error('Erro no login admin:', error);
      return { success: false, error: 'Erro de conexão' };
    }

    if (!data.success) {
      return { success: false, error: data.error || 'Credenciais inválidas' };
    }

    // Salva token do admin
    sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);

    return { success: true, token: data.token };
  } catch (err) {
    console.error('Erro no login admin:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Logout do administrador
 */
export function adminLogout(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

/**
 * Verifica se admin está logado
 */
export function isAdminLoggedIn(): boolean {
  return !!sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

/**
 * Obtém token do admin
 */
export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

/**
 * Lista todas as licenças
 */
export async function listLicenses(): Promise<LicenseListResponse> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { action: 'list', admin_token: token },
    });

    if (error) {
      return { success: false, error: 'Erro ao buscar licenças' };
    }

    return { success: true, licenses: data.licenses || [] };
  } catch (err) {
    console.error('Erro ao listar licenças:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Obtém estatísticas das licenças
 */
export async function getLicenseStats(): Promise<LicenseStats> {
  const result = await listLicenses();
  
  if (!result.success || !result.licenses) {
    return { total: 0, active: 0, expired: 0, blocked: 0, pending: 0 };
  }

  const licenses = result.licenses;
  return {
    total: licenses.length,
    active: licenses.filter(l => l.status === 'active').length,
    expired: licenses.filter(l => l.status === 'expired').length,
    blocked: licenses.filter(l => l.status === 'blocked').length,
    pending: licenses.filter(l => l.status === 'pending').length,
  };
}

/**
 * Cria uma nova licença
 */
export async function createLicense(expiresAt: string): Promise<{ success: boolean; license?: License; error?: string }> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { 
        action: 'create', 
        admin_token: token,
        expires_at: expiresAt,
      },
    });

    if (error) {
      return { success: false, error: 'Erro ao criar licença' };
    }

    return { success: true, license: data.license };
  } catch (err) {
    console.error('Erro ao criar licença:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Atualiza status de uma licença
 */
export async function updateLicenseStatus(
  licenseId: string, 
  status: 'active' | 'blocked' | 'expired'
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { 
        action: 'update_status', 
        admin_token: token,
        license_id: licenseId,
        status,
      },
    });

    if (error) {
      return { success: false, error: 'Erro ao atualizar licença' };
    }

    return { success: data.success, error: data.error };
  } catch (err) {
    console.error('Erro ao atualizar licença:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Reseta ativação de uma licença (libera para novo computador)
 */
export async function resetLicenseActivation(licenseId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { 
        action: 'reset_activation', 
        admin_token: token,
        license_id: licenseId,
      },
    });

    if (error) {
      return { success: false, error: 'Erro ao resetar ativação' };
    }

    return { success: data.success, error: data.error };
  } catch (err) {
    console.error('Erro ao resetar ativação:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Atualiza data de expiração de uma licença
 */
export async function updateLicenseExpiration(
  licenseId: string, 
  expiresAt: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { 
        action: 'update_expiration', 
        admin_token: token,
        license_id: licenseId,
        expires_at: expiresAt,
      },
    });

    if (error) {
      return { success: false, error: 'Erro ao atualizar expiração' };
    }

    return { success: data.success, error: data.error };
  } catch (err) {
    console.error('Erro ao atualizar expiração:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Obtém logs de atividade
 */
export async function getActivityLogs(licenseId?: string): Promise<{ success: boolean; logs?: ActivityLog[]; error?: string }> {
  try {
    const token = getAdminToken();
    if (!token) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data, error } = await supabase.functions.invoke('admin-licenses', {
      body: { 
        action: 'get_logs', 
        admin_token: token,
        license_id: licenseId,
      },
    });

    if (error) {
      return { success: false, error: 'Erro ao buscar logs' };
    }

    return { success: true, logs: data.logs || [] };
  } catch (err) {
    console.error('Erro ao buscar logs:', err);
    return { success: false, error: 'Erro de conexão' };
  }
}

/**
 * Verifica sessão do admin com o servidor
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const token = getAdminToken();
    if (!token) return false;

    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'verify', admin_token: token },
    });

    if (error || !data.valid) {
      adminLogout();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
