/**
 * Simple in-memory rate limiter
 * In production, consider using Redis or a more robust solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(
  request: Request,
  options: { limit: number; windowMs: number }
): { success: boolean; resetTime?: number } {
  const ip = 
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const windowMs = options.windowMs;
  const limit = options.limit;

  const entry = rateLimitStore.get(ip);

  if (!entry) {
    // First request from this IP
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true };
  }

  if (now > entry.resetTime) {
    // Window has expired, reset
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { success: true };
  }

  if (entry.count >= limit) {
    // Rate limit exceeded
    return { 
      success: false, 
      resetTime: entry.resetTime 
    };
  }

  // Increment count
  entry.count++;
  rateLimitStore.set(ip, entry);
  return { success: true };
}
