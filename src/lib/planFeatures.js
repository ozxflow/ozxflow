// Plan feature definitions and limits for multi-tenancy

export const PLAN_NAMES = {
  free: "צעדים ראשונים",
  starter: "עסק בתנופה",
  growth: "צמיחה מואצת",
  premium: "הנבחרת",
  enterprise: "Custom",
};

export const PLAN_FEATURES = {
  free: ["basic_crm", "basic_reports"],
  starter: [
    "basic_crm",
    "basic_reports",
    "templates",
    "email_support",
    "lead_import",
    "landing_pages",
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
    setup_cost: 1500,
  },
  growth: {
    leads: 300,
    users: 15,
    price_per_user: 249,
    setup_cost: 5500,
  },
  premium: {
    leads: 500,
    users: Infinity,
    price_per_user: 249,
    setup_cost: 10500,
  },
  enterprise: {
    leads: 999,
    users: Infinity,
    price_per_user: null,
    setup_cost: null,
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
    setupCost: 0,
    monthlyPerUser: 0,
    features: PLAN_FEATURES.free,
  },
  {
    id: "starter",
    name: PLAN_NAMES.starter,
    leads: 99,
    users: 5,
    price: "1,500₪ הקמה + 69₪ למשתמש",
    setupCost: 1500,
    monthlyPerUser: 69,
    features: PLAN_FEATURES.starter,
  },
  {
    id: "growth",
    name: PLAN_NAMES.growth,
    leads: "99-300",
    users: 15,
    price: "5,500₪ הקמה + 249₪ למשתמש",
    setupCost: 5500,
    monthlyPerUser: 249,
    badge: "הנמכרת ביותר",
    features: PLAN_FEATURES.growth,
  },
  {
    id: "premium",
    name: PLAN_NAMES.premium,
    leads: "300-500",
    users: "ללא הגבלה",
    price: "10,500₪ הקמה + 249₪ למשתמש",
    setupCost: 10500,
    monthlyPerUser: 249,
    notes: "מעל 500 לידים - חבילת Custom, הנחה 15%-20% בתשלום שנתי.",
    features: PLAN_FEATURES.premium,
  },
  {
    id: "enterprise",
    name: PLAN_NAMES.enterprise,
    leads: "500+",
    users: "ללא הגבלה",
    price: "מותאם אישית",
    setupCost: null,
    monthlyPerUser: null,
    features: PLAN_FEATURES.enterprise,
  },
];
