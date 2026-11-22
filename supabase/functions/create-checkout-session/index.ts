// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Official Dev Infrastructure Stripe Connect Account (Locked 7.5% App-Wide)
const DEV_STRIPE_CONNECT_ACCOUNT_ID = "acct_1US3pv2d62PnIfST";
const DEV_RECIPIENT_EMAIL = "rayme3000@gmail.com";
const DEV_CUT_PERCENT = 7.5;
const SAT_AM_MIN_GROSS_PERCENT = 50.0;
const MAX_CREATOR_POOL_PERCENT = 100 - SAT_AM_MIN_GROSS_PERCENT - DEV_CUT_PERCENT; // 42.5%

const EXCLUDED_TEST_EMAILS = new Set([
  "rayme3000@gmail.com",
  "publisher@saturday-am.com",
  "saturday.editorial@gmail.com",
]);

// Exact normalized creator keys (NO short "eric" key that could match "frederick"!)
const CREATOR_STRIPE_CONNECT_MAP: Record<string, string> = {
  "raymond brown": DEV_STRIPE_CONNECT_ACCOUNT_ID,
  "rayme3000": DEV_STRIPE_CONNECT_ACCOUNT_ID,
  "rayme3000@gmail.com": DEV_STRIPE_CONNECT_ACCOUNT_ID,
  "oscar fong": "acct_1USWwtGzA2Qad5v8",
  "odunze oguguo": "acct_1USiRECvtW3bYdhU",
  "whyt manga": "acct_1USiRECvtW3bYdhU",
  "odunze oguguo (whyt manga)": "acct_1USiRECvtW3bYdhU",
  "erick pedrucci": "acct_1USUE8GnNL3tCg0x",
  "eric pedrucci": "acct_1USUE8GnNL3tCg0x",
  "erick perducci": "acct_1USUE8GnNL3tCg0x",
  "eric perducci": "acct_1USUE8GnNL3tCg0x",
  "stefano romano": "acct_1USU8mKGryTzf1Ck",
  "jeyodin": "acct_1USMJFGv39K92CFY",
  "frank simmonds": "acct_1USDbD1EcQ1S1MjY",
  "effessart": "acct_1USDbD1EcQ1S1MjY",
  "austin harvey-younis": "acct_1UT6TNK9op8GbFK7",
  "austin harvey younis": "acct_1UT6TNK9op8GbFK7",
  "saturday.editorial@gmail.com": "acct_1UT6TNK9op8GbFK7",
  "frederick l. jones": "",
  "vee": "",
};

const resolveStripeAccount = (creatorName?: string, passedAccountId?: string): string => {
  const cleanPassed = String(passedAccountId || "").trim();
  if (cleanPassed.toUpperCase() === "SATURDAY_AM" || cleanPassed.toUpperCase() === "NONE") {
    return "";
  }
  if (cleanPassed.startsWith("acct_")) return cleanPassed;

  const lowerName = String(creatorName || "").trim().replace(/\s+/g, " ").toLowerCase();
  if (!lowerName) return "";

  if (lowerName in CREATOR_STRIPE_CONNECT_MAP) {
    return CREATOR_STRIPE_CONNECT_MAP[lowerName];
  }

  for (const [key, acctId] of Object.entries(CREATOR_STRIPE_CONNECT_MAP)) {
    if (acctId && key.length >= 6 && (lowerName.includes(key) || key.includes(lowerName))) {
      return acctId;
    }
  }

  return "";
};

const computeStripeFeeCents = (grossCents: number): number => {
  if (grossCents <= 0) return 0;
  return Math.round(grossCents * 0.029) + 30;
};

const computeGrossedUpTipCents = (baseTipCents: number): number => {
  return Math.ceil((baseTipCents + 30) / (1 - 0.029));
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const {
      type = "subscription",
      productType = "",
      userId,
      userEmail,
      returnUrl,
      plan = "monthly",
      billingCycle = "",
      bundleId = "",
      bundleTitle = "",
      creatorName,
      creatorNames = [],
      creatorSplits = [],
      commissionMode = "flat",
      commissionPercent = 0,
      splitEvenly = true,
      creatorBountyDollars = 0,
      stripeAccountId,
      amountDollars,
      amountCents,
      coverStripeFee = true,
      fanmail = "",
      seriesSlug = "",
      referralCode = "",
      referralRole = "",
      referralPartnerName = "",
      referralGrossDollars,
    } = body;

    // =========================================================================
    // ADMIN ACTION: LIVE DEV SPLIT AUDIT & CATCH-UP RECONCILIATION (7.5% LOCKED)
    // =========================================================================
    if (type === "audit_dev_splits" || type === "execute_dev_catchup") {
      const stripeHeaders = {
        "Authorization": `Bearer ${rawKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      };

      const [chargesRes, transfersRes, subsRes, balanceRes] = await Promise.all([
        fetch("https://api.stripe.com/v1/charges?limit=100", { headers: stripeHeaders }),
        fetch(
          `https://api.stripe.com/v1/transfers?destination=${DEV_STRIPE_CONNECT_ACCOUNT_ID}&limit=100`,
          { headers: stripeHeaders }
        ),
        fetch("https://api.stripe.com/v1/subscriptions?status=all&limit=100", {
          headers: stripeHeaders,
        }),
        fetch("https://api.stripe.com/v1/balance", { headers: stripeHeaders }),
      ]);

      const [chargesJson, transfersJson, subsJson, balanceJson] = await Promise.all([
        chargesRes.json(),
        transfersRes.json(),
        subsRes.json(),
        balanceRes.json(),
      ]);

      const transfersList = Array.isArray(transfersJson?.data) ? transfersJson.data : [];
      const activeTransfers = transfersList.filter((t: any) => !t.reversed);
      const transferredChargeIds = new Set<string>();
      const transferredGroupKeys = new Set<string>();
      let alreadyTransferredCents = 0;

      activeTransfers.forEach((t: any) => {
        alreadyTransferredCents += Number(t.amount || 0);
        if (t.source_transaction) transferredChargeIds.add(String(t.source_transaction));
        if (t.transfer_group) transferredGroupKeys.add(String(t.transfer_group));
        if (t.metadata?.source_charge_id) {
          transferredChargeIds.add(String(t.metadata.source_charge_id));
        }
      });

      const allSubs = Array.isArray(subsJson?.data) ? subsJson.data : [];
      const appActiveSubs = allSubs.filter((s: any) => {
        const isActive = ["active", "trialing", "past_due"].includes(String(s.status || ""));
        if (!isActive) return false;
        const hasAppMeta = Boolean(
          s.metadata?.userId || s.metadata?.devRecipientEmail || s.metadata?.plan
        );
        const unitAmt = Number(s.items?.data?.[0]?.price?.unit_amount || s.plan?.amount || 0);
        const isAppPrice =
          unitAmt === 199 || unitAmt === 2000 || unitAmt === 299 || unitAmt === 3500;
        return hasAppMeta || isAppPrice;
      });

      const unpatchedSubs = appActiveSubs.filter(
        (s: any) =>
          s.transfer_data?.destination !== DEV_STRIPE_CONNECT_ACCOUNT_ID ||
          Number(s.transfer_data?.amount_percent) !== DEV_CUT_PERCENT
      );

      const allCharges = Array.isArray(chargesJson?.data) ? chargesJson.data : [];
      const succeededCharges = allCharges.filter(
        (c: any) => c.status === "succeeded" && !c.refunded && Number(c.amount || 0) > 0
      );

      let expectedDevCentsTotal = 0;
      let missedCatchupCentsTotal = 0;
      const chargeAuditRows: any[] = [];
      const unpaidDevChargesToTransfer: { chargeId: string; devCents: number; label: string }[] = [];

      for (const ch of succeededCharges) {
        const amtCents = Number(ch.amount || 0);
        const meta = ch.metadata || {};
        const metaType = String(meta.type || "").toLowerCase();
        const desc = String(ch.description || "").toLowerCase();
        const email = String(ch.billing_details?.email || ch.receipt_email || "")
          .trim()
          .toLowerCase();

        const isBundleCharge =
          amtCents === 2499 || metaType === "themed_bundle" || meta.productType === "bundle";

        if (!isBundleCharge && (metaType === "donation" || desc.includes("creator tip"))) {
          continue;
        }
        if (email && EXCLUDED_TEST_EMAILS.has(email)) {
          continue;
        }

        const isExplicitAppMeta = Boolean(
          meta.userId ||
            meta.devRecipientEmail ||
            meta.bundleId ||
            metaType === "subscription" ||
            metaType === "themed_bundle" ||
            metaType === "store_item"
        );
        const isExactAppPricePoint =
          amtCents === 199 ||
          amtCents === 2000 ||
          amtCents === 2499 ||
          amtCents === 500 ||
          amtCents === 1000;
        const isSubscriptionInvoice = Boolean(ch.invoice) && isExactAppPricePoint;

        if (!isExplicitAppMeta && !isSubscriptionInvoice && !isExactAppPricePoint) {
          continue;
        }

        const expectedDevCents = Math.round(amtCents * (DEV_CUT_PERCENT / 100));
        const categoryLabel = isBundleCharge
          ? meta.bundleTitle || `Collector Bundle ($${(amtCents / 100).toFixed(2)})`
          : amtCents === 2000
          ? "Annual PLUS Sub ($20.00)"
          : amtCents === 199
          ? "Monthly PLUS Sub ($1.99)"
          : meta.bundleTitle || `Digital Store Item ($${(amtCents / 100).toFixed(2)})`;

        const alreadyPaidDevOnThisCharge =
          ch.transfer_data?.destination === DEV_STRIPE_CONNECT_ACCOUNT_ID ||
          transferredChargeIds.has(String(ch.id)) ||
          (ch.transfer_group && transferredGroupKeys.has(String(ch.transfer_group)));

        expectedDevCentsTotal += expectedDevCents;

        if (!alreadyPaidDevOnThisCharge) {
          missedCatchupCentsTotal += expectedDevCents;
          unpaidDevChargesToTransfer.push({
            chargeId: ch.id,
            devCents: expectedDevCents,
            label: `${categoryLabel} (${email || ch.id.slice(-6)})`,
          });
        }

        chargeAuditRows.push({
          id: ch.id,
          created: new Date((ch.created || 0) * 1000).toISOString(),
          amountDollars: (amtCents / 100).toFixed(2),
          expectedDevDollars: (expectedDevCents / 100).toFixed(2),
          categoryLabel,
          receiptEmail: email || "Customer",
          hadAutoTransfer: alreadyPaidDevOnThisCharge,
        });
      }

      const availableUsdCents =
        (balanceJson?.available || []).find((b: any) => b.currency === "usd")?.amount || 0;
      const pendingUsdCents =
        (balanceJson?.pending || []).find((b: any) => b.currency === "usd")?.amount || 0;

      let patchedSubsCount = 0;
      let transferredCentsNow = 0;
      const executedTransfersList: any[] = [];
      const transferErrors: any[] = [];

      if (type === "execute_dev_catchup") {
        for (const sub of unpatchedSubs) {
          const patchParams = new URLSearchParams();
          patchParams.append("transfer_data[destination]", DEV_STRIPE_CONNECT_ACCOUNT_ID);
          patchParams.append("transfer_data[amount_percent]", String(DEV_CUT_PERCENT));
          const patchRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${sub.id}`,
            {
              method: "POST",
              headers: stripeHeaders,
              body: patchParams.toString(),
            }
          );
          if (patchRes.ok) patchedSubsCount += 1;
        }

        for (const item of unpaidDevChargesToTransfer) {
          const tParams = new URLSearchParams();
          tParams.append("amount", String(item.devCents));
          tParams.append("currency", "usd");
          tParams.append("destination", DEV_STRIPE_CONNECT_ACCOUNT_ID);
          tParams.append("description", `Dev Allocation (7.5%): ${item.label}`);
          tParams.append("metadata[source_charge_id]", item.chargeId);

          const stParams = new URLSearchParams(tParams);
          stParams.append("source_transaction", item.chargeId);

          let tRes = await fetch("https://api.stripe.com/v1/transfers", {
            method: "POST",
            headers: stripeHeaders,
            body: stParams.toString(),
          });
          let tJson = await tRes.json();

          if (!tRes.ok) {
            tRes = await fetch("https://api.stripe.com/v1/transfers", {
              method: "POST",
              headers: stripeHeaders,
              body: tParams.toString(),
            });
            tJson = await tRes.json();
          }

          if (tRes.ok) {
            transferredCentsNow += item.devCents;
            executedTransfersList.push(tJson);
          } else {
            transferErrors.push(`${item.label}: ${tJson?.error?.message || "Pending settlement"}`);
          }
        }
      }

      const remainingOwedCents = Math.max(0, missedCatchupCentsTotal - transferredCentsNow);

      return new Response(
        JSON.stringify({
          success: true,
          devAccountId: DEV_STRIPE_CONNECT_ACCOUNT_ID,
          expectedDevDollars: (expectedDevCentsTotal / 100).toFixed(2),
          alreadyTransferredDollars: (
            (alreadyTransferredCents + transferredCentsNow) /
            100
          ).toFixed(2),
          owedCatchupCents: remainingOwedCents,
          owedCatchupDollars: (remainingOwedCents / 100).toFixed(2),
          availablePlatformBalanceDollars: (availableUsdCents / 100).toFixed(2),
          pendingPlatformBalanceDollars: (pendingUsdCents / 100).toFixed(2),
          activeSubsCount: appActiveSubs.length,
          unpatchedSubsCount: Math.max(0, unpatchedSubs.length - patchedSubsCount),
          patchedSubsCount,
          executedTransfer:
            executedTransfersList.length > 0
              ? { amount: transferredCentsNow, count: executedTransfersList.length }
              : null,
          transferErrorMsg: transferErrors.length > 0 ? transferErrors.join(" | ") : null,
          chargeAuditRows,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const effectiveUserId = userId || "guest_checkout";
    const safeReturnUrl = returnUrl || "https://www.mangahype.com";

    let dbCreatorStripeId = "";
    if (creatorName) {
      const { data: scMatch } = await supabaseAdmin
        .from("series_creators")
        .select("stripe_account_id")
        .ilike("name", String(creatorName).trim())
        .limit(1)
        .maybeSingle();
      if (scMatch?.stripe_account_id) {
        dbCreatorStripeId = String(scMatch.stripe_account_id).trim();
      }
    }
    const resolvedConnectId = resolveStripeAccount(
      creatorName,
      stripeAccountId || dbCreatorStripeId
    );

    // Load global referral bounty config + 1-Trial-Per-Account user flags for subscription checkouts
    let referralConfig: any = {
      mode: "flat",
      creator_flat_dollars: 5.0,
      influencer_flat_dollars: 2.0,
      creator_percent: 25.0,
      influencer_percent: 10.0,
      partner_overrides: {},
    };
    let userAlreadyUsedTrial = false;
    let userAlreadyPaidRefCommission = false;

    if (type === "subscription") {
      const [{ data: appSet }, profRes] = await Promise.all([
        supabaseAdmin
          .from("app_settings")
          .select("referral_bounty_config")
          .eq("id", 1)
          .maybeSingle(),
        effectiveUserId && effectiveUserId !== "guest_checkout"
          ? supabaseAdmin
              .from("profiles")
              .select("has_used_referral_trial, referral_commission_paid_at")
              .eq("id", effectiveUserId)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (appSet?.referral_bounty_config) {
        referralConfig = { ...referralConfig, ...appSet.referral_bounty_config };
      }
      userAlreadyUsedTrial = Boolean(profRes?.data?.has_used_referral_trial);
      userAlreadyPaidRefCommission = Boolean(profRes?.data?.referral_commission_paid_at);
    }

    const buildParams = (includeConnectTransfer: boolean) => {
      const params = new URLSearchParams();

      // =======================================================================
      // 1. DIRECT CREATOR TIP / DONATION (OPT-IN FEE COVERAGE OR NET TRANSFER)
      // =======================================================================
      if (type === "donation") {
        const validAmounts = [5, 10, 15, 20];
        const baseTipDollars = Number(amountDollars);
        if (!validAmounts.includes(baseTipDollars)) {
          throw new Error("Invalid donation amount. Please select $5, $10, $15, or $20.");
        }

        const baseTipCents = Math.round(baseTipDollars * 100);
        const fanCoversFee = Boolean(coverStripeFee);
        const grossChargedCents = fanCoversFee
          ? computeGrossedUpTipCents(baseTipCents)
          : baseTipCents;
        const estimatedStripeFeeCents = fanCoversFee
          ? grossChargedCents - baseTipCents
          : computeStripeFeeCents(baseTipCents);
        const creatorNetCents = fanCoversFee
          ? baseTipCents
          : Math.max(0, baseTipCents - estimatedStripeFeeCents);

        const cleanCreatorName = (creatorName || "Saturday AM Creator").trim();
        const cleanFanmail = String(fanmail || "").slice(0, 250);
        const useConnect = includeConnectTransfer && resolvedConnectId.startsWith("acct_");
        const payoutRouting = useConnect ? "creator_connect" : "saturday_am_default";

        params.append("mode", "payment");
        params.append("payment_method_types[0]", "card");
        if (userEmail) params.append("customer_email", userEmail);
        params.append("client_reference_id", effectiveUserId);

        params.append("line_items[0][quantity]", "1");
        params.append("line_items[0][price_data][currency]", "usd");
        params.append("line_items[0][price_data][unit_amount]", String(grossChargedCents));
        params.append(
          "line_items[0][price_data][product_data][name]",
          fanCoversFee
            ? `Support ${cleanCreatorName} ($${baseTipDollars.toFixed(2)} Tip + Processing Fee)`
            : `Support ${cleanCreatorName} ($${baseTipDollars.toFixed(2)} Creator Tip)`
        );
        params.append(
          "line_items[0][price_data][product_data][description]",
          cleanFanmail
            ? `Fanmail: "${cleanFanmail}"`
            : `Direct creator support for ${cleanCreatorName} on Saturday AM.`
        );

        const metaEntries: Record<string, string> = {
          type: "donation",
          userId: effectiveUserId,
          creatorName: cleanCreatorName,
          baseTipDollars: baseTipDollars.toFixed(2),
          grossChargedDollars: (grossChargedCents / 100).toFixed(2),
          creatorNetDollars: (creatorNetCents / 100).toFixed(2),
          stripeFeeDollars: (estimatedStripeFeeCents / 100).toFixed(2),
          coverStripeFee: fanCoversFee ? "true" : "false",
          amountDollars: (creatorNetCents / 100).toFixed(2),
          fanmail: cleanFanmail,
          seriesSlug: seriesSlug || "",
          stripeAccountId: useConnect ? resolvedConnectId : "",
          payoutRouting,
        };

        for (const [k, v] of Object.entries(metaEntries)) {
          params.append(`metadata[${k}]`, v);
          params.append(`payment_intent_data[metadata][${k}]`, v);
        }

        if (useConnect && creatorNetCents > 0) {
          params.append("payment_intent_data[transfer_data][destination]", resolvedConnectId);
          params.append("payment_intent_data[transfer_data][amount]", String(creatorNetCents));
        }

        const separator = safeReturnUrl.includes("?") ? "&" : "?";
        params.append(
          "success_url",
          `${safeReturnUrl}${separator}donation_status=success&creator=${encodeURIComponent(
            cleanCreatorName
          )}&amount=${baseTipDollars}`
        );
        params.append("cancel_url", `${safeReturnUrl}${separator}donation_status=cancelled`);

        // =====================================================================
        // 2. MULTI-CREATOR STORE BUNDLES & DIGITAL STORE ITEMS
        // =====================================================================
      } else if (type === "themed_bundle" || type === "store_item") {
        const rawCents =
          Number(amountCents) || Math.round(Number(amountDollars || 24.99) * 100);
        const unitAmountCents = Math.max(100, rawCents);
        const grossDollarsNum = unitAmountCents / 100;
        const grossDollars = grossDollarsNum.toFixed(2);
        const isBundle = type === "themed_bundle" || productType === "bundle";

        const devTransferCents = Math.round(unitAmountCents * (DEV_CUT_PERCENT / 100));
        const devShareDollars = (devTransferCents / 100).toFixed(2);

        const maxCreatorPoolCents = Math.floor(
          unitAmountCents * (MAX_CREATOR_POOL_PERCENT / 100)
        );

        let normalizedSplits: { name: string; cents: number; percent: number }[] = [];

        if (Array.isArray(creatorSplits) && creatorSplits.length > 0) {
          const validRows = creatorSplits.filter(
            (r: any) => r && String(r.creator_name || r.name || "").trim()
          );
          if (validRows.length > 0) {
            if (commissionMode === "percent") {
              let rawTotalPct = validRows.reduce(
                (s: number, r: any) => s + Math.max(0, Number(r.percent || 0)),
                0
              );
              const scale =
                rawTotalPct > MAX_CREATOR_POOL_PERCENT && rawTotalPct > 0
                  ? MAX_CREATOR_POOL_PERCENT / rawTotalPct
                  : 1;
              normalizedSplits = validRows.map((r: any) => {
                const effPct = Math.max(0, Number(r.percent || 0)) * scale;
                return {
                  name: String(r.creator_name || r.name).trim(),
                  percent: Number(effPct.toFixed(2)),
                  cents: Math.round(unitAmountCents * (effPct / 100)),
                };
              });
            } else {
              let rawTotalCents = validRows.reduce(
                (s: number, r: any) =>
                  s + Math.max(0, Math.round(Number(r.dollars ?? r.amount_dollars ?? 0) * 100)),
                0
              );
              const scale =
                rawTotalCents > maxCreatorPoolCents && rawTotalCents > 0
                  ? maxCreatorPoolCents / rawTotalCents
                  : 1;
              normalizedSplits = validRows.map((r: any) => {
                const effCents = Math.round(
                  Math.max(0, Number(r.dollars ?? r.amount_dollars ?? 0) * 100) * scale
                );
                return {
                  name: String(r.creator_name || r.name).trim(),
                  cents: effCents,
                  percent: Number(((effCents / unitAmountCents) * 100).toFixed(2)),
                };
              });
            }
          }
        } else {
          const cleanCreatorList: string[] = Array.isArray(creatorNames)
            ? creatorNames.map((c: any) => String(c || "").trim()).filter(Boolean)
            : creatorName
            ? [String(creatorName).trim()]
            : [];

          if (cleanCreatorList.length > 0) {
            const requestedPoolCents =
              commissionMode === "percent" && Number(commissionPercent) > 0
                ? Math.round(
                    unitAmountCents *
                      (Math.min(MAX_CREATOR_POOL_PERCENT, Number(commissionPercent)) / 100)
                  )
                : Math.min(
                    maxCreatorPoolCents,
                    Math.max(0, Math.round(Number(creatorBountyDollars || 0) * 100))
                  );

            if (requestedPoolCents > 0) {
              if (splitEvenly !== false) {
                const perCreator = Math.floor(requestedPoolCents / cleanCreatorList.length);
                normalizedSplits = cleanCreatorList.map((cName, idx) => {
                  const cents =
                    idx === 0
                      ? requestedPoolCents - perCreator * (cleanCreatorList.length - 1)
                      : perCreator;
                  return {
                    name: cName,
                    cents,
                    percent: Number(((cents / unitAmountCents) * 100).toFixed(2)),
                  };
                });
              } else {
                normalizedSplits = [
                  {
                    name: cleanCreatorList[0],
                    cents: requestedPoolCents,
                    percent: Number(((requestedPoolCents / unitAmountCents) * 100).toFixed(2)),
                  },
                ];
              }
            }
          }
        }

        const totalCreatorBountyCents = normalizedSplits.reduce((s, r) => s + r.cents, 0);
        const totalCreatorBountyDollars = (totalCreatorBountyCents / 100).toFixed(2);
        const compactSplitsJson = JSON.stringify(normalizedSplits).slice(0, 490);

        const displayTitle = (
          bundleTitle ||
          (isBundle ? "Saturday AM+ Collector Bundle" : "Saturday AM Digital Store Unlock")
        ).trim();

        params.append("mode", "payment");
        params.append("payment_method_types[0]", "card");
        if (userEmail) params.append("customer_email", userEmail);
        params.append("client_reference_id", effectiveUserId);
        params.append("allow_promotion_codes", "true");

        params.append("line_items[0][quantity]", "1");
        params.append("line_items[0][price_data][currency]", "usd");
        params.append("line_items[0][price_data][unit_amount]", String(unitAmountCents));
        params.append("line_items[0][price_data][product_data][name]", displayTitle);
        params.append(
          "line_items[0][price_data][product_data][description]",
          isBundle
            ? `Includes 1-Year Saturday AM+ PLUS Pass & Exclusive Collector Cosmetics ($${grossDollars})`
            : `Instant permanent unlock for your Saturday AM Profile Loadout ($${grossDollars})`
        );

        const storeMeta: Record<string, string> = {
          type: isBundle ? "themed_bundle" : "store_item",
          productType: String(productType || (isBundle ? "bundle" : "store_item")),
          bundleId: String(bundleId || ""),
          bundleTitle: displayTitle,
          userId: effectiveUserId,
          amountDollars: grossDollars,
          commissionMode: String(commissionMode || "flat"),
          creatorBountyDollars: totalCreatorBountyDollars,
          creatorSplitsJson: compactSplitsJson,
          devRecipientEmail: DEV_RECIPIENT_EMAIL,
          devStripeAccountId: DEV_STRIPE_CONNECT_ACCOUNT_ID,
          devCutPercent: String(DEV_CUT_PERCENT),
          devShareDollars,
        };

        for (const [k, v] of Object.entries(storeMeta)) {
          params.append(`metadata[${k}]`, v);
          params.append(`payment_intent_data[metadata][${k}]`, v);
        }

        const cancelUrl = safeReturnUrl.includes("?")
          ? `${safeReturnUrl.split("?")[0]}?view=shop`
          : safeReturnUrl;
        params.append("success_url", safeReturnUrl);
        params.append("cancel_url", cancelUrl);

        // =====================================================================
        // 3. RECURRING SUBSCRIPTIONS (1-TRIAL-PER-ACCOUNT GUARD + 7.5% DEV CUT)
        // =====================================================================
      } else {
        const cleanReferralCode = String(referralCode || "").trim().toUpperCase();
        const hasReferral = Boolean(cleanReferralCode) && !userAlreadyPaidRefCommission;
        const eligibleForFreeTrial = hasReferral && !userAlreadyUsedTrial;

        const normalizedPlan = String(plan || billingCycle || "monthly").toLowerCase();
        const isYearly =
          hasReferral || normalizedPlan === "yearly" || normalizedPlan === "annual";
        const effectivePlan = isYearly ? "annual" : "monthly";

        const unitAmountCents = isYearly ? 2000 : 199;
        const devShareDollars = ((unitAmountCents / 100) * (DEV_CUT_PERCENT / 100)).toFixed(2);
        const maxRefPoolCents = Math.floor(unitAmountCents * (MAX_CREATOR_POOL_PERCENT / 100));

        let grossRefCents = 0;
        if (hasReferral && isYearly) {
          const override = referralConfig?.partner_overrides?.[cleanReferralCode];
          const isInf = String(referralRole || override?.role || "").toLowerCase() === "influencer";

          if (referralGrossDollars !== undefined && Number(referralGrossDollars) >= 0) {
            grossRefCents = Math.round(Number(referralGrossDollars) * 100);
          } else if (override) {
            grossRefCents =
              override.mode === "percent"
                ? Math.round(unitAmountCents * (Number(override.value || 0) / 100))
                : Math.round(Number(override.value || 5) * 100);
          } else if (referralConfig.mode === "percent") {
            const pct = isInf
              ? Number(referralConfig.influencer_percent ?? 10)
              : Number(referralConfig.creator_percent ?? 25);
            grossRefCents = Math.round(unitAmountCents * (pct / 100));
          } else {
            const flat = isInf
              ? Number(referralConfig.influencer_flat_dollars ?? 2.0)
              : Number(referralConfig.creator_flat_dollars ?? 5.0);
            grossRefCents = Math.round(flat * 100);
          }
          grossRefCents = Math.min(maxRefPoolCents, Math.max(0, grossRefCents));
        }

        const partnerGrossCommissionDollars = (grossRefCents / 100).toFixed(2);

        params.append("mode", "subscription");
        params.append("payment_method_types[0]", "card");
        params.append("payment_method_collection", "always");
        if (userEmail) params.append("customer_email", userEmail);
        params.append("client_reference_id", effectiveUserId);
        params.append("allow_promotion_codes", "true");
        params.append("line_items[0][quantity]", "1");
        params.append("line_items[0][price_data][currency]", "usd");
        params.append(
          "line_items[0][price_data][product_data][name]",
          isYearly
            ? eligibleForFreeTrial
              ? "Saturday AM+ Annual Membership (Includes 3-Day Free Trial)"
              : "Saturday AM+ Annual Membership"
            : "Saturday AM+ Monthly Membership"
        );
        params.append(
          "line_items[0][price_data][product_data][description]",
          eligibleForFreeTrial
            ? `3-Day Free Trial via code ${cleanReferralCode}, then $20.00/yr (Normal Price $35.99/yr). Cancel anytime before trial ends.`
            : "Complete vault access, 3 weekly Super Hypes, and custom card skins."
        );
        params.append("line_items[0][price_data][unit_amount]", String(unitAmountCents));
        params.append(
          "line_items[0][price_data][recurring][interval]",
          isYearly ? "year" : "month"
        );

        if (eligibleForFreeTrial && isYearly) {
          params.append("subscription_data[trial_period_days]", "3");
        }

        if (includeConnectTransfer && DEV_STRIPE_CONNECT_ACCOUNT_ID.startsWith("acct_")) {
          params.append(
            "subscription_data[transfer_data][destination]",
            DEV_STRIPE_CONNECT_ACCOUNT_ID
          );
          params.append(
            "subscription_data[transfer_data][amount_percent]",
            String(DEV_CUT_PERCENT)
          );
        }

        const subMeta: Record<string, string> = {
          type: "subscription",
          userId: effectiveUserId,
          plan: effectivePlan,
          referralCode: hasReferral ? cleanReferralCode : "",
          referralRole: String(referralRole || ""),
          referralPartnerName: String(referralPartnerName || ""),
          partnerCommissionDollars: partnerGrossCommissionDollars,
          referralCommissionMode: String(referralConfig.mode || "flat"),
          referralOneTimeOnly: "true",
          creatorPaysStripeFee: "true",
          devRecipientEmail: DEV_RECIPIENT_EMAIL,
          devStripeAccountId: DEV_STRIPE_CONNECT_ACCOUNT_ID,
          devCutPercent: String(DEV_CUT_PERCENT),
          devShareDollars,
        };

        for (const [k, v] of Object.entries(subMeta)) {
          params.append(`metadata[${k}]`, v);
          params.append(`subscription_data[metadata][${k}]`, v);
        }

        const separator = safeReturnUrl.includes("?") ? "&" : "?";
        params.append(
          "success_url",
          `${safeReturnUrl}${separator}status=sub_success&plan=${effectivePlan}`
        );
        params.append("cancel_url", `${safeReturnUrl}${separator}status=sub_cancelled`);
      }

      return params;
    };

    const shouldUseConnect =
      type === "donation"
        ? resolvedConnectId.startsWith("acct_")
        : type === "themed_bundle" || type === "store_item"
        ? false
        : DEV_STRIPE_CONNECT_ACCOUNT_ID.startsWith("acct_");

    let stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${rawKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildParams(shouldUseConnect).toString(),
    });

    let session = await stripeRes.json();

    if (!stripeRes.ok && shouldUseConnect) {
      console.warn(
        `Connect transfer failed (${session?.error?.message}). Retrying checkout session without direct transfer.`
      );

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