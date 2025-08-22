import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import type { AuthContextType, Profile } from '../types.ts';
import LoadingScreen from '../components/LoadingScreen.tsx';
import type { User } from '@supabase/supabase-js';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ALL_PROFILE_FIELDS = 'id, username, balance, created_at, banned_until, ban_reason, muted_until, warnings, level, rank, xp, godmode_until, is_admin, total_wagered, total_wins, total_losses';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    const isAdmin = useMemo(() => profile?.is_admin === true || profile?.username === 'Admin', [profile]);

    const fetchProfile = async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select(ALL_PROFILE_FIELDS)
            .eq('id', userId)
            .single();

        if (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
        return data as unknown as Profile;
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setLoading(true);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const userProfile = await fetchProfile(currentUser.id);
                 if (userProfile?.banned_until && new Date(userProfile.banned_until) > new Date()) {
                    setProfile(null);
                    supabase.auth.signOut();
                } else {
                    setProfile(userProfile);
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (profile?.id) {
            const channel = supabase
                .channel(`public:profiles:id=eq.${profile.id}`)
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
                    (payload) => {
                        const updatedProfile = payload.new as unknown as Profile;
                        setProfile(updatedProfile);
                    }
                )
                .subscribe();
            return () => { supabase.removeChannel(channel); };
        }
    }, [profile?.id]);

    const login = useCallback(async (username: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: `${username.toLowerCase()}@pinkystake.local`,
            password,
        });

        if (error) {
            if(error.message.includes('banned')) {
                 return { error: { message: `BANNED::${new Date(Date.now() + 3600*1000*24*7).toISOString()}::Account is temporarily disabled.` } };
            }
            return { error: { message: 'Invalid username or password.' } };
        }
        return { error: null };
    }, []);

    const signUp = useCallback(async (username: string, password: string) => {
        const { data: { user }, error } = await supabase.auth.signUp({
            email: `${username.toLowerCase()}@pinkystake.local`,
            password,
            options: {
                data: {
                    username: username,
                    initial_balance: 10.00,
                }
            }
        });

        if (error) {
            return { error: { message: error.message } };
        }
        if (!user) {
             return { error: { message: 'Signup failed. Please try again.' } };
        }
        
        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
    }, []);
    
    const adjustBalance = async (amount: number) => {
        if (!profile) return;

        const newBalance = profile.balance + amount;
        
        // Optimistic update
        const oldProfile = profile;
        setProfile({...profile, balance: newBalance});
        
        const { error } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', profile.id)

        if (error) {
            console.error("Error adjusting balance:", error);
            // Revert on failure
            setProfile(oldProfile);
        }
    };

    const value: AuthContextType = {
        profile,
        loading,
        isAdmin,
        login,
        signUp,
        signOut,
        adjustBalance,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <LoadingScreen /> : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};