/**
 * Tiny classnames joiner — filters falsy values. Keeps component markup clean
 * without pulling in a dependency.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
