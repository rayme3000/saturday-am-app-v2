// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const k1 = (Deno.env.get("NEW LIVE KEY") ?? "").trim();
    const k2 = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
    const stripeKey = [k1, k2].find((k) => k.startsWith("sk_") || k.startsWith("rk_")) ?? k1 ?? k2;

    if (!stripeKey) {
      throw new Error("Missing Stripe Secret Key.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, userEmail } = await req.json();
    if (!userId && !userEmail) {
      throw new Error("Missing userId or userEmail.");
    }

    const stripeHeaders = {
      "Authorization": `Bearer ${stripeKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    let targetSubIds = new Set<string>();
    let targetEmail = String(userEmail || "").trim().toLowerCase();

    if (userId) {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email, stripe_customer_id, stripe_subscription_id")
        .eq("id", userId)
        .maybeSingle();

      if (prof?.email && !targetEmail) targetEmail = String(prof.email).trim().toLowerCase();
      if (prof?.stripe_subscription_id) targetSubIds.add(String(prof.stripe_subscription_id));

      if (prof?.stripe_customer_id) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(
            prof.stripe_customer_id
          )}&status=all`,
          { headers: stripeHeaders }
        );
        const subJson = await subRes.json();
        (subJson?.data || []).forEach((s: any) => {
          if (["active", "trialing", "past_due"].includes(s.status)) {
            targetSubIds.add(s.id);
          }
        });
      }
    }

    // Fallback: Lookup Stripe customers by email if subscription ID wasn't stored on profile yet
    if (targetSubIds.size === 0 && targetEmail) {
      const custRes = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(targetEmail)}&limit=10`,
        { headers: stripeHeaders }
      );
      const custJson = await custRes.json();
      for (const cust of custJson?.data || []) {
        const subRes = await fetch(
          `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(
            cust.id
          )}&status=all`,
          { headers: stripeHeaders }
        );
        const subJson = await subRes.json();
        (subJson?.data || []).forEach((s: any) => {
          if (["active", "trialing", "past_due"].includes(s.status)) {
            targetSubIds.add(s.id);
          }
        });
      }
    }

    const canceledIds: string[] = [];
    for (const subId of targetSubIds) {
      const delRes = await fetch(
        `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`,
        { method: "DELETE", headers: stripeHeaders }
      );
      if (delRes.ok) canceledIds.push(subId);
    }

    return new Response(
      JSON.stringify({ success: true, canceledSubscriptions: canceledIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Cancel Subscription Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});