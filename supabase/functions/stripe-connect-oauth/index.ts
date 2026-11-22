import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateCreatorName = url.searchParams.get("state") ?? "";
    const errorParam = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (errorParam) {
      return Response.redirect(
        "https://www.mangahype.com/?stripe_connect_error=" +
          encodeURIComponent(errorDesc || errorParam),
        302
      );
    }

    if (!code) {
      return Response.redirect("https://www.mangahype.com/", 302);
    }

    const k1 = (Deno.env.get("NEW LIVE KEY") ?? "").trim();
    const k2 = (Deno.env.get("STRIPE_SECRET_KEY") ?? "").trim();
    const stripeSecretKey =
      [k1, k2].find((k) => k.startsWith("sk_") || k.startsWith("rk_")) ?? k1 ?? k2;

    if (!stripeSecretKey) {
      throw new Error("Missing Stripe Secret Key in Supabase Secrets.");
    }

    // 1. Exchange the temporary OAuth `code` for the creator's permanent `stripe_user_id` (acct_...)
    const tokenParams = new URLSearchParams();
    tokenParams.append("grant_type", "authorization_code");
    tokenParams.append("code", code);

    const tokenRes = await fetch("https://connect.stripe.com/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + stripeSecretKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.stripe_user_id) {
      throw new Error(tokenData.error_description || tokenData.error || "OAuth token exchange failed.");
    }

    const stripeAccountId = String(tokenData.stripe_user_id).trim();

    // 2. Request `transfers` capability automatically so fan donations never get blocked
    const capParams = new URLSearchParams();
    capParams.append("capabilities[transfers][requested]", "true");
    await fetch("https://api.stripe.com/v1/accounts/" + encodeURIComponent(stripeAccountId), {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + stripeSecretKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: capParams.toString(),
    }).catch(() => {});

    // 3. Fetch the creator's name and email from their newly connected Stripe account
    let creatorEmail = "";
    let creatorFullName = stateCreatorName.trim();

    const acctRes = await fetch(
      "https://api.stripe.com/v1/accounts/" + encodeURIComponent(stripeAccountId),
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + stripeSecretKey,
        },
      }
    );

    if (acctRes.ok) {
      const acctData = await acctRes.json();
      creatorEmail = String(
        acctData.email ??
        acctData.support_email ??
        acctData.business_profile?.support_email ??
        ""
      ).trim().toLowerCase();

      if (!creatorFullName) {
        const indFirst = acctData.individual?.first_name ?? "";
        const indLast = acctData.individual?.last_name ?? "";
        const combinedInd = (indFirst + " " + indLast).trim();
        creatorFullName = String(
          combinedInd ||
          acctData.business_profile?.name ||
          acctData.settings?.dashboard?.display_name ||
          ""
        ).trim();
      }
    }

    // 4. Automatically update matching creator rows in public.series_creators!
    if (creatorFullName) {
      await supabase
        .from("series_creators")
        .update({
          stripe_account_id: stripeAccountId,
          ...(creatorEmail ? { email: creatorEmail } : {}),
        })
        .ilike("name", creatorFullName);
    } else if (creatorEmail) {
      await supabase
        .from("series_creators")
        .update({
          stripe_account_id: stripeAccountId,
        })
        .ilike("email", creatorEmail);
    }

    // 5. Redirect creator to MangaHype with a success banner!
    return Response.redirect(
      "https://www.mangahype.com/?stripe_connected=success&acct=" +
        encodeURIComponent(stripeAccountId),
      302
    );
  } catch (err: any) {
    console.error("Stripe OAuth Redirect Error:", err.message);
    return Response.redirect(
      "https://www.mangahype.com/?stripe_connect_error=" + encodeURIComponent(err.message),
      302
    );
  }
});