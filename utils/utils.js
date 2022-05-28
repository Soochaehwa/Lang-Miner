/**
 * 빈 객체 확인하는 함수
 * @param {object} value 비었는지 확인할 객체
 * @returns 비었으면 true, 아니면 false
 */
export const isEmpty = (value) => {
  return Object.keys(value).length === 0 && value.constructor === Object;
};
