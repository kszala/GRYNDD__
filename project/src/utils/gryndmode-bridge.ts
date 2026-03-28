// ═══════════════════════════════════════════════════════════════
// GRYNDMODE BRIDGE — src/utils/gryndmode-bridge.ts
// Connects GRYND web app → GryndMode Chrome extension
// Protocol: window.postMessage (handled by content.js)
// ═══════════════════════════════════════════════════════════════

// Extension availability (set when content.js fires GRYNDMODE_READY)
let extensionReady = false;

// Listen for the ready signal once, on module load
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'GRYNDMODE_READY') {
    extensionReady = true;
    console.log('[GryndMode Bridge] Extension ready. Version:', event.data.payload?.version);
  }
});

// ── Check if extension is installed ──────────────────────────
export function isGryndModeAvailable(): boolean {
  return extensionReady;
}

// ── Activate GryndMode (call at session start) ────────────────
// Sends SESSION_START → content.js → background.js → blocking rules ON
// timestore.ts usage: activateGryndMode(subject, sessionId, durationMinutes)
export function activateGryndMode(
  subject: string,
  sessionId: string,
  durationMinutes: number
): void {
  if (!extensionReady) {
    console.warn('[GryndMode Bridge] Extension not available. Skipping activation.');
    return;
  }

  window.postMessage(
    {
      type: 'GRYNDMODE_SESSION_START',
      payload: { subject, sessionId, durationMinutes },
    },
    window.location.origin
  );

  console.log(`[GryndMode Bridge] Session started — Subject: ${subject}, Duration: ${durationMinutes}m`);
}

// ── Deactivate GryndMode (call at session stop/complete) ──────
// Sends SESSION_END → content.js → background.js → blocking rules OFF
// timestore.ts usage: deactivateGryndMode()
export function deactivateGryndMode(): void {
  if (!extensionReady) return;

  window.postMessage(
    { type: 'GRYNDMODE_SESSION_END' },
    window.location.origin
  );

  console.log('[GryndMode Bridge] Session ended — blocking deactivated.');
}

// ── Get GryndMode analytics (for Dashboard / Analytics page) ──
// Returns a Promise that resolves with extension state + blocked attempts
export interface GryndModeAnalytics {
  gryndActive: boolean;
  sessionLocked: boolean;
  blockedAttempts: number;
  customBlocked: string[];
  defaultBlocked: string[];
}

export function getGryndModeAnalytics(): Promise<GryndModeAnalytics | null> {
  return new Promise((resolve) => {
    if (!extensionReady) {
      resolve(null);
      return;
    }

    // One-time listener for the state response
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type === 'GRYNDMODE_STATE') {
        window.removeEventListener('message', handler);
        resolve(event.data.payload as GryndModeAnalytics);
      }
    };

    window.addEventListener('message', handler);

    // Request state from extension
    window.postMessage({ type: 'GRYNDMODE_GET_STATE' }, window.location.origin);

    // Timeout safety — if extension doesn't respond in 2s, resolve null
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 2000);
  });
}