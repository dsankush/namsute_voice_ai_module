export interface PlivoCallSession {
  callUuid: string;
  industryId: string;
  speaker: string;
  callerPhone?: string;
  history: { speaker: "ai" | "user"; text: string; language?: string }[];
  currentExtracted: Record<string, any>;
  lastSpokenText?: string;
  lastAudioId?: string;
  startTime: number;
  lastTurnTime: number;
  isComplete: boolean;
}

// In-memory session store (cleaned up after 30 mins)
const sessions = new Map<string, PlivoCallSession>();
const SESSION_TTL_MS = 30 * 60 * 1000;

function cleanupOldSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.lastTurnTime > SESSION_TTL_MS) {
      sessions.delete(key);
    }
  }
}

export function getOrCreatePlivoSession(
  callUuid: string,
  initialData?: Partial<PlivoCallSession>
): PlivoCallSession {
  cleanupOldSessions();
  const existing = sessions.get(callUuid);
  if (existing) {
    if (initialData) {
      Object.assign(existing, initialData);
      existing.lastTurnTime = Date.now();
    }
    return existing;
  }

  const newSession: PlivoCallSession = {
    callUuid,
    industryId: initialData?.industryId || "automobile",
    speaker: initialData?.speaker || "ritu",
    callerPhone: initialData?.callerPhone || "",
    history: initialData?.history || [],
    currentExtracted: initialData?.currentExtracted || {},
    startTime: Date.now(),
    lastTurnTime: Date.now(),
    isComplete: false,
  };

  sessions.set(callUuid, newSession);
  return newSession;
}

export function getPlivoSession(callUuid: string): PlivoCallSession | undefined {
  return sessions.get(callUuid);
}

export function updatePlivoSession(
  callUuid: string,
  updates: Partial<PlivoCallSession>
): PlivoCallSession | undefined {
  const session = sessions.get(callUuid);
  if (!session) return undefined;
  Object.assign(session, updates);
  session.lastTurnTime = Date.now();
  return session;
}

export function deletePlivoSession(callUuid: string): void {
  sessions.delete(callUuid);
}

/**
 * Encodes key state into a URL-safe base64 string.
 * This provides a stateless backup in the Plivo action URL query string
 * so that multi-turn calls survive across Vercel serverless cold-starts.
 */
export function encodeStatelessToken(session: PlivoCallSession): string {
  try {
    const minPayload = {
      i: session.industryId,
      s: session.speaker,
      p: session.callerPhone,
      e: session.currentExtracted,
      h: session.history.slice(-6), // keep last 6 messages
    };
    return Buffer.from(JSON.stringify(minPayload)).toString("base64url");
  } catch {
    return "";
  }
}

export function decodeStatelessToken(token: string): Partial<PlivoCallSession> | null {
  if (!token) return null;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const parsed = JSON.parse(raw);
    return {
      industryId: parsed.i,
      speaker: parsed.s,
      callerPhone: parsed.p,
      currentExtracted: parsed.e || {},
      history: parsed.h || [],
    };
  } catch {
    return null;
  }
}
