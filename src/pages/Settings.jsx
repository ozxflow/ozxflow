import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Save, Loader2, Eye, GitBranch, CreditCard, Users, Shield, Edit, Building2, Upload, Trash2, LayoutGrid, Plus, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { appConfig } from "@/config/appConfig";

const ALL_LEAD_STATUSES = [
  "חדש", "בטיפול", "נקבעה פגישה", "התקיימה פגישה", "הצעת מחיר", "לא סגר", "סגר",
  "רשום לאתר הרכב", "מודעת דרוש", "מודעת רכב", "נרשם לוובינר", "קיבל הקלטה",
  "רכש קורס", "לידים לליווי המלא", "רכש ליווי מלא", "לא סגר ליווי", "לא רלוונטי"
];

const CUBE_COLORS = [
  { id: "text-blue-600", name: "כחול", bg: "bg-blue-100" },
  { id: "text-purple-600", name: "סגול", bg: "bg-purple-100" },
  { id: "text-green-600", name: "ירוק", bg: "bg-green-100" },
  { id: "text-indigo-600", name: "אינדיגו", bg: "bg-indigo-100" },
  { id: "text-cyan-600", name: "תכלת", bg: "bg-cyan-100" },
  { id: "text-teal-600", name: "טורקיז", bg: "bg-teal-100" },
  { id: "text-amber-600", name: "ענבר", bg: "bg-amber-100" },
  { id: "text-emerald-600", name: "אמרלד", bg: "bg-emerald-100" },
  { id: "text-orange-600", name: "כתום", bg: "bg-orange-100" },
  { id: "text-red-600", name: "אדום", bg: "bg-red-100" },
  { id: "text-pink-600", name: "ורוד", bg: "bg-pink-100" },
  { id: "text-sky-600", name: "שמיים", bg: "bg-sky-100" },
];

const DEFAULT_STATUS_CUBES = [
  { status: "חדש", color: "text-blue-600" },
  { status: "בטיפול", color: "text-purple-600" },
  { status: "נקבעה פגישה", color: "text-green-600" },
  { status: "התקיימה פגישה", color: "text-indigo-600" },
  { status: "הצעת מחיר", color: "text-cyan-600" },
  { status: "לא סגר", color: "text-red-600" },
  { status: "סגר", color: "text-emerald-600" },
];

const allModules = [
  { id: 'Leads', name: 'לידים' },
  { id: 'Quotes', name: 'הצעות מחיר' },
  { id: 'Jobs', name: 'עבודות' },
  { id: 'Tasks', name: 'המשימות שלי' },
  { id: 'Employees', name: 'עובדים' },
  { id: 'Inventory', name: 'מלאי' },
  { id: 'SupplierOrders', name: 'הזמנות מספקים'},
  { id: 'Suppliers', name: 'ספקים' },
  { id: 'Reports', name: 'דוחות' },
  { id: 'Bot', name: 'בוט' },
];

const PERMISSION_CATEGORIES = {
  "לידים": ["leads_view_all", "leads_create", "leads_edit", "leads_delete", "leads_view_prices", "leads_change_status"],
  "כספים": ["quotes_view", "quotes_create", "quotes_edit", "quotes_delete", "quotes_view_prices", "quotes_send", "quotes_create_payment_link", "invoices_view", "invoices_view_amounts", "invoices_delete", "payments_view", "payments_refund", "payments_manual_update"],
  "מלאי": ["inventory_view", "inventory_view_costs", "inventory_create", "inventory_edit", "inventory_delete", "inventory_update_stock", "suppliers_view", "suppliers_view_costs", "suppliers_create_order", "suppliers_edit", "suppliers_delete"],
  "עבודות": ["jobs_view_all", "jobs_change_status", "jobs_delete", "tasks_view_all", "tasks_create", "tasks_edit", "tasks_delete", "tasks_assign", "queue_manage", "assign_jobs_manual"],
  "לקוחות": ["customers_view_all", "customers_create", "customers_edit", "customers_delete", "communication_whatsapp", "communication_email", "communication_phone", "surveys_view"],
  "עובדים": ["employees_view_all", "employees_create", "employees_edit", "employees_delete", "employees_manage_permissions", "stats_view_others", "audit_view", "warranty_view", "warranty_create"],
  "דוחות": ["reports_view", "reports_view_financial", "stats_view_revenue", "stats_view_profit", "export_data", "print_documents"],
  "הגדרות": ["settings_access", "settings_integrations", "bot_access", "bot_configure", "templates_edit", "lead_sources_edit", "media_upload", "media_delete"]
};

// פונקציה לבדוק אם לעובד יש גישה לדף
const hasAccessToPage = (user, pageName) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  
  const permissions = user.permissions || {};
  
  switch(pageName) {
    case "Leads":
      return permissions.leads_view_all;
    case "Quotes":
      return permissions.quotes_view;
    case "Invoices":
      return permissions.invoices_view;
    case "Customers":
      return permissions.customers_view_all;
    case "Jobs":
      return permissions.jobs_view_all || permissions.jobs_change_status;
    case "Tasks":
      return true;
    case "Employees":
      return true;
    case "Inventory":
      return permissions.inventory_view;
    case "Suppliers":
      return permissions.suppliers_view;
    case "SupplierOrders":
      return permissions.suppliers_view;
    case "Reports":
      return permissions.reports_view;
    case "Bot":
      return permissions.bot_access;
    case "Settings":
      return permissions.settings_access;
    default:
      return false;
  }
};

const pagesList = [
  { id: 'Leads', name: 'לידים', icon: '📊' },
  { id: 'Quotes', name: 'הצעות', icon: '💰' },
  { id: 'Invoices', name: 'חשבוניות', icon: '🧾' },
  { id: 'Customers', name: 'לקוחות', icon: '👥' },
  { id: 'Jobs', name: 'עבודות', icon: '🔧' },
  { id: 'Tasks', name: 'משימות', icon: '✅' },
  { id: 'Employees', name: 'עובדים', icon: '👨‍💼' },
  { id: 'Inventory', name: 'מלאי', icon: '📦' },
  { id: 'Suppliers', name: 'ספקים', icon: '🏭' },
  { id: 'SupplierOrders', name: 'הזמנות', icon: '📋' },
  { id: 'Reports', name: 'דוחות', icon: '📈' },
  { id: 'Bot', name: 'בוט', icon: '🤖' },
  { id: 'Settings', name: 'הגדרות', icon: '⚙️' }
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const results = await supabase.entities.Settings.list();
      return results[0] || {};
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.entities.User.list(),
    initialData: []
  });

  const [visibleModules, setVisibleModules] = useState([]);
  const [leadAssignment, setLeadAssignment] = useState({ auto_assign: true, assignment_method: 'round_robin' });
  const [cardcomSettings, setCardcomSettings] = useState({
    terminal_number: "",
    api_name: "",
    success_redirect_url: "",
    failed_redirect_url: "",
    webhook_url: ""
  });
  
  const [brandingSettings, setBrandingSettings] = useState({
    business_name: "",
    business_logo: ""
  });

  const [statusCubes, setStatusCubes] = useState(DEFAULT_STATUS_CUBES);
  const [editingCubeIndex, setEditingCubeIndex] = useState(null);
  const [editingCubeName, setEditingCubeName] = useState("");
  const [previousCubes, setPreviousCubes] = useState(null);
  const [newCustomStatus, setNewCustomStatus] = useState("");
  const [jobStartButtonText, setJobStartButtonText] = useState("🚗 יצאתי לדרך");
  const [defaultLeadStatus, setDefaultLeadStatus] = useState("חדש");
  const [defaultLeadRating, setDefaultLeadRating] = useState("");

  const [selectedRole, setSelectedRole] = useState("איש צוות");
  const [rolePermissions, setRolePermissions] = useState({});
  
  const [editingUser, setEditingUser] = useState(null);
  const [userPageAccess, setUserPageAccess] = useState({});

  useEffect(() => {
    if (settings) {
      setVisibleModules(settings.visible_modules || allModules.map(m => m.id));
      setLeadAssignment(settings.lead_assignment_rules || { auto_assign: true, assignment_method: 'round_robin' });
      setCardcomSettings(settings.cardcom_settings || {
        terminal_number: "",
        api_name: "",
        success_redirect_url: "",
        failed_redirect_url: "",
        webhook_url: ""
      });
      setBrandingSettings({
        business_name: settings.business_name || "",
        business_logo: settings.business_logo || ""
      });
      setStatusCubes(settings.lead_status_cubes?.length > 0 ? settings.lead_status_cubes : DEFAULT_STATUS_CUBES);
      setJobStartButtonText(settings.job_start_button_text || "🚗 יצאתי לדרך");
      setDefaultLeadStatus(settings.default_lead_status || "חדש");
      setDefaultLeadRating(settings.default_lead_rating || "");
    }
  }, [settings]);

  useEffect(() => {
    const usersInRole = users.filter(u => u.role_type === selectedRole);
    if (usersInRole.length > 0) {
      const firstUser = usersInRole[0];
      const perms = {};
      Object.keys(PERMISSION_CATEGORIES).forEach(cat => {
        const allPermsInCat = PERMISSION_CATEGORIES[cat];
        const enabledCount = allPermsInCat.filter(p => firstUser.permissions?.[p]).length;
        perms[cat] = enabledCount === allPermsInCat.length;
      });
      setRolePermissions(perms);
    }
  }, [selectedRole, users]);

  const updateMutation = useMutation({
    mutationFn: (newSettings) => {
      if (settings && settings.id) {
        return supabase.entities.Settings.update(settings.id, newSettings);
      } else {
        return supabase.entities.Settings.create(newSettings);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: "✓ ההגדרות נשמרו בהצלחה!" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בשמירת הגדרות", description: error.message, variant: 'destructive' });
    }
  });

  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ role, permissions }) => {
      const usersInRole = users.filter(u => u.role_type === role);
      
      const fullPermissions = {};
      Object.keys(PERMISSION_CATEGORIES).forEach(cat => {
        PERMISSION_CATEGORIES[cat].forEach(perm => {
          fullPermissions[perm] = permissions[cat] || false;
        });
      });

      const updates = usersInRole.map(user => 
        supabase.entities.User.update(user.id, { 
          ...user,
          permissions: fullPermissions 
        })
      );

      return Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      const count = users.filter(u => u.role_type === variables.role).length;
      toast({ 
        title: `✓ עודכנו ${count} עובדים!`,
        description: `כל ה${variables.role}ים עודכנו בהצלחה`
      });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון הרשאות", description: error.message, variant: 'destructive' });
    }
  });

  const updateUserPermissionsMutation = useMutation({
    mutationFn: async ({ userId, pageAccess }) => {
      const user = users.find(u => u.id === userId);
      if (!user) throw new Error("User not found");
      
      const fullPermissions = { ...user.permissions };
      
      // עדכן הרשאות לפי גישה לדפים
      Object.keys(pageAccess).forEach(pageId => {
        const hasAccess = pageAccess[pageId];
        
        switch(pageId) {
          case "Leads":
            fullPermissions.leads_view_all = hasAccess;
            fullPermissions.leads_create = hasAccess;
            fullPermissions.leads_edit = hasAccess;
            break;
          case "Quotes":
            fullPermissions.quotes_view = hasAccess;
            fullPermissions.quotes_create = hasAccess;
            fullPermissions.quotes_edit = hasAccess;
            break;
          case "Invoices":
            fullPermissions.invoices_view = hasAccess;
            break;
          case "Customers":
            fullPermissions.customers_view_all = hasAccess;
            fullPermissions.customers_create = hasAccess;
            fullPermissions.customers_edit = hasAccess;
            break;
          case "Jobs":
            fullPermissions.jobs_view_all = hasAccess;
            fullPermissions.jobs_change_status = hasAccess;
            break;
          case "Inventory":
            fullPermissions.inventory_view = hasAccess;
            break;
          case "Suppliers":
            fullPermissions.suppliers_view = hasAccess;
            break;
          case "SupplierOrders":
            fullPermissions.suppliers_view = hasAccess;
            break;
          case "Reports":
            fullPermissions.reports_view = hasAccess;
            break;
          case "Bot":
            fullPermissions.bot_access = hasAccess;
            break;
          case "Settings":
            fullPermissions.settings_access = hasAccess;
            break;
        }
      });
      
      return supabase.entities.User.update(userId, { permissions: fullPermissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast({ title: "✓ ההרשאות עודכנו!" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון", description: error.message, variant: 'destructive' });
    }
  });

  const handleSave = () => {
    updateMutation.mutate({
      visible_modules: visibleModules,
      lead_assignment_rules: leadAssignment,
      cardcom_settings: cardcomSettings,
      business_name: brandingSettings.business_name,
      business_logo: brandingSettings.business_logo,
      lead_status_cubes: statusCubes,
      job_start_button_text: jobStartButtonText,
      default_lead_status: defaultLeadStatus,
      default_lead_rating: defaultLeadRating
    });
  };

  const handleLogoUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const { file_url } = await supabase.integrations.Core.UploadFile({ file });
          setBrandingSettings({...brandingSettings, business_logo: file_url});
          toast({ title: "✓ הלוגו הועלה בהצלחה" });
        } catch (error) {
          toast({ title: "שגיאה בהעלאת לוגו", description: error.message, variant: "destructive" });
        }
      }
    };
    input.click();
  };

  const toggleModule = (moduleId) => {
    setVisibleModules(prev =>
      prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
    );
  };

  const handleUpdateRolePermissions = () => {
    updateRolePermissionsMutation.mutate({ 
      role: selectedRole, 
      permissions: rolePermissions 
    });
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    const access = {};
    pagesList.forEach(page => {
      access[page.id] = hasAccessToPage(user, page.id);
    });
    setUserPageAccess(access);
  };

  const handleSaveUserPermissions = () => {
    updateUserPermissionsMutation.mutate({
      userId: editingUser.id,
      pageAccess: userPageAccess
    });
  };

  const usersInSelectedRole = users.filter(u => u.role_type === selectedRole);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="w-12 h-12 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-3 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <SettingsIcon className="w-7 h-7 md:w-10 md:h-10 text-blue-600" />
              הגדרות מערכת
            </h1>
            <p className="text-sm md:text-base text-slate-600">ניהול הגדרות ותצורות כלליות של המערכת</p>
          </div>
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="sm" className="md:size-default">
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            שמור שינויים
          </Button>
        </motion.div>

        <Tabs defaultValue="branding" className="space-y-4 md:space-y-6">
          <TabsList className="flex w-full bg-slate-100 gap-0.5 p-1">
              <TabsTrigger value="branding" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><Building2 className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0" />מיתוג</TabsTrigger>
              <TabsTrigger value="overview" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><Shield className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0" />הרשאות</TabsTrigger>
              <TabsTrigger value="permissions" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><Users className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0" />קבוצתיות</TabsTrigger>
              <TabsTrigger value="modules" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><Eye className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0"/>מודולים</TabsTrigger>
              <TabsTrigger value="leads" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><GitBranch className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0"/>לידים</TabsTrigger>
              <TabsTrigger value="cardcom" className="flex-1 min-w-0 whitespace-normal text-[10px] md:text-sm px-1 md:px-3 gap-0.5"><CreditCard className="w-3 h-3 md:w-4 md:h-4 hidden sm:block flex-shrink-0"/>Cardcom</TabsTrigger>
          </TabsList>

          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5"/>
                  מיתוג העסק
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-base font-semibold">שם העסק</Label>
                  <Input
                    id="business_name"
                    value={brandingSettings.business_name}
                    onChange={(e) => setBrandingSettings({...brandingSettings, business_name: e.target.value})}
                    placeholder="שם העסק שלך"
                    className="text-lg h-12"
                  />
                  <p className="text-sm text-slate-500">השם יוצג בתפריט הראשי ובראש העמוד</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold">לוגו העסק</Label>
                  <div className="flex items-center gap-4">
                    {brandingSettings.business_logo ? (
                      <div className="relative">
                        <img 
                          src={brandingSettings.business_logo} 
                          alt="לוגו העסק" 
                          className="w-20 h-20 object-contain rounded-xl border shadow-md bg-white"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                          onClick={() => setBrandingSettings({...brandingSettings, business_logo: ""})}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    <Button onClick={handleLogoUpload} variant="outline" className="h-12">
                      <Upload className="w-4 h-4 ml-2" />
                      {brandingSettings.business_logo ? "החלף לוגו" : "העלה לוגו"}
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">הלוגו יוצג בתפריט הראשי (מומלץ: תמונה מרובעת)</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2 text-blue-900">💡 תצוגה מקדימה:</h4>
                  <div className="flex items-center gap-3 bg-white p-4 rounded-lg border">
                    {brandingSettings.business_logo ? (
                      <img src={brandingSettings.business_logo} alt="לוגו" className="w-10 h-10 object-contain rounded-xl" />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-slate-900 text-lg">{brandingSettings.business_name || "שם העסק"}</h2>
                      <p className="text-xs text-slate-500">מערכת ניהול</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-6 mt-6">
                  <h4 className="font-semibold mb-3 text-slate-700">קרדיט ויצירת קשר</h4>
                  <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm text-slate-600">
                    <p>
                      💬 <strong>רוצה מערכת כזו?</strong>{" "}
                      <a 
                        href={`https://wa.me/${appConfig.supportWhatsApp}?text=${encodeURIComponent(`הגעתי מהמערכת של ${brandingSettings.business_name || 'העסק'} ואני רוצה לשמוע פרטים`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline font-medium"
                      >
                        השאר פרטים בוואטסאפ
                      </a>
                    </p>
                    <p>
                      🔧 פותח על ידי{" "}
                      <a 
                        href={appConfig.supportSiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        xFlow CRM
                      </a>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><SettingsIcon className="w-5 h-5" /> התאמות כלליות</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="job_start_button_text">טקסט כפתור "יצאתי לדרך" בעמוד עבודות</Label>
                  <Input
                    id="job_start_button_text"
                    value={jobStartButtonText}
                    onChange={(e) => setJobStartButtonText(e.target.value)}
                    placeholder="🚗 יצאתי לדרך"
                    className="max-w-sm"
                  />
                  <p className="text-xs text-slate-500">ניתן לשנות את הטקסט שיופיע על הכפתור בדף העבודות</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5"/>
                  סקירת גישה לדפים - כל העובדים
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map(user => (
                    <Card key={user.id} className="border-2 hover:border-blue-300 transition-all">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                              <span className="text-white font-bold text-sm">{user.full_name?.[0] || 'U'}</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-sm md:text-base truncate">{user.full_name}</h3>
                              <Badge className="text-xs">
                                {user.role_type === "בעלים" && "👑 בעלים"}
                                {user.role_type === "מנכל" && "💼 מנכ\"ל"}
                                {user.role_type === "מזכירה" && "📞 מזכירה"}
                                {user.role_type === "איש צוות" && "🔧 איש צוות"}
                                {user.role_type === "מחסנאי" && "📦 מחסנאי"}
                                {user.role_type === "צופה" && "👀 צופה"}
                              </Badge>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleEditUser(user)} className="bg-blue-600">
                            <Edit className="w-4 h-4 ml-1" />
                            ערוך
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-2">
                          {pagesList.map(page => {
                            const hasAccess = hasAccessToPage(user, page.id);
                            return (
                              <div 
                                key={page.id} 
                                className={`p-2 rounded-lg text-center ${
                                  hasAccess 
                                    ? 'bg-green-50 border border-green-200' 
                                    : 'bg-slate-50 border border-slate-200'
                                }`}
                              >
                                <div className="text-2xl mb-1">{page.icon}</div>
                                <div className="text-xs font-medium text-slate-700">{page.name}</div>
                                <div className="text-lg mt-1">
                                  {hasAccess ? '✅' : '❌'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-900">💡 מקרא:</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
                    <div>✅ = יש גישה לדף</div>
                    <div>❌ = אין גישה לדף</div>
                    <div>🟢 ירוק = הרשאה פעילה</div>
                    <div>⚪ אפור = הרשאה לא פעילה</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5"/>
                  ניהול הרשאות לפי תפקיד
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">בחר תפקיד:</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="h-12 text-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="בעלים">👑 בעלים</SelectItem>
                      <SelectItem value="מנכל">💼 מנכ"ל</SelectItem>
                      <SelectItem value="מזכירה">📞 מזכירה</SelectItem>
                      <SelectItem value="איש צוות">🔧 איש צוות</SelectItem>
                      <SelectItem value="מחסנאי">📦 מחסנאי</SelectItem>
                      <SelectItem value="צופה">👀 צופה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  💡 שינוי זה ישפיע על <strong>{usersInSelectedRole.length}</strong> {selectedRole}ים במערכת
                </div>

                <div className="space-y-3">
                  {Object.keys(PERMISSION_CATEGORIES).map(category => (
                    <div key={category} className="flex items-center justify-between p-4 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                      <Label htmlFor={category} className="text-base font-medium cursor-pointer">
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
                        <span className="text-sm text-slate-500">
                          {rolePermissions[category] ? "כן" : "לא"}
                        </span>
                        <Switch
                          id={category}
                          checked={rolePermissions[category] || false}
                          onCheckedChange={(checked) => setRolePermissions({...rolePermissions, [category]: checked})}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={handleUpdateRolePermissions} 
                  disabled={updateRolePermissionsMutation.isPending || usersInSelectedRole.length === 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 md:h-12 text-sm md:text-lg"
                >
                  {updateRolePermissionsMutation.isPending ? (
                    <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  ) : (
                    <>
                      💾 עדכן את כל ה{selectedRole}ים ({usersInSelectedRole.length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="modules">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye/> מודולים גלויים</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {allModules.map(module => (
                  <div key={module.id} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                    <Label htmlFor={module.id} className="text-sm font-medium">{module.name}</Label>
                    <Switch
                      id={module.id}
                      checked={visibleModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><GitBranch /> חוקי שיבוץ לידים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                  <Label htmlFor="auto-assign" className="text-sm font-medium">שבץ לידים אוטומטית</Label>
                  <Switch
                    id="auto-assign"
                    checked={leadAssignment.auto_assign}
                    onCheckedChange={(checked) => setLeadAssignment(prev => ({...prev, auto_assign: checked}))}
                  />
                </div>
                {leadAssignment.auto_assign && (
                  <div className="space-y-2">
                    <Label>שיטת שיבוץ</Label>
                    <Select 
                      value={leadAssignment.assignment_method}
                      onValueChange={(value) => setLeadAssignment(prev => ({...prev, assignment_method: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="round_robin">סבב רוטציה</SelectItem>
                        <SelectItem value="available_installer">שבץ לאיש צוות פנוי (או לפי סבב)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  ברירות מחדל לליד חדש
                </CardTitle>
                <p className="text-sm text-slate-500">הגדר את הערכים שיוכנסו אוטומטית בכל פעם שנוסף ליד חדש</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>סטטוס ברירת מחדל לליד חדש</Label>
                    <Select value={defaultLeadStatus} onValueChange={setDefaultLeadStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(statusCubes.length > 0 ? statusCubes : DEFAULT_STATUS_CUBES).map(c => (
                          <SelectItem key={c.status} value={c.status}>{c.status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>דירוג (טמפרטורה) ברירת מחדל</Label>
                    <Select value={defaultLeadRating || "none"} onValueChange={(v) => setDefaultLeadRating(v === "none" ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">ללא</SelectItem>
                        <SelectItem value="ליד קר קרח">ליד קר קרח</SelectItem>
                        <SelectItem value="ליד קריר">ליד קריר</SelectItem>
                        <SelectItem value="ליד חם">ליד חם</SelectItem>
                        <SelectItem value="ליד חם אש">ליד חם אש</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5" />
                  קוביות סטטוס בדף לידים
                </CardTitle>
                <p className="text-sm text-slate-500">בחר אילו קוביות סטטוס להציג בראש דף הלידים. כל קובייה מסננת לידים לפי הסטטוס שלה.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Undo button */}
                {previousCubes && (
                  <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-sm text-amber-800">בוצע שינוי בשם סטטוס</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-700 border-amber-300"
                      onClick={() => {
                        setStatusCubes(previousCubes);
                        setPreviousCubes(null);
                        toast({ title: "↩ השינוי בוטל" });
                      }}
                    >
                      ↩ בטל שינוי
                    </Button>
                  </div>
                )}

                {/* Current cubes list */}
                <div className="space-y-2">
                  {statusCubes.map((cube, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 md:gap-3 p-2 md:p-3 bg-white border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center font-bold text-sm md:text-lg flex-shrink-0 ${CUBE_COLORS.find(c => c.id === cube.color)?.bg || 'bg-slate-100'} ${cube.color}`}>
                        {index + 1}
                      </div>

                      {editingCubeIndex === index ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editingCubeName}
                            onChange={(e) => setEditingCubeName(e.target.value)}
                            className="flex-1 h-9"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (editingCubeName.trim()) {
                                  setPreviousCubes([...statusCubes]);
                                  const arr = [...statusCubes];
                                  arr[index] = { ...arr[index], status: editingCubeName.trim() };
                                  setStatusCubes(arr);
                                  toast({ title: "✓ שם הסטטוס עודכן - לחץ 'שמור שינויים' לשמירה סופית" });
                                }
                                setEditingCubeIndex(null);
                              } else if (e.key === 'Escape') {
                                setEditingCubeIndex(null);
                              }
                            }}
                          />
                          <Button size="sm" className="h-9 bg-green-600" onClick={() => {
                            if (editingCubeName.trim()) {
                              setPreviousCubes([...statusCubes]);
                              const arr = [...statusCubes];
                              arr[index] = { ...arr[index], status: editingCubeName.trim() };
                              setStatusCubes(arr);
                              toast({ title: "✓ שם הסטטוס עודכן - לחץ 'שמור שינויים' לשמירה סופית" });
                            }
                            setEditingCubeIndex(null);
                          }}>שמור</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingCubeIndex(null)}>ביטול</Button>
                        </div>
                      ) : (
                        <span
                          className="flex-1 font-medium text-slate-800 cursor-pointer hover:text-blue-600 flex items-center gap-2"
                          onClick={() => {
                            setEditingCubeIndex(index);
                            setEditingCubeName(cube.status);
                          }}
                        >
                          {cube.status}
                          <Edit className="w-3.5 h-3.5 text-slate-400" />
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-1"
                          disabled={index === 0}
                          onClick={() => {
                            const arr = [...statusCubes];
                            [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                            setStatusCubes(arr);
                          }}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-30 p-1"
                          disabled={index === statusCubes.length - 1}
                          onClick={() => {
                            const arr = [...statusCubes];
                            [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
                            setStatusCubes(arr);
                          }}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>

                      <Select
                        value={cube.color}
                        onValueChange={(val) => {
                          const arr = [...statusCubes];
                          arr[index] = { ...arr[index], color: val };
                          setStatusCubes(arr);
                        }}
                      >
                        <SelectTrigger className="w-20 md:w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CUBE_COLORS.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <span className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-full ${c.bg}`}></span>
                                {c.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 px-1 md:px-2"
                        onClick={() => {
                          if (confirm(`למחוק את הסטטוס "${cube.status}"?`)) {
                            setStatusCubes(statusCubes.filter((_, i) => i !== index));
                            toast({ title: `✓ הסטטוס "${cube.status}" הוסר - לחץ 'שמור שינויים' לשמירה סופית` });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 md:ml-1" />
                        <span className="hidden md:inline">הסר</span>
                      </Button>
                    </div>
                  ))}

                  {statusCubes.length === 0 && (
                    <div className="text-center text-slate-400 py-8 border-2 border-dashed rounded-lg">
                      אין קוביות. הוסף קוביה חדשה למטה.
                    </div>
                  )}
                </div>

                {/* Add from predefined list */}
                {ALL_LEAD_STATUSES.filter(s => !statusCubes.find(c => c.status === s)).length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Plus className="w-5 h-5 text-blue-600" />
                    <Select
                      onValueChange={(val) => {
                        setStatusCubes([...statusCubes, { status: val, color: CUBE_COLORS[statusCubes.length % CUBE_COLORS.length].id }]);
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="הוסף מרשימה קיימת..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_LEAD_STATUSES
                          .filter(s => !statusCubes.find(c => c.status === s))
                          .map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Add custom new status */}
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Plus className="w-5 h-5 text-green-600" />
                  <Input
                    value={newCustomStatus}
                    onChange={(e) => setNewCustomStatus(e.target.value)}
                    placeholder="הקלד שם סטטוס חדש..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCustomStatus.trim()) {
                        if (statusCubes.find(c => c.status === newCustomStatus.trim())) {
                          toast({ title: "סטטוס זה כבר קיים", variant: "destructive" });
                          return;
                        }
                        setStatusCubes([...statusCubes, { status: newCustomStatus.trim(), color: CUBE_COLORS[statusCubes.length % CUBE_COLORS.length].id }]);
                        setNewCustomStatus("");
                        toast({ title: "✓ סטטוס חדש נוסף" });
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!newCustomStatus.trim()}
                    onClick={() => {
                      if (statusCubes.find(c => c.status === newCustomStatus.trim())) {
                        toast({ title: "סטטוס זה כבר קיים", variant: "destructive" });
                        return;
                      }
                      setStatusCubes([...statusCubes, { status: newCustomStatus.trim(), color: CUBE_COLORS[statusCubes.length % CUBE_COLORS.length].id }]);
                      setNewCustomStatus("");
                      toast({ title: "✓ סטטוס חדש נוסף" });
                    }}
                  >
                    הוסף
                  </Button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>תצוגה מקדימה:</strong>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-3">
                    {statusCubes.map((cube, i) => (
                      <div key={i} className="bg-white rounded-lg p-3 shadow-sm border text-center">
                        <p className={`text-xl font-bold ${cube.color}`}>0</p>
                        <p className="text-xs text-slate-500 mt-1">{cube.status}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cardcom">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard /> הגדרות Cardcom</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terminal_number">מספר טרמינל (TerminalNumber)</Label>
                  <Input
                    id="terminal_number"
                    value={cardcomSettings.terminal_number}
                    onChange={(e) => setCardcomSettings({...cardcomSettings, terminal_number: e.target.value})}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api_name">שם API (ApiName)</Label>
                  <Input
                    id="api_name"
                    value={cardcomSettings.api_name}
                    onChange={(e) => setCardcomSettings({...cardcomSettings, api_name: e.target.value})}
                    placeholder="cardtest1994"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="success_redirect">URL הצלחה (SuccessRedirectUrl)</Label>
                  <Input
                    id="success_redirect"
                    value={cardcomSettings.success_redirect_url}
                    onChange={(e) => setCardcomSettings({...cardcomSettings, success_redirect_url: e.target.value})}
                    placeholder="https://www.example.com/success"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="failed_redirect">URL כישלון (FailedRedirectUrl)</Label>
                  <Input
                    id="failed_redirect"
                    value={cardcomSettings.failed_redirect_url}
                    onChange={(e) => setCardcomSettings({...cardcomSettings, failed_redirect_url: e.target.value})}
                    placeholder="https://www.example.com/failed"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhook_url">Webhook URL</Label>
                  <Input
                    id="webhook_url"
                    value={cardcomSettings.webhook_url}
                    onChange={(e) => setCardcomSettings({...cardcomSettings, webhook_url: e.target.value})}
                    placeholder="https://hook.eu2.make.com/..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save button at bottom */}
        <div className="mt-8 flex justify-center">
          <Button onClick={handleSave} disabled={updateMutation.isPending} size="lg" className="px-6 md:px-12 py-3 text-sm md:text-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
            {updateMutation.isPending ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Save className="w-5 h-5 ml-2" />}
            שמור שינויים
          </Button>
        </div>

        {/* Dialog לעריכת הרשאות עובד */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                עריכת הרשאות - {editingUser?.full_name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {pagesList.map(page => (
                <div 
                  key={page.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    userPageAccess[page.id]
                      ? 'bg-green-50 border-green-500 shadow-md'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setUserPageAccess({...userPageAccess, [page.id]: !userPageAccess[page.id]})}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">{page.icon}</div>
                    <div className="font-medium text-sm mb-2">{page.name}</div>
                    <div className="text-2xl">
                      {userPageAccess[page.id] ? '✅' : '❌'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                ביטול
              </Button>
              <Button 
                onClick={handleSaveUserPermissions} 
                disabled={updateUserPermissionsMutation.isPending}
                className="bg-blue-600"
              >
                {updateUserPermissionsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                ) : (
                  <>
                    💾 שמור שינויים
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
