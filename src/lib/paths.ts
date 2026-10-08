/** Returns `value` when it is a same-site path like "/courses/", otherwise `fallback`. Blocks "//evil.com" and backslash tricks. */
export function safeLocalPath(value: string | null | undefined, fallback = '/') {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') ? value : fallback;
}
