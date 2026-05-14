import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

const formatRole = (role) => {
  if (!role) return "User";

  return role.charAt(0).toUpperCase() + role.slice(1);
};

const getUserId = (userOrId) => {
  if (!userOrId) return null;

  if (typeof userOrId === "string") {
    return userOrId;
  }

  return userOrId.id || null;
};

const getFallbackFullName = (currentUser) => {
  return (
    currentUser?.user_metadata?.full_name ||
    currentUser?.email?.split("@")[0] ||
    "User"
  );
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const createMissingProfile = async (currentUser) => {
    if (!currentUser?.id) return null;

    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: currentUser.id,
        full_name: getFallbackFullName(currentUser),
        email: currentUser.email || "",
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

  const fetchProfile = async (userOrId) => {
    const userId = getUserId(userOrId);

    if (!userId) {
      setProfile(null);
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, company_id, full_name, email, role, active")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return null;
      }

      if (!data && typeof userOrId !== "string") {
        const newProfile = await createMissingProfile(userOrId);
        setProfile(newProfile);
        return newProfile;
      }

      setProfile(data || null);
      return data || null;
    } catch (error) {
      console.error("Unexpected profile error:", error);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting Supabase session:", error);
        }

        if (!isMounted) return;

        const currentSession = data.session || null;
        const currentUser = currentSession?.user || null;

        setSession(currentSession);
        setUser(currentUser);

        if (currentUser) {
          await fetchProfile(currentUser);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
      } catch (error) {
        console.error("Unexpected auth error:", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileLoading(false);
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const currentUser = currentSession?.user || null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }

      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
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
    setProfileLoading(false);
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