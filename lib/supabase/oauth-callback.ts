// Only authorization codes bound to the SDK's locally stored PKCE verifier are accepted.
export function getNativeOAuthCode(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'lotochoco:' || url.hostname !== 'login' ||
        url.pathname !== '' || url.username || url.password || url.port || url.hash) return null;
    const codes = url.searchParams.getAll('code');
    if (codes.length !== 1 || !codes[0] || url.searchParams.has('error')) return null;
    return codes[0];
  } catch {
    return null;
  }
}
