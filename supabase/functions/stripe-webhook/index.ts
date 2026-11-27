// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const DEV_STRIPE_CONNECT_ACCOUNT_ID = "acct_1US3pv2d62PnIfST";
const DEV_CUT_PERCENT = 7.5;
const MAX_CREATOR_POOL_PERCENT = 42.5; // 100% - 50% Sat AM Min - 7.5% Dev

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

const buildCreatorReferralCode = (rawCreatorName?: string): string => {
  const withoutParens = String(rawCreatorName || "AM")
    .replace(/\([^)]*\)/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  const clean = withoutParens.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return `VIP-${clean || "AM"}`;
};

const getCreatorReferralCodeVariants = (rawCreatorName?: string): string[] => {
  const variants = new Set<string>();
  if (!rawCreatorName) return [];
  const primary = buildCreatorReferralCode(rawCreatorName);
  variants.add(primary);
  variants.add(primary.replace(/^VIP-/, ""));

  const parenMatch = String(rawCreatorName).match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    const aliasCode = buildCreatorReferralCode(parenMatch[1]);
    variants.add(aliasCode);
    variants.add(aliasCode.replace(/^VIP-/, ""));
  }

  const rawFull = String(rawCreatorName)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  if (rawFull) {
    variants.add(`VIP-${rawFull}`);
    variants.add(rawFull);
  }
  return Array.from(variants);
};

const computeStripeFeeCents = (grossCents: number): number => {
  if (grossCents <= 0) return 0;
  return Math.round(grossCents * 0.029) + 30;
};

Deno.serve(async (req: Request) => {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const k1 = (Deno.env.get("NEW LIVE KEY") ?? "").trim();
    const k2 = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
    const stripeSecretKey =
      [k1, k2].find((k) => k.startsWith("sk_") || k.startsWith("rk_")) ?? k1 ?? k2;

    const { data: settings } = await supabase
      .from("app_settings")
      .select("resend_api_key, moderator_emails, premium_hype_allowance, referral_bounty_config")
      .eq("id", 1)
      .maybeSingle();

    const proAllowance = Number(settings?.premium_hype_allowance ?? 3);
    const referralConfig = settings?.referral_bounty_config || {};

    const resolvePartnerByNameOrCode = async (
      nameOrEmail?: string,
      referralCode?: string
    ): Promise<{ connectId: string; partnerName: string; role: string }> => {
      const cleanTarget = String(nameOrEmail ?? "").trim().replace(/\s+/g, " ").toLowerCase();
      const cleanCode = String(referralCode ?? "").trim().toUpperCase();

      const { data: scRows } = await supabase
        .from("series_creators")
        .select("name, email, role, stripe_account_id");

      const { data: profRows } = await supabase
        .from("profiles")
        .select(
          "username, first_name, last_name, email, role, linked_creator_name, referral_code, stripe_account_id"
        );

      if (cleanTarget) {
        if (cleanTarget in CREATOR_STRIPE_CONNECT_MAP) {
          return {
            connectId: CREATOR_STRIPE_CONNECT_MAP[cleanTarget],
            partnerName: nameOrEmail || cleanTarget,
            role: "creator",
          };
        }
        const matchedSc = (scRows ?? []).find((r: any) => {
          const rName = String(r.name ?? "").trim().toLowerCase();
          const rEmail = String(r.email ?? "").trim().toLowerCase();
          return (
            rName === cleanTarget ||
            rEmail === cleanTarget ||
            (cleanTarget.length >= 6 && (rName.includes(cleanTarget) || cleanTarget.includes(rName)))
          );
        });
        if (matchedSc) {
          const dbStripe = String(matchedSc.stripe_account_id ?? "").trim();
          const rLower = String(matchedSc.name ?? "").trim().toLowerCase();
          const resolvedId =
            dbStripe.toUpperCase() === "SATURDAY_AM"
              ? ""
              : dbStripe.startsWith("acct_")
              ? dbStripe
              : CREATOR_STRIPE_CONNECT_MAP[rLower] ?? "";
          return {
            connectId: resolvedId,
            partnerName: matchedSc.name,
            role: "creator",
          };
        }
      }

      if (cleanCode) {
        for (const sc of scRows ?? []) {
          const variants = getCreatorReferralCodeVariants(sc.name);
          if (variants.includes(cleanCode)) {
            const dbStripe = String(sc.stripe_account_id ?? "").trim();
            const rLower = String(sc.name ?? "").trim().toLowerCase();
            let resolvedId =
              dbStripe.toUpperCase() === "SATURDAY_AM"
                ? ""
                : dbStripe.startsWith("acct_")
                ? dbStripe
                : CREATOR_STRIPE_CONNECT_MAP[rLower] ?? "";

            if (!resolvedId) {
              for (const [k, v] of Object.entries(CREATOR_STRIPE_CONNECT_MAP)) {
                if (v && k.length >= 6 && (rLower.includes(k) || k.includes(rLower))) {
                  resolvedId = v;
                  break;
                }
              }
            }

            const linkedProf = (profRows ?? []).find(
              (p: any) =>
                String(p.linked_creator_name ?? "").trim().toLowerCase() === rLower
            );
            return {
              connectId: resolvedId,
              partnerName: sc.name,
              role: String(linkedProf?.role || "creator").toLowerCase(),
            };
          }
        }

        for (const p of profRows ?? []) {
          const pCode = String(p.referral_code ?? "").trim().toUpperCase();
          const pLinked = String(p.linked_creator_name ?? "").trim();
          const pFull = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
          const pUser = String(p.username ?? "").trim();
          const allVariants = new Set([
            pCode,
            ...getCreatorReferralCodeVariants(pLinked),
            ...getCreatorReferralCodeVariants(pFull),
            ...getCreatorReferralCodeVariants(pUser),
          ]);

          if (allVariants.has(cleanCode)) {
            const lookupName = (pLinked || pFull || pUser).toLowerCase();
            const pEmail = String(p.email ?? "").trim().toLowerCase();
            const pStripe = String(p.stripe_account_id ?? "").trim();
            const resolvedId = pStripe.startsWith("acct_")
              ? pStripe
              : CREATOR_STRIPE_CONNECT_MAP[pEmail] ||
                CREATOR_STRIPE_CONNECT_MAP[lookupName] ||
                "";
            return {
              connectId: resolvedId,
              partnerName: pLinked || pFull || pUser || cleanCode,
              role: String(p.role || "creator").toLowerCase(),
            };
          }
        }
      }

      if (cleanTarget) {
        for (const [key, acctId] of Object.entries(CREATOR_STRIPE_CONNECT_MAP)) {
          if (acctId && key.length >= 6 && (cleanTarget.includes(key) || key.includes(cleanTarget))) {
            return { connectId: acctId, partnerName: nameOrEmail || key, role: "creator" };
          }
        }
      }

      return { connectId: "", partnerName: nameOrEmail || cleanCode || "", role: "creator" };
    };

    const executeStripeTransfer = async (opts: {
      destinationAcct: string;
      amountCents: number;
      description: string;
      sourceChargeId?: string;
      idempotencyKey: string;
      metadata?: Record<string, string>;
    }) => {
      if (!stripeSecretKey || !opts.destinationAcct.startsWith("acct_") || opts.amountCents <= 0) {
        return null;
      }

      const buildTransferBody = (includeSourceTx: boolean) => {
        const params = new URLSearchParams();
        params.append("amount", String(Math.round(opts.amountCents)));
        params.append("currency", "usd");
        params.append("destination", opts.destinationAcct);
        params.append("description", opts.description);
        if (includeSourceTx && opts.sourceChargeId && opts.sourceChargeId.startsWith("ch_")) {
          params.append("source_transaction", opts.sourceChargeId);
        }
        if (opts.metadata) {
          for (const [k, v] of Object.entries(opts.metadata)) {
            params.append(`metadata[${k}]`, String(v));
          }
        }
        return params.toString();
      };

      try {
        let res = await fetch("https://api.stripe.com/v1/transfers", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeSecretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": opts.idempotencyKey,
          },
          body: buildTransferBody(true),
        });

        let data = await res.json();

        if (!res.ok && opts.sourceChargeId) {
          res = await fetch("https://api.stripe.com/v1/transfers", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${stripeSecretKey}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "Idempotency-Key": `${opts.idempotencyKey}_nosrc`,
            },
            body: buildTransferBody(false),
          });
          data = await res.json();
        }

        if (!res.ok) {
          console.error(`Stripe Transfer to ${opts.destinationAcct} failed:`, data?.error?.message);
          return null;
        }
        return data;
      } catch (err: any) {
        console.error("Stripe Transfer Exception:", err.message);
        return null;
      }
    };

    const checkChargeAlreadyHasDevAutoSplit = async (
      chargeId?: string,
      subscriptionId?: string
    ): Promise<{ hasAutoDevSplit: boolean; resolvedChargeId: string }> => {
      if (!stripeSecretKey) return { hasAutoDevSplit: false, resolvedChargeId: chargeId || "" };
      try {
        if (chargeId && chargeId.startsWith("ch_")) {
          const chRes = await fetch(`https://api.stripe.com/v1/charges/${encodeURIComponent(chargeId)}`, {
            headers: { "Authorization": `Bearer ${stripeSecretKey}` },
          });
          if (chRes.ok) {
            const chData = await chRes.json();
            if (chData?.transfer_data?.destination === DEV_STRIPE_CONNECT_ACCOUNT_ID) {
              return { hasAutoDevSplit: true, resolvedChargeId: chargeId };
            }
          }
        }
        if (subscriptionId && subscriptionId.startsWith("sub_")) {
          const subRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
            { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
          );
          if (subRes.ok) {
            const subData = await subRes.json();
            if (subData?.transfer_data?.destination === DEV_STRIPE_CONNECT_ACCOUNT_ID) {
              return { hasAutoDevSplit: true, resolvedChargeId: chargeId || "" };
            }
          }
        }
      } catch {
        // ignore
      }
      return { hasAutoDevSplit: false, resolvedChargeId: chargeId || "" };
    };

    const processSubscriptionPayoutSplits = async (opts: {
      uniqueEventId: string;
      amountPaidCents: number;
      sourceChargeId?: string;
      subscriptionId?: string;
      billingReason?: string;
      subMetadata: Record<string, any>;
    }) => {
      if (opts.amountPaidCents <= 0) return { devTransfer: null, referralTransfer: null };

      const meta = opts.subMetadata ?? {};
      const subUserId = String(meta.userId ?? meta.user_id ?? "").trim();
      const referralCode = String(meta.referralCode ?? "").trim().toUpperCase();
      const referralPartnerName = String(meta.referralPartnerName ?? "").trim();

      const { hasAutoDevSplit } = await checkChargeAlreadyHasDevAutoSplit(
        opts.sourceChargeId,
        opts.subscriptionId
      );

      let devTransfer = null;
      if (!hasAutoDevSplit) {
        const devCutCents = Math.round(opts.amountPaidCents * (DEV_CUT_PERCENT / 100));
        if (DEV_STRIPE_CONNECT_ACCOUNT_ID.startsWith("acct_") && devCutCents > 0) {
          devTransfer = await executeStripeTransfer({
            destinationAcct: DEV_STRIPE_CONNECT_ACCOUNT_ID,
            amountCents: devCutCents,
            description: `7.5% Developer Cut ($${(devCutCents / 100).toFixed(2)}) on Saturday AM+ Subscription`,
            sourceChargeId: opts.sourceChargeId,
            idempotencyKey: `dev_cut_${opts.uniqueEventId}`,
            metadata: {
              type: "developer_cut",
              recipient: "Raymond Brown (rayme3000@gmail.com)",
              stripeAccountId: DEV_STRIPE_CONNECT_ACCOUNT_ID,
              percent: "7.5",
            },
          });
        }
      }

      let referralTransfer = null;
      if (referralCode && opts.amountPaidCents >= 1500) {
        let subscriberProf: any = null;
        if (subUserId && subUserId !== "guest_checkout") {
          const { data: pRow } = await supabase
            .from("profiles")
            .select("id, referral_commission_paid_at, referred_at, linked_creator_name, username")
            .eq("id", subUserId)
            .maybeSingle();
          subscriberProf = pRow;
        }

        const alreadyPaidReferralOnce = Boolean(subscriberProf?.referral_commission_paid_at);

        let isExpiredWindow = false;
        if (subscriberProf?.referred_at) {
          const ageMs = Date.now() - new Date(subscriberProf.referred_at).getTime();
          if (ageMs > 366 * 24 * 60 * 60 * 1000) {
            isExpiredWindow = true;
          }
        }

        if (!alreadyPaidReferralOnce && !isExpiredWindow) {
          const resolvedPartner = await resolvePartnerByNameOrCode(
            referralPartnerName,
            referralCode
          );

          const subLinkedLower = String(subscriberProf?.linked_creator_name ?? "")
            .trim()
            .toLowerCase();
          const isSelfReferral =
            subLinkedLower &&
            resolvedPartner.partnerName &&
            subLinkedLower === resolvedPartner.partnerName.trim().toLowerCase();

          if (!isSelfReferral) {
            const effectiveRole =
              String(meta.referralRole || resolvedPartner.role || "creator").toLowerCase();
            const maxPoolCents = Math.floor(
              opts.amountPaidCents * (MAX_CREATOR_POOL_PERCENT / 100)
            );

            let grossBountyCents = 0;
            const metaGross = Number(meta.partnerCommissionDollars ?? -1);
            const override = referralConfig?.partner_overrides?.[referralCode];

            if (metaGross > 0) {
              grossBountyCents = Math.round(metaGross * 100);
            } else if (override) {
              grossBountyCents =
                override.mode === "percent"
                  ? Math.round(opts.amountPaidCents * (Number(override.value || 0) / 100))
                  : Math.round(Number(override.value || 5) * 100);
            } else if (referralConfig?.mode === "percent") {
              const pct =
                effectiveRole === "influencer"
                  ? Number(referralConfig.influencer_percent ?? 10)
                  : Number(referralConfig.creator_percent ?? 25);
              grossBountyCents = Math.round(opts.amountPaidCents * (pct / 100));
            } else {
              grossBountyCents =
                effectiveRole === "influencer"
                  ? Math.round(Number(referralConfig?.influencer_flat_dollars ?? 2.0) * 100)
                  : Math.round(Number(referralConfig?.creator_flat_dollars ?? 5.0) * 100);
            }

            grossBountyCents = Math.min(maxPoolCents, Math.max(0, grossBountyCents));

            const stripeFeeCents = computeStripeFeeCents(opts.amountPaidCents);
            const netCreatorReferralCents = Math.max(0, grossBountyCents - stripeFeeCents);

            if (resolvedPartner.connectId.startsWith("acct_") && netCreatorReferralCents > 0) {
              referralTransfer = await executeStripeTransfer({
                destinationAcct: resolvedPartner.connectId,
                amountCents: netCreatorReferralCents,
                description: `1-Time Annual Referral Bounty (${referralCode}) — $${(
                  grossBountyCents / 100
                ).toFixed(2)} less $${(stripeFeeCents / 100).toFixed(2)} Stripe fee`,
                sourceChargeId: opts.sourceChargeId,
                idempotencyKey: `ref_comm_yr1_${subUserId || opts.uniqueEventId}`,
                metadata: {
                  type: "referral_commission_year1",
                  referralCode,
                  partnerName: resolvedPartner.partnerName,
                  grossBountyDollars: (grossBountyCents / 100).toFixed(2),
                  stripeFeeDeductedDollars: (stripeFeeCents / 100).toFixed(2),
                  netTransferredDollars: (netCreatorReferralCents / 100).toFixed(2),
                },
              });
            }

            if (subUserId && subUserId !== "guest_checkout") {
              await supabase
                .from("profiles")
                .update({
                  referred_by_code: referralCode,
                  referral_commission_paid_at: new Date().toISOString(),
                })
                .eq("id", subUserId);
            }
          }
        }
      }

      return { devTransfer, referralTransfer };
    };

    const fetchCustomerEmailFromStripe = async (customerId: string): Promise<string> => {
      if (!customerId || !stripeSecretKey) return "";
      try {
        const res = await fetch(
          `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`,
          { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
        );
        if (res.ok) {
          const data = await res.json();
          return String(data.email ?? "").trim().toLowerCase();
        }
      } catch {
        // ignore
      }
      return "";
    };

    const downgradeUserPreserveStats = async (
      userId: string,
      customerEmail: string,
      reasonStatus: string
    ) => {
      let downgraded = false;
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({
            is_premium: false,
            subscription_status: reasonStatus,
            trial_ends_at: null,
            super_hypes_left: 1,
            hypes_remaining: 1,
          })
          .eq("id", userId);
        if (!error) downgraded = true;
      }
      if (!downgraded && customerEmail) {
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            subscription_status: reasonStatus,
            trial_ends_at: null,
            super_hypes_left: 1,
            hypes_remaining: 1,
          })
          .ilike("email", customerEmail);
      }
    };

    // =========================================================================
    // A. PAID SUBSCRIPTION INVOICES (3-DAY TRIAL CONVERSIONS & RENEWALS)
    // =========================================================================
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data?.object ?? {};
      const amountPaidCents = Number(invoice.amount_paid ?? 0);
      const chargeId = String(invoice.charge ?? "").trim();
      const subscriptionId = String(invoice.subscription ?? "").trim();
      const billingReason = String(invoice.billing_reason ?? "").trim();
      const subMeta =
        invoice.subscription_details?.metadata ??
        invoice.lines?.data?.[0]?.metadata ??
        invoice.metadata ??
        {};

      if (amountPaidCents > 0) {
        const paidUserId = String(subMeta.userId ?? subMeta.user_id ?? "").trim();
        if (paidUserId && paidUserId !== "guest_checkout") {
          await supabase
            .from("profiles")
            .update({
              is_premium: true,
              subscription_status: "active",
              trial_ends_at: null,
            })
            .eq("id", paidUserId);
        }

        const splits = await processSubscriptionPayoutSplits({
          uniqueEventId: String(invoice.id ?? event.id),
          amountPaidCents,
          sourceChargeId: chargeId,
          subscriptionId,
          billingReason,
          subMetadata: subMeta,
        });

        return new Response(
          JSON.stringify({
            received: true,
            action: "invoice_paid_splits_processed",
            amount_paid_cents: amountPaidCents,
            dev_transfer_id: splits.devTransfer?.id ?? null,
            referral_transfer_id: splits.referralTransfer?.id ?? null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // =========================================================================
    // B. CANCELLATIONS, MISSED PAYMENTS & SUBSCRIPTION STATUS UPDATES
    // =========================================================================
    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated" ||
      event.type === "invoice.payment_failed"
    ) {
      const obj = event.data?.object ?? {};
      const subMeta = obj.metadata ?? obj.subscription_details?.metadata ?? {};
      const targetUserId = String(subMeta.userId ?? subMeta.user_id ?? "").trim();
      const customerId = String(obj.customer ?? "").trim();
      let customerEmail = String(obj.customer_email ?? "").trim().toLowerCase();

      if (!customerEmail && customerId) {
        customerEmail = await fetchCustomerEmailFromStripe(customerId);
      }

      if (event.type === "customer.subscription.deleted") {
        await downgradeUserPreserveStats(targetUserId, customerEmail, "canceled");
        return new Response(
          JSON.stringify({ received: true, action: "downgraded_on_cancel" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (event.type === "invoice.payment_failed") {
        await downgradeUserPreserveStats(targetUserId, customerEmail, "past_due");
        return new Response(
          JSON.stringify({ received: true, action: "downgraded_on_payment_failed" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      if (event.type === "customer.subscription.updated") {
        const subStatus = String(obj.status ?? "").toLowerCase();
        if (["canceled", "unpaid", "incomplete_expired", "past_due"].includes(subStatus)) {
          await downgradeUserPreserveStats(targetUserId, customerEmail, subStatus);
          return new Response(
            JSON.stringify({ received: true, action: `downgraded_${subStatus}` }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        } else if (["active", "trialing"].includes(subStatus)) {
          if (targetUserId) {
            await supabase
              .from("profiles")
              .update({
                is_premium: true,
                subscription_status: subStatus,
                ...(subStatus === "active" ? { trial_ends_at: null } : {}),
                super_hypes_left: proAllowance,
                hypes_remaining: proAllowance,
              })
              .eq("id", targetUserId);
          }
          return new Response(
            JSON.stringify({ received: true, action: `kept_active_${subStatus}` }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }

    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true, ignored: event.type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = event.data?.object ?? {};
    const metadata = session.metadata ?? {};
    const metaType = String(metadata.type ?? "").trim().toLowerCase();
    const resendKey = (Deno.env.get("RESEND_API_KEY") ?? settings?.resend_api_key ?? "").trim();

    const adminEmailsSet = new Set<string>([
      "rayme3000@gmail.com",
      "publisher@saturday-am.com",
    ]);
    if (Array.isArray(settings?.moderator_emails)) {
      settings.moderator_emails.forEach((em: string) => {
        const cleanEm = String(em ?? "").trim().toLowerCase();
        if (cleanEm.includes("@")) adminEmailsSet.add(cleanEm);
      });
    }
    const adminEmails = Array.from(adminEmailsSet);

    const resolveChargeIdFromPaymentIntent = async (paymentIntentId?: string): Promise<string> => {
      const cleanPi = String(paymentIntentId || "").trim();
      if (!cleanPi || !stripeSecretKey) return "";
      try {
        const piRes = await fetch(
          `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(cleanPi)}`,
          { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
        );
        if (piRes.ok) {
          const piData = await piRes.json();
          if (piData?.latest_charge) return String(piData.latest_charge);
        }
      } catch {
        // ignore
      }
      return "";
    };

    // =========================================================================
    // CASE 1: MULTI-CREATOR STORE BUNDLES & DIGITAL STORE ITEMS
    // =========================================================================
    if (metaType === "themed_bundle" || metaType === "store_item") {
      const buyerUserId = String(
        metadata.userId ?? session.client_reference_id ?? ""
      ).trim();
      const productId = String(metadata.bundleId ?? "").trim();
      const productTitle = String(metadata.bundleTitle ?? "Store Item").trim();
      const productType = String(metadata.productType ?? metaType).trim();
      const grossCents = Number(session.amount_total ?? 0);
      const grossDollars = Number((grossCents / 100).toFixed(2));
      const stripeFeeDollars = Number((computeStripeFeeCents(grossCents) / 100).toFixed(2));
      const sessionId = String(session.id ?? `store_${Date.now()}`);

      const chargeId = await resolveChargeIdFromPaymentIntent(session.payment_intent);

      const devCents = Math.round(grossCents * (DEV_CUT_PERCENT / 100));
      const devDollars = Number((devCents / 100).toFixed(2));
      let devTransfer = null;
      if (devCents > 0 && DEV_STRIPE_CONNECT_ACCOUNT_ID.startsWith("acct_")) {
        devTransfer = await executeStripeTransfer({
          destinationAcct: DEV_STRIPE_CONNECT_ACCOUNT_ID,
          amountCents: devCents,
          description: `7.5% Dev Allocation on ${productTitle}`,
          sourceChargeId: chargeId,
          idempotencyKey: `store_dev_${sessionId}`,
          metadata: {
            type: "store_dev_cut",
            productId,
            productTitle,
            percent: "7.5",
          },
        });
      }

      let parsedSplits: { name: string; cents: number; percent: number }[] = [];
      try {
        if (metadata.creatorSplitsJson) {
          parsedSplits = JSON.parse(metadata.creatorSplitsJson);
        }
      } catch {
        parsedSplits = [];
      }

      const maxPoolCents = Math.floor(grossCents * (MAX_CREATOR_POOL_PERCENT / 100));
      const rawSplitSum = parsedSplits.reduce((s, r) => s + Math.max(0, Number(r.cents || 0)), 0);
      const scale = rawSplitSum > maxPoolCents && rawSplitSum > 0 ? maxPoolCents / rawSplitSum : 1;

      let totalCreatorBountyCents = 0;
      let anyUnconnectedCreator = false;
      const ledgerCreatorSplits: any[] = [];

      for (let i = 0; i < parsedSplits.length; i++) {
        const sp = parsedSplits[i];
        const cName = String(sp.name || "").trim();
        const cCents = Math.round(Math.max(0, Number(sp.cents || 0)) * scale);
        if (!cName || cCents <= 0) continue;

        totalCreatorBountyCents += cCents;
        const resolved = await resolvePartnerByNameOrCode(cName);
        let transferred = false;
        let transferId: string | null = null;

        if (resolved.connectId.startsWith("acct_")) {
          const tRes = await executeStripeTransfer({
            destinationAcct: resolved.connectId,
            amountCents: cCents,
            description: `Store Bundle Commission: ${productTitle} (${cName})`,
            sourceChargeId: chargeId,
            idempotencyKey: `store_cr_${i}_${sessionId}`,
            metadata: {
              type: "store_creator_commission",
              productId,
              productTitle,
              creatorName: cName,
            },
          });
          if (tRes?.id) {
            transferred = true;
            transferId = tRes.id;
          } else {
            anyUnconnectedCreator = true;
          }
        } else {
          anyUnconnectedCreator = true;
        }

        ledgerCreatorSplits.push({
          creator_name: cName,
          amount_dollars: Number((cCents / 100).toFixed(2)),
          percent: Number(((cCents / Math.max(1, grossCents)) * 100).toFixed(2)),
          stripe_account_id: resolved.connectId || null,
          payout_status: transferred ? "paid" : "pending",
          transfer_id: transferId,
        });
      }

      const totalCreatorBountyDollars = Number((totalCreatorBountyCents / 100).toFixed(2));
      const netSatAmDollars = Math.max(
        0,
        Number((grossDollars - stripeFeeDollars - totalCreatorBountyDollars - devDollars).toFixed(2))
      );

      if (buyerUserId && buyerUserId !== "guest_checkout" && productId) {
        const [{ data: prodRow }, { data: buyerProf }, { data: existingLedger }] =
          await Promise.all([
            supabase
              .from("in_app_store_products")
              .select("*")
              .eq("id", productId)
              .maybeSingle(),
            supabase.from("profiles").select("*").eq("id", buyerUserId).maybeSingle(),
            supabase
              .from("store_payout_ledger")
              .select("id")
              .eq("user_id", buyerUserId)
              .eq("product_id", productId)
              .limit(1)
              .maybeSingle(),
          ]);

        if (prodRow && buyerProf) {
          const skinIds: string[] = Array.isArray(prodRow.card_skin_ids)
            ? prodRow.card_skin_ids.map(String)
            : [];
          let skinUrls: string[] = [];
          let stampedAutos: string[] = [];
          if (skinIds.length > 0) {
            const { data: skinRows } = await supabase
              .from("card_skins")
              .select("id, image_url, signature_stamps")
              .in("id", skinIds);
            skinUrls = (skinRows || []).map((s: any) => s.image_url).filter(Boolean);
            stampedAutos = (skinRows || []).flatMap((s: any) =>
              Array.isArray(s?.signature_stamps)
                ? s.signature_stamps.map((st: any) => String(st?.creator_name || "").trim()).filter(Boolean)
                : []
            );
          }

          const existingSkins: string[] = Array.isArray(buyerProf.unlocked_skins)
            ? buyerProf.unlocked_skins.map(String)
            : [];
          const nextSkins = Array.from(
            new Set([...existingSkins, ...skinIds, ...skinUrls].filter(Boolean))
          );

          const existingAvatars: string[] = Array.isArray(buyerProf.unlocked_avatars)
            ? buyerProf.unlocked_avatars.map(String)
            : [];
          const prodAvatars: string[] = Array.isArray(prodRow.avatar_urls)
            ? prodRow.avatar_urls.filter(Boolean)
            : [];
          const nextAvatars = Array.from(new Set([...existingAvatars, ...prodAvatars]));

          const existingAutos: string[] = Array.isArray(buyerProf.unlocked_autographs)
            ? buyerProf.unlocked_autographs.map(String)
            : [];
          const explicitAutos: string[] = Array.isArray(prodRow.autograph_creators)
            ? prodRow.autograph_creators.filter(Boolean)
            : [];
          const fallbackCommAutos: string[] =
            explicitAutos.length === 0 && stampedAutos.length === 0 && prodRow.product_type === "bundle"
              ? (Array.isArray(prodRow.commission_creators) ? prodRow.commission_creators.filter(Boolean) : [])
              : [];
          const mergedBundleAutos = Array.from(
            new Set([...explicitAutos, ...stampedAutos, ...fallbackCommAutos].filter(Boolean))
          );
          const nextAutos = Array.from(new Set([...existingAutos, ...mergedBundleAutos]));

          const bonusVaulted = !existingLedger ? Number(prodRow.bonus_vaulted_hypes || 0) : 0;
          const patch: Record<string, any> = {
            unlocked_skins: nextSkins,
            unlocked_avatars: nextAvatars,
            unlocked_autographs: nextAutos,
            vaulted_hypes: Number(buyerProf.vaulted_hypes || 0) + bonusVaulted,
          };

          if (prodRow.include_1yr_sub) {
            patch.is_premium = true;
            const curActive = Number(
              buyerProf.hypes_remaining ?? buyerProf.super_hypes_left ?? 3
            );
            patch.hypes_remaining = Math.min(10, Math.max(3, curActive));
            patch.super_hypes_left = patch.hypes_remaining;
          }
          if (skinUrls[0] && !buyerProf.card_skin) patch.card_skin = skinUrls[0];
          if (prodAvatars[0] && !buyerProf.avatar_url) patch.avatar_url = prodAvatars[0];

          const { error: profErr } = await supabase
            .from("profiles")
            .update(patch)
            .eq("id", buyerUserId);

          if (profErr) {
            console.error("Bundle profile update fallback:", profErr.message);
            const { unlocked_autographs: _ua, ...safePatch } = patch;
            await supabase.from("profiles").update(safePatch).eq("id", buyerUserId);
          }

          if (mergedBundleAutos.length > 0) {
            const { data: existingSigLogs } = await supabase
              .from("bingo_signatures_log")
              .select("creator_name")
              .eq("user_id", buyerUserId);
            const loggedLower = new Set(
              (existingSigLogs || []).map((r: any) => String(r.creator_name || "").trim().toLowerCase())
            );
            for (const cName of mergedBundleAutos) {
              const cleanC = String(cName).trim();
              if (cleanC && !loggedLower.has(cleanC.toLowerCase())) {
                loggedLower.add(cleanC.toLowerCase());
                await supabase.from("bingo_signatures_log").insert([
                  {
                    user_id: buyerUserId,
                    creator_name: cleanC,
                    event_name: productTitle || "Annual Collector Bundle",
                    signature_type: "Standard",
                  },
                ]);
              }
            }
          }
        }

        if (!existingLedger && grossDollars > 0) {
          await supabase.from("store_payout_ledger").insert([
            {
              stripe_session_id: sessionId,
              user_id: buyerUserId,
              user_email:
                session.customer_details?.email ||
                session.customer_email ||
                buyerProf?.email ||
                null,
              product_id: productId,
              product_title: productTitle,
              product_type: productType,
              commission_mode: String(metadata.commissionMode || "flat"),
              gross_amount_dollars: grossDollars,
              stripe_fee_dollars: stripeFeeDollars,
              creator_bounty_dollars: totalCreatorBountyDollars,
              creator_names: ledgerCreatorSplits.map((s) => s.creator_name),
              creator_splits: ledgerCreatorSplits,
              dev_allocation_dollars: devDollars,
              net_saturday_am_dollars: netSatAmDollars,
              status: anyUnconnectedCreator ? "pending" : "completed",
            },
          ]);
        }
      }

      return new Response(
        JSON.stringify({
          received: true,
          type: metaType,
          product: productTitle,
          dev_transfer_id: devTransfer?.id ?? null,
          creator_splits: ledgerCreatorSplits,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // CASE 2: CREATOR DONATION / TIP & FAN MAIL NOTIFICATION
    // =========================================================================
    const creatorName = String(metadata.creatorName ?? metadata.creator_name ?? "").trim();

    if (metaType === "donation" || metaType === "creator_tip") {
      const targetCreator = creatorName || "Saturday AM Creator";
      const fanMessage = String(
        metadata.fanmail ?? metadata.fan_message ?? metadata.fanMessage ?? ""
      ).trim();

      const donorUserId = String(
        metadata.userId ?? session.client_reference_id ?? ""
      ).trim();

      let profileUsername = "";
      let profileFullName = "";
      let profileEmail = "";
      if (donorUserId && donorUserId !== "guest_checkout") {
        const { data: donorProfile } = await supabase
          .from("profiles")
          .select("username, first_name, last_name, email")
          .eq("id", donorUserId)
          .maybeSingle();

        if (donorProfile) {
          profileUsername = String(donorProfile.username ?? "").trim();
          profileFullName = `${donorProfile.first_name ?? ""} ${donorProfile.last_name ?? ""}`.trim();
          profileEmail = String(donorProfile.email ?? "").trim().toLowerCase();
        }
      }

      const donorName = String(
        profileUsername ||
          profileFullName ||
          session.customer_details?.name ||
          "A Saturday AM Fan"
      ).trim();

      const donorEmail = String(
        session.customer_details?.email ?? session.customer_email ?? profileEmail ?? ""
      )
        .trim()
        .toLowerCase();

      const grossChargedCents = Number(session.amount_total ?? 500);
      const netCreatorDollars = metadata.creatorNetDollars
        ? Number(metadata.creatorNetDollars)
        : Number(((grossChargedCents - computeStripeFeeCents(grossChargedCents)) / 100).toFixed(2));
      const baseTipLabel = metadata.baseTipDollars || netCreatorDollars.toFixed(2);

      const { data: creatorRows } = await supabase
        .from("series_creators")
        .select("name, email, stripe_account_id")
        .ilike("name", targetCreator)
        .limit(5);

      let creatorEmail =
        (creatorRows ?? [])
          .map((r: any) => String(r.email ?? "").trim().toLowerCase())
          .find((em: string) => em.includes("@")) ?? "";

      const resolvedCreatorPartner = await resolvePartnerByNameOrCode(targetCreator);
      const stripeAccountId =
        String(metadata.stripeAccountId ?? "").trim() || resolvedCreatorPartner.connectId;

      const wasTransferredViaConnect =
        metadata.payoutRouting === "creator_connect" && stripeAccountId.startsWith("acct_");

      if (!creatorEmail && stripeAccountId.startsWith("acct_") && stripeSecretKey) {
        try {
          const acctRes = await fetch(
            "https://api.stripe.com/v1/accounts/" + encodeURIComponent(stripeAccountId),
            { headers: { "Authorization": "Bearer " + stripeSecretKey } }
          );
          if (acctRes.ok) {
            const acctData = await acctRes.json();
            const fetchedEmail = String(
              acctData.email ??
                acctData.support_email ??
                acctData.business_profile?.support_email ??
                ""
            )
              .trim()
              .toLowerCase();
            if (fetchedEmail.includes("@")) {
              creatorEmail = fetchedEmail;
              await supabase
                .from("series_creators")
                .update({ email: creatorEmail })
                .ilike("name", targetCreator);
            }
          }
        } catch {
          // ignore
        }
      }

      const sessionId = String(session.id ?? "tip_" + Date.now());

      await supabase.from("creator_tips").upsert(
        [
          {
            creator_name: targetCreator,
            creator_email: creatorEmail || null,
            donor_user_id: donorUserId && donorUserId !== "guest_checkout" ? donorUserId : null,
            donor_name: donorName,
            donor_email: donorEmail || null,
            amount_dollars: netCreatorDollars,
            fan_message: fanMessage || null,
            payout_status: wasTransferredViaConnect ? "paid" : "pending",
            stripe_session_id: sessionId,
          },
        ],
        { onConflict: "stripe_session_id" }
      );

      const recipientsSet = new Set<string>(adminEmails);
      if (creatorEmail) recipientsSet.add(creatorEmail);
      const allRecipients = Array.from(recipientsSet);

      if (resendKey && allRecipients.length > 0) {
        const messageBlockHtml = fanMessage
          ? `<div style="background-color:#18181b;border-left:4px solid #fe9a00;border-radius:8px;padding:18px;margin:20px 0;text-align:left;"><div style="color:#fe9a00;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Fan Mail Message from ${donorName}</div><div style="color:#ffffff;font-size:15px;font-style:italic;line-height:1.6;">"${fanMessage}"</div></div>`
          : '<p style="color:#71717a;font-size:12px;font-style:italic;">(No fan mail message was attached to this tip.)</p>';

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Saturday AM Manga Hype <support@mangahype.com>",
            to: allRecipients,
            reply_to: donorEmail || undefined,
            subject: `New $${netCreatorDollars.toFixed(2)} Net Fan Tip for ${targetCreator}!`,
            html: `
              <div style="background-color:#09090b;color:#ffffff;padding:36px 24px;font-family:sans-serif;max-width:560px;margin:0 auto;border-radius:16px;border:1px solid #27272a;text-align:center;">
                <div style="display:inline-block;background-color:#fe9a00;color:#000000;font-weight:900;font-size:11px;text-transform:uppercase;letter-spacing:2px;padding:6px 14px;border-radius:999px;margin-bottom:16px;">
                  Creator Support Alert
                </div>
                <h1 style="color:#ffffff;font-size:24px;font-style:italic;text-transform:uppercase;margin:0 0 8px 0;">
                  ${targetCreator} Earned $${netCreatorDollars.toFixed(2)} Net!
                </h1>
                <p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin-bottom:24px;">
                  <strong>${donorName}</strong> sent a $${baseTipLabel} tip (${
              wasTransferredViaConnect
                ? "Auto-routed via Stripe Connect"
                : "Held in Saturday AM account — Pending Creator Payout"
            }).
                </p>
                ${messageBlockHtml}
              </div>
            `,
          }),
        });
      }

      return new Response(
        JSON.stringify({
          received: true,
          type: "donation",
          creator: targetCreator,
          net_amount: netCreatorDollars,
          payout_status: wasTransferredViaConnect ? "paid" : "pending",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // CASE 3: SATURDAY AM+ SUBSCRIPTION CHECKOUT (INCLUDING 3-DAY FREE TRIAL)
    // =========================================================================
    const userId = metadata.userId ?? metadata.user_id ?? session.client_reference_id ?? "";
    const referralCode = String(metadata.referralCode ?? "").trim().toUpperCase();
    const subPlan = String(metadata.plan ?? "annual").trim();
    const sessionAmountPaid = Number(session.amount_total ?? 0);

    if (userId && userId !== "guest_checkout") {
      const isStartingTrial = sessionAmountPaid === 0 && Boolean(referralCode);
      let trialEndsIso: string | null = null;
      let partnerDisplayName = String(metadata.referralPartnerName ?? "").trim();

      if (isStartingTrial) {
        trialEndsIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        if (session.subscription && stripeSecretKey) {
          try {
            const subRes = await fetch(
              `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(
                String(session.subscription)
              )}`,
              { headers: { "Authorization": `Bearer ${stripeSecretKey}` } }
            );
            if (subRes.ok) {
              const subJson = await subRes.json();
              if (subJson?.trial_end) {
                trialEndsIso = new Date(Number(subJson.trial_end) * 1000).toISOString();
              }
            }
          } catch {
            // keep 72h fallback
          }
        }

        if (!partnerDisplayName) {
          const resolved = await resolvePartnerByNameOrCode("", referralCode);
          partnerDisplayName = resolved.partnerName || referralCode;
        }
      }

      const updatePayload: Record<string, any> = {
        is_premium: true,
        subscription_status: isStartingTrial ? "trialing" : "active",
        trial_ends_at: isStartingTrial ? trialEndsIso : null,
        super_hypes_left: proAllowance,
        hypes_remaining: proAllowance,
        stripe_customer_id: session.customer ? String(session.customer) : undefined,
        stripe_subscription_id: session.subscription ? String(session.subscription) : undefined,
      };

      if (isStartingTrial) {
        updatePayload.has_used_referral_trial = true;
        updatePayload.trial_referred_by_name = partnerDisplayName || referralCode;
      }

      if (referralCode) {
        updatePayload.referred_by_code = referralCode;
        updatePayload.referred_plan = subPlan;
      }

      await supabase.from("profiles").update(updatePayload).eq("id", userId);
    }

    return new Response(
      JSON.stringify({
        received: true,
        type: "subscription",
        upgraded_user: userId || null,
        status: sessionAmountPaid === 0 && referralCode ? "trialing" : "active",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Stripe Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});