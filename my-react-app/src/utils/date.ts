/**
 * 백엔드(Spring)에서 내려오는 다양한 포맷의 날짜 데이터를 
 * YYYY-MM-DD 형식의 문자열로 변환하는 유틸리티 함수 [cite: 24]
 */
export const formatDate = (dateInput: any): string => {
  if (!dateInput) return '';

  // Case 1: 문자열로 들어오는 경우 (ISO String 등) [cite: 25]
  if (typeof dateInput === 'string') {
    return dateInput.split('T')[0]; 
  }

  // Case 2: 스프링 Jackson 직렬화로 인해 [YYYY, MM, DD, hh, mm, ss] 배열로 들어오는 경우 [cite: 25]
  if (Array.isArray(dateInput)) {
    const year = dateInput[0];
    const month = String(dateInput[1]).padStart(2, '0'); 
    const day = String(dateInput[2]).padStart(2, '0'); 
    return `${year}-${month}-${day}`; 
  }

  return ''; 
};