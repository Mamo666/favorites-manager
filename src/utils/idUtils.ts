import * as crypto from 'crypto';

/** Generates a short random ID */
export function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}
