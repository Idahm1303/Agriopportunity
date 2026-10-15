export const registrationEmailPolicyMessage =
  "UK email addresses are not accepted. Use a South African email address or a supported provider such as Gmail, Outlook, or Yahoo.";

export function isAllowedRegistrationEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@").at(-1);
  return Boolean(domain && domain.split(".").at(-1) !== "uk");
}
