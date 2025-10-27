/**
 * Validates that a string is a valid UUID v4
 */
export function isValidUUID(id: string): boolean {
  if (typeof id !== "string") {
    return false;
  }

  const uuidV4Regex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(id);
}

/**
 * Validates that a string is safe for database queries
 * Prevents SQL injection by ensuring proper format
 */
export function validateDatabaseId(id: string, fieldName: string = "id"): void {
  if (!id || typeof id !== "string") {
    throw new Error(`Invalid ${fieldName}: must be a non-empty string`);
  }

  // For UUID-based IDs, ensure it's a valid UUID
  if (!isValidUUID(id)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID`);
  }

  // Additional safety: check for suspicious patterns
  if (
    id.includes("'") ||
    id.includes('"') ||
    id.includes(";") ||
    id.includes("--")
  ) {
    throw new Error(`Invalid ${fieldName}: contains forbidden characters`);
  }
}

/**
 * Sanitizes a lock key to prevent injection attacks
 */
export function sanitizeLockKey(key: string): string {
  if (!key || typeof key !== "string") {
    throw new Error("Lock key must be a non-empty string");
  }

  // Only allow alphanumeric characters, hyphens, and underscores
  const sanitized = key.replace(/[^a-zA-Z0-9_-]/g, "");

  if (sanitized.length === 0) {
    throw new Error("Lock key contains only invalid characters");
  }

  // Limit length to prevent DOS
  if (sanitized.length > 255) {
    throw new Error("Lock key is too long (max 255 characters)");
  }

  return sanitized;
}
