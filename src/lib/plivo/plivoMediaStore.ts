// In-memory store for generated TTS clips served to Plivo
const mediaCache = new Map<string, { buffer: Buffer; mimeType: string; createdAt: number }>();
const MEDIA_TTL_MS = 20 * 60 * 1000; // 20 minutes

function cleanupMedia() {
  const now = Date.now();
  for (const [id, item] of mediaCache.entries()) {
    if (now - item.createdAt > MEDIA_TTL_MS) {
      mediaCache.delete(id);
    }
  }
}

export function savePlivoMedia(base64Data: string, mimeType = "audio/wav"): string {
  cleanupMedia();
  const id = `aud_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const buffer = Buffer.from(base64Data, "base64");
  mediaCache.set(id, { buffer, mimeType, createdAt: Date.now() });
  return id;
}

export function getPlivoMedia(id: string): { buffer: Buffer; mimeType: string } | null {
  const item = mediaCache.get(id);
  if (!item) return null;
  return { buffer: item.buffer, mimeType: item.mimeType };
}
