import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  // Identity
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);
  const profileCacheRef = useRef<{ userId: string; data: Profile; timestamp: number } | null>(null);

  // Cache duration: 30 seconds
  const CACHE_DURATION = 30 * 1000;

  const fetchProfile = async (userId: string, skipCache = false) => {
    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) return;

    // Check cache first (unless explicitly skipped)
    if (!skipCache && profileCacheRef.current) {
      const { userId: cachedUserId, data, timestamp } = profileCacheRef.current;
      const now = Date.now();

      if (cachedUserId === userId && now - timestamp < CACHE_DURATION) {
        if (mountedRef.current) {
          setProfile(data);
        }
        return;
      }
    }

    fetchingRef.current = true;

    try {
      // Fetch profile with timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();

      clearTimeout(timeoutId);

      if (error) {
        // Check if it's an abort error
        if (error.message?.includes('aborted')) {
          throw new Error('Profile fetch timeout');
        }
        throw error;
      }

      if (!mountedRef.current) return;

      // Check if user is banned
      if (profileData.is_banned) {
        // Sign out banned user immediately
        if (mountedRef.current) {
          setProfile(null);
          setUser(null);
          setSession(null);
          profileCacheRef.current = null;
        }
        await supabase.auth.signOut();
        throw new Error('Your account has been banned. Please contact the e-board for more information.');
      }

      // Update cache
      profileCacheRef.current = {
        userId,
        data: profileData,
        timestamp: Date.now(),
      };

      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);

      if (mountedRef.current) {
        // Set minimal fallback profile
        const fallbackProfile: Profile = {
          id: userId,
          email: user?.email || '',
          full_name: '',
          class_year: null,
          is_banned: false,
          linkedin_username: null,
          profile_picture_url: null,
          resume_url: null,
          points: 0,
          github_username: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          position: null,
          term_joined: null,
          theme: 'light',
        };

        setProfile(fallbackProfile);
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      // Skip cache when explicitly refreshing
      await fetchProfile(user.id, true);
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (!mountedRef.current) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mountedRef.current = false;
    };
  }, []); // ✅ Only run once on mount - no auth listener needed!

  // Separate effect for profile real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    // Real-time subscription for profile updates
    const profileSubscription = supabase
      .channel(`profile_changes_${user.id}`) // Unique channel name per user
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        () => {
          if (!mountedRef.current) return;

          // Invalidate cache and refetch when profile changes
          profileCacheRef.current = null;
          fetchProfile(user.id, true);
        }
      )
      .subscribe();

    return () => {
      profileSubscription.unsubscribe();
    };
  }, [user?.id]); // ✅ This effect CAN safely depend on user.id

  const signIn = async (email: string, password: string) => {
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update state with new session
    setSession(data.session);
    setUser(data.user);

    // Fetch profile
    if (data.user) {
      await fetchProfile(data.user.id);

      // Check if user is banned
      if (profile?.is_banned) {
        // Sign out the banned user
        await signOut();
        throw new Error('Your account has been banned. Please contact the e-board for more information.');
      }
    }
  };

  const signOut = async () => {
    // Clear local state first
    setProfile(null);
    setUser(null);
    setSession(null);
    profileCacheRef.current = null;

    // Sign out from Supabase
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signIn,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};