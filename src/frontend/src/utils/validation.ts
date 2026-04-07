import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const caseLawSearchSchema = z.object({
  jurisdiction: z.string().optional(),
  legalSystem: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().positive().default(20),
  skip: z.number().nonnegative().default(0)
});

export const treatySearchSchema = z.object({
  status: z.string().optional(),
  topic: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().positive().default(20),
  skip: z.number().nonnegative().default(0)
});

export const ragSearchSchema = z.object({
  query: z.string().min(5, 'Query must be at least 5 characters')
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CaseLawSearchParams = z.infer<typeof caseLawSearchSchema>;
export type TreatySearchParams = z.infer<typeof treatySearchSchema>;
export type RAGSearchParams = z.infer<typeof ragSearchSchema>;

export function validateFormData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as unknown as { errors: { message: string }[] };
      const errorMessage = zodError.errors.map(e => e.message).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}