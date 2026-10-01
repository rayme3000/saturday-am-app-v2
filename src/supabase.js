import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("🔍 URL Check:", supabaseUrl);
console.log("🔑 Key Check:", supabaseKey ? "Key is loaded!" : "KEY IS UNDEFINED!");

export const supabase = createClient(supabaseUrl, supabaseKey);

// --- GLOBAL TELEMETRY TRACKER ---
export const trackTelemetry = async (eventType, metadata = {}) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id || null;
    
    // Create a temporary session ID so anonymous users are still counted uniquely per visit
    let sessionId = sessionStorage.getItem('am_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('am_session_id', sessionId);
    }

    await supabase.from('telemetry_events').insert([{
      event_type: eventType,
      user_id: userId,
      session_id: sessionId,
      metadata: metadata
    }]);
  } catch (err) {
    console.error("Telemetry failed silently:", err);
  }
};