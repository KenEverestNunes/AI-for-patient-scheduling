const { z } = require('zod');

const IntakeSchema = z.object({
  firstName: z.string({ required_error: 'firstName is required' })
    .trim()
    .min(1, 'firstName cannot be empty')
    .max(50, 'firstName cannot exceed 50 characters'),
  lastName: z.string({ required_error: 'lastName is required' })
    .trim()
    .min(1, 'lastName cannot be empty')
    .max(50, 'lastName cannot exceed 50 characters'),
  dob: z.string({ required_error: 'dob is required' })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be in YYYY-MM-DD format'),
  phone: z.string({ required_error: 'phone is required' })
    .trim()
    .refine(val => {
      const digits = val.replace(/\D/g, '');
      return digits.length >= 10 && digits.length <= 15;
    }, { message: 'phone must contain between 10 and 15 digits' }),
  email: z.string({ required_error: 'email is required' })
    .trim()
    .email('Invalid email address')
    .max(100, 'email cannot exceed 100 characters')
    .toLowerCase(),
  reason: z.string().trim().max(500, 'reason cannot exceed 500 characters').optional().default(''),
  smsOptIn: z.boolean().optional().default(false)
});

module.exports = { IntakeSchema };
