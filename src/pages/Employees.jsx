import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Plus, X, RefreshCw, Trash2, Sparkles, ChevronDown, TrendingUp, DollarSign, Package, Clock, UserCheck, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, isWithinInterval } from 'date-fns';
import _ from 'lodash';

const roleColors = {
  "בעלים": "bg-red-100 text-red-800",
  "מנכל": "bg-yellow-100 text-yellow-800",
  "מזכירה": "bg-purple-100 text-purple-800",
  "איש צוות": "bg-blue-100 text-blue-800",
  "מחסנאי": "bg-orange-100 text-orange-800",
  "צופה": "bg-gray-100 text-gray-800"
};

const statusColors = {
  "פנוי": "bg-green-100 text-green-800",
  "בעבודה": "bg-yellow-100 text-yellow-800",
  "בחופש": "bg-red-100 text-red-800",
};

const PERMISSION_PROFILES = {
  "בעלים": { all: true },
  "מנכל": { all: true, except: ["settings_integrations"] },
  "מזכירה": {
    leads_view_all: true, leads_create: true, leads_edit: true, leads_view_prices: true, leads_change_status: true,
    quotes_view: true, quotes_create: true, quotes_edit: true, quotes_view_prices: true, quotes_send: true,
    customers_view_all: true, customers_create: true, customers_edit: true,
    communication_whatsapp: true, communication_email: true, communication_phone: true,
    tasks_view_all: true, tasks_create: true, tasks_edit: true
  },
  "איש צוות": {
    jobs_change_status: true, tasks_create: true, inventory_view: true,
    communication_whatsapp: true, communication_phone: true, media_upload: true
  },
  "מחסנאי": {
    inventory_view: true, inventory_view_costs: true, inventory_create: true, inventory_edit: true, inventory_delete: true, inventory_update_stock: true,
    suppliers_view: true, suppliers_view_costs: true, suppliers_create_order: true, suppliers_edit: true, suppliers_delete: true,
    warranty_view: true, media_upload: true, print_documents: true
  },
  "צופה": {
    leads_view_all: true, quotes_view: true, quotes_view_prices: true, invoices_view: true, invoices_view_amounts: true,
    customers_view_all: true, jobs_view_all: true, inventory_view: true, inventory_view_costs: true,
    suppliers_view: true, suppliers_view_costs: true, employees_view_all: true, reports_view: true, reports_view_financial: true
  }
};

const SIMPLE_CATEGORIES = {
  "לידים": ["leads_view_all", "leads_create", "leads_edit", "leads_delete", "leads_view_prices", "leads_change_status"],
  "כספים": ["quotes_view", "quotes_create", "quotes_edit", "quotes_delete", "quotes_view_prices", "quotes_send", "quotes_create_payment_link", "invoices_view", "invoices_view_amounts", "invoices_delete", "payments_view", "payments_refund", "payments_manual_update"],
  "מלאי": ["inventory_view", "inventory_view_costs", "inventory_create", "inventory_edit", "inventory_delete", "inventory_update_stock", "suppliers_view", "suppliers_view_costs", "suppliers_create_order", "suppliers_edit", "suppliers_delete"],
  "עבודות": ["jobs_view_all", "jobs_change_status", "jobs_delete", "tasks_view_all", "tasks_create", "tasks_edit", "tasks_delete", "tasks_assign", "queue_manage", "assign_jobs_manual"],
  "לקוחות": ["customers_view_all", "customers_create", "customers_edit", "customers_delete", "communication_whatsapp", "communication_email", "communication_phone", "surveys_view"],
  "עובדים": ["employees_view_all", "employees_create", "employees_edit", "employees_delete", "employees_manage_permissions", "stats_view_others", "audit_view", "warranty_view", "warranty_create"],
  "דוחות": ["reports_view", "reports_view_financial", "stats_view_revenue", "stats_view_profit", "export_data", "print_documents"],
  "הגדרות": ["settings_access", "settings_integrations", "bot_access", "bot_configure", "templates_edit", "lead_sources_edit", "media_upload", "media_delete"]
};

const PERMISSION_CATEGORIES = {
  "לידים ומכירות": [
    { key: "leads_view_all", label: "צפייה בכל הלידים" },
    { key: "leads_create", label: "יצירת ליד חדש" },
    { key: "leads_edit", label: "עריכת לידים" },
    { key: "leads_delete", label: "מחיקת לידים" },
    { key: "leads_view_prices", label: "צפייה במחירים" },
    { key: "leads_change_status", label: "שינוי סטטוס" }
  ],
  "כספים ומסמכים": [
    { key: "quotes_view", label: "צפייה בהצעות מחיר" },
    { key: "quotes_create", label: "יצירת הצעת מחיר" },
    { key: "quotes_edit", label: "עריכת הצעות" },
    { key: "quotes_delete", label: "מחיקת הצעות" },
    { key: "quotes_view_prices", label: "צפייה במחירים" },
    { key: "quotes_send", label: "שליחת הצעה ללקוח" },
    { key: "quotes_create_payment_link", label: "יצירת לינק תשלום" },
    { key: "invoices_view", label: "צפייה בחשבוניות" },
    { key: "invoices_view_amounts", label: "צפייה בסכומים" },
    { key: "invoices_delete", label: "מחיקת חשבוניות" },
    { key: "payments_view", label: "צפייה בפרטי תשלום" },
    { key: "payments_refund", label: "יצירת החזר כספי" },
    { key: "payments_manual_update", label: "עדכון סטטוס תשלום" }
  ],
  "מלאי וספקים": [
    { key: "inventory_view", label: "צפייה במלאי" },
    { key: "inventory_view_costs", label: "צפייה בעלות רכש" },
    { key: "inventory_create", label: "הוספת פריט חדש" },
    { key: "inventory_edit", label: "עריכת פריטים" },
    { key: "inventory_delete", label: "מחיקת פריטים" },
    { key: "inventory_update_stock", label: "עדכון כמויות" },
    { key: "suppliers_view", label: "צפייה בספקים" },
    { key: "suppliers_view_costs", label: "צפייה בעלויות" },
    { key: "suppliers_create_order", label: "יצירת הזמנה" },
    { key: "suppliers_edit", label: "עריכת ספקים" },
    { key: "suppliers_delete", label: "מחיקת ספקים" }
  ],
  "עבודות ומשימות": [
    { key: "jobs_view_all", label: "צפייה בכל העבודות" },
    { key: "jobs_change_status", label: "שינוי סטטוס עבודה" },
    { key: "jobs_delete", label: "מחיקת עבודות" },
    { key: "tasks_view_all", label: "צפייה בכל המשימות" },
    { key: "tasks_create", label: "יצירת משימות" },
    { key: "tasks_edit", label: "עריכת משימות" },
    { key: "tasks_delete", label: "מחיקת משימות" },
    { key: "tasks_assign", label: "הקצאת משימות לאחרים" },
    { key: "queue_manage", label: "ניהול תור עבודות" },
    { key: "assign_jobs_manual", label: "שיבוץ עובדים ידנית" }
  ],
  "לקוחות ותקשורת": [
    { key: "customers_view_all", label: "צפייה בכל הלקוחות" },
    { key: "customers_create", label: "יצירת לקוח חדש" },
    { key: "customers_edit", label: "עריכת לקוחות" },
    { key: "customers_delete", label: "מחיקת לקוחות" },
    { key: "communication_whatsapp", label: "שליחת וואטסאפ" },
    { key: "communication_email", label: "שליחת אימייל" },
    { key: "communication_phone", label: "גישה למספרי טלפון" },
    { key: "surveys_view", label: "צפייה בסקרים" }
  ],
  "עובדים וניהול": [
    { key: "employees_view_all", label: "צפייה ברשימת עובדים" },
    { key: "employees_create", label: "הוספת עובד חדש" },
    { key: "employees_edit", label: "עריכת פרטי עובדים" },
    { key: "employees_delete", label: "מחיקת עובדים" },
    { key: "employees_manage_permissions", label: "עריכת הרשאות" },
    { key: "stats_view_others", label: "סטטיסטיקות עובדים" },
    { key: "audit_view", label: "היסטוריית שינויים" },
    { key: "warranty_view", label: "תעודות אחריות" },
    { key: "warranty_create", label: "יצירת תעודת אחריות" }
  ],
  "דוחות וסטטיסטיקות": [
    { key: "reports_view", label: "צפייה בדוחות" },
    { key: "reports_view_financial", label: "נתונים כספיים" },
    { key: "stats_view_revenue", label: "מחזור כספי" },
    { key: "stats_view_profit", label: "רווחיות" },
    { key: "export_data", label: "ייצוא נתונים" },
    { key: "print_documents", label: "הדפסת מסמכים" }
  ],
  "הגדרות מתקדמות": [
    { key: "settings_access", label: "גישה להגדרות מערכת" },
    { key: "settings_integrations", label: "ניהול אינטגרציות" },
    { key: "bot_access", label: "גישה לבוט AI" },
    { key: "bot_configure", label: "הגדרת אוטומציות" },
    { key: "templates_edit", label: "עריכת תבניות" },
    { key: "lead_sources_edit", label: "עריכת מקורות לידים" },
    { key: "media_upload", label: "העלאת תמונות" },
    { key: "media_delete", label: "מחיקת תמונות" }
  ]
};

// פונקציה לחישוב מדדים
const calculateUserMetrics = (user, jobs, leads, timeRange) => {
  if (!user) return { totalInstallations: 0, totalRevenue: 0, totalBatteries: 0, uniqueCustomers: 0, avgTime: 0 };
  
  const now = new Date();
  let interval;
  
  switch(timeRange) {
    case "day":
      interval = { start: startOfDay(now), end: now };
      break;
    case "week":
      interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: now };
      break;
    case "month":
      interval = { start: startOfMonth(now), end: now };
      break;
    case "quarter":
      interval = { start: startOfQuarter(now), end: now };
      break;
    case "all":
    default:
      interval = null;
  }
  
  // תיקון: גם אם אין end_time, עדיין נספור את העבודה
  let userJobs = jobs.filter(j => j.installer_email === user.email && j.status === "בוצע");
  
  if (interval) {
    userJobs = userJobs.filter(j => {
      // אם יש end_time - נבדוק לפי זה, אחרת לפי updated_date
      const dateToCheck = j.end_time ? new Date(j.end_time) : new Date(j.updated_date);
      return isWithinInterval(dateToCheck, interval);
    });
  }
  
  const totalInstallations = userJobs.length;
  
  const jobLeadIds = userJobs.map(j => j.lead_id).filter(Boolean);
  const relatedLeads = leads.filter(l => jobLeadIds.includes(l.id));
  const totalRevenue = _.sumBy(relatedLeads, l => l.actual_value || 0);
  
  const totalBatteries = userJobs.reduce((sum, job) => {
    return sum + (job.items?.length || 0);
  }, 0);
  
  const uniqueCustomers = _.uniq(userJobs.map(j => j.customer_name).filter(Boolean)).length;
  
  const jobsWithTime = userJobs.filter(j => j.start_time && j.end_time);
  let avgTime = 0;
  
  if (jobsWithTime.length > 0) {
    const totalMinutes = jobsWithTime.reduce((sum, job) => {
      const start = new Date(job.start_time);
      const end = new Date(job.end_time);
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      return sum + Math.max(0, diffMins);
    }, 0);
    
    avgTime = Math.round(totalMinutes / jobsWithTime.length);
  }
  
  return {
    totalInstallations,
    totalRevenue,
    totalBatteries,
    uniqueCustomers,
    avgTime
  };
};

const SimplePermissionsEditor = ({ user, onSave, onCancel, onAdvanced }) => {
  const [selectedProfile, setSelectedProfile] = useState(user.role_type || "custom");
  const [categoryPermissions, setCategoryPermissions] = useState({});

  useEffect(() => {
    const cats = {};
    Object.keys(SIMPLE_CATEGORIES).forEach(cat => {
      const permsInCat = SIMPLE_CATEGORIES[cat];
      const enabledCount = permsInCat.filter(p => user.permissions?.[p]).length;
      cats[cat] = enabledCount === permsInCat.length;
    });
    setCategoryPermissions(cats);
  }, [user]);

  const handleProfileClick = (profile) => {
    setSelectedProfile(profile);
    const profileConfig = PERMISSION_PROFILES[profile];
    const newCats = {};
    
    if (profileConfig.all) {
      Object.keys(SIMPLE_CATEGORIES).forEach(cat => {
        newCats[cat] = true;
      });
      if (profileConfig.except) {
        Object.keys(SIMPLE_CATEGORIES).forEach(cat => {
          const hasException = SIMPLE_CATEGORIES[cat].some(p => profileConfig.except.includes(p));
          if (hasException) newCats[cat] = false;
        });
      }
    } else {
      Object.keys(SIMPLE_CATEGORIES).forEach(cat => {
        const permsInCat = SIMPLE_CATEGORIES[cat];
        const enabledCount = permsInCat.filter(p => profileConfig[p]).length;
        newCats[cat] = enabledCount === permsInCat.length;
      });
    }
    
    setCategoryPermissions(newCats);
  };

  const handleSave = () => {
    const fullPermissions = {};
    Object.keys(SIMPLE_CATEGORIES).forEach(cat => {
      SIMPLE_CATEGORIES[cat].forEach(perm => {
        fullPermissions[perm] = categoryPermissions[cat] || false;
      });
    });
    
    onSave({ 
      id: user.id, 
      data: { 
        permissions: fullPermissions,
        role_type: selectedProfile !== "custom" ? selectedProfile : user.role_type 
      } 
    });
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className="border-2 border-blue-500 shadow-2xl bg-white">
        <CardHeader className="flex-row items-center justify-between border-b">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              הרשאות - {user.full_name}
            </CardTitle>
            <p className="text-sm text-slate-500 mt-1">בחר פרופיל או התאם בעצמך</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">📋 בחר פרופיל מהיר:</Label>
            <div className="grid grid-cols-3 gap-2">
              {["בעלים", "מנכל", "מזכירה", "איש צוות", "מחסנאי", "צופה"].map(profile => (
                <Button
                  key={profile}
                  variant={selectedProfile === profile ? "default" : "outline"}
                  onClick={() => handleProfileClick(profile)}
                  className="text-xs h-10"
                >
                  {profile === "בעלים" && "👑"}
                  {profile === "מנכל" && "💼"}
                  {profile === "מזכירה" && "📞"}
                  {profile === "איש צוות" && "🔧"}
                  {profile === "מחסנאי" && "📦"}
                  {profile === "צופה" && "👀"}
                  {" "}{profile}
                </Button>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <Label className="text-sm font-semibold mb-3 block">או התאם ידנית:</Label>
            <div className="space-y-3">
              {Object.keys(SIMPLE_CATEGORIES).map(category => (
                <div key={category} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                  <Label htmlFor={category} className="text-sm font-medium cursor-pointer">
                    {category === "לידים" && "📊"} 
                    {category === "כספים" && "💰"} 
                    {category === "מלאי" && "📦"} 
                    {category === "עבודות" && "🔧"} 
                    {category === "לקוחות" && "👥"} 
                    {category === "עובדים" && "👨‍💼"} 
                    {category === "דוחות" && "📈"} 
                    {category === "הגדרות" && "⚙️"} 
                    {" "}{category}
                  </Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {categoryPermissions[category] ? "כן" : "לא"}
                    </span>
                    <Switch
                      id={category}
                      checked={categoryPermissions[category] || false}
                      onCheckedChange={(checked) => {
                        setCategoryPermissions({...categoryPermissions, [category]: checked});
                        setSelectedProfile("custom");
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onAdvanced}
              className="w-full"
            >
              <ChevronDown className="w-4 h-4 ml-2" />
              רוצה לערוך לעומק? לחץ כאן
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={onCancel}>ביטול</Button>
              <Button onClick={handleSave} className="bg-blue-600">
                💾 שמור
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const AdvancedPermissionsEditor = ({ user, onSave, onCancel }) => {
  const [permissions, setPermissions] = useState(user.permissions || {});

  const toggleCategory = (category, enabled) => {
    const newPerms = { ...permissions };
    PERMISSION_CATEGORIES[category].forEach(p => {
      newPerms[p.key] = enabled;
    });
    setPermissions(newPerms);
  };

  const togglePermission = (key) => {
    setPermissions({ ...permissions, [key]: !permissions[key] });
  };

  const getCategoryStatus = (category) => {
    const perms = PERMISSION_CATEGORIES[category];
    const enabled = perms.filter(p => permissions[p.key]).length;
    return { enabled, total: perms.length };
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className="border-2 border-purple-500 shadow-2xl bg-white">
        <CardHeader className="flex-row items-center justify-between border-b">
          <div>
            <CardTitle>עריכה מתקדמת - {user.full_name}</CardTitle>
            <p className="text-sm text-slate-500 mt-1">שליטה מלאה בכל הרשאה</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          <Tabs defaultValue="לידים ומכירות" className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="לידים ומכירות" className="text-xs">📊</TabsTrigger>
              <TabsTrigger value="כספים ומסמכים" className="text-xs">💰</TabsTrigger>
              <TabsTrigger value="מלאי וספקים" className="text-xs">📦</TabsTrigger>
              <TabsTrigger value="עבודות ומשימות" className="text-xs">🔧</TabsTrigger>
            </TabsList>
            <TabsList className="grid w-full grid-cols-4 h-auto mt-2">
              <TabsTrigger value="לקוחות ותקשורת" className="text-xs">👥</TabsTrigger>
              <TabsTrigger value="עובדים וניהול" className="text-xs">👨‍💼</TabsTrigger>
              <TabsTrigger value="דוחות וסטטיסטיקות" className="text-xs">📈</TabsTrigger>
              <TabsTrigger value="הגדרות מתקדמות" className="text-xs">⚙️</TabsTrigger>
            </TabsList>

            {Object.keys(PERMISSION_CATEGORIES).map(category => {
              const { enabled, total } = getCategoryStatus(category);
              return (
                <TabsContent key={category} value={category} className="space-y-4 mt-4">
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                    <Label className="font-semibold">{category}</Label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{enabled}/{total}</span>
                      <Switch
                        checked={enabled === total}
                        onCheckedChange={(checked) => toggleCategory(category, checked)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PERMISSION_CATEGORIES[category].map(perm => (
                      <div key={perm.key} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                        <Label htmlFor={perm.key} className="text-sm cursor-pointer">{perm.label}</Label>
                        <Switch
                          id={perm.key}
                          checked={permissions[perm.key] || false}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>ביטול</Button>
            <Button onClick={() => onSave({ id: user.id, data: { permissions } })} className="bg-purple-600">
              💾 שמור
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const QuickEditCard = ({ user, onSave, onCancel }) => {
  const [roleType, setRoleType] = useState(user.role_type || "איש צוות");
  const [availabilityStatus, setAvailabilityStatus] = useState(user.availability_status || "פנוי");
  const [phone, setPhone] = useState(user.phone || "");

  const handleSave = () => {
    onSave({ 
      id: user.id, 
      data: { 
        role_type: roleType,
        availability_status: availabilityStatus,
        phone: phone
      } 
    });
  };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className="border-2 border-green-500 shadow-2xl bg-white">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>עדכון מהיר - {user.full_name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-4 h-4" /></Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>תפקיד *</Label>
            <Select value={roleType} onValueChange={setRoleType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="בעלים">בעלים</SelectItem>
                <SelectItem value="מנכל">מנכ"ל</SelectItem>
                <SelectItem value="מזכירה">מזכירה</SelectItem>
                <SelectItem value="איש צוות">איש צוות</SelectItem>
                <SelectItem value="מחסנאי">מחסנאי</SelectItem>
                <SelectItem value="צופה">צופה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>סטטוס זמינות *</Label>
            <Select value={availabilityStatus} onValueChange={setAvailabilityStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="פנוי">🟢 פנוי</SelectItem>
                <SelectItem value="בעבודה">🟡 בעבודה</SelectItem>
                <SelectItem value="בחופש">🔴 בחופש</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>טלפון</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="מספר טלפון" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>ביטול</Button>
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">שמור</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const UserMetricsDialog = ({ user, metrics, timeRange, onTimeRangeChange, onClose }) => {
  if (!user || !metrics) return null;
  
  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            מדדי ביצועים - {user.full_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant={timeRange === "day" ? "default" : "outline"}
              onClick={() => onTimeRangeChange("day")}
            >
              היום
            </Button>
            <Button 
              size="sm" 
              variant={timeRange === "week" ? "default" : "outline"}
              onClick={() => onTimeRangeChange("week")}
            >
              שבוע
            </Button>
            <Button 
              size="sm" 
              variant={timeRange === "month" ? "default" : "outline"}
              onClick={() => onTimeRangeChange("month")}
            >
              חודש
            </Button>
            <Button 
              size="sm" 
              variant={timeRange === "quarter" ? "default" : "outline"}
              onClick={() => onTimeRangeChange("quarter")}
            >
              רבעון
            </Button>
            <Button 
              size="sm" 
              variant={timeRange === "all" ? "default" : "outline"}
              onClick={() => onTimeRangeChange("all")}
            >
              כל הזמן
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-900">{metrics.totalInstallations}</p>
                    <p className="text-xs text-blue-700">התקנות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-900">₪{metrics.totalRevenue.toLocaleString()}</p>
                    <p className="text-xs text-green-700">הכנסות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-900">{metrics.totalBatteries}</p>
                    <p className="text-xs text-purple-700">מוצרים</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-900">{metrics.uniqueCustomers}</p>
                    <p className="text-xs text-orange-700">לקוחות</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-none shadow-md bg-gradient-to-br from-pink-50 to-pink-100">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-pink-600" />
                  <div>
                    <p className="text-2xl font-bold text-pink-900">{metrics.avgTime}</p>
                    <p className="text-xs text-pink-700">דקות ממוצע</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function Employees() {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [quickEditingUser, setQuickEditingUser] = useState(null);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [viewingUserMetrics, setViewingUserMetrics] = useState(null);
  const [metricsTimeRange, setMetricsTimeRange] = useState("month");
  const [newEmployee, setNewEmployee] = useState({ fullName: "", email: "", password: "", role: "user" });
  const [addError, setAddError] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me()
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.entities.User.list(),
    initialData: [],
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list(),
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => supabase.entities.Job.list(),
    initialData: [],
  });

  const addEmployeeMutation = useMutation({
    mutationFn: ({ fullName, email, password, role }) =>
      supabase.org.inviteMember(email, password, fullName, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setNewEmployee({ fullName: "", email: "", password: "", role: "user" });
      setAddError("");
      toast({ title: "✓ העובד נוסף בהצלחה" });
    },
    onError: (error) => {
      setAddError(error.message);
    }
  });

  const handleAddEmployee = () => {
    setAddError("");
    if (!newEmployee.fullName || !newEmployee.email || !newEmployee.password) {
      setAddError("יש למלא שם, אימייל וסיסמה");
      return;
    }
    if (newEmployee.password.length < 6) {
      setAddError("סיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    addEmployeeMutation.mutate(newEmployee);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.User.update(id, data),
    onSuccess: async (updatedUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setEditingUser(null);
      setQuickEditingUser(null);
      setAdvancedMode(false);
      
      if (updatedUser.availability_status === "פנוי" && updatedUser.role_type === "איש צוות") {
        const waitingLeads = leads
          .filter(l => l.status === "ממתין לטיפול" && !l.assignee_id)
          .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        
        if (waitingLeads.length > 0) {
          const nextLead = waitingLeads[0];
          
          try {
            const newJob = await supabase.entities.Job.create({
              lead_id: nextLead.id,
              customer_name: nextLead.customer_name,
              installation_address: nextLead.customer_address,
              service_type: nextLead.service_type,
              installer_email: updatedUser.email,
              installer_name: updatedUser.full_name,
              status: "פתוח",
              items: nextLead.items || [],
              start_time: new Date().toISOString(),
              notes: nextLead.notes || ""
            });
            
            await supabase.entities.Lead.update(nextLead.id, {
              assignee_id: updatedUser.id,
              job_id: newJob.id,
              internal_p_paid_assigned: true
            });
            
            await supabase.entities.User.update(updatedUser.id, {
              availability_status: "בעבודה"
            });
            
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
            
            toast({ 
              title: "✓ עבודה חדשה נמשכה מהתור!", 
              description: `${updatedUser.full_name} שובץ ללקוח: ${nextLead.customer_name}`,
              duration: 6000
            });
          } catch (error) {
            toast({ title: "שגיאה במשיכת עבודה מהתור", description: error.message, variant: "destructive" });
          }
        } else {
          toast({ title: "✓ העובד עודכן" });
        }
      } else {
        toast({ title: "✓ העובד עודכן בהצלחה" });
      }
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון עובד", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (userId) => supabase.entities.User.delete(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: "✓ העובד נמחק" });
    },
  });

  const isAdmin = currentUser?.role === "admin";

  const handleDeleteUser = (user) => {
    if (!isAdmin) {
      toast({ title: "אין הרשאה", variant: "destructive" });
      return;
    }
    
    if (confirm(`האם למחוק את ${user.full_name}?`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleVacationToggle = (user) => {
    const newStatus = user.availability_status === "בחופש" ? "פנוי" : "בחופש";
    updateMutation.mutate({
      id: user.id,
      data: { availability_status: newStatus }
    });
  };

  const handleViewMetrics = (user) => {
    setViewingUserMetrics(user);
    setMetricsTimeRange("month");
  };

  // תיקון: אם זה לא אדמין ואין נתונים ב-users - נציג את המשתמש הנוכחי
  let displayedUsers = isAdmin ? users : users.filter(u => u.email === currentUser?.email);
  
  // אם זה לא אדמין והרשימה ריקה - נוסיף את המשתמש הנוכחי ידנית
  if (!isAdmin && displayedUsers.length === 0 && currentUser) {
    displayedUsers = [currentUser];
  }
  
  const usersWithMetrics = useMemo(() => {
    return displayedUsers.map(user => {
      const metrics = calculateUserMetrics(user, jobs, leads, metricsTimeRange);
      return {
        ...user,
        metrics: metrics || {
          totalInstallations: 0,
          totalRevenue: 0,
          totalBatteries: 0,
          uniqueCustomers: 0,
          avgTime: 0
        }
      };
    });
  }, [displayedUsers, jobs, leads, metricsTimeRange]);
  
  const viewingUserMetricsData = viewingUserMetrics ? 
    calculateUserMetrics(viewingUserMetrics, jobs, leads, metricsTimeRange) : null;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <UsersIcon className="w-10 h-10 text-blue-600" />
              {isAdmin ? "צוות העובדים" : "הפרופיל שלי"}
            </h1>
            <p className="text-slate-600">
              {isAdmin ? `רשימת כל העובדים במערכת (${users.length})` : "פרטים אישיים ומדדי ביצועים"}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-5 h-5 ml-2" />
              הוסף עובד
            </Button>
          )}
        </motion.div>

        {!isAdmin && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <Button 
              size="sm" 
              variant={metricsTimeRange === "day" ? "default" : "outline"}
              onClick={() => setMetricsTimeRange("day")}
            >
              היום
            </Button>
            <Button 
              size="sm" 
              variant={metricsTimeRange === "week" ? "default" : "outline"}
              onClick={() => setMetricsTimeRange("week")}
            >
              שבוע
            </Button>
            <Button 
              size="sm" 
              variant={metricsTimeRange === "month" ? "default" : "outline"}
              onClick={() => setMetricsTimeRange("month")}
            >
              חודש
            </Button>
            <Button 
              size="sm" 
              variant={metricsTimeRange === "quarter" ? "default" : "outline"}
              onClick={() => setMetricsTimeRange("quarter")}
            >
              רבעון
            </Button>
            <Button 
              size="sm" 
              variant={metricsTimeRange === "all" ? "default" : "outline"}
              onClick={() => setMetricsTimeRange("all")}
            >
              כל הזמן
            </Button>
          </div>
        )}

        {/* הודעת טעינה */}
        {!currentUser && (
          <Card className="p-12 text-center">
            <Loader2 className="w-16 h-16 mx-auto text-blue-600 mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">טוען נתונים...</h3>
            <p className="text-slate-500">אנא המתן</p>
          </Card>
        )}

        {/* הודעה אם אין נתונים */}
        {currentUser && displayedUsers.length === 0 && (
          <Card className="p-12 text-center">
            <UsersIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">לא נמצאו נתונים</h3>
            <p className="text-slate-500">אנא נסה לרענן את הדף</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['users'] })} className="mt-4">
              <RefreshCw className="w-4 h-4 ml-2" />
              רענן
            </Button>
          </Card>
        )}

        {/* תצוגת הכרטיסים */}
        {currentUser && displayedUsers.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {usersWithMetrics.map((user) => (
              quickEditingUser?.id === user.id ? (
                <QuickEditCard key={user.id} user={quickEditingUser} onSave={updateMutation.mutate} onCancel={() => setQuickEditingUser(null)} />
              ) : editingUser?.id === user.id ? (
                advancedMode ? (
                  <AdvancedPermissionsEditor 
                    key={user.id} 
                    user={editingUser}
                    onSave={updateMutation.mutate}
                    onCancel={() => { setEditingUser(null); setAdvancedMode(false); }} 
                  />
                ) : (
                  <SimplePermissionsEditor 
                    key={user.id} 
                    user={editingUser}
                    onSave={updateMutation.mutate}
                    onCancel={() => setEditingUser(null)}
                    onAdvanced={() => setAdvancedMode(true)}
                  />
                )
              ) : (
                <motion.div key={user.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all h-full flex flex-col">
                    <CardContent className="p-6 flex-grow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white font-bold text-xl">{user.full_name?.[0] || 'U'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{user.full_name}</h3>
                          <p className="text-sm text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <Badge className={roleColors[user.role_type] || "bg-gray-100 text-gray-800"}>{user.role_type || "לא מוגדר"}</Badge>
                        {user.availability_status && <Badge className={statusColors[user.availability_status]}>{user.availability_status}</Badge>}
                        {user.phone && (<Badge variant="outline">📞 {user.phone}</Badge>)}
                      </div>

                      <div className="mt-4 pt-4 border-t space-y-2">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">📊 מדדי ביצועים:</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-blue-50 rounded">
                            <span className="text-blue-600 font-bold">{user.metrics?.totalInstallations || 0}</span>
                            <span className="text-slate-600"> התקנות</span>
                          </div>
                          <div className="p-2 bg-green-50 rounded">
                            <span className="text-green-600 font-bold">₪{(user.metrics?.totalRevenue || 0).toLocaleString()}</span>
                            <span className="text-slate-600 text-xs block">הכנסות</span>
                          </div>
                          <div className="p-2 bg-purple-50 rounded">
                            <span className="text-purple-600 font-bold">{user.metrics?.totalBatteries || 0}</span>
                            <span className="text-slate-600"> מוצרים</span>
                          </div>
                          <div className="p-2 bg-orange-50 rounded">
                            <span className="text-orange-600 font-bold">{user.metrics?.uniqueCustomers || 0}</span>
                            <span className="text-slate-600"> לקוחות</span>
                          </div>
                        </div>
                        <div className="p-2 bg-pink-50 rounded text-center">
                          <span className="text-pink-600 font-bold">{user.metrics?.avgTime || 0}</span>
                          <span className="text-slate-600 text-xs"> דקות ממוצע</span>
                        </div>
                      </div>

                      {!isAdmin && user.availability_status !== "בעבודה" && (
                        <div className="mt-4 pt-4 border-t">
                          <Button onClick={() => handleVacationToggle(user)} className={`w-full ${user.availability_status === "בחופש" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                            {user.availability_status === "בחופש" ? "✓ חזרתי לעבודה" : "🏖️ אני בחופש"}
                          </Button>
                        </div>
                      )}

                      {user.availability_status === "בעבודה" && !isAdmin && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-slate-500 text-center bg-yellow-50 p-2 rounded">
                            🟡 אתה בעבודה - הסטטוס ישתנה אוטומטית
                          </p>
                        </div>
                      )}
                    </CardContent>
                    
                    {isAdmin && (
                      <CardContent className="p-4 border-t mt-auto">
                        <div className="grid grid-cols-4 gap-2">
                          <Button variant="outline" size="sm" onClick={() => setQuickEditingUser(user)} className="text-xs">
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => { setEditingUser(user); setAdvancedMode(false); }} className="text-xs">
                            <Sparkles className="w-3 h-3" />
                          </Button>
                          {user.role_type === "איש צוות" && (
                            <Button variant="outline" size="sm" onClick={() => handleViewMetrics(user)} className="text-xs">
                              <TrendingUp className="w-3 h-3" />
                            </Button>
                          )}
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteUser(user)} className="text-xs">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                </motion.div>
              )
            ))}
          </div>
        )}
      </div>
      
      {viewingUserMetrics && (
        <UserMetricsDialog
          user={viewingUserMetrics}
          metrics={viewingUserMetricsData}
          timeRange={metricsTimeRange}
          onTimeRangeChange={setMetricsTimeRange}
          onClose={() => setViewingUserMetrics(null)}
        />
      )}

      {/* דיאלוג הוספת עובד */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setAddError(""); } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת עובד חדש</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם מלא *</Label>
              <Input
                value={newEmployee.fullName}
                onChange={(e) => setNewEmployee({...newEmployee, fullName: e.target.value})}
                placeholder="שם העובד"
              />
            </div>
            <div className="space-y-2">
              <Label>אימייל *</Label>
              <Input
                type="email"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                placeholder="email@example.com"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>סיסמה * (מינימום 6 תווים)</Label>
              <Input
                type="password"
                value={newEmployee.password}
                onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                placeholder="סיסמה"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>תפקיד</Label>
              <Select value={newEmployee.role} onValueChange={(value) => setNewEmployee({...newEmployee, role: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">עובד</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {addError && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{addError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setAddError(""); }}>ביטול</Button>
            <Button onClick={handleAddEmployee} disabled={addEmployeeMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {addEmployeeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              הוסף עובד
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
