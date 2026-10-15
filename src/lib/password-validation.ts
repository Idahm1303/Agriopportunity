export const passwordPolicyMessage =
  "Incorrect password format. Use 8-10 characters with at least one letter, one number, and one special character.";

export function isValidPassword(password: string) {
  if (password.length < 8 || password.length > 10) return false;

  let hasLetter = false;
  let hasNumber = false;
  let hasSpecialCharacter = false;
  for (const character of password) {
    const code = character.charCodeAt(0);
    if (code < 33 || code > 126) return false;
    if (/[A-Za-z]/.test(character)) hasLetter = true;
    else if (/[0-9]/.test(character)) hasNumber = true;
    else hasSpecialCharacter = true;
  }

  return hasLetter && hasNumber && hasSpecialCharacter;
}
