import { z } from 'zod';

// Session token request validation
export const sessionTokenRequestSchema = z.object({
  addresses: z.array(
    z.object({
      address: z.string().min(1, 'Address is required'),
      blockchains: z.array(z.string()).min(1, 'At least one blockchain is required'),
    })
  ).min(1, 'At least one address is required'),
  assets: z.array(z.string()).optional(),
});

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
};
