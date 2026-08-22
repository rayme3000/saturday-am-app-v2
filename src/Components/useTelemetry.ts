import { useEffect, useCallback } from 'react';
import { supabase } from '../supabase';

// Generates a simple session ID if one doesn't exist for this browser session
const getSessionId = () => {
  let sid = sessionStorage.getItem('am_telemetry_session');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('am_telemetry_session', sid);
  }
  return sid;
};

export const useTelemetry = (userId?: string) => {
  const sessionId = getSessionId();

  const trackEvent = useCallback(async (eventType: string, eventData: any = {}) => {
    try {
      await supabase.from('telemetry_events').insert([{
        session_id: sessionId,
        user_id: userId || null,
        event_type: eventType,
        event_data: eventData
      }]);
    } catch (err) {
      console.error('Telemetry error:', err);
    }
  }, [sessionId, userId]);

  // Track session start exactly once per session
  useEffect(() => {
    const hasStarted = sessionStorage.getItem('am_session_started');
    if (!hasStarted) {
      trackEvent('session_start');
      sessionStorage.setItem('am_session_started', 'true');
    }
  }, [trackEvent]);

  return { trackEvent };
};