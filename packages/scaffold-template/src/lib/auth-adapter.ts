import { supabaseAdmin } from './supabase';

// Thin CRUD shim used by Better Auth against the auth_* tables in Supabase.
// Intentionally minimal — expand as the admin surface grows.
export const authAdapter = {
  async findUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin
      .from('auth_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createUser(user: { email: string; hashedPassword: string; name?: string }) {
    const { data, error } = await supabaseAdmin
      .from('auth_users')
      .insert({ email: user.email, hashed_password: user.hashedPassword, name: user.name ?? null })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createSession(session: { userId: string; token: string; expiresAt: string }) {
    const { data, error } = await supabaseAdmin
      .from('auth_sessions')
      .insert({ user_id: session.userId, token: session.token, expires_at: session.expiresAt })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async findSessionByToken(token: string) {
    const { data, error } = await supabaseAdmin
      .from('auth_sessions')
      .select('*, auth_users(*)')
      .eq('token', token)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async deleteSession(token: string) {
    const { error } = await supabaseAdmin.from('auth_sessions').delete().eq('token', token);
    if (error) throw error;
  },
};
