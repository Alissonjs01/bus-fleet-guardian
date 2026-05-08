import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  isAdminLoggedIn, 
  adminLogout, 
  verifyAdminSession,
  adminLogin 
} from '@/admin/services/adminService';

export function useAdminAuth() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    setIsLoading(true);
    
    if (!isAdminLoggedIn()) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return false;
    }

    // Verifica com o servidor
    const valid = await verifyAdminSession();
    setIsAuthenticated(valid);
    setIsLoading(false);
    
    return valid;
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const result = await adminLogin(email, password);
    
    if (result.success) {
      setIsAuthenticated(true);
    }
    
    return result;
  };

  const logout = useCallback(() => {
    adminLogout();
    setIsAuthenticated(false);
    navigate('/login');
  }, [navigate]);

  const requireAuth = useCallback(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  return {
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth,
    requireAuth,
  };
}
