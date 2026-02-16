// Plan feature definitions and limits for multi-tenancy

export const PLAN_NAMES = {
  free: "חינם",
  starter: "סטארטר",
  growth: "צמיחה",
  premium: "פרימיום",
  enterprise: "אנטרפרייז",
};

export const PLAN_FEATURES = {
  free: ["basic_crm", "basic_reports", "inventory"],
  starter: [
    "basic_crm",
    "basic_reports",
    "templates",
    "email_support",
    "lead_import",
    "landing_pages",
    "inventory",
  ],
  growth: [
    "basic_crm",
    "basic_reports",
    "templates",
    "email_support",
    "lead_import",
    "landing_pages",
    "automations",
    "advanced_reports",
    "employee_stats",
    "inventory",
    "payment",
    "telephony",
  ],
  premium: [
    "basic_crm",
    "basic_reports",
    "templates",
    "email_support",
    "lead_import",
    "landing_pages",
    "automations",
    "advanced_reports",
    "employee_stats",
    "inventory",
    "payment",
    "telephony",
    "lead_routing",
    "custom_fields",
    "chat_support",
    "phone_support",
  ],
  enterprise: [
    "basic_crm",
    "basic_reports",
    "templates",
    "email_support",
    "lead_import",
    "landing_pages",
    "automations",
    "advanced_reports",
    "employee_stats",
    "inventory",
    "payment",
    "telephony",
    "lead_routing",
    "custom_fields",
    "chat_support",
    "phone_support",
    "bi_dashboards",
    "user_permissions",
    "dedicated_am",
    "sla",
    "private_server",
  ],
};

export const PLAN_LIMITS = {
  free: {
    leads: 40,
    users: 1,
    price_per_user: 0,
    setup_cost: 0,
  },
  starter: {
    leads: 99,
    users: 5,
    price_per_user: 69,
    setup_cost: 0,
  },
  growth: {
    leads: 300,
    users: 15,
    price_per_user: 249,
    setup_cost: 0,
  },
  premium: {
    leads: 500,
    users: Infinity,
    price_per_user: 249,
    setup_cost: 0,
  },
  enterprise: {
    leads: 999,
    users: Infinity,
    price_per_user: null, // custom pricing
    setup_cost: null, // custom pricing
  },
};

export function hasFeature(plan, feature) {
  const features = PLAN_FEATURES[plan];
  if (!features) return false;
  return features.includes(feature);
}

export function getPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export const ALL_PLANS = [
  {
    id: "free",
    name: PLAN_NAMES.free,
    leads: 40,
    users: 1,
    price: "חינם",
    features: PLAN_FEATURES.free,
  },
  {
    id: "starter",
    name: PLAN_NAMES.starter,
    leads: 99,
    users: 5,
    price: "69₪ / משתמש",
    features: PLAN_FEATURES.starter,
  },
  {
    id: "growth",
    name: PLAN_NAMES.growth,
    leads: 300,
    users: 15,
    price: "249₪ / משתמש",
    features: PLAN_FEATURES.growth,
  },
  {
    id: "premium",
    name: PLAN_NAMES.premium,
    leads: 500,
    users: "ללא הגבלה",
    price: "249₪ / משתמש",
    features: PLAN_FEATURES.premium,
  },
  {
    id: "enterprise",
    name: PLAN_NAMES.enterprise,
    leads: "999+",
    users: "ללא הגבלה",
    price: "מותאם אישית",
    features: PLAN_FEATURES.enterprise,
  },
];
