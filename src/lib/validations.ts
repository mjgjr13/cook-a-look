import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Please enter a valid email address" })
  .max(255, { message: "Email must be less than 255 characters" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters" })
  .max(72, { message: "Password must be less than 72 characters" });

export const nameSchema = z
  .string()
  .trim()
  .min(1, { message: "Name is required" })
  .max(100, { message: "Name must be less than 100 characters" })
  .regex(/^[a-zA-Z\s'-]+$/, { message: "Name can only contain letters, spaces, hyphens, and apostrophes" });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Password is required" }),
});

export const signUpSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const uuidSchema = z.string().uuid({ message: "Invalid ID format" });

export const bookingRequestSchema = z.object({
  advisorId: uuidSchema,
  slotId: uuidSchema,
});

// Phone number validation - required for advisors
export const phoneSchema = z
  .string()
  .trim()
  .min(10, { message: "Phone number is required" })
  .max(20, { message: "Phone number must be less than 20 characters" })
  .regex(/^[+]?[\d\s\-()]+$/, { message: "Please enter a valid phone number" });

// Instagram handle validation
export const instagramSchema = z
  .string()
  .trim()
  .min(1, { message: "Instagram handle is required" })
  .max(30, { message: "Instagram handle must be less than 30 characters" })
  .regex(/^@?[a-zA-Z0-9._]+$/, { message: "Please enter a valid Instagram handle" });

// URL validation - optional but must be valid if provided
export const urlSchema = z
  .string()
  .trim()
  .url({ message: "Please enter a valid URL" })
  .max(500, { message: "URL must be less than 500 characters" })
  .optional()
  .or(z.literal(""));

// Bio/text area validation
export const bioSchema = z
  .string()
  .trim()
  .min(10, { message: "Please provide at least 10 characters" })
  .max(2000, { message: "Must be less than 2000 characters" });

// Specialty validation - now optional since we use client focus/use cases instead
export const specialtySchema = z
  .string()
  .trim()
  .max(100, { message: "Specialty must be less than 100 characters" })
  .optional()
  .or(z.literal(""));

// File validation helper
export const validateFile = (file: File | null, maxSizeMB: number = 5): string | null => {
  if (!file) return "File is required";
  
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return "Only JPEG, PNG, WebP, and GIF images are allowed";
  }
  
  const maxSize = maxSizeMB * 1024 * 1024;
  if (file.size > maxSize) {
    return `File must be smaller than ${maxSizeMB}MB`;
  }
  
  return null;
};

// Advisor application schema
export const advisorApplicationSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  experience: z.string().max(50, { message: "Experience must be less than 50 characters" }).optional(),
  bio: bioSchema,
  virtual: z.boolean(),
  inPerson: z.boolean(),
  instagram: instagramSchema,
  tiktok: z.string().max(30).optional().or(z.literal("")),
  linkedin: z.string().max(200).optional().or(z.literal("")),
  portfolio: urlSchema,
  agreeTerms: z.literal(true, { 
    errorMap: () => ({ message: "You must agree to the terms" }) 
  }),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type AdvisorApplicationFormData = z.infer<typeof advisorApplicationSchema>;
