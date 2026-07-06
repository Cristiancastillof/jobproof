import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getAppUrl = () => {
  return (
    process.env.VITE_PUBLIC_APP_URL ||
    process.env.PUBLIC_APP_URL ||
    "http://localhost:5173"
  ).replace(/\/+$/, "");
};

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw createHttpError(500, "Stripe is not configured on the server.");
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

const getBearerToken = (req) => {
  const authorization =
    req.headers?.authorization || req.headers?.Authorization || "";

  if (Array.isArray(authorization)) {
    return authorization[0]?.replace(/^Bearer\s+/i, "") || "";
  }

  return String(authorization).replace(/^Bearer\s+/i, "");
};

const getSupabaseClient = (accessToken) => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw createHttpError(
      500,
      "Supabase is not configured on the server."
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

const loadBillingContext = async (req, companyId) => {
  const accessToken = getBearerToken(req);

  if (!accessToken) {
    throw createHttpError(401, "Authentication is required.");
  }

  const supabase = getSupabaseClient(accessToken);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw createHttpError(401, "Your session is invalid or expired.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile || profile.active === false) {
    throw createHttpError(403, "Your profile is not active.");
  }

  if (profile.company_id !== companyId) {
    throw createHttpError(403, "You cannot manage billing for this company.");
  }

  if (!["admin", "supervisor"].includes(profile.role)) {
    throw createHttpError(
      403,
      "Only Admins and Supervisors can manage billing."
    );
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, stripe_customer_id")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    throw companyError;
  }

  if (!company) {
    throw createHttpError(404, "Company information was not found.");
  }

  return { company };
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { companyId } = req.body || {};

    if (!companyId) {
      return res.status(400).json({
        error: "Missing company ID.",
      });
    }

    const { company } = await loadBillingContext(req, companyId);

    if (!company.stripe_customer_id) {
      return res.status(400).json({
        error:
          "This company does not have a Stripe customer yet. Start checkout first.",
      });
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Customer Portal session error:", error);

    return res.status(error.statusCode || 500).json({
      error:
        error.message ||
        "Unable to create Stripe Customer Portal session. Please try again.",
    });
  }
}
