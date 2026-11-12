import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔍 URL Check:", supabaseUrl);
console.log("🔑 Key Check:", supabaseKey ? "Key is loaded!" : "KEY IS UNDEFINED!");

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getOrCreatePersistentVisitorId = (): string => {
  try {
    let vid = localStorage.getItem('am_visitor_id');
    if (!vid) {
      vid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `vis_${crypto.randomUUID()}`
          : `vis_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('am_visitor_id', vid);
    }
    return vid;
  } catch {
    return `vis_anon_${Date.now()}`;
  }
};

// --- GLOBAL TELEMETRY TRACKER ---
export const trackTelemetry = async (eventType: string, metadata: any = {}) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    const visitorId = getOrCreatePersistentVisitorId();

    // Keep per-tab session ID for session-level tracking, and always include persistent visitor_id
    let sessionId = sessionStorage.getItem('am_session_id');
    if (!sessionId) {
      sessionId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      sessionStorage.setItem('am_session_id', sessionId);
    }

    const enrichedMetadata = {
      ...(metadata && typeof metadata === 'object' ? metadata : {}),
      visitor_id: metadata?.visitor_id || visitorId
    };

    await supabase.from('telemetry_events').insert([
      {
        event_type: eventType,
        user_id: userId,
        session_id: sessionId,
        metadata: enrichedMetadata
      }
    ]);
  } catch (err) {
    console.error("Telemetry failed silently:", err);
  }
};