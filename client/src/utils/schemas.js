import { z } from 'zod';

export const phone = z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
export const email = z.string().trim().email('Enter a valid email address');
export const password = z.string().min(8, 'At least 8 characters').regex(/[a-z]/, 'Add a lowercase letter').regex(/[A-Z]/, 'Add an uppercase letter').regex(/\d/, 'Add a number');

export const loginSchema = z.object({ email, password: z.string().min(1, 'Enter your password') });
export const registerSchema = z.object({ name: z.string().trim().min(2, 'Enter your full name'), email, password });
export const forgotSchema = z.object({ email });
export const resetSchema = z.object({ password, confirm: z.string() }).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] });
export const addressSchema = z.object({
  label: z.string().optional(), fullName: z.string().trim().min(2, 'Enter the recipient name'), phone,
  line1: z.string().trim().min(3, 'Enter the street address'), line2: z.string().optional(), landmark: z.string().optional(),
  city: z.string().trim().min(2, 'Enter the city'), state: z.string().min(2, 'Select a state'), pincode: z.string().trim().regex(/^[1-9][0-9]{5}$/, 'Enter a valid 6-digit PIN code'),
  isDefault: z.boolean().optional(),
});
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name'), email,
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,17}$/, 'Enter a valid phone number').or(z.literal('')).optional(),
  message: z.string().trim().min(10, 'Message must be at least 10 characters'),
});
export const reviewSchema = z.object({ rating: z.number().min(1, 'Choose a rating'), title: z.string().trim().min(3, 'Add a short title'), body: z.string().max(2000).optional() });
export const profileSchema = z.object({ name: z.string().trim().min(2, 'Enter your name'), phone });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1, 'Required'), newPassword: password });

// Minimal react-hook-form resolver for Zod (avoids an extra dependency)
export const zodResolver = (schema) => async (values) => {
  const r = schema.safeParse(values);
  if (r.success) return { values: r.data, errors: {} };
  const errors = {};
  for (const i of r.error.issues) { const k = i.path.join('.'); if (!errors[k]) errors[k] = { type: i.code, message: i.message }; }
  return { values: {}, errors };
};
