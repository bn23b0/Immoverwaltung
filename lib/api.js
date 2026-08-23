import { supabase } from './supabase';

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const authStatus = () => rpc('auth_status', {});
export const login = (pin) => rpc('login', { p_pin: pin });
export const setupPin = (pin) => rpc('setup_pin', { p_pin: pin });
export const logout = (token) => rpc('logout', { p_token: token });
export const listProperties = (token) => rpc('list_properties', { p_token: token });
export const upsertProperty = (token, data) => rpc('upsert_property', { p_token: token, p_data: data });
export const deleteProperty = (token, id) => rpc('delete_property', { p_token: token, p_id: id });
export const propertyStats = (token) => rpc('property_stats', { p_token: token });
