/**
 * Converte um ArrayBuffer (ou Uint8Array) para uma string Base64URL.
 * Essencial para serializar dados binários para transmissão (e.g., para a Sui Blockchain).
 */
export function arrayBufferToBase64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  // Usa btoa para Base64 padrão e depois ajusta para URL-safe
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Converte uma string Base64URL de volta para um ArrayBuffer.
 * Essencial para desserializar dados binários recuperados da Sui.
 */
export function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  // Ajusta de URL-safe de volta para Base64 padrão para atob funcionar
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray.buffer;
}
