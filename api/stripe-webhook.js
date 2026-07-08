import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { JOBPROOF_PLANS, PLAN_KEYS } from "../src/config/plans.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripePriceToPlanKey = Object.values(JOBPROOF_PLANS).reduce(
  (priceMap, plan) => {
    if (plan.stripePriceId) {
      priceMap[plan.stripePriceId] = plan.key;
    }

    return priceMap;
  },
  {}
);

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw createHttpError(500, "Stripe is not configured on the server.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getSupabaseAdmin = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError(
      500,
      "Supabase service role is not configured on the server."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const readRawBody = async (req) => {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body, "utf8");
  }

  if (req.body && typeof req.body === "object") {
    return Buffer.from(JSON.stringify(req.body), "utf8");
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const normalizeSubscriptionStatus = (status) => {
  if (["canceled", "incomplete_expired", "unpaid"].includes(status)) {
    return "inactive";
  }

  return status || "inactive";
};

const getSubscriptionPriceId = (subscription) => {
  const items = subscription?.items?.data || [];
  return items[0]?.price?.id || null;
};

const getPlanKeyFromSubscription = (subscription, fallbackPlanKey) => {
  const metadataPlanKey = subscription?.metadata?.planKey;

  if (metadataPlanKey && JOBPROOF_PLANS[metadataPlanKey]) {
    return metadataPlanKey;
  }

  const priceId = getSubscriptionPriceId(subscription);
  const mappedPlanKey = priceId ? stripePriceToPlanKey[priceId] : null;

  return mappedPlanKey || fallbackPlanKey || PLAN_KEYS.FREE_TRIAL;
};

const findCompany = async ({
  supabase,
  companyId,
  stripeCustomerId,
  stripeSubscriptionId,
}) => {
  if (companyId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data;
    }
  }

  if (stripeSubscriptionId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("stripe_subscription_id", stripeSubscriptionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data;
    }
  }

  if (stripeCustomerId) {
    const { data, error } = await supabase
      .from("companies")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data?.id) {
      return data;
    }
  }

  return null;
};

const updateCompanyBilling = async ({ supabase, companyId, updates }) => {
  const { error } = await supabase
    .from("companies")
    .update({
      ...updates,
      billing_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", companyId);

  if (error) {
    throw error;
  }
};

const getCustomerId = (stripeObject) => {
  const customer = stripeObject?.customer;
  return typeof customer === "string" ? customer : customer?.id || null;
};

const getSubscriptionId = (stripeObject) => {
  const subscription = stripeObject?.subscription;
  return typeof subscription === "string"
    ? subscription
    : subscription?.id || null;
};

const handleSubscription = async ({
  supabase,
  subscription,
  fallbackCompanyId,
  fallbackPlanKey,
  billingEmail,
}) => {
  const stripeCustomerId = getCustomerId(subscription);
  const stripeSubscriptionId = subscription.id;

  const company = await findCompany({
    supabase,
    companyId: subscription.metadata?.companyId || fallbackCompanyId,
    stripeCustomerId,
    stripeSubscriptionId,
  });

  if (!company?.id) {
    console.warn("Stripe webhook skipped: company not found.", {
      stripeCustomerId,
      stripeSubscriptionId,
    });
    return;
  }

  const updates = {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan_key: getPlanKeyFromSubscription(subscription, fallbackPlanKey),
    subscription_status: normalizeSubscriptionStatus(subscription.status),
  };

  if (billingEmail) {
    updates.billing_email = billingEmail;
  }

  await updateCompanyBilling({
    supabase,
    companyId: company.id,
    updates,
  });
};

const handleCheckoutCompleted = async ({ stripe, supabase, session }) => {
  if (session.mode !== "subscription" || !session.subscription) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    getSubscriptionId(session)
  );

  await handleSubscription({
    supabase,
    subscription,
    fallbackCompanyId: session.client_reference_id || session.metadata?.companyId,
    fallbackPlanKey: session.metadata?.planKey,
    billingEmail: session.customer_details?.email || session.customer_email,
  });
};

const handleSubscriptionDeleted = async ({ supabase, subscription }) => {
  const company = await findCompany({
    supabase,
    companyId: subscription.metadata?.companyId,
    stripeCustomerId: getCustomerId(subscription),
    stripeSubscriptionId: subscription.id,
  });

  if (!company?.id) {
    console.warn("Stripe webhook skipped subscription deletion: company not found.", {
      stripeSubscriptionId: subscription.id,
    });
    return;
  }

  await updateCompanyBilling({
    supabase,
    companyId: company.id,
    updates: {
      stripe_subscription_id: null,
      subscription_status: "inactive",
    },
  });
};

const handleInvoicePayment = async ({ stripe, supabase, invoice, status }) => {
  const subscriptionId = getSubscriptionId(invoice);

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await handleSubscription({
    supabase,
    subscription: {
      ...subscription,
      status: status || subscription.status,
    },
    billingEmail: invoice.customer_email,
  });
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw createHttpError(500, "Stripe webhook secret is not configured.");
    }

    const stripe = getStripe();
    const signature = req.headers["stripe-signature"];
    const rawBody = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted({
          stripe,
          supabase,
          session: event.data.object,
        });
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscription({
          supabase,
          subscription: event.data.object,
        });
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted({
          supabase,
          subscription: event.data.object,
        });
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePayment({
          stripe,
          supabase,
          invoice: event.data.object,
          status: "active",
        });
        break;

      case "invoice.payment_failed":
        await handleInvoicePayment({
          stripe,
          supabase,
          invoice: event.data.object,
          status: "past_due",
        });
        break;

      default:
        break;
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return res.status(error.statusCode || 400).json({
      error:
        error.message ||
        "Unable to process Stripe webhook. Please try again.",
    });
  }
}
