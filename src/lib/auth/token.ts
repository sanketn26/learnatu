/** JWT payloads contain UTF-8 JSON encoded as base64url. */
export function decodeTokenPayload(token: string) {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Token has no payload');
  const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
