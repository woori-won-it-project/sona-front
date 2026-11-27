export function normalizeEmployeeNumber(value) {
  return value.replace(/\D/g, '').slice(0, 8);
}

export function hasValidLoginFormat(employeeNumber, password) {
  const validEmployeeNumber =
    /^[34]\d{2}0\d{4}$/.test(employeeNumber) &&
    [...employeeNumber].reduce((sum, digit) => sum + Number(digit), 0) === 20;

  return (
    validEmployeeNumber &&
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[@!]/.test(password)
  );
}
