import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const allowedPlans = {
  starter: "Starter",
  business: "Business",
  pro: "Pro",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { priceId, planKey, companyId, customerEmail } = req.body || {};

    if (!priceId) {
      return res.status(400).json({
        error: "Missing Stripe price ID.",
      });
    }

    if (!planKey || !allowedPlans[planKey]) {
      return res.status(400).json({
        error: "Invalid plan selected.",
      });
    }

    if (!companyId) {
      return res.status(400).json({
        error: "Missing company ID.",
      });
    }

    const appUrl =
      process.env.VITE_PUBLIC_APP_URL ||
      process.env.PUBLIC_APP_URL ||
      "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: customerEmail || undefined,
      success_url: `${appUrl}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      automatic_tax: {
        enabled: false,
      },
      subscription_data: {
        metadata: {
          companyId,
          planKey,
        },
      },
      metadata: {
        companyId,
        planKey,
      },
    });

    return res.status(200).json({
      url: session.url,
    });
  } catch (error) {
    console.error("Stripe Checkout session error:", error);

    return res.status(500).json({
      error:
        error.message ||
        "Unable to create Stripe Checkout session. Please try again.",
    });
  }
}