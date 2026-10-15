export function dashboardForRole(role: string | undefined) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "EMPLOYER" || role === "PROVIDER") return "/employer/dashboard";
  return "/dashboard";
}
