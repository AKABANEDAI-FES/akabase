/**
 * ID generation utility using crypto.randomUUID()
 */
export function generateId(): string {
  return crypto.randomUUID();
}
