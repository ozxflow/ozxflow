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
      const { data: membership } = await supabaseClient
        .from('org_members')
        .select('org_id, role, organizations(id, name, plan, max_leads_per_month, max_users, is_active, subscription_end_date, auto_renew, auto_renew_months)')
        .eq('user_id', user.id)
        .single();

      if (membership) {
        merged.org_id = membership.org_id;
        // Map org_member roles to app roles: owner/admin -> admin, member -> user
        const orgRole = membership.role;
        merged.role = (orgRole === 'owner' || orgRole === 'admin') ? 'admin' : (metadata.role || 'admin');
        merged.org = membership.organizations || null;
        // Store org_id at module level for tenant filtering
        currentOrgId = membership.org_id;
      } else {
        merged.role = metadata.role || 'admin';
      }

      // Super admin flag
      merged.is_super_admin = metadata.is_super_admin || false;

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
