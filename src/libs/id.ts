/**
 * ID generation utility using crypto.randomUUID()
 */
export function generateId<T extends string>(): T {
  return crypto.randomUUID() as T;
}
