// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Cryptographic HMAC-SHA256 verification so fake orders can never be spoofed
async function verifyShopifyHmac(rawBody: string, hmacHeader: string, secret: string): Promise<boolean> {
  if (!hmacHeader || !secret) return false;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret.trim()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));
  return base64Sig === hmacHeader.trim();
}

function generateUniquePromoCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return segment() + "-" + segment() + "-" + segment();
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const shopifyHmac = req.headers.get("x-shopify-hmac-sha256") ?? "";
    const webhookSecret = (Deno.env.get("SHOPIFY_WEBHOOK_SECRET") ?? "").trim();

    if (webhookSecret) {
      const isValid = await verifyShopifyHmac(rawBody, shopifyHmac, webhookSecret);
      if (!isValid) {
        console.error("Invalid Shopify Webhook signature");
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const order = JSON.parse(rawBody);
    const orderNumber = String(order.name ?? order.order_number ?? "Shopify Order").trim();

    // Extract Buyer Email & Full Name (Data Minimization: No street addresses or phone numbers stored in DB)
    const buyerEmail = String(
      order.email ??
      order.contact_email ??
      order.customer?.email ??
      order.billing_address?.email ??
      ""
    ).trim().toLowerCase();

    const firstName = String(
      order.customer?.first_name ??
      order.billing_address?.first_name ??
      order.shipping_address?.first_name ??
      ""
    ).trim();

    const lastName = String(
      order.customer?.last_name ??
      order.billing_address?.last_name ??
      order.shipping_address?.last_name ??
      ""
    ).trim();

    const combinedName = (firstName + " " + lastName).trim();
    const fullName = String(
      combinedName ||
      order.billing_address?.name ||
      order.shipping_address?.name ||
      order.customer?.default_address?.name ||
      "Super Fan"
    ).trim();

    const shippingAddr = order.shipping_address ?? order.billing_address ?? order.customer?.default_address ?? {};
    const country = String(shippingAddr.country ?? shippingAddr.country_code ?? "").trim();

    const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
    const purchasedItemsSummary = lineItems
      .map((item: any) => {
        const qty = item.quantity ?? 1;
        const itemTitle = item.title ?? "Item";
        return String(qty) + "x " + String(itemTitle);
      })
      .join(", ");

    // Fetch app_settings for moderator emails & standard Pro allowance
    const { data: settings } = await supabase
      .from("app_settings")
      .select("moderator_emails, premium_hype_allowance")
      .eq("id", 1)
      .maybeSingle();

    const proAllowance = Number(settings?.premium_hype_allowance ?? 3);

    // Check if the order includes a Saturday AM+ Subscription / Pro Code product
    const qualifiesForProCode = lineItems.some((item: any) => {
      const title = String(item.title ?? "").toLowerCase();
      const sku = String(item.sku ?? "").toLowerCase();
      return (
        title.includes("subscription") ||
        title.includes("saturday am+") ||
        title.includes("annual") ||
        title.includes("membership") ||
        title.includes("pro") ||
        sku.includes("satam-pro") ||
        sku.includes("sub")
      );
    });

    if (!qualifiesForProCode) {
      return new Response(
        JSON.stringify({
          received: true,
          pro_code_minted: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if buyer already has a Saturday AM profile matching their Shopify email
    let matchedProfile: any = null;
    if (buyerEmail) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", buyerEmail)
        .maybeSingle();
      matchedProfile = existingProfile;
    }

    // 1. Mint a unique 1-time 12-character 1-Year Pro Code (XXXX-XXXX-XXXX)
    const generatedCode = generateUniquePromoCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365);

    let autoUpgraded = false;

    // 2. If buyer's email matches a Saturday AM account, auto-upgrade them to Pro (without storing street address/phone)
    if (matchedProfile) {
      const { error: upgradeErr } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          subscription_status: "active",
          super_hypes_left: proAllowance,
          hypes_remaining: proAllowance,
          first_name: matchedProfile.first_name || firstName || null,
          last_name: matchedProfile.last_name || lastName || null,
          country: matchedProfile.country || country || null,
        })
        .eq("id", matchedProfile.id);

      if (!upgradeErr) {
        autoUpgraded = true;
      }
    }

    // Insert the code AND minimal purchaser info into promo_codes (No physical address or phone number)
    const { error: insertErr } = await supabase.from("promo_codes").insert([
      {
        code: generatedCode,
        tier: "premium",
        max_uses: 1,
        times_used: autoUpgraded ? 1 : 0,
        expires_at: expiresAt.toISOString(),
        buyer_name: fullName || null,
        buyer_email: buyerEmail || null,
        buyer_phone: null,
        buyer_address: null,
        order_number: orderNumber || null,
      },
    ]);

    if (insertErr) {
      throw new Error("Failed to insert promo code: " + insertErr.message);
    }

    // 3. Email the customer their code + 1-click Magic Redemption Link via Resend Secret
    const resendKey = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
    const magicLink = "https://www.mangahype.com/?promo=" + encodeURIComponent(generatedCode);

    // Build Admin Notification Recipient List
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

    if (resendKey) {
      const displayGreetingName = firstName || fullName;
      const buyerStatusLine = autoUpgraded
        ? "We found your Saturday AM account (<strong>" + buyerEmail + "</strong>) and <strong>automatically upgraded you to Pro for 1 Full Year!</strong>"
        : "Here is your personal 1-time activation code for <strong>1 Full Year of Saturday AM+ Pro</strong>:";
      const keyLabel = autoUpgraded ? "Your Redeemed Pro Key" : "1-Year Pro Activation Code";
      const instructionsLine = autoUpgraded
        ? "Open MangaHype.com now to binge the entire Manga Vault, drop 3 weekly Super Hypes, and equip exclusive Crew Card skins!"
        : "Click the button below to automatically apply your code and unlock your 1-Year Pro account on MangaHype.com:";
      const buttonLabel = autoUpgraded ? "Open Saturday AM+" : "1-Click Activate Pro";

      // A. Send Welcome + Activation Email to the Buyer
      if (buyerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Saturday AM Manga Hype <support@mangahype.com>",
            to: [buyerEmail],
            subject: autoUpgraded
              ? "Your Saturday AM+ Pro Membership is Unlocked!"
              : "Activate Your Saturday AM+ 1-Year Pro Membership!",
            html: `
              <div style="background-color:#000000;color:#ffffff;padding:40px 24px;font-family:sans-serif;max-width:560px;margin:0 auto;border-radius:16px;border:1px solid #27272a;text-align:center;">
                <h1 style="color:#fe9a00;font-style:italic;text-transform:uppercase;margin-bottom:8px;">Welcome to Saturday AM+</h1>
                <p style="color:#a1a1aa;font-size:14px;line-height:1.6;">
                  Hey ${displayGreetingName}! Thank you for your Shopify order (${orderNumber}).
                  ${buyerStatusLine}
                </p>
                <div style="background-color:#18181b;border:2px solid #fe9a00;border-radius:12px;padding:20px;margin:28px 0;">
                  <div style="color:#71717a;font-size:10px;text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">
                    ${keyLabel}
                  </div>
                  <span style="color:#fe9a00;font-size:24px;font-weight:900;letter-spacing:4px;">${generatedCode}</span>
                </div>
                <p style="color:#d4d4d8;font-size:13px;line-height:1.6;margin-bottom:28px;">
                  ${instructionsLine}
                </p>
                <a href="${magicLink}" style="display:inline-block;background-color:#fe9a00;color:#000000;font-weight:900;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:13px;letter-spacing:1px;">
                  ${buttonLabel}
                </a>
              </div>
            `,
          }),
        });
      }

      // B. Send Detailed Purchaser Receipt & Code Alert to Admins
      const displayEmail = buyerEmail || "Not provided";
      const itemsOrPrice = purchasedItemsSummary || ("$" + String(order.total_price ?? "20.00"));
      const matchedName = matchedProfile?.username || buyerEmail;
      const adminStatusHtml = autoUpgraded
        ? '<span style="color:#34d399;font-weight:700;">Auto-Upgraded Existing Saturday AM Account (' + matchedName + ')</span>'
        : '<span style="color:#fbbf24;font-weight:700;">Emailed 1-Click Magic Activation Link to ' + displayEmail + '</span>';

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + resendKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Saturday AM Manga Hype <support@mangahype.com>",
          to: adminEmails,
          subject: "[Shopify Pro Code] " + fullName + " (" + displayEmail + ") - " + generatedCode,
          html: `
            <div style="background-color:#09090b;color:#ffffff;padding:32px 24px;font-family:sans-serif;max-width:580px;margin:0 auto;border-radius:16px;border:1px solid #27272a;">
              <h2 style="color:#fe9a00;font-style:italic;text-transform:uppercase;margin-top:0;margin-bottom:6px;">New Shopify Pro Subscriber</h2>
              <p style="color:#a1a1aa;font-size:13px;margin-top:0;">A qualifying Shopify subscription order was processed and a 1-Year Pro code was automatically generated.</p>
              
              <div style="background-color:#18181b;border:1px solid #3f3f46;border-radius:12px;padding:18px;margin:20px 0;font-size:13px;line-height:1.9;">
                <div style="color:#fe9a00;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #27272a;padding-bottom:4px;">
                  Purchaser Details
                </div>
                <div><strong>Purchaser Name:</strong> ${fullName}</div>
                <div><strong>Email Address:</strong> <a href="mailto:${displayEmail}" style="color:#fe9a00;">${displayEmail}</a></div>
                <div><strong>Shopify Order:</strong> ${orderNumber} (${itemsOrPrice})</div>
              </div>

              <div style="background-color:#18181b;border:1px solid #fe9a00;border-radius:12px;padding:18px;margin:20px 0;font-size:13px;line-height:1.9;">
                <div style="color:#fe9a00;font-weight:800;text-transform:uppercase;font-size:11px;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #27272a;padding-bottom:4px;">
                  Generated Code & Account Status
                </div>
                <div><strong>1-Year Pro Code:</strong> <span style="color:#fe9a00;font-weight:900;letter-spacing:2px;font-size:15px;">${generatedCode}</span></div>
                <div><strong>Account Status:</strong> ${adminStatusHtml}</div>
              </div>
            </div>
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        received: true,
        order_number: orderNumber,
        purchaser_name: fullName,
        purchaser_email: buyerEmail,
        code: generatedCode,
        auto_upgraded: autoUpgraded,
        admin_notified: adminEmails,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Shopify Webhook Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});