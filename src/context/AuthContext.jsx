import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const roleLabels = {
  admin: "Admin",
  supervisor: "Supervisor",
  worker: "Worker",
};

const getUserDisplayName = (user, profile) => {
  if (profile?.full_name) return profile.full_name;
  if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user?.email) return user.email.split("@")[0];

  return "User";
};

const getRoleLabel = (profile) => {
  if (!profile?.role) return "User";

  return roleLabels[profile.role] || "User";
};

const COMPANY_FIELDS = `
  id,
  owner_id,
  business_name,
  business_email,
  business_phone,
  business_logo_url,
  plan_key,
  subscription_status,
  trial_started_at,
  trial_ends_at,
  stripe_customer_id,
  stripe_subscription_id,
  billing_email,
  billing_updated_at,
  created_at,
  updated_at
`;

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [currentCompany, setCurrentCompany] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const createMissingAdminProfile = useCallback(async (currentUser) => {
    const fullName =
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split("@")[0] ||
      "Admin user";

    const { data, error } = await supabase.rpc(
      "create_admin_profile_for_current_user",
      {
        full_name_input: fullName,
      }
    );

    if (error) {
      throw error;
    }

    return data;
  }, []);

  const fetchCompany = useCallback(async (companyId) => {
    if (!companyId) {
      setCurrentCompany(null);
      return null;
    }

    const { data, error } = await supabase
      .from("companies")
      .select(COMPANY_FIELDS)
      .eq("id", companyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    setCurrentCompany(data || null);
    return data || null;
  }, []);

  const fetchProfile = useCallback(async (currentUser = user) => {
    if (!currentUser?.id) {
      setProfile(null);
      setCurrentCompany(null);
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          company_id,
          full_name,
          email,
          role,
          active,
          created_at,
          updated_at
        `
        )
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        const createdProfile = await createMissingAdminProfile(currentUser);
        setProfile(createdProfile);
        await fetchCompany(createdProfile?.company_id);
        return createdProfile;
      }

      setProfile(data);
      await fetchCompany(data.company_id);
      return data;
    } catch (error) {
      console.error("Error loading user profile:", error);

      setProfile(null);
      setCurrentCompany(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, [createMissingAdminProfile, fetchCompany, user]);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      setAuthLoading(true);

      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!isMounted) return;

        const currentSession = data.session || null;
        const currentUser = currentSession?.user || null;

        setSession(currentSession);
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading auth session:", error);

        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setCurrentCompany(null);
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const currentUser = newSession?.user || null;

      setSession(newSession);
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        setProfile(null);
        setCurrentCompany(null);
        setProfileLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.id) {
      setProfile(null);
      setCurrentCompany(null);
      setProfileLoading(false);
      return;
    }

    fetchProfile(user);
  }, [authLoading, fetchProfile, user]);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
    setCurrentCompany(null);
    setProfileLoading(false);
  };

  const value = useMemo(() => {
    const displayName = getUserDisplayName(user, profile);
    const displayRole = getRoleLabel(profile);
    const role = profile?.role || "";
    const isAdmin = role === "admin";
    const isSupervisor = role === "supervisor";
    const isWorker = role === "worker";

    return {
      session,
      user,
      profile,
      userProfile: profile,
      currentCompany,
      authLoading,
      profileLoading,
      isAuthenticated: Boolean(session?.user),
      isAdmin,
      isSupervisor,
      isWorker,
      displayName,
      displayRole,
      fetchCompany,
      fetchProfile,
      signOut,
    };
  }, [
    session,
    user,
    profile,
    currentCompany,
    authLoading,
    profileLoading,
    fetchCompany,
    fetchProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};

export default AuthContext;
