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

export const listEvents = (token) => rpc('list_events', { p_token: token });
export const upsertEvent = (token, data) => rpc('upsert_event', { p_token: token, p_data: data });
export const deleteEvent = (token, id) => rpc('delete_event', { p_token: token, p_id: id });

export const listTodos = (token) => rpc('list_todos', { p_token: token });
export const upsertTodo = (token, data) => rpc('upsert_todo', { p_token: token, p_data: data });
export const deleteTodo = (token, id) => rpc('delete_todo', { p_token: token, p_id: id });
