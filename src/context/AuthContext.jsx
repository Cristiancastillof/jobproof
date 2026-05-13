import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const formatRole = (role) => {
  if (!role) return "User";

  return role.charAt(0).toUpperCase() + role.slice(1);
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const createMissingProfile = async (currentUser) => {
    const fallbackFullName =
      currentUser?.user_metadata?.full_name ||
      currentUser?.email?.split("@")[0] ||
      "User";

    const fallbackEmail = currentUser?.email || "";

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: currentUser.id,
        full_name: fallbackFullName,
        email: fallbackEmail,
        role: "admin",
        active: true,
      })
      .select("id, company_id, full_name, email, role, active")
      .single();

    if (error) {
      console.error("Error creating missing profile:", error);
      return null;
    }

    return data;
  };

  const fetchProfile = async (currentUser) => {
    if (!currentUser?.id) {
      setProfile(null);
      return null;
    }

    setProfileLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, company_id, full_name, email, role, active")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
      setProfileLoading(false);
      setProfile(null);
      return null;
    }

    if (!data) {
      const newProfile = await createMissingProfile(currentUser);
      setProfile(newProfile);
      setProfileLoading(false);
      return newProfile;
    }

    setProfile(data);
    setProfileLoading(false);
    return data;
  };

  useEffect(() => {
    const getInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error getting Supabase session:", error);
      }

      const currentSession = data.session || null;
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }

      setAuthLoading(false);
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }

      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Error signing out:", error);
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const displayRole = formatRole(profile?.role);

  const value = {
    session,
    user,
    profile,
    authLoading,
    profileLoading,
    isAuthenticated: Boolean(user),
    displayName,
    displayRole,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};