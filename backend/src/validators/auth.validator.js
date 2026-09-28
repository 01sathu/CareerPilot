const { z } = require('zod');

// Password rule (SRS FR-003): 8-128 chars, at least 1 uppercase, 1 lowercase, 1 digit
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const passwordErrorMessage =
  'Password must be 8-128 characters long and include at least one uppercase letter, one lowercase letter, and one number.';

const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters long')
      .max(80, 'Name cannot exceed 80 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address')
      .max(120, 'Email cannot exceed 120 characters'),
    password: z
      .string({ required_error: 'Password is required' })
      .regex(passwordRegex, passwordErrorMessage),
    passwordConfirmation: z
      .string({ required_error: 'Password confirmation is required' })
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation']
  });

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});

const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address')
});

const resetPasswordSchema = z
  .object({
    password: z
      .string({ required_error: 'Password is required' })
      .regex(passwordRegex, passwordErrorMessage),
    passwordConfirmation: z
      .string({ required_error: 'Password confirmation is required' })
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Passwords do not match',
    path: ['passwordConfirmation']
  });

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password cannot be empty'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .regex(passwordRegex, passwordErrorMessage),
    newPasswordConfirmation: z
      .string({ required_error: 'New password confirmation is required' })
  })
  .refine((data) => data.newPassword === data.newPasswordConfirmation, {
    message: 'New passwords do not match',
    path: ['newPasswordConfirmation']
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword']
  });

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
};
