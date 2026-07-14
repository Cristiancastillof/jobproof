import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { supabase } from "../lib/supabaseClient";

const formatRoleLabel = (role) => {
  if (!role) return "User";

  const roleMap = {
    admin: "Admin",
    supervisor: "Supervisor",
    worker: "Worker",
  };

  return roleMap[role] || role.charAt(0).toUpperCase() + role.slice(1);
};

const getInitials = (nameOrEmail) => {
  if (!nameOrEmail) return "U";

  const cleanValue = String(nameOrEmail).trim();

  const parts = cleanValue
    .replace(/@.*/, "")
    .split(" ")
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return cleanValue.slice(0, 2).toUpperCase();
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, displayName } = useAuth();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAuthenticated = Boolean(user);
  const role = profile?.role || "";
  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const canManageWorkspace = isAdmin || isSupervisor;
  const authenticatedNavLinks = [
    {
      to: "/",
      label: "Dashboard",
      mobileLabel: "Home",
      icon: "H",
      end: true,
    },
    {
      to: "/reports",
      label: "Reports",
      mobileLabel: "Reports",
      icon: "R",
    },
    {
      to: "/create-report",
      label: "Create Report",
      mobileLabel: "Create",
      icon: "+",
      isCreate: true,
    },
    ...(canManageWorkspace
      ? [
          {
            to: "/clients",
            label: "Clients",
            mobileLabel: "Clients",
            icon: "C",
          },
          {
            to: "/team",
            label: "Team",
            mobileLabel: "Team",
            icon: "T",
          },
          {
            to: "/business-profile",
            label: "Business Profile",
            mobileLabel: "Profile",
            icon: "P",
          },
          {
            to: "/billing",
            label: "Billing",
            mobileLabel: "Billing",
            icon: "B",
          },
        ]
      : []),
  ];
  const publicNavLinks = [
    {
      to: "/",
      label: "Home",
      mobileLabel: "Home",
      icon: "H",
      end: true,
    },
  ];
  const navLinks = isAuthenticated ? authenticatedNavLinks : publicNavLinks;

  const userName =
    displayName ||
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    "JobProof user";

  const userEmail = user?.email || "";
  const roleLabel = formatRoleLabel(role);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
      setIsMenuOpen(false);
    }
  };

  const getNavLinkClass = ({ isActive }) =>
    isActive ? "jp2-nav-link active" : "jp2-nav-link";

  const getMobileNavLinkClass = (link, isActive) => {
    const classes = ["jp2-mobile-nav-link"];

    if (link.isCreate) {
      classes.push("create");
    }

    if (isActive) {
      classes.push("active");
    }

    return classes.join(" ");
  };

  return (
    <>
      <style>
        {`
          .jp2-navbar-shell {
            position: sticky;
            top: 0;
            z-index: 1040;
            background: rgba(248, 250, 252, 0.96);
            border-bottom: 1px solid rgba(15, 23, 42, 0.08);
            backdrop-filter: blur(18px);
          }

          .jp2-navbar {
            width: 100%;
            max-width: 1440px;
            margin: 0 auto;
            padding: 12px 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
          }

          .jp2-brand {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #0f172a;
            text-decoration: none;
            flex: 0 0 auto;
            min-width: 185px;
          }

          .jp2-brand:hover {
            color: #0f172a;
          }

          .jp2-brand-mark {
            width: 42px;
            height: 42px;
            flex: 0 0 42px;
            border-radius: 15px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            background: linear-gradient(135deg, #1e40af, #0f172a);
            box-shadow: 0 12px 24px rgba(30, 64, 175, 0.28);
          }

          .jp2-brand-check {
            width: 22px;
            height: 22px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.22);
            font-size: 0.9rem;
            font-weight: 950;
            line-height: 1;
          }

          .jp2-brand-text {
            display: flex;
            flex-direction: column;
            line-height: 1.05;
            min-width: 0;
          }

          .jp2-brand-text strong {
            font-size: 1rem;
            font-weight: 950;
            letter-spacing: -0.03em;
            white-space: nowrap;
          }

          .jp2-brand-text small {
            margin-top: 3px;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            white-space: nowrap;
          }

          .jp2-menu-toggle {
            display: none;
            width: 44px;
            height: 44px;
            border: 1px solid rgba(15, 23, 42, 0.12);
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
            padding: 0;
          }

          .jp2-menu-toggle span {
            display: block;
            width: 18px;
            height: 2px;
            margin: 4px auto;
            border-radius: 999px;
            background: #0f172a;
            transition: transform 0.2s ease, opacity 0.2s ease;
          }

          .jp2-menu-toggle.open span:nth-child(1) {
            transform: translateY(6px) rotate(45deg);
          }

          .jp2-menu-toggle.open span:nth-child(2) {
            opacity: 0;
          }

          .jp2-menu-toggle.open span:nth-child(3) {
            transform: translateY(-6px) rotate(-45deg);
          }

          .jp2-nav-panel {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            min-width: 0;
          }

          .jp2-nav-links {
            flex: 1 1 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 0;
          }

          .jp2-nav-link {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 36px;
            padding: 8px 10px;
            border-radius: 999px;
            color: #475569;
            text-decoration: none;
            font-size: 0.84rem;
            font-weight: 850;
            white-space: nowrap;
          }

          .jp2-nav-link:hover {
            color: #1e40af;
            background: rgba(30, 64, 175, 0.08);
          }

          .jp2-nav-link.active {
            color: #1e40af;
            background: #eff6ff;
          }

          .jp2-user-area {
            flex: 0 0 auto;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .jp2-user-card {
            display: flex;
            align-items: center;
            gap: 9px;
            min-width: 0;
            max-width: 290px;
            padding: 7px 8px;
            border-radius: 18px;
            background: #ffffff;
            border: 1px solid rgba(15, 23, 42, 0.08);
            box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
          }

          .jp2-user-avatar {
            width: 34px;
            height: 34px;
            flex: 0 0 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            color: #ffffff;
            background: #0f172a;
            font-size: 0.78rem;
            font-weight: 950;
            letter-spacing: -0.03em;
          }

          .jp2-user-meta {
            min-width: 0;
            display: flex;
            flex-direction: column;
            line-height: 1.1;
          }

          .jp2-user-meta strong {
            max-width: 135px;
            color: #0f172a;
            font-size: 0.82rem;
            font-weight: 900;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp2-user-meta small {
            max-width: 135px;
            margin-top: 3px;
            color: #64748b;
            font-size: 0.68rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .jp2-role-badge {
            flex: 0 0 auto;
            display: inline-flex;
            align-items: center;
            padding: 5px 8px;
            border-radius: 999px;
            color: #334155;
            background: #f1f5f9;
            border: 1px solid rgba(15, 23, 42, 0.08);
            font-size: 0.66rem;
            font-weight: 950;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            white-space: nowrap;
          }

          .jp2-role-badge.admin {
            color: #1e40af;
            background: #eff6ff;
            border-color: rgba(30, 64, 175, 0.18);
          }

          .jp2-role-badge.supervisor {
            color: #92400e;
            background: #fffbeb;
            border-color: rgba(245, 158, 11, 0.22);
          }

          .jp2-role-badge.worker {
            color: #166534;
            background: #f0fdf4;
            border-color: rgba(22, 101, 52, 0.18);
          }

          .jp2-logout-btn {
            min-width: 86px;
            min-height: 38px;
            border-radius: 999px;
            font-size: 0.82rem;
            font-weight: 850;
            white-space: nowrap;
            padding-left: 14px;
            padding-right: 14px;
          }

          .jp2-auth-actions {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .jp2-auth-actions .btn {
            border-radius: 999px;
            font-weight: 850;
            white-space: nowrap;
          }

          .jp2-mobile-nav-drawer {
            display: none;
          }

          .jp2-mobile-nav-tab,
          .jp2-mobile-nav-link {
            -webkit-tap-highlight-color: transparent;
          }

          .jp2-mobile-nav-tab {
            border: 0;
            font: inherit;
          }

          .jp2-mobile-tab-grip {
            width: 30px;
            height: 4px;
            border-radius: 999px;
            background: currentColor;
            opacity: 0.5;
          }

          .jp2-mobile-tab-label {
            color: rgba(255, 255, 255, 0.78);
            font-size: 0.72rem;
            font-weight: 950;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }

          .jp2-mobile-nav-panel {
            width: 100%;
            max-height: 0;
            margin-top: 8px;
            overflow: hidden;
            opacity: 0;
            pointer-events: none;
            transform: translateY(18px) scale(0.98);
            visibility: hidden;
          }

          .jp2-mobile-nav-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(62px, 1fr));
            gap: 5px;
          }

          .jp2-mobile-nav-link {
            min-width: 0;
            min-height: 58px;
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            border-radius: 16px;
            color: #64748b;
            text-decoration: none;
            font-size: 0.68rem;
            font-weight: 950;
            line-height: 1.05;
            text-align: center;
          }

          .jp2-mobile-nav-link:hover {
            color: #1e40af;
          }

          .jp2-mobile-nav-link.active {
            color: #1e40af;
            background: #eff6ff;
          }

          .jp2-mobile-nav-link.create {
            position: relative;
            top: -18px;
            min-height: 70px;
            color: #ffffff;
            background: #1d4ed8;
            box-shadow: 0 16px 28px rgba(29, 78, 216, 0.3);
          }

          .jp2-mobile-nav-link.create.active {
            color: #ffffff;
            background: #1d4ed8;
          }

          .jp2-mobile-nav-icon {
            display: block;
            font-size: 1.05rem;
            line-height: 1;
          }

          .jp2-mobile-nav-link.create .jp2-mobile-nav-icon {
            font-size: 1.45rem;
          }

          .jp2-mobile-account {
            display: grid;
            gap: 10px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
          }

          .jp2-mobile-user-card {
            min-width: 0;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-radius: 16px;
            background: #f8fafc;
            border: 1px solid rgba(15, 23, 42, 0.06);
          }

          .jp2-mobile-user-card .jp2-user-meta {
            flex: 1 1 auto;
          }

          .jp2-mobile-logout {
            width: 100%;
            min-height: 42px;
            border-radius: 14px;
            font-weight: 900;
          }

          .jp2-mobile-auth-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(15, 23, 42, 0.08);
          }

          .jp2-mobile-auth-actions .btn {
            min-height: 42px;
            border-radius: 14px;
            font-weight: 900;
          }

          @media (max-width: 1200px) {
            .jp2-navbar {
              max-width: 100%;
              padding-left: 16px;
              padding-right: 16px;
              gap: 12px;
            }

            .jp2-brand {
              min-width: 165px;
            }

            .jp2-nav-link {
              font-size: 0.8rem;
              padding-left: 8px;
              padding-right: 8px;
            }

            .jp2-user-card {
              max-width: 245px;
            }

            .jp2-user-meta strong,
            .jp2-user-meta small {
              max-width: 105px;
            }
          }

          @media (max-width: 991px) {
            .jp2-navbar {
              padding: 12px 14px;
            }

            .jp2-brand {
              min-width: 0;
            }

            .jp2-menu-toggle {
              display: inline-block;
            }

            .jp2-nav-panel {
              position: absolute;
              left: 12px;
              right: 12px;
              top: 72px;
              display: none;
              flex-direction: column;
              align-items: stretch;
              gap: 16px;
              padding: 16px;
              border-radius: 24px;
              background: rgba(255, 255, 255, 0.98);
              border: 1px solid rgba(15, 23, 42, 0.1);
              box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
              backdrop-filter: blur(18px);
            }

            .jp2-nav-panel.open {
              display: flex;
            }

            .jp2-nav-links {
              width: 100%;
              margin-left: 0;
              display: grid;
              grid-template-columns: 1fr;
              gap: 8px;
            }

            .jp2-nav-link {
              width: 100%;
              min-height: 46px;
              justify-content: flex-start;
              padding: 10px 14px;
              border-radius: 16px;
              color: #334155;
              background: #f8fafc;
              border: 1px solid rgba(15, 23, 42, 0.06);
              font-size: 0.9rem;
            }

            .jp2-nav-link.active {
              color: #1e40af;
              background: #eff6ff;
              border-color: rgba(30, 64, 175, 0.18);
            }

            .jp2-user-area {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
              padding-top: 14px;
              border-top: 1px solid rgba(15, 23, 42, 0.08);
            }

            .jp2-user-card {
              width: 100%;
              max-width: 100%;
              align-items: center;
              padding: 12px;
              border-radius: 18px;
            }

            .jp2-user-meta {
              flex: 1;
            }

            .jp2-user-meta strong,
            .jp2-user-meta small {
              max-width: 100%;
            }

            .jp2-role-badge {
              margin-left: auto;
            }

            .jp2-logout-btn {
              width: 100%;
              min-height: 44px;
            }

            .jp2-auth-actions {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
              padding-top: 14px;
              border-top: 1px solid rgba(15, 23, 42, 0.08);
            }

            .jp2-auth-actions .btn {
              width: 100%;
              min-height: 44px;
            }

            .app-container {
              padding-bottom: calc(82px + env(safe-area-inset-bottom));
            }

            .jp2-menu-toggle {
              display: none;
            }

            .jp2-nav-panel,
            .jp2-nav-panel.open {
              display: none;
            }

            .jp2-mobile-nav-drawer {
              position: fixed;
              left: max(12px, env(safe-area-inset-left));
              right: max(12px, env(safe-area-inset-right));
              bottom: max(12px, env(safe-area-inset-bottom));
              z-index: 1050;
              display: grid;
              justify-items: center;
              pointer-events: none;
            }

            .jp2-mobile-nav-tab {
              width: min(176px, 58vw);
              min-height: 46px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 9px;
              padding: 0 16px;
              border: 1px solid rgba(15, 23, 42, 0.08);
              border-radius: 999px;
              color: #ffffff;
              background: #0f172a;
              box-shadow: 0 18px 38px rgba(15, 23, 42, 0.24);
              pointer-events: auto;
              transition:
                width 180ms ease,
                min-height 180ms ease,
                border-radius 180ms ease,
                background 180ms ease,
                color 180ms ease,
                transform 180ms ease;
            }

            .jp2-mobile-nav-panel {
              padding: 0;
              border: 1px solid rgba(217, 225, 236, 0.96);
              border-radius: 22px;
              background: rgba(255, 255, 255, 0.97);
              box-shadow: 0 18px 44px rgba(15, 23, 42, 0.18);
              backdrop-filter: blur(18px);
              transition:
                max-height 180ms ease,
                opacity 180ms ease,
                padding 180ms ease,
                transform 180ms ease,
                visibility 180ms ease;
            }

            .jp2-mobile-nav-drawer.open .jp2-mobile-nav-tab {
              width: 118px;
              min-height: 34px;
              border-color: rgba(217, 225, 236, 0.96);
              border-bottom-color: transparent;
              border-radius: 16px 16px 8px 8px;
              color: #1d4ed8;
              background: rgba(255, 255, 255, 0.97);
              box-shadow: 0 -6px 18px rgba(15, 23, 42, 0.08);
              transform: translateY(9px);
            }

            .jp2-mobile-nav-drawer.open .jp2-mobile-tab-label {
              color: #1d4ed8;
            }

            .jp2-mobile-nav-drawer.open .jp2-mobile-nav-panel {
              max-height: min(74vh, 480px);
              overflow: visible;
              opacity: 1;
              padding: 8px;
              pointer-events: auto;
              transform: translateY(0) scale(1);
              visibility: visible;
            }
          }

          @media (max-width: 380px) {
            .jp2-brand-text small {
              display: none;
            }

            .jp2-brand-mark {
              width: 38px;
              height: 38px;
              border-radius: 13px;
            }
          }
        `}
      </style>

      <header className="jp2-navbar-shell">
        <nav className="jp2-navbar">
          <Link
            to="/"
            className="jp2-brand"
            onClick={() => setIsMenuOpen(false)}
          >
            <span className="jp2-brand-mark">
              <span className="jp2-brand-check">✓</span>
            </span>

            <span className="jp2-brand-text">
              <strong>JobProof</strong>
              <small>Field reports</small>
            </span>
          </Link>

          <button
            type="button"
            className={isMenuOpen ? "jp2-menu-toggle open" : "jp2-menu-toggle"}
            onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            <span />
            <span />
            <span />
          </button>

          <div className={isMenuOpen ? "jp2-nav-panel open" : "jp2-nav-panel"}>
            <div className="jp2-nav-links">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={getNavLinkClass}
                  end={link.end}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>

            {isAuthenticated ? (
              <div className="jp2-user-area">
                <div className="jp2-user-card">
                  <div className="jp2-user-avatar">{getInitials(userName)}</div>

                  <div className="jp2-user-meta">
                    <strong>{userName}</strong>
                    {userEmail && <small>{userEmail}</small>}
                  </div>

                  <span className={`jp2-role-badge ${role || "user"}`}>
                    {roleLabel}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-outline-danger jp2-logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Log out"}
                </button>
              </div>
            ) : (
              <div className="jp2-auth-actions">
                <Link to="/login" className="btn btn-outline-primary">
                  Log in
                </Link>

                <Link to="/register" className="btn btn-primary">
                  Get started
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      <div
        className={
          isMenuOpen
            ? "jp2-mobile-nav-drawer open"
            : "jp2-mobile-nav-drawer"
        }
      >
        <button
          type="button"
          className="jp2-mobile-nav-tab"
          onClick={() => setIsMenuOpen((currentValue) => !currentValue)}
          aria-label="Toggle navigation menu"
          aria-expanded={isMenuOpen}
          aria-controls="jp2-mobile-nav-panel"
        >
          <span className="jp2-mobile-tab-grip" aria-hidden="true" />
          <span className="jp2-mobile-tab-label">MENU</span>
        </button>

        <div id="jp2-mobile-nav-panel" className="jp2-mobile-nav-panel">
          <div className="jp2-mobile-nav-grid">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  getMobileNavLinkClass(link, isActive)
                }
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="jp2-mobile-nav-icon" aria-hidden="true">
                  {link.icon}
                </span>
                <span>{link.mobileLabel}</span>
              </NavLink>
            ))}
          </div>

          {isAuthenticated ? (
            <div className="jp2-mobile-account">
              <div className="jp2-mobile-user-card">
                <div className="jp2-user-avatar">{getInitials(userName)}</div>

                <div className="jp2-user-meta">
                  <strong>{userName}</strong>
                  {userEmail && <small>{userEmail}</small>}
                </div>

                <span className={`jp2-role-badge ${role || "user"}`}>
                  {roleLabel}
                </span>
              </div>

              <button
                type="button"
                className="btn btn-outline-danger jp2-mobile-logout"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          ) : (
            <div className="jp2-mobile-auth-actions">
              <Link
                to="/login"
                className="btn btn-outline-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Log in
              </Link>

              <Link
                to="/register"
                className="btn btn-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
