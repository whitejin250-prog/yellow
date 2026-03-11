import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    staff: any | null;
    loading: boolean;
    isAdminMode: boolean;
    setIsAdminMode: (mode: boolean) => void;
    refreshStaff: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [staff, setStaff] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const staffRef = React.useRef<any>(null);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchStaff(session.user.id);
            else setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Auth event:", event);
            setUser(session?.user ?? null);
            
            if (session?.user) {
                // Only fetch if the user ID has changed or we don't have staff data yet
                if (!staffRef.current || staffRef.current.id !== session.user.id) {
                    fetchStaff(session.user.id);
                }
            } else {
                setStaff(null);
                staffRef.current = null;
                setIsAdminMode(false);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchStaff = async (userId: string) => {
        if (!userId) return;
        setLoading(true);
        console.log("Fetching staff for ID:", userId);

        // Use select() instead of single() to be more resilient to PGRST116 errors
        const { data: staffList, error } = await supabase
            .from('staff')
            .select('*')
            .eq('id', userId);

        if (error) {
            console.error("Staff fetch error:", error);
            setLoading(false);
            return;
        }

        if (staffList && staffList.length > 0) {
            const data = staffList[0];
            console.log("Staff profile successfully loaded:", data);
            
            // Only force AdminMode=true if switching to a new Admin user
            if (data.role_level === 'Admin' && (!staffRef.current || staffRef.current.id !== userId)) {
                setIsAdminMode(true);
            }
            
            setStaff(data);
            staffRef.current = data;
            setLoading(false);
        } else {
            // Not found by ID, try by email as fallback
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser?.email) {
                const { data: emailMatch } = await supabase
                    .from('staff')
                    .select('*')
                    .eq('email', authUser.email);

                if (emailMatch && emailMatch.length > 0) {
                    // Found by email, need to fix the ID link
                    const matched = emailMatch[0];
                    await supabase.from('staff').update({ id: userId }).eq('email', authUser.email);
                    
                    const updatedMatched = { ...matched, id: userId };
                    if (updatedMatched.role_level === 'Admin' && (!staffRef.current || staffRef.current.id !== userId)) {
                        setIsAdminMode(true);
                    }
                    
                    setStaff(updatedMatched);
                    staffRef.current = updatedMatched;
                    setLoading(false);
                    return;
                }
            }

            // Truly not found, create new
            console.log("Staff record truly not found, creating default...");
            const { data: userData } = await supabase.auth.getUser();
            const { data: newData, error: insertError } = await supabase
                .from('staff')
                .insert({
                    id: userId,
                    email: userData.user?.email,
                    name: userData.user?.email?.split('@')[0] || 'Unknown',
                    employee_no: 'EMP-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
                    role_level: userData.user?.email === 'jiho.hong@motiv-i.com' ? 'Admin' : 'User',
                    status: userData.user?.email === 'jiho.hong@motiv-i.com' ? 'Active' : 'Pending',
                    join_date: new Date().toISOString().split('T')[0]
                })
                .select();

            if (!insertError && newData && newData.length > 0) {
                const createdStaff = newData[0];
                if (createdStaff.role_level === 'Admin') setIsAdminMode(true);
                setStaff(createdStaff);
                staffRef.current = createdStaff;
            }
            setLoading(false);
        }
    };

    const refreshStaff = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await fetchStaff(session.user.id);
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, staff, loading, isAdminMode, setIsAdminMode, refreshStaff, signOut }}>
            {children}
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
