export const PLAN_KEYS = {
  FREE_TRIAL: "free_trial",
  STARTER: "starter",
  BUSINESS: "business",
  PRO: "pro",
  ENTERPRISE: "enterprise",
};

export const JOBPROOF_PLANS = {
  [PLAN_KEYS.FREE_TRIAL]: {
    key: PLAN_KEYS.FREE_TRIAL,
    name: "Free Trial",
    price: 0,
    priceLabel: "A$0",
    billingLabel: "14 days",
    description: "Start using JobProof with the essential tools to test the workflow.",
    reportsLimit: 10,
    usersLimit: 1,
    clientsLimit: 5,
    isTrial: true,
    highlighted: false,
    badge: null,
    stripePriceId: null,
    features: [
      "14-day free trial",
      "10 reports included",
      "1 user",
      "5 clients",
      "Professional PDF reports",
      "Photo evidence upload",
    ],
  },

  [PLAN_KEYS.STARTER]: {
    key: PLAN_KEYS.STARTER,
    name: "Starter",
    price: 19,
    priceLabel: "A$19/month",
    billingLabel: "Monthly",
    description: "For solo operators or very small teams starting to digitise reports.",
    reportsLimit: 30,
    usersLimit: 2,
    clientsLimit: 25,
    isTrial: false,
    highlighted: false,
    badge: null,
    stripePriceId: "price_starter_monthly",
    features: [
      "30 reports per month",
      "2 users",
      "25 clients",
      "Professional PDF reports",
      "Client database",
      "Photo evidence upload",
    ],
  },

  [PLAN_KEYS.BUSINESS]: {
    key: PLAN_KEYS.BUSINESS,
    name: "Business",
    price: 49,
    priceLabel: "A$49/month",
    billingLabel: "Monthly",
    description: "Best option for small teams that create reports every week.",
    reportsLimit: 150,
    usersLimit: 5,
    clientsLimit: 150,
    isTrial: false,
    highlighted: true,
    badge: "Most Popular",
    stripePriceId: "price_business_monthly",
    features: [
      "150 reports per month",
      "5 users",
      "150 clients",
      "Professional PDF reports",
      "Client sharing links",
      "Activity timeline",
      "Team workflow",
    ],
  },

  [PLAN_KEYS.PRO]: {
    key: PLAN_KEYS.PRO,
    name: "Pro",
    price: 89,
    priceLabel: "A$89/month",
    billingLabel: "Monthly",
    description: "For growing teams with higher reporting volume and more staff.",
    reportsLimit: 500,
    usersLimit: 15,
    clientsLimit: null,
    isTrial: false,
    highlighted: false,
    badge: null,
    stripePriceId: "price_pro_monthly",
    features: [
      "500 reports per month",
      "15 users",
      "Unlimited clients",
      "Professional PDF reports",
      "Client sharing links",
      "Activity timeline",
      "Priority feature access",
    ],
  },

  [PLAN_KEYS.ENTERPRISE]: {
    key: PLAN_KEYS.ENTERPRISE,
    name: "Enterprise",
    price: 199,
    priceLabel: "From A$199/month",
    billingLabel: "Custom",
    description: "For companies that need custom volume, users, support or workflows.",
    reportsLimit: null,
    usersLimit: null,
    clientsLimit: null,
    isTrial: false,
    highlighted: false,
    badge: "Custom",
    stripePriceId: null,
    contactSales: true,
    features: [
      "Custom report volume",
      "Custom users",
      "Unlimited clients",
      "Priority support",
      "Custom onboarding",
      "Advanced workflow options",
    ],
  },
};

export const getPlanByKey = (planKey) => {
  return JOBPROOF_PLANS[planKey] || JOBPROOF_PLANS[PLAN_KEYS.FREE_TRIAL];
};

export const formatLimit = (limit, label) => {
  if (limit === null || limit === undefined) return `Unlimited ${label}`;
  return `${limit} ${label}`;
};

export const getUsagePercentage = (used, limit) => {
  if (!limit) return 0;
  return Math.min(Math.round((Number(used || 0) / Number(limit)) * 100), 100);
};

export const hasReachedLimit = (used, limit) => {
  if (limit === null || limit === undefined) return false;
  return Number(used || 0) >= Number(limit);
};