import { z } from "zod";
import { isValidEmail } from "@/server/security/canonical";

export const registerSchema = z.object({
 email: z
 .string()
 .trim()
 .min(3, "Email is required")
 .max(254)
 .refine(isValidEmail, "Enter a valid email address"),
 password: z.string().min(1, "Password is required").max(500),
 displayName: z.string().trim().min(1).max(80).optional(),
});

export const loginSchema = z.object({
 email: z.string().trim().min(3).max(254),
 password: z.string().min(1).max(500),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
