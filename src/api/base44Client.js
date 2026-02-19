import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Module-level org_id for multi-tenancy filtering
let currentOrgId = null;

export function setCurrentOrgId(orgId) {
  currentOrgId = orgId;
}

export function getCurrentOrgId() {
  return currentOrgId;
}

function sanitizeFileName(name = "file") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// Helper to create a full CRUD entity wrapper for a Supabase table with multi-tenancy
function createEntity(tableName) {
  return {
    list: async (sortParam) => {
      let query = supabaseClient.from(tableName).select('*');
      if (currentOrgId) {
        query = query.eq('org_id', currentOrgId);
      }
      if (sortParam) {
        const desc = sortParam.startsWith('-');
        const column = desc ? sortParam.slice(1) : sortParam;
        query = query.order(column, { ascending: !desc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    filter: async (filters) => {
      let query = supabaseClient.from(tableName).select('*');
      if (currentOrgId) {
        query = query.eq('org_id', currentOrgId);
      }
      for (const [key, value] of Object.entries(filters)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    get: async (id) => {
      let query = supabaseClient.from(tableName).select('*').eq('id', id);
      if (currentOrgId) {
        query = query.eq('org_id', currentOrgId);
      }
      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    create: async (record) => {
      const enrichedRecord = { ...record };
      if (currentOrgId) {
        enrichedRecord.org_id = currentOrgId;
      }

      // For leads table, check monthly limit before creating
      if (tableName === 'leads' && currentOrgId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        // Get org plan limits
        const { data: org } = await supabaseClient
          .from('organizations')
          .select('max_leads_per_month')
          .eq('id', currentOrgId)
          .single();

        if (org && org.max_leads_per_month) {
          // Count leads created this month for this org
          const { count } = await supabaseClient
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', currentOrgId)
            .gte('created_date', startOfMonth)
            .lte('created_date', endOfMonth);

          if (count >= org.max_leads_per_month) {
            throw new Error(`Monthly lead limit reached (${org.max_leads_per_month}). Upgrade your plan to add more leads.`);
          }
        }
      }

      const { data, error } = await supabaseClient.from(tableName).insert(enrichedRecord).select().single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      let query = supabaseClient.from(tableName).update(updates).eq('id', id);
      if (currentOrgId) {
        query = query.eq('org_id', currentOrgId);
      }
      const { data, error } = await query.select().single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      let query = supabaseClient.from(tableName).delete().eq('id', id);
      if (currentOrgId) {
        query = query.eq('org_id', currentOrgId);
      }
      const { error } = await query;
      if (error) throw error;
    },
  };
}

// This is exported as "supabase" because all pages import { supabase } and use
// supabase.auth.me(), supabase.entities.X.list(), etc.
export const supabase = {
  auth: {
    me: async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return null;

      // Flatten user_metadata into the user object so pages can access
      // user.role, user.permissions, user.full_name, etc. directly
      const metadata = user.user_metadata || {};
      const merged = { ...user, ...metadata };

      // Look up org membership from org_members table
      const { data: membership, error: membershipError } = await supabaseClient
        .from('org_members')
        .select('org_id, role, organizations(id, name, plan, max_leads_per_month, max_users, is_active, subscription_end_date, auto_renew, auto_renew_months)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.warn('org_members lookup failed:', membershipError.message);
      }

      if (membership) {
        merged.org_id = membership.org_id;
        // Map org_member roles to app roles: owner/admin -> admin, member -> user
        const orgRole = membership.role;
        merged.role = (orgRole === 'owner' || orgRole === 'admin') ? 'admin' : (metadata.role || 'admin');
        merged.org = membership.organizations || null;
        // Store org_id at module level for tenant filtering
        currentOrgId = membership.org_id;
      } else {
        // Fallback: users created outside org_members can still own an organization.
        const { data: ownedOrg, error: ownedOrgError } = await supabaseClient
          .from('organizations')
          .select('id, name, plan, max_leads_per_month, max_users, is_active, subscription_end_date, auto_renew, auto_renew_months')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (ownedOrgError && ownedOrgError.code !== 'PGRST116') {
          console.warn('owned organization lookup failed:', ownedOrgError.message);
        }

        if (ownedOrg) {
          merged.org_id = ownedOrg.id;
          merged.org = ownedOrg;
          merged.role = metadata.role || 'admin';
          currentOrgId = ownedOrg.id;
        } else {
          merged.role = metadata.role || 'admin';
          currentOrgId = null;
        }
      }

      // Super admin flag
      merged.is_super_admin =
        metadata.is_super_admin ||
        user.app_metadata?.is_super_admin ||
        false;

      return merged;
    },
    signIn: async (email, password) => {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { user: data.user };
    },
    signUp: async (email, password, fullName, businessName, referralCode = null) => {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin',
          },
        },
      });
      if (authError) return { error: authError.message };

      const user = authData.user;
      if (!user) return { error: 'Failed to create user' };

      // 2. Create organization + org_member via SECURITY DEFINER function (bypasses RLS)
      const { data: orgId, error: orgError } = await supabaseClient.rpc('create_org_for_user', {
        p_user_id: user.id,
        p_business_name: businessName,
        p_email: email,
        p_full_name: fullName,
      });
      if (orgError) throw orgError;

      // Optional referral hook: if DB function exists, link signup to referral/affiliate source
      if (referralCode) {
        const { error: referralError } = await supabaseClient.rpc('apply_referral_code', {
          p_ref_code: referralCode,
          p_referred_user_id: user.id,
          p_referred_org_id: orgId,
        });
        if (referralError) {
          console.warn('Referral code was not applied:', referralError.message);
        }
      }

      // Store org_id at module level
      currentOrgId = orgId;

      return { user };
    },
    logout: async () => {
      currentOrgId = null;
      await supabaseClient.auth.signOut();
    },
    resetPassword: async (email) => {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
    },
    updatePassword: async (newPassword) => {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    updateMe: async (updates) => {
      const { data, error } = await supabaseClient.auth.updateUser({ data: updates });
      if (error) throw error;
      const user = data.user;
      return { ...user, ...user.user_metadata };
    },
    // User management via org_members table (not auth)
    list: async () => {
      if (!currentOrgId) return [];
      const { data, error } = await supabaseClient
        .from('org_members')
        .select('*')
        .eq('org_id', currentOrgId);
      if (error) throw error;
      return data || [];
    },
    get: async (id) => {
      if (!currentOrgId) return null;
      const { data, error } = await supabaseClient
        .from('org_members')
        .select('*')
        .eq('id', id)
        .eq('org_id', currentOrgId)
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, updates) => {
      if (!currentOrgId) return null;
      const { data, error } = await supabaseClient
        .from('org_members')
        .update(updates)
        .eq('id', id)
        .eq('org_id', currentOrgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      if (!currentOrgId) return null;
      const { error } = await supabaseClient
        .from('org_members')
        .delete()
        .eq('id', id)
        .eq('org_id', currentOrgId);
      if (error) throw error;
    },
  },

  // Organization management methods
  org: {
    getInfo: async () => {
      if (!currentOrgId) return null;
      const { data, error } = await supabaseClient
        .from('organizations')
        .select('*')
        .eq('id', currentOrgId)
        .single();
      if (error) throw error;
      return data;
    },
    getUsage: async () => {
      if (!currentOrgId) return { count: 0 };
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { count, error } = await supabaseClient
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', currentOrgId)
        .gte('created_date', startOfMonth)
        .lte('created_date', endOfMonth);

      if (error) throw error;
      return { count: count || 0 };
    },
    getMembers: async () => {
      if (!currentOrgId) return [];
      const { data, error } = await supabaseClient
        .from('org_members')
        .select('*')
        .eq('org_id', currentOrgId);
      if (error) throw error;
      return data || [];
    },
    inviteMember: async (email, password, fullName, role = 'user') => {
      if (!currentOrgId) throw new Error('No organization context');

      // Check member limit
      const { data: org } = await supabaseClient
        .from('organizations')
        .select('max_users')
        .eq('id', currentOrgId)
        .single();

      if (org && org.max_users && org.max_users !== -1) {
        const { count } = await supabaseClient
          .from('org_members')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrgId);

        if (count >= org.max_users) {
          throw new Error(`User limit reached (${org.max_users}). Upgrade your plan to add more users.`);
        }
      }

      // Save current session before creating new user
      const { data: { session: currentSession } } = await supabaseClient.auth.getSession();

      // Create auth user (this may create a new session)
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });
      if (authError) {
        // Restore session on error
        if (currentSession) await supabaseClient.auth.setSession(currentSession);
        throw authError;
      }

      const user = authData.user;
      if (!user) {
        if (currentSession) await supabaseClient.auth.setSession(currentSession);
        throw new Error('Failed to create user');
      }

      // Restore the original admin/owner session
      if (currentSession) {
        await supabaseClient.auth.setSession(currentSession);
      }

      // Add to org_members
      const { data: member, error: memberError } = await supabaseClient
        .from('org_members')
        .insert({
          org_id: currentOrgId,
          user_id: user.id,
          role: role,
          email: email,
          full_name: fullName,
        })
        .select()
        .single();
      if (memberError) throw memberError;

      return member;
    },
    removeMember: async (memberId) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { error } = await supabaseClient
        .from('org_members')
        .delete()
        .eq('id', memberId)
        .eq('org_id', currentOrgId);
      if (error) throw error;
    },
    updateOrg: async (updates) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data, error } = await supabaseClient
        .from('organizations')
        .update(updates)
        .eq('id', currentOrgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    listPlans: async () => {
      const { data, error } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    getOrCreateReferralCode: async () => {
      if (!currentOrgId) throw new Error('No organization context');

      const fallbackCode = currentOrgId;

      try {
        const { data: existing, error: existingError } = await supabaseClient
          .from('referral_links')
          .select('ref_code')
          .eq('org_id', currentOrgId)
          .maybeSingle();

        if (existingError) throw existingError;
        if (existing?.ref_code) return existing.ref_code;

        const generatedCode = `org_${String(currentOrgId).replace(/-/g, '').slice(0, 12)}`;
        const { data: created, error: createError } = await supabaseClient
          .from('referral_links')
          .upsert(
            { org_id: currentOrgId, ref_code: generatedCode, is_active: true },
            { onConflict: 'org_id' }
          )
          .select('ref_code')
          .single();

        if (createError) throw createError;
        return created?.ref_code || generatedCode;
      } catch (error) {
        console.warn('Referral code fallback in use:', error.message);
        return fallbackCode;
      }
    },
    getWalletInfo: async () => {
      if (!currentOrgId) return { credit_balance: 0 };
      try {
        const { data, error } = await supabaseClient
          .from('wallet_accounts')
          .select('*')
          .eq('org_id', currentOrgId)
          .maybeSingle();
        if (error) throw error;
        return data || { credit_balance: 0 };
      } catch (error) {
        console.warn('Wallet info fallback in use:', error.message);
        return { credit_balance: 0 };
      }
    },
    getReferralStats: async () => {
      if (!currentOrgId) {
        return {
          total_signups: 0,
          total_upgraded: 0,
          total_active: 0,
        };
      }
      try {
        const { data, error } = await supabaseClient
          .from('referrals')
          .select('status')
          .eq('referrer_org_id', currentOrgId);
        if (error) throw error;

        const list = data || [];
        return {
          total_signups: list.length,
          total_upgraded: list.filter((r) => r.status === 'upgraded').length,
          total_active: list.filter((r) => r.status === 'signed_up' || r.status === 'upgraded').length,
        };
      } catch (error) {
        console.warn('Referral stats fallback in use:', error.message);
        return {
          total_signups: 0,
          total_upgraded: 0,
          total_active: 0,
        };
      }
    },
    listReferrals: async () => {
      if (!currentOrgId) return [];
      try {
        const { data, error } = await supabaseClient
          .from('referrals')
          .select('id, ref_code, status, source_type, signup_at, upgraded_at, referred_org_id')
          .eq('referrer_org_id', currentOrgId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.warn('Referrals list fallback in use:', error.message);
        return [];
      }
    },
  },

  bot: {
    getOrCreateConversation: async (userId) => {
      if (!currentOrgId) throw new Error('No organization context');

      const { data: existing, error: existingError } = await supabaseClient
        .from('bot_conversations')
        .select('*')
        .eq('org_id', currentOrgId)
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return existing;

      const { data, error } = await supabaseClient
        .from('bot_conversations')
        .insert({
          org_id: currentOrgId,
          user_id: userId,
          title: 'CRM Bot',
          session_state: {},
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    listMessages: async (conversationId) => {
      if (!currentOrgId) return [];
      const { data, error } = await supabaseClient
        .from('bot_messages')
        .select('*')
        .eq('org_id', currentOrgId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    addMessage: async (conversationId, { role, content, metadata = {}, userId = null }) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data, error } = await supabaseClient
        .from('bot_messages')
        .insert({
          org_id: currentOrgId,
          conversation_id: conversationId,
          user_id: userId,
          role,
          content,
          metadata,
        })
        .select()
        .single();
      if (error) throw error;

      await supabaseClient
        .from('bot_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('org_id', currentOrgId);

      return data;
    },
    updateConversationSession: async (conversationId, sessionState) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data, error } = await supabaseClient
        .from('bot_conversations')
        .update({
          session_state: sessionState || {},
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId)
        .eq('org_id', currentOrgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    uploadFile: async (conversationId, file, userId) => {
      if (!currentOrgId) throw new Error('No organization context');
      if (!file) throw new Error('File is required');

      const safeName = sanitizeFileName(file.name || 'file');
      const path = `${currentOrgId}/${conversationId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabaseClient
        .storage
        .from('bot-files')
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data, error } = await supabaseClient
        .from('bot_files')
        .insert({
          org_id: currentOrgId,
          conversation_id: conversationId,
          user_id: userId,
          file_name: file.name || safeName,
          file_path: path,
          mime_type: file.type || null,
          file_size: file.size || null,
          purpose: 'unassigned',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    assignFilePurpose: async (fileId, purpose, options = {}) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data: fileRow, error: fileError } = await supabaseClient
        .from('bot_files')
        .select('*')
        .eq('id', fileId)
        .eq('org_id', currentOrgId)
        .single();
      if (fileError) throw fileError;

      let linkedEntityType = null;
      let linkedEntityId = null;
      let createdTask = null;

      if (purpose === 'task') {
        linkedEntityType = 'task';
        const taskTitle = options.taskTitle?.trim() || `קובץ מהבוט: ${fileRow.file_name}`;

        // Ensure the created task appears in "My Tasks"
        let assigneeEmail = null;
        if (fileRow.user_id) {
          const { data: memberRow } = await supabaseClient
            .from('org_members')
            .select('email')
            .eq('org_id', currentOrgId)
            .eq('user_id', fileRow.user_id)
            .maybeSingle();
          assigneeEmail = memberRow?.email || null;
        }

        const { data: task, error: taskError } = await supabaseClient
          .from('tasks')
          .insert({
            org_id: currentOrgId,
            title: taskTitle,
            description: `נוצר אוטומטית מהבוט עבור הקובץ: ${fileRow.file_name}`,
            assigned_to: assigneeEmail,
            status: 'ממתין',
            created_date: new Date().toISOString(),
          })
          .select()
          .single();
        if (taskError) throw taskError;
        linkedEntityId = task.id;
        createdTask = task;

        // Create a first timeline note on the created task with the attached bot file.
        await supabaseClient
          .from('entity_notes')
          .insert({
            org_id: currentOrgId,
            entity_type: 'task',
            entity_id: task.id,
            note_text: `קובץ שויך ע"י הבוט: ${fileRow.file_name}`,
            file_name: fileRow.file_name,
            file_bucket: 'bot-files',
            file_path: fileRow.file_path,
            created_by: fileRow.user_id,
          });
      } else if (purpose === 'lead') {
        linkedEntityType = 'lead';
        linkedEntityId = options.leadId || null;

        if (!linkedEntityId && options.leadQuery) {
          const like = `%${String(options.leadQuery).trim()}%`;
          const { data: foundLead, error: foundLeadError } = await supabaseClient
            .from('leads')
            .select('id')
            .eq('org_id', currentOrgId)
            .or(`customer_name.ilike.${like},customer_phone.ilike.${like}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (foundLeadError) throw foundLeadError;
          linkedEntityId = foundLead?.id || null;
        }

        if (!linkedEntityId) {
          const { data: latestLead, error: latestLeadError } = await supabaseClient
            .from('leads')
            .select('id')
            .eq('org_id', currentOrgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (latestLeadError) throw latestLeadError;
          linkedEntityId = latestLead?.id || null;
        }

        if (linkedEntityId) {
          await supabaseClient
            .from('entity_notes')
            .insert({
              org_id: currentOrgId,
              entity_type: 'lead',
              entity_id: linkedEntityId,
              note_text: `קובץ שויך ע"י הבוט: ${fileRow.file_name}`,
              file_name: fileRow.file_name,
              file_bucket: 'bot-files',
              file_path: fileRow.file_path,
              created_by: fileRow.user_id,
            });
        }
      } else if (purpose === 'supplier_order') {
        linkedEntityType = 'supplier_order';
      } else if (purpose === 'customer') {
        linkedEntityType = 'customer';
      } else if (purpose === 'archive') {
        linkedEntityType = 'archive';
      }

      const { data, error } = await supabaseClient
        .from('bot_files')
        .update({
          purpose,
          linked_entity_type: linkedEntityType,
          linked_entity_id: linkedEntityId,
        })
        .eq('id', fileId)
        .eq('org_id', currentOrgId)
        .select()
        .single();
      if (error) throw error;
      return { ...data, task: createdTask, linked_entity_id: linkedEntityId };
    },
    createSignedUrl: async (filePath, expiresInSeconds = 3600) => {
      const { data, error } = await supabaseClient
        .storage
        .from('bot-files')
        .createSignedUrl(filePath, expiresInSeconds);
      if (error) throw error;
      return data?.signedUrl || null;
    },
    searchQA: async (queryText) => {
      if (!queryText) return null;
      if (!currentOrgId) return null;

      const normalized = queryText.toLowerCase().trim();
      const tokens = normalized.split(/\s+/).filter(Boolean);

      const { data, error } = await supabaseClient
        .from('bot_qa')
        .select('*')
        .eq('is_active', true)
        .or(`org_id.is.null,org_id.eq.${currentOrgId}`);
      if (error) throw error;

      const rows = data || [];
      if (!rows.length) return null;

      const scored = rows
        .map((row) => {
          const q = String(row.question || '').toLowerCase();
          const keywords = Array.isArray(row.keywords) ? row.keywords.map((k) => String(k).toLowerCase()) : [];
          let score = 0;
          for (const token of tokens) {
            if (q.includes(token)) score += 3;
            if (keywords.some((kw) => kw.includes(token) || token.includes(kw))) score += 5;
          }
          if (row.org_id === currentOrgId) score += 2;
          score += Math.max(0, 100 - Number(row.priority || 100)) / 100;
          return { row, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score || Number(a.row.priority || 100) - Number(b.row.priority || 100));

      return scored[0]?.row || null;
    },
    searchContacts: async (term) => {
      if (!currentOrgId || !term) return [];
      const like = `%${term}%`;

      const [{ data: leads, error: leadsError }, { data: customers, error: customersError }] = await Promise.all([
        supabaseClient
          .from('leads')
          .select('id, customer_name, customer_phone')
          .eq('org_id', currentOrgId)
          .or(`customer_name.ilike.${like},customer_phone.ilike.${like}`)
          .limit(10),
        supabaseClient
          .from('customers')
          .select('id, full_name, phone')
          .eq('org_id', currentOrgId)
          .or(`full_name.ilike.${like},phone.ilike.${like}`)
          .limit(10),
      ]);

      if (leadsError) throw leadsError;
      if (customersError) throw customersError;
      return [...(leads || []), ...(customers || [])];
    },
    getDashboardStats: async () => {
      if (!currentOrgId) return { totalLeads: 0, monthLeads: 0, openJobs: 0, openTasks: 0 };

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const [totalLeadsRes, monthLeadsRes, openJobsRes, openTasksRes] = await Promise.all([
        supabaseClient.from('leads').select('*', { count: 'exact', head: true }).eq('org_id', currentOrgId),
        supabaseClient
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrgId)
          .gte('created_date', startOfMonth)
          .lte('created_date', endOfMonth),
        supabaseClient
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrgId)
          .eq('status', 'פתוח'),
        supabaseClient
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', currentOrgId)
          .eq('status', 'פתוח'),
      ]);

      if (totalLeadsRes.error) throw totalLeadsRes.error;
      if (monthLeadsRes.error) throw monthLeadsRes.error;
      if (openJobsRes.error) throw openJobsRes.error;
      if (openTasksRes.error) throw openTasksRes.error;

      return {
        totalLeads: totalLeadsRes.count || 0,
        monthLeads: monthLeadsRes.count || 0,
        openJobs: openJobsRes.count || 0,
        openTasks: openTasksRes.count || 0,
      };
    },
  },

  notes: {
    list: async (entityType, entityId) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data, error } = await supabaseClient
        .from('entity_notes')
        .select('*')
        .eq('org_id', currentOrgId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const rows = data || [];
      const withUrls = await Promise.all(
        rows.map(async (row) => {
          if (!row.file_path) return row;
          const bucket = row.file_bucket || 'entity-notes';
          const { data: signed, error: signedError } = await supabaseClient
            .storage
            .from(bucket)
            .createSignedUrl(row.file_path, 3600);
          if (signedError) {
            return { ...row, file_url: null };
          }
          return { ...row, file_url: signed?.signedUrl || null };
        })
      );
      return withUrls;
    },
    create: async ({ entityType, entityId, noteText, file, createdBy, createdByEmail }) => {
      if (!currentOrgId) throw new Error('No organization context');

      let fileName = null;
      let filePath = null;
      let fileBucket = null;

      if (file) {
        const safeName = sanitizeFileName(file.name || 'file');
        filePath = `${currentOrgId}/${entityType}/${entityId}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabaseClient
          .storage
          .from('entity-notes')
          .upload(filePath, file, { upsert: false });
        if (uploadError) throw uploadError;
        fileName = file.name || safeName;
        fileBucket = 'entity-notes';
      }

      const { data, error } = await supabaseClient
        .from('entity_notes')
        .insert({
          org_id: currentOrgId,
          entity_type: entityType,
          entity_id: entityId,
          note_text: noteText || null,
          file_name: fileName,
          file_bucket: fileBucket,
          file_path: filePath,
          created_by: createdBy || null,
          created_by_email: createdByEmail || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    remove: async (noteId) => {
      if (!currentOrgId) throw new Error('No organization context');
      const { data: row, error: rowError } = await supabaseClient
        .from('entity_notes')
        .select('*')
        .eq('id', noteId)
        .eq('org_id', currentOrgId)
        .single();
      if (rowError) throw rowError;

      if (row.file_path && row.file_bucket === 'entity-notes') {
        await supabaseClient.storage.from('entity-notes').remove([row.file_path]);
      }

      const { error } = await supabaseClient
        .from('entity_notes')
        .delete()
        .eq('id', noteId)
        .eq('org_id', currentOrgId);
      if (error) throw error;
    },
  },

  // Super admin methods (no org filtering)
  superAdmin: {
    listPlans: async () => {
      const { data, error } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    updatePlanConfig: async (planId, updates) => {
      const { data, error } = await supabaseClient
        .from('subscription_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    listOrgs: async () => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .select('*');
      if (error) throw error;

      // Enrich with lead usage, member count, and owner info
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const enriched = await Promise.all((data || []).map(async (org) => {
        // Get lead count for this month
        const { count } = await supabaseClient
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .gte('created_date', startOfMonth)
          .lte('created_date', endOfMonth);

        // Get members for this org
        const { data: members } = await supabaseClient
          .from('org_members')
          .select('email, full_name, role')
          .eq('org_id', org.id);

        const memberList = members || [];
        const owner = memberList.find(m => m.role === 'owner') || memberList[0] || {};

        return {
          ...org,
          member_count: memberList.length,
          lead_usage: count || 0,
          owner_name: owner.full_name || '-',
          owner_email: owner.email || '',
        };
      }));

      return enriched;
    },
    getOrg: async (orgId) => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .select('*, org_members(*)')
        .eq('id', orgId)
        .single();
      if (error) throw error;
      return data;
    },
    updatePlan: async (orgId, planId) => {
      // Look up plan details from subscription_plans
      const { data: plan, error: planError } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();
      if (planError) throw planError;

      const { data, error } = await supabaseClient
        .from('organizations')
        .update({
          plan: planId,
          max_leads_per_month: plan.max_leads_per_month,
          max_users: plan.max_users,
        })
        .eq('id', orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    updateOrg: async (orgId, updates) => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .update(updates)
        .eq('id', orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    toggleOrg: async (orgId, isActive) => {
      const { data, error } = await supabaseClient
        .from('organizations')
        .update({ is_active: isActive })
        .eq('id', orgId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    createClient: async ({ businessName, fullName, email, phone, password, plan }) => {
      // Save current super admin session before creating new user
      const { data: { session: currentSession } } = await supabaseClient.auth.getSession();

      // 1. Create auth user
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin',
            phone: phone || '',
          },
        },
      });
      if (authError) {
        if (currentSession) await supabaseClient.auth.setSession(currentSession);
        throw authError;
      }

      const user = authData.user;
      if (!user) {
        if (currentSession) await supabaseClient.auth.setSession(currentSession);
        throw new Error('Failed to create user');
      }

      // Restore super admin session immediately
      if (currentSession) {
        await supabaseClient.auth.setSession(currentSession);
      }

      // 2. Get plan limits
      const { data: planData } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .eq('id', plan)
        .single();

      // 3. Create organization with selected plan
      const { data: org, error: orgError } = await supabaseClient
        .from('organizations')
        .insert({
          name: businessName,
          owner_id: user.id,
          plan: plan,
          max_leads_per_month: planData?.max_leads_per_month || 40,
          max_users: planData?.max_users || 1,
        })
        .select()
        .single();
      if (orgError) throw orgError;

      // 4. Create org_member linking user to org
      const { error: memberError } = await supabaseClient
        .from('org_members')
        .insert({
          org_id: org.id,
          user_id: user.id,
          role: 'owner',
          email: email,
          full_name: fullName,
        });
      if (memberError) throw memberError;

      return { user, org };
    },
    listBotQA: async () => {
      const { data, error } = await supabaseClient
        .from('bot_qa')
        .select('*')
        .is('org_id', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    listBotInstructions: async () => {
      const { data, error } = await supabaseClient
        .from('bot_instructions')
        .select('*')
        .is('org_id', null)
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    upsertGlobalBotInstruction: async (payload) => {
      if (payload.id) {
        const { data, error } = await supabaseClient
          .from('bot_instructions')
          .update({
            title: payload.title,
            instruction: payload.instruction,
            priority: payload.priority ?? 100,
            is_active: payload.is_active !== false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabaseClient
        .from('bot_instructions')
        .insert({
          org_id: null,
          title: payload.title,
          instruction: payload.instruction,
          priority: payload.priority ?? 100,
          is_active: payload.is_active !== false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    deleteBotInstruction: async (id) => {
      const { error } = await supabaseClient
        .from('bot_instructions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    createBotQA: async (payload) => {
      const { data, error } = await supabaseClient
        .from('bot_qa')
        .insert({
          org_id: null,
          question: payload.question,
          answer: payload.answer,
          keywords: payload.keywords || [],
          priority: payload.priority ?? 100,
          category: payload.category || 'general',
          is_active: payload.is_active !== false,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    updateBotQA: async (id, updates) => {
      const { data, error } = await supabaseClient
        .from('bot_qa')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    deleteBotQA: async (id) => {
      const { error } = await supabaseClient
        .from('bot_qa')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    listBotConversations: async (limit = 100) => {
      const { data, error } = await supabaseClient
        .from('bot_conversations')
        .select('id, org_id, user_id, title, last_message_at, created_at')
        .order('last_message_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    listBotFiles: async (limit = 100) => {
      const { data, error } = await supabaseClient
        .from('bot_files')
        .select('id, org_id, user_id, file_name, file_path, purpose, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    listBotMessages: async (conversationId) => {
      const { data, error } = await supabaseClient
        .from('bot_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    listAllUsers: async () => {
      const { data, error } = await supabaseClient
        .from('org_members')
        .select('*, organizations(id, name)');
      if (error) throw error;
      return data || [];
    },
  },

  entities: {
    Customer: createEntity('customers'),
    Task: createEntity('tasks'),
    Lead: createEntity('leads'),
    LeadSource: createEntity('lead_sources'),
    Settings: createEntity('settings'),
    SystemHistory: createEntity('system_history'),
    SatisfactionSurvey: createEntity('satisfaction_surveys'),
    Quote: createEntity('quotes'),
    Job: createEntity('jobs'),
    Inventory: createEntity('inventory'),
    StockMove: createEntity('stock_moves'),
    Supplier: createEntity('suppliers'),
    Template: createEntity('templates'),
    WarrantyCertificate: createEntity('warranty_certificates'),
    SupplierOrder: createEntity('supplier_orders'),
    Invoice: createEntity('invoices'),
    Vehicle: createEntity('vehicles'),
    User: createEntity('org_members'),
  },
  integrations: {
    Core: {
      InvokeLLM: async () => null,
      SendEmail: async () => null,
      UploadFile: async () => null,
      GenerateImage: async () => null,
      ExtractDataFromUploadedFile: async () => null,
      CreateFileSignedUrl: async () => null,
      UploadPrivateFile: async () => null,
    }
  },
  functions: {
    createCardcomPaymentLink: async () => null,
    cancelInvoice: async () => null,
    addSerialNumbersToLeads: async () => null,
    cardcomWebhook: async () => null,
    sendSubscriptionRenewal: async () => null,
    migrateLeadStatuses: async () => null,
  }
};

// Also export as base44 for entities.js / integrations.js / functions.js
export const base44 = supabase;
