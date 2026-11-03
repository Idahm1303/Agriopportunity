import { z } from "zod";

import { opportunityTypes } from "@/lib/agri-options";

const opportunityTypeSchema = z.enum(
  opportunityTypes as [typeof opportunityTypes[number], ...typeof opportunityTypes[number][]],
);

export const platformSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
  enabledOpportunityTypes: z.array(opportunityTypeSchema).min(1, "Keep at least one opportunity type enabled."),
  emailNotificationsEnabled: z.boolean(),
  siteName: z.string().trim().min(2).max(80),
  contactEmail: z.union([z.email(), z.literal("")]),
  contactPhone: z.string().trim().max(40),
  loginAttemptLimit: z.number().int().min(3).max(20),
  loginLockoutMinutes: z.number().int().min(5).max(240),
});

export type PlatformSettings = z.infer<typeof platformSettingsSchema>;

export const defaultPlatformSettings: PlatformSettings = {
  registrationEnabled: true,
  enabledOpportunityTypes: [...opportunityTypes],
  emailNotificationsEnabled: true,
  siteName: "AgriOpportunity",
  contactEmail: "",
  contactPhone: "",
  loginAttemptLimit: 5,
  loginLockoutMinutes: 15,
};
