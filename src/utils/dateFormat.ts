// Utilitários para formatação de datas em pt-BR

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string | Date): string => {
  return new Date(date).toLocaleString('pt-BR');
};

export const formatDateForInput = (date: string | Date): string => {
  return new Date(date).toISOString().split('T')[0];
};

export const formatNumber = (value: number): string => {
  return value.toLocaleString('pt-BR');
};

export const formatCurrency = (value: number): string => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
};