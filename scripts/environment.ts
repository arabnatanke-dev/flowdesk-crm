import { z } from "zod";

const baseEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  SEED_ORG_SLUG: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default("horizon"),
  SEED_ORG_NAME: z.string().min(1).default("Horizon Home Services"),
  SEED_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_NAME: z.string().min(1).default("FlowDesk Owner"),
});

export const bootstrapEnvironmentSchema = baseEnvironmentSchema.extend({
  SEED_ADMIN_PASSWORD: z.string().min(12),
});

export const demoEnvironmentSchema = baseEnvironmentSchema.extend({
  DEMO_TECHNICIAN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  DEMO_TECHNICIAN_PASSWORD: z.string().min(12),
  DEMO_TECHNICIAN_NAME: z.string().min(1).default("Demo Technician"),
});

export const resetPasswordEnvironmentSchema = z.object({
  DATABASE_URL: z.string().url(),
  SEED_ADMIN_EMAIL: z.email().transform((value) => value.toLowerCase()),
  SEED_ADMIN_PASSWORD: z.string().min(12),
});
