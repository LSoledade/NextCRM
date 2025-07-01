// Utilitários para empresas
export type Company = 'Favale' | 'Pink' | 'Favale&Pink' | null;

export const getCompanyBadgeStyles = (company: Company) => {
  switch (company) {
    case 'Favale':
      return 'border-[#ff9810] text-[#ff9810] bg-[#ff9810]/10 dark:bg-[#ff9810]/20';
    case 'Pink':
      return 'border-[#ed0180] text-[#ed0180] bg-[#ed0180]/10 dark:bg-[#ed0180]/20';
    case 'Favale&Pink':
      return 'border-[#E71161] text-[#E71161] bg-[#E71161]/10 dark:bg-[#E71161]/20';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800';
  }
};

export const getStudentBadgeStyles = (company: Company) => {
  switch (company) {
    case 'Favale':
      return 'border-[#ff9810] text-[#ff9810] bg-[#ff9810]/10 dark:bg-[#ff9810]/20';
    case 'Pink':
      return 'border-[#ed0180] text-[#ed0180] bg-[#ed0180]/10 dark:bg-[#ed0180]/20';
    case 'Favale&Pink':
      return 'border-[#E71161] text-[#E71161] bg-[#E71161]/10 dark:bg-[#E71161]/20';
    default:
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800';
  }
};

export const getCompanyColor = (company: Company): string => {
  switch (company) {
    case 'Favale':
      return '#ff9810'; // Laranja #ff9810 para Favale
    case 'Pink':
      return '#ed0180'; // Rosa #ed0180 para Pink
    case 'Favale&Pink':
      return '#E71161'; // Rosa #E71161 para FavalePink
    default:
      return '#64748b'; // Cinza padrão
  }
};
