    // @ts-nocheck
const corsHeaders = {

  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Built-in Stripe Connect lookup so the backend always knows connected creators
const CREATOR_STRIPE_CONNECT_MAP: Record<string, string> = {
  "oscar fong": "acct_1USWwtGzA2Qad5v8",
  "odunze oguguo": "acct_1USiRECvtW3bYdhU",
  "whyt manga": "acct_1USiRECvtW3bYdhU",
  "odunze oguguo (whyt manga)": "acct_1USiRECvtW3bYdhU",
  "erick pedrucci": "acct_1USUE8GnNL3tCg0x",
  "eric pedrucci": "acct_1USUE8GnNL3tCg0x",
  "eric": "acct_1USUE8GnNL3tCg0x",
  "stefano romano": "acct_1USU8mKGryTzf1Ck",
  "jeyodin": "acct_1USMJFGv39K92CFY",
  "frank simmonds": "acct_1USDbD1EcQ1S1MjY",
};

const resolveStripeAccount = (creatorName?: string, passedAccountId?: string): string => {
  const cleanPassed = String(passedAccountId || "").trim();
  if (cleanPassed.startsWith("acct_")) return cleanPassed;

  const lowerName = String(creatorName || "").trim().toLowerCase();
  if (!lowerName) return "";

  if (CREATOR_STRIPE_CONNECT_MAP[lowerName]) {
    return CREATOR_STRIPE_CONNECT_MAP[lowerName];
  }

  for (const [key, acctId] of Object.entries(CREATOR_STRIPE_CONNECT_MAP)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return acctId;
    }
  }

  // Empty string means no Connect account yet -> defaults 100% to Saturday AM main Stripe account
  return "";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const k1 = (Deno.env.get("NEW LIVE KEY") || "").trim();
    const k2 = (Deno.env.get("STRIPE_SECRET_KEY") || "").trim();

    const validKey = [k1, k2].find((k) => k.startsWith("sk_") || k.startsWith("rk_"));
    const rawKey = validKey || k1 || k2;

    if (!rawKey) {
      throw new Error("Stripe key is empty in Supabase Secrets.");
    }

    if (!rawKey.startsWith("sk_") && !rawKey.startsWith("rk_")) {
      throw new Error(
        `Neither NEW LIVE KEY (${k1.slice(0, 7)}...) nor STRIPE_SECRET_KEY (${k2.slice(0, 7)}...) starts with sk_live_.`
      );
    }

    const body = await req.json();
    const {
      type = "subscription",
      userId,
      userEmail,
      returnUrl,
      plan = "monthly",
      creatorName,
      stripeAccountId,
      amountDollars,
      fanmail = "",
      seriesSlug = "",
      referralCode = "",
      referralRole = "",
      referralPartnerName = "",
    } = body;

    if (!userId) {
      throw new Error("Missing User ID. Please log in again.");
    }

    const safeReturnUrl = returnUrl || "https://www.mangahype.com";
    const resolvedConnectId = resolveStripeAccount(creatorName, stripeAccountId);

    // Helper function to build Checkout Session params
    const buildParams = (includeConnectTransfer: boolean) => {
      const params = new URLSearchParams();

      if (type === "donation") {
        const validAmounts = [5, 10, 15, 20];
        const cleanAmount = Number(amountDollars);
        if (!validAmounts.includes(cleanAmount)) {
          throw new Error("Invalid donation amount. Please select $5, $10, $15, or $20.");
        }

        const unitAmountCents = String(cleanAmount * 100);
        const cleanCreatorName = (creatorName || "Saturday AM Creator").trim();
        const cleanFanmail = String(fanmail || "").slice(0, 250);
        const useConnect = includeConnectTransfer && resolvedConnectId.startsWith("acct_");
        const payoutRouting = useConnect ? "creator_connect" : "saturday_am_default";

        params.append("mode", "payment");
        params.append("payment_method_types[0]", "card");
        if (userEmail) params.append("customer_email", userEmail);
        params.append("client_reference_id", userId);

        params.append("line_items[0][quantity]", "1");
        params.append("line_items[0][price_data][currency]", "usd");
        params.append("line_items[0][price_data][unit_amount]", unitAmountCents);
        params.append(
          "line_items[0][price_data][product_data][name]",
          `Support ${cleanCreatorName} (Creator Tip)`
        );
        params.append(
          "line_items[0][price_data][product_data][description]",
          cleanFanmail
            ? `Fanmail: "${cleanFanmail}"`
            : `Direct support for ${cleanCreatorName} on Saturday AM.`
        );

        params.append("metadata[type]", "donation");
        params.append("metadata[userId]", userId);
        params.append("metadata[creatorName]", cleanCreatorName);
        params.append("metadata[amountDollars]", String(cleanAmount));
        params.append("metadata[fanmail]", cleanFanmail);
        params.append("metadata[seriesSlug]", seriesSlug || "");
        params.append("metadata[stripeAccountId]", useConnect ? resolvedConnectId : "");
        params.append("metadata[payoutRouting]", payoutRouting);

        params.append("payment_intent_data[metadata][type]", "donation");
        params.append("payment_intent_data[metadata][creatorName]", cleanCreatorName);
        params.append("payment_intent_data[metadata][fanmail]", cleanFanmail);
        params.append("payment_intent_data[metadata][userId]", userId);
        params.append("payment_intent_data[metadata][stripeAccountId]", useConnect ? resolvedConnectId : "");
        params.append("payment_intent_data[metadata][payoutRouting]", payoutRouting);

        if (useConnect) {
          params.append("payment_intent_data[transfer_data][destination]", resolvedConnectId);
        }

        const separator = safeReturnUrl.includes("?") ? "&" : "?";
        params.append(
          "success_url",
          `${safeReturnUrl}${separator}donation_status=success&creator=${encodeURIComponent(cleanCreatorName)}&amount=${cleanAmount}`
        );
        params.append(
          "cancel_url",
          `${safeReturnUrl}${separator}donation_status=cancelled`
        );
      } else {
        const cleanReferralCode = String(referralCode || "").trim().toUpperCase();
        const hasReferral = Boolean(cleanReferralCode);

        // Referral codes are strictly valid for Annual subscriptions
        const isYearly = hasReferral ? true : plan === "yearly";
        const effectivePlan = isYearly ? "yearly" : "monthly";

        // Current Launch Promo Unit Amounts in Cents ($20.00/yr = 2000, $1.99/mo = 199)
        const unitAmountCents = isYearly ? 2000 : 199;
        // Auto-adjusting 7.5% Developer Cut for rayme3000@gmail.com
        const devShareDollars = ((unitAmountCents / 100) * 0.075).toFixed(2);
        const partnerCommissionDollars = hasReferral
          ? (referralRole === "influencer" ? "2.00" : "5.00")
          : "0.00";

        params.append("mode", "subscription");
        params.append("payment_method_types[0]", "card");
        // Always require a credit card on file even when a 3-day free trial is active
        params.append("payment_method_collection", "always");
        if (userEmail) params.append("customer_email", userEmail);
        params.append("client_reference_id", userId);
        params.append("allow_promotion_codes", "true");
        params.append("line_items[0][quantity]", "1");
        params.append("line_items[0][price_data][currency]", "usd");
        params.append(
          "line_items[0][price_data][product_data][name]",
          isYearly
            ? (hasReferral ? "Saturday AM+ Annual Membership (Includes 3-Day Free Trial)" : "Saturday AM+ Annual Membership")
            : "Saturday AM+ Monthly Membership"
        );
        params.append(
          "line_items[0][price_data][product_data][description]",
          hasReferral
            ? `3-Day Free Trial via code ${cleanReferralCode}, then $20.00/yr (Normal Price $35.99/yr). Cancel anytime before trial ends.`
            : "Complete vault access, 3 weekly Super Hypes, and custom card skins."
        );
        params.append("line_items[0][price_data][unit_amount]", String(unitAmountCents));
        params.append("line_items[0][price_data][recurring][interval]", isYearly ? "year" : "month");

        // If referred by Creator, Staff, or Influencer -> Include 3-Day Free Trial (Card Required)
        if (hasReferral && isYearly) {
          params.append("subscription_data[trial_period_days]", "3");
        }

        params.append("metadata[type]", "subscription");
        params.append("metadata[userId]", userId);
        params.append("metadata[plan]", effectivePlan);
        params.append("metadata[referralCode]", cleanReferralCode);
        params.append("metadata[referralRole]", String(referralRole || ""));
        params.append("metadata[referralPartnerName]", String(referralPartnerName || ""));
        params.append("metadata[partnerCommissionDollars]", partnerCommissionDollars);
        params.append("metadata[devRecipientEmail]", "rayme3000@gmail.com");
        params.append("metadata[devCutPercent]", "7.5");
        params.append("metadata[devShareDollars]", devShareDollars);

        params.append("subscription_data[metadata][userId]", userId);
        params.append("subscription_data[metadata][plan]", effectivePlan);
        params.append("subscription_data[metadata][referralCode]", cleanReferralCode);
        params.append("subscription_data[metadata][referralRole]", String(referralRole || ""));
        params.append("subscription_data[metadata][referralPartnerName]", String(referralPartnerName || ""));
        params.append("subscription_data[metadata][partnerCommissionDollars]", partnerCommissionDollars);
        params.append("subscription_data[metadata][devRecipientEmail]", "rayme3000@gmail.com");
        params.append("subscription_data[metadata][devCutPercent]", "7.5");
        params.append("subscription_data[metadata][devShareDollars]", devShareDollars);

        params.append("success_url", `${safeReturnUrl}?status=sub_success`);
        params.append("cancel_url", `${safeReturnUrl}?status=sub_cancelled`);
      }

      return params;
    };

    const hasConnectId = type === "donation" && resolvedConnectId.startsWith("acct_");

    let stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${rawKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildParams(hasConnectId).toString(),
    });

    let session = await stripeRes.json();

    if (!stripeRes.ok && hasConnectId) {
      console.warn(
        `Connect account ${resolvedConnectId} could not accept direct transfer (${session?.error?.message}). Falling back to Saturday AM default account.`
      );

      const capParams = new URLSearchParams();
      capParams.append("capabilities[transfers][requested]", "true");
      await fetch(`https://api.stripe.com/v1/accounts/${resolvedConnectId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${rawKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: capParams.toString(),
      }).catch(() => {});

      stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${rawKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: buildParams(false).toString(),
      });

      session = await stripeRes.json();
    }

    if (!stripeRes.ok) {
      throw new Error(session?.error?.message || "Stripe rejected checkout session creation.");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Stripe Checkout Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});