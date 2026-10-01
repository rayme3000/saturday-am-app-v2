import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record || !record.text) {
      return new Response("No comment text provided", { status: 200 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: settings } = await supabaseAdmin
      .from('app_settings')
      .select('openai_api_key, resend_api_key, moderator_emails, moderator_email_mode')
      .eq('id', 1)
      .single()
    
    if (!settings?.openai_api_key) {
      return new Response("OpenAI API key missing", { status: 200 })
    }

    // Evaluate toxicity via OpenAI
    const aiResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.openai_api_key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ input: record.text })
    })

    const aiData = await aiResponse.json()
    const isToxic = aiData.results[0]?.flagged || false

    if (isToxic) {
      await supabaseAdmin.from('series_comments').update({ is_flagged: true }).eq('id', record.id)
    }

    // Determine whether to send email based on configured toggle mode
    const emailMode = settings.moderator_email_mode || 'flagged_only'
    const shouldSendEmail = 
      (emailMode === 'all') ||
      (emailMode === 'flagged_only' && isToxic) ||
      (emailMode === 'clean_only' && !isToxic)

    if (shouldSendEmail && settings.resend_api_key && settings.moderator_emails?.length > 0) {
      const subject = isToxic ? '🚨 Toxic Comment Auto-Flagged' : '💬 New Public Comment Posted'
      const statusText = isToxic 
        ? 'This comment was flagged and is currently hidden from the public (Shadow Banned).' 
        : 'This comment passed moderation and is live.'
      const accentColor = isToxic ? '#ef4444' : '#22c55e'

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.resend_api_key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'AM Moderation <onboarding@resend.dev>',
          to: settings.moderator_emails,
          subject: subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: ${accentColor};">${isToxic ? 'Comment Flagged by Virtual Mod' : 'New Comment Posted'}</h2>
              <p><strong>User:</strong> ${record.user_name || 'Anonymous'}</p>
              <p><strong>Series / Chapter:</strong> ${record.series_slug || record.chapter_id || 'General'}</p>
              <div style="background: #f4f4f5; padding: 15px; border-left: 4px solid ${accentColor}; margin: 20px 0;">
                "${record.text}"
              </div>
              <p>${statusText}</p>
            </div>
          `
        })
      })
    }

    return new Response(JSON.stringify({ success: true, flagged: isToxic }), {
      headers: { "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error(error)
    return new Response("Internal Server Error", { status: 500 })
  }
})