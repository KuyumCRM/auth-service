/** Result of password policy validation (e.g. length, complexity). */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
