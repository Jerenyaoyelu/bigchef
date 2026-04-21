type TrackPayload = Record<string, unknown>;

export function track(event: string, payload: TrackPayload = {}) {
  const ts = new Date().toISOString();
  // v0: local logger; next step can send to backend.
  console.log(`[track] ${event}`, { ts, ...payload });
}

