import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  JOBPROOF_PLANS,
  PLAN_KEYS,
  getPlanByKey,
  getUsagePercentage,
  hasReachedLimit,
} from "../config/plans";
import { loadCompanyUsage } from "../utils/billingLimits";

const Billing = () => {
  const {
    session,
    profile,
    userProfile,
    currentCompany,
    isAdmin,
    isSupervisor,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  const [usage, setUsage] = useState({
    reports: 0,
    users: 0,
    clients: 0,
  });

  const currentProfile = userProfile || profile;

  const companyId = currentCompany?.id || currentProfile?.company_id;

  const planKey = currentCompany?.plan_key || PLAN_KEYS.FREE_TRIAL;
  const currentPlan = getPlanByKey(planKey);

  const subscriptionStatus = currentCompany?.subscription_status || "trialing";

  const trialEndsAt = currentCompany?.trial_ends_at || null;

  const role = currentProfile?.role || "";

  const canManageBilling =
    Boolean(isAdmin) ||
    Boolean(isSupervisor) ||
    role === "admin" ||
    role === "supervisor";

  const trialDaysLeft = useMemo(() => {
    if (!trialEndsAt) return null;

    const today = new Date();
    const end = new Date(trialEndsAt);
    const diff = end.getTime() - today.getTime();

    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  }, [trialEndsAt]);

  const reportUsagePercent = getUsagePercentage(
    usage.reports,
    currentPlan.reportsLimit
  );

  const userUsagePercent = getUsagePercentage(
    usage.users,
    currentPlan.usersLimit
  );

  const clientUsagePercent = getUsagePercentage(
    usage.clients,
    currentPlan.clientsLimit
  );

  const getAuthHeaders = () => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      throw new Error("Your session is not ready. Please log in again.");
    }

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };
  };

  useEffect(() => {
    const loadUsage = async () => {
      if (!companyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const usageState = await loadCompanyUsage(companyId);

        setUsage({
          reports: usageState.reportsUsed,
          users: usageState.usersUsed,
          clients: usageState.clientsUsed,
        });
      } catch (error) {
        console.error("Billing usage error:", error);
        setCheckoutError(
          error.message || "Billing usage could not be loaded."
        );
      } finally {
        setLoading(false);
      }
    };

    loadUsage();
  }, [companyId]);

  const getProgressClass = (percentage) => {
    if (percentage >= 100) return "bg-danger";
    if (percentage >= 80) return "bg-warning";
    return "bg-primary";
  };

  const openUpgradeModal = (plan) => {
    setCheckoutError("");

    if (!canManageBilling) {
      setCheckoutError("Only Admins and Supervisors can manage billing.");
      return;
    }

    if (plan.contactSales) {
      window.location.href =
        "mailto:sales@jobproof.com.au?subject=JobProof Enterprise enquiry";
      return;
    }

    setSelectedPlan(plan);
  };

  const closeUpgradeModal = () => {
    if (checkoutLoading) return;

    setSelectedPlan(null);
    setCheckoutError("");
  };

  const handleContinueToCheckout = async () => {
    if (!selectedPlan) return;

    if (!selectedPlan.stripePriceId) {
      setCheckoutError("This plan is not connected to Stripe yet.");
      return;
    }

    if (!companyId) {
      setCheckoutError("Company information is missing. Please try again.");
      return;
    }

    try {
      setCheckoutLoading(true);
      setCheckoutError("");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          planKey: selectedPlan.key,
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to create Stripe Checkout session."
        );
      }

      if (!data?.url) {
        throw new Error("Stripe Checkout URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      setCheckoutError(
        error.message ||
          "Something went wrong while starting checkout. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setCheckoutLoading(true);
      setCheckoutError("");

      const response = await fetch("/api/create-customer-portal-session", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          companyId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to create Stripe Customer Portal session."
        );
      }

      if (!data?.url) {
        throw new Error("Stripe Customer Portal URL was not returned.");
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("Customer portal error:", error);
      setCheckoutError(
        error.message ||
          "Stripe Customer Portal could not be opened. Please try again."
      );
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="jp-billing-page">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading billing</span>
          </div>
          <h1 className="h5">Loading billing</h1>
        </div>
      </section>
    );
  }

  return (
    <section className="jp-billing-page">
      <style>{`
        .jp-billing-page {
          color: #0f172a;
        }

        .jp-billing-hero {
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 28px;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.16), transparent 36%),
            linear-gradient(135deg, #ffffff 0%, #f8fafc 46%, #eef4ff 100%);
          padding: 32px;
          box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08);
          margin-bottom: 24px;
        }

        .jp-billing-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.1);
          color: #1d4ed8;
          font-size: 0.78rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 14px;
        }

        .jp-billing-title {
          font-size: clamp(2rem, 4vw, 3.4rem);
          font-weight: 900;
          letter-spacing: -0.05em;
          margin-bottom: 12px;
        }

        .jp-billing-subtitle {
          max-width: 760px;
          color: #64748b;
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 0;
        }

        .jp-current-card {
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 24px;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          height: 100%;
        }

        .jp-current-plan-name {
          font-size: 1.6rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 4px;
        }

        .jp-status-pill {
          display: inline-flex;
          align-items: center;
          padding: 7px 11px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          background: rgba(22, 163, 74, 0.12);
          color: #15803d;
        }

        .jp-status-pill.warning {
          background: rgba(245, 158, 11, 0.14);
          color: #b45309;
        }

        .jp-status-pill.danger {
          background: rgba(220, 38, 38, 0.12);
          color: #b91c1c;
        }

        .jp-usage-card {
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 20px;
          background: #f8fafc;
          padding: 18px;
        }

        .jp-usage-label {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 0.88rem;
          font-weight: 800;
          color: #334155;
          margin-bottom: 9px;
        }

        .jp-progress {
          height: 9px;
          border-radius: 999px;
          background: #e2e8f0;
          overflow: hidden;
        }

        .jp-progress > div {
          height: 100%;
          border-radius: inherit;
        }

        .jp-plan-card {
          position: relative;
          height: 100%;
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 26px;
          background: #ffffff;
          padding: 24px;
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.06);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
        }

        .jp-plan-card:hover {
          transform: translateY(-4px);
          border-color: rgba(37, 99, 235, 0.45);
          box-shadow: 0 26px 70px rgba(15, 23, 42, 0.1);
        }

        .jp-plan-card.highlighted {
          border: 2px solid rgba(37, 99, 235, 0.86);
          box-shadow: 0 28px 80px rgba(37, 99, 235, 0.16);
        }

        .jp-plan-badge {
          position: absolute;
          top: 18px;
          right: 18px;
          padding: 7px 10px;
          border-radius: 999px;
          background: #2563eb;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .jp-plan-name {
          font-size: 1.35rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 6px;
        }

        .jp-plan-price {
          font-size: 2rem;
          font-weight: 950;
          letter-spacing: -0.06em;
          margin-bottom: 4px;
        }

        .jp-plan-desc {
          color: #64748b;
          font-size: 0.93rem;
          line-height: 1.55;
          min-height: 72px;
        }

        .jp-plan-limit {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          font-size: 0.9rem;
        }

        .jp-plan-limit span:first-child {
          color: #64748b;
          font-weight: 700;
        }

        .jp-plan-limit span:last-child {
          color: #0f172a;
          font-weight: 900;
        }

        .jp-feature-list {
          list-style: none;
          padding: 0;
          margin: 18px 0 0;
        }

        .jp-feature-list li {
          display: flex;
          gap: 9px;
          color: #334155;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }

        .jp-feature-list li::before {
          content: "✓";
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(22, 163, 74, 0.12);
          color: #15803d;
          font-weight: 900;
          font-size: 0.78rem;
        }

        .jp-billing-note {
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 22px;
          background: #ffffff;
          padding: 20px;
          color: #64748b;
          font-size: 0.94rem;
          line-height: 1.65;
        }

        .jp-upgrade-backdrop {
          position: fixed;
          inset: 0;
          z-index: 2000;
          background: rgba(15, 23, 42, 0.58);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
        }

        .jp-upgrade-modal {
          width: min(560px, 100%);
          border-radius: 28px;
          background: #ffffff;
          box-shadow: 0 40px 120px rgba(15, 23, 42, 0.28);
          overflow: hidden;
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .jp-upgrade-modal-header {
          padding: 26px;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.18), transparent 34%),
            linear-gradient(135deg, #f8fafc, #ffffff);
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
        }

        .jp-upgrade-modal-title {
          font-size: 1.65rem;
          font-weight: 950;
          letter-spacing: -0.05em;
          margin-bottom: 4px;
        }

        .jp-upgrade-modal-price {
          font-size: 2.35rem;
          font-weight: 950;
          letter-spacing: -0.06em;
          color: #1d4ed8;
          margin-bottom: 0;
        }

        .jp-upgrade-modal-body {
          padding: 26px;
        }

        .jp-upgrade-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .jp-upgrade-summary-card {
          border: 1px solid rgba(148, 163, 184, 0.28);
          border-radius: 18px;
          background: #f8fafc;
          padding: 14px;
        }

        .jp-upgrade-summary-card span {
          display: block;
          color: #64748b;
          font-size: 0.72rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 5px;
        }

        .jp-upgrade-summary-card strong {
          display: block;
          color: #0f172a;
          font-size: 0.98rem;
          font-weight: 950;
        }

        .jp-upgrade-secure {
          border-radius: 18px;
          background: #eff6ff;
          color: #1e3a8a;
          padding: 15px;
          font-size: 0.92rem;
          line-height: 1.55;
          margin-bottom: 18px;
        }

        .jp-upgrade-error {
          border-radius: 18px;
          background: #fff1f2;
          color: #be123c;
          padding: 14px;
          font-size: 0.9rem;
          font-weight: 700;
          margin-bottom: 18px;
        }

        .jp-upgrade-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 20px 26px 26px;
        }

        .jp-upgrade-modal-footer .btn {
          border-radius: 999px;
          font-weight: 850;
          padding-left: 18px;
          padding-right: 18px;
        }

        @media (max-width: 768px) {
          .jp-billing-hero {
            padding: 24px;
            border-radius: 22px;
          }

          .jp-current-card,
          .jp-plan-card {
            border-radius: 22px;
          }

          .jp-upgrade-summary {
            grid-template-columns: 1fr;
          }

          .jp-upgrade-modal-footer {
            flex-direction: column-reverse;
          }

          .jp-upgrade-modal-footer .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="jp-billing-hero">
        <div className="jp-billing-eyebrow">Billing & subscription</div>
        <h1 className="jp-billing-title">Manage your JobProof plan</h1>
        <p className="jp-billing-subtitle">
          Choose the right plan for your reporting volume, team size and client
          database. Billing is managed at company level, so every user inside
          the same company shares the same plan limits.
        </p>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-lg-5">
          <div className="jp-current-card">
            <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
              <div>
                <p className="text-muted fw-bold mb-1">Current plan</p>
                <h2 className="jp-current-plan-name">{currentPlan.name}</h2>
                <p className="text-muted mb-0">{currentPlan.priceLabel}</p>
              </div>

              <span
                className={`jp-status-pill ${
                  subscriptionStatus === "past_due" ? "warning" : ""
                } ${subscriptionStatus === "inactive" ? "danger" : ""}`}
              >
                {subscriptionStatus}
              </span>
            </div>

            {trialDaysLeft !== null && (
              <div className="alert alert-primary border-0 rounded-4 mb-4">
                <strong>{trialDaysLeft} days left</strong> in your free trial.
              </div>
            )}

            <div className="d-grid gap-3">
              <div className="jp-usage-card">
                <div className="jp-usage-label">
                  <span>Reports used</span>
                  <span>
                    {usage.reports} /{" "}
                    {currentPlan.reportsLimit === null
                      ? "Unlimited"
                      : currentPlan.reportsLimit}
                  </span>
                </div>
                <div className="jp-progress">
                  <div
                    className={getProgressClass(reportUsagePercent)}
                    style={{ width: `${reportUsagePercent}%` }}
                  />
                </div>
              </div>

              <div className="jp-usage-card">
                <div className="jp-usage-label">
                  <span>Users used</span>
                  <span>
                    {usage.users} /{" "}
                    {currentPlan.usersLimit === null
                      ? "Unlimited"
                      : currentPlan.usersLimit}
                  </span>
                </div>
                <div className="jp-progress">
                  <div
                    className={getProgressClass(userUsagePercent)}
                    style={{ width: `${userUsagePercent}%` }}
                  />
                </div>
              </div>

              <div className="jp-usage-card">
                <div className="jp-usage-label">
                  <span>Clients used</span>
                  <span>
                    {usage.clients} /{" "}
                    {currentPlan.clientsLimit === null
                      ? "Unlimited"
                      : currentPlan.clientsLimit}
                  </span>
                </div>
                <div className="jp-progress">
                  <div
                    className={getProgressClass(clientUsagePercent)}
                    style={{ width: `${clientUsagePercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-4">
              <Link to="/reports" className="btn btn-outline-secondary">
                View reports
              </Link>
              <Link to="/clients" className="btn btn-outline-secondary">
                View clients
              </Link>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-7">
          <div className="jp-current-card">
            <h3 className="h5 fw-bold mb-3">Plan controls</h3>

            {!canManageBilling ? (
              <div className="alert alert-warning border-0 rounded-4 mb-0">
                Only Admins and Supervisors can manage billing.
              </div>
            ) : (
              <>
                <p className="text-muted mb-3">
                  Choose a plan and continue to Stripe Checkout to complete the
                  subscription securely. Billing is linked to your company, not
                  to an individual report.
                </p>

                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => openUpgradeModal(JOBPROOF_PLANS.business)}
                  >
                    Upgrade plan
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleManageBilling}
                    disabled={checkoutLoading}
                  >
                    Manage billing
                  </button>
                </div>

                {checkoutError && !selectedPlan && (
                  <div className="jp-upgrade-error mt-4 mb-0">
                    {checkoutError}
                  </div>
                )}

                {(hasReachedLimit(
                  usage.reports,
                  currentPlan.reportsLimit
                ) ||
                  hasReachedLimit(usage.users, currentPlan.usersLimit) ||
                  hasReachedLimit(
                    usage.clients,
                    currentPlan.clientsLimit
                  )) && (
                  <div className="alert alert-danger border-0 rounded-4 mt-4 mb-0">
                    You have reached one of your plan limits. Upgrade will be
                    required to continue using that feature.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {Object.values(JOBPROOF_PLANS).map((plan) => {
          const isCurrent = plan.key === currentPlan.key;

          return (
            <div className="col-12 col-md-6 col-xl-4" key={plan.key}>
              <div
                className={`jp-plan-card ${
                  plan.highlighted ? "highlighted" : ""
                }`}
              >
                {plan.badge && <div className="jp-plan-badge">{plan.badge}</div>}

                <h3 className="jp-plan-name">{plan.name}</h3>
                <div className="jp-plan-price">{plan.priceLabel}</div>
                <p className="text-muted fw-bold mb-3">{plan.billingLabel}</p>
                <p className="jp-plan-desc">{plan.description}</p>

                <div className="my-3">
                  <div className="jp-plan-limit">
                    <span>Reports</span>
                    <span>
                      {plan.reportsLimit === null
                        ? "Custom"
                        : plan.isTrial
                        ? `${plan.reportsLimit} total`
                        : `${plan.reportsLimit}/month`}
                    </span>
                  </div>

                  <div className="jp-plan-limit">
                    <span>Users</span>
                    <span>
                      {plan.usersLimit === null ? "Custom" : plan.usersLimit}
                    </span>
                  </div>

                  <div className="jp-plan-limit">
                    <span>Clients</span>
                    <span>
                      {plan.clientsLimit === null
                        ? "Unlimited"
                        : plan.clientsLimit}
                    </span>
                  </div>
                </div>

                <ul className="jp-feature-list">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <div className="d-grid mt-4">
                  <button
                    type="button"
                    className={`btn ${
                      plan.highlighted ? "btn-primary" : "btn-outline-primary"
                    }`}
                    disabled={isCurrent || !canManageBilling}
                    onClick={() => openUpgradeModal(plan)}
                  >
                    {isCurrent
                      ? "Current plan"
                      : plan.contactSales
                      ? "Contact sales"
                      : "Choose plan"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="jp-billing-note">
        <strong>Next step:</strong> connect the backend API routes for Stripe
        Checkout, Stripe Customer Portal and Stripe Webhooks. Once connected,
        plan changes will update the company subscription automatically.
      </div>

      {selectedPlan && (
        <div className="jp-upgrade-backdrop" role="dialog" aria-modal="true">
          <div className="jp-upgrade-modal">
            <div className="jp-upgrade-modal-header">
              <p className="jp-billing-eyebrow mb-3">Secure checkout</p>
              <h2 className="jp-upgrade-modal-title">
                Upgrade to {selectedPlan.name}
              </h2>
              <p className="jp-upgrade-modal-price">
                {selectedPlan.priceLabel}
              </p>
            </div>

            <div className="jp-upgrade-modal-body">
              <div className="jp-upgrade-summary">
                <div className="jp-upgrade-summary-card">
                  <span>Reports</span>
                  <strong>
                    {selectedPlan.reportsLimit === null
                      ? "Custom"
                      : selectedPlan.isTrial
                      ? `${selectedPlan.reportsLimit} total`
                      : `${selectedPlan.reportsLimit}/month`}
                  </strong>
                </div>

                <div className="jp-upgrade-summary-card">
                  <span>Users</span>
                  <strong>
                    {selectedPlan.usersLimit === null
                      ? "Custom"
                      : selectedPlan.usersLimit}
                  </strong>
                </div>

                <div className="jp-upgrade-summary-card">
                  <span>Clients</span>
                  <strong>
                    {selectedPlan.clientsLimit === null
                      ? "Unlimited"
                      : selectedPlan.clientsLimit}
                  </strong>
                </div>
              </div>

              <div className="jp-upgrade-secure">
                You will be redirected to Stripe Checkout to complete your
                subscription securely. Your card details are processed by Stripe,
                not stored inside JobProof.
              </div>

              {checkoutError && (
                <div className="jp-upgrade-error">{checkoutError}</div>
              )}

              <ul className="jp-feature-list">
                {selectedPlan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <div className="jp-upgrade-modal-footer">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={closeUpgradeModal}
                disabled={checkoutLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleContinueToCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading
                  ? "Starting checkout..."
                  : "Continue to secure checkout"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Billing;
