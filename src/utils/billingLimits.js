import { supabase } from "../lib/supabaseClient";
import {
  PLAN_KEYS,
  getPlanByKey,
  hasReachedLimit,
} from "../config/plans";

const getMonthRange = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export const getCompanyPlanState = (company) => {
  const planKey = company?.plan_key || PLAN_KEYS.FREE_TRIAL;
  const plan = getPlanByKey(planKey);

  const subscriptionStatus =
    company?.subscription_status || (plan.isTrial ? "trialing" : "inactive");

  const trialEndsAt = company?.trial_ends_at || null;

  const isTrialExpired =
    plan.isTrial &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() < new Date().getTime();

  const isSubscriptionActive =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const isBillingBlocked = isTrialExpired || !isSubscriptionActive;

  return {
    planKey,
    plan,
    subscriptionStatus,
    trialEndsAt,
    isTrialExpired,
    isSubscriptionActive,
    isBillingBlocked,
  };
};

export const loadCompanyUsage = async (companyId) => {
  if (!companyId) {
    return {
      reportsUsed: 0,
      usersUsed: 0,
      clientsUsed: 0,
    };
  }

  const { startIso, endIso } = getMonthRange();

  const [reportsResult, usersResult, clientsResult] = await Promise.all([
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),

    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId),
  ]);

  if (reportsResult.error) {
    console.error("Error loading reports usage:", reportsResult.error);
  }

  if (usersResult.error) {
    console.error("Error loading users usage:", usersResult.error);
  }

  if (clientsResult.error) {
    console.error("Error loading clients usage:", clientsResult.error);
  }

  return {
    reportsUsed: reportsResult.count || 0,
    usersUsed: usersResult.count || 0,
    clientsUsed: clientsResult.count || 0,
  };
};

export const getBillingPermissions = ({ company, usage }) => {
  const planState = getCompanyPlanState(company);
  const { plan } = planState;

  const reportsUsed = usage?.reportsUsed || 0;
  const usersUsed = usage?.usersUsed || 0;
  const clientsUsed = usage?.clientsUsed || 0;

  const reportLimitReached = hasReachedLimit(
    reportsUsed,
    plan.reportsLimit
  );

  const userLimitReached = hasReachedLimit(
    usersUsed,
    plan.usersLimit
  );

  const clientLimitReached = hasReachedLimit(
    clientsUsed,
    plan.clientsLimit
  );

  const canCreateReport =
    !planState.isBillingBlocked && !reportLimitReached;

  const canInviteUser =
    !planState.isBillingBlocked && !userLimitReached;

  const canCreateClient =
    !planState.isBillingBlocked && !clientLimitReached;

  const blockedReasons = {
    billing:
      planState.isBillingBlocked
        ? planState.isTrialExpired
          ? "Your free trial has ended. Upgrade your plan to continue using JobProof."
          : "Your subscription is not active. Please update your billing to continue."
        : null,

    reports:
      reportLimitReached
        ? `You have reached the report limit for your current plan: ${plan.name}.`
        : null,

    users:
      userLimitReached
        ? `You have reached the user limit for your current plan: ${plan.name}.`
        : null,

    clients:
      clientLimitReached
        ? `You have reached the client limit for your current plan: ${plan.name}.`
        : null,
  };

  return {
    ...planState,
    reportsUsed,
    usersUsed,
    clientsUsed,
    reportLimitReached,
    userLimitReached,
    clientLimitReached,
    canCreateReport,
    canInviteUser,
    canCreateClient,
    blockedReasons,
  };
};

export const loadBillingPermissions = async (company) => {
  const companyId = company?.id;

  const usage = await loadCompanyUsage(companyId);

  return getBillingPermissions({
    company,
    usage,
  });
};

export const getLimitLabel = (used, limit, unitLabel) => {
  if (limit === null || limit === undefined) {
    return `${used} / Unlimited ${unitLabel}`;
  }

  return `${used} / ${limit} ${unitLabel}`;
};

export const getPrimaryBillingBlockReason = (billingPermissions, type) => {
  if (!billingPermissions) {
    return "Billing information is not available.";
  }

  if (billingPermissions.blockedReasons.billing) {
    return billingPermissions.blockedReasons.billing;
  }

  if (type === "reports" && billingPermissions.blockedReasons.reports) {
    return billingPermissions.blockedReasons.reports;
  }

  if (type === "users" && billingPermissions.blockedReasons.users) {
    return billingPermissions.blockedReasons.users;
  }

  if (type === "clients" && billingPermissions.blockedReasons.clients) {
    return billingPermissions.blockedReasons.clients;
  }

  return "Your current plan does not allow this action.";
};