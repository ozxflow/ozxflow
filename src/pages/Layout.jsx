import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Users,
  Car,
  CheckSquare,
  Menu,
  X,
  BarChart3,
  LogOut,
  TrendingUp,
  MessageCircle,
  Shield,
  FileText,
  Settings,
  ClipboardList,
  Truck,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/api/base44Client";
import { Toaster } from "@/components/ui/toaster";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import SubscriptionBell from "@/components/SubscriptionBell";
import { hasFeature } from "@/lib/planFeatures";
import { appConfig } from "@/config/appConfig";

// פונקציית עזר - בדיקת הרשאה
const hasPermission = (user, permission) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.permissions?.[permission] === true;
};

// בדיקה אם פיצ'ר זמין בחבילה של המשתמש
const hasPlanFeature = (user, feature) => {
  if (!user) return false;
  if (user.is_super_admin) return true;
  const plan = user.org?.plan || 'free';
  return hasFeature(plan, feature);
};

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [businessSettings, setBusinessSettings] = useState({ business_name: "", business_logo: "" });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: (newStatus) => supabase.auth.updateMe({ availability_status: newStatus }),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['currentUser'], updatedUser);
      setUser(updatedUser);
      toast({ title: "✓ הסטטוס עודכן" });
    },
    onError: () => {
      toast({ title: "שגיאה בעדכון סטטוס", variant: "destructive" });
    }
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => supabase.entities.Job.list(),
    enabled: !!user && user.role_type === "איש צוות",
    refetchInterval: 30000,
  });

  React.useEffect(() => {
    if (user && user.role_type === "איש צוות" && jobs.length > 0) {
      const myNewJobs = jobs.filter(j =>
        j.installer_email === user.email &&
        j.status === "פתוח"
      );
      setNewJobsCount(myNewJobs.length);
    } else {
      setNewJobsCount(0);
    }
  }, [jobs, user]);



  React.useEffect(() => {
    supabase.auth.me().then(user => {
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setLoading(false);
      queryClient.setQueryData(['currentUser'], user);

      // בדיקת מנוי - מול org.subscription_end_date או user.subscription_end_date
      const subEndDate = user.org?.subscription_end_date || user.subscription_end_date;
      if (subEndDate && location.pathname !== createPageUrl('RenewSubscription')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(subEndDate);
        endDate.setHours(0, 0, 0, 0);

        if (endDate < today) {
          // בדיקת חידוש אוטומטי
          if (user.org?.auto_renew) {
            const months = user.org.auto_renew_months || 1;
            const newEndDate = new Date(today);
            newEndDate.setMonth(newEndDate.getMonth() + months);
            // עדכון תאריך תוקף מנוי בארגון
            supabase.org.updateOrg({
              subscription_end_date: newEndDate.toISOString()
            }).catch(err => console.error("שגיאה בחידוש אוטומטי:", err));
          } else {
            window.location.href = createPageUrl('RenewSubscription');
          }
        }
      }
    }).catch(() => {
      setUser(null);
      navigate('/login');
    });
    
    // טעינת הגדרות העסק
    supabase.entities.Settings.list().then(results => {
      if (results && results[0]) {
        setBusinessSettings({
          business_name: results[0].business_name || "",
          business_logo: results[0].business_logo || ""
        });
      }
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await supabase.auth.logout();
    navigate('/login');
  };

  const handleStatusToggle = () => {
    if (user.availability_status === "בחופש") {
      updateStatusMutation.mutate("פנוי");
    } else {
      updateStatusMutation.mutate("בחופש");
    }
  };

  // בניית תפריט דינמי לפי הרשאות + חבילת מנוי
  const getNavigationItems = () => {
    if (!user) return [];

    const items = [];
    const isAdmin = user.role === "admin";

    // === פיצ'רים בסיסיים (basic_crm) - זמינים לכולם ===

    // דוחות - ראשון בתפריט
    if (hasPermission(user, 'reports_view') || isAdmin) {
      items.push({ title: "דוחות", url: createPageUrl("Reports"), icon: BarChart3 });
    }

    // לידים - בסיסי, זמין לכל החבילות
    if (hasPermission(user, 'leads_view_all') || isAdmin) {
      items.push({ title: "לידים", url: createPageUrl("Leads"), icon: TrendingUp });
    }

    // הצעות מחיר - בסיסי
    if (hasPermission(user, 'quotes_view') || isAdmin) {
      items.push({ title: "הצעות מחיר", url: createPageUrl("Quotes"), icon: FileText });
    }

    // לקוחות - בסיסי
    if (hasPermission(user, 'customers_view_all') || isAdmin) {
      items.push({ title: "לקוחות", url: createPageUrl("CustomersPage"), icon: Users });
    }

    // עבודות - בסיסי
    if (hasPermission(user, 'jobs_view_all') || hasPermission(user, 'jobs_change_status') || isAdmin) {
      items.push({ title: "עבודות", url: createPageUrl("Jobs"), icon: CheckSquare });
    }

    // המשימות שלי - כולם
    items.push({ title: "המשימות שלי", url: createPageUrl("Tasks"), icon: ClipboardList });

    // עובדים - כולם
    items.push({ title: "עובדים", url: createPageUrl("Employees"), icon: Users });

    // === חשבוניות - דורש payment ===
    if ((hasPermission(user, 'invoices_view') || isAdmin) && hasPlanFeature(user, 'payment')) {
      items.push({ title: "חשבוניות", url: createPageUrl("Invoices"), icon: FileText });
    }

    // === קטלוג - זמין לכולם ===
    items.push({ title: "קטלוג", url: createPageUrl("Catalog"), icon: Car });

    // === הזמנות מספקים - דורש inventory ===
    if ((hasPermission(user, 'suppliers_view') || isAdmin) && hasPlanFeature(user, 'inventory')) {
      items.push({ title: "הזמנות מספקים", url: createPageUrl("SupplierOrders"), icon: Truck });
    }

    // === ספקים - דורש inventory ===
    if ((hasPermission(user, 'suppliers_view') || isAdmin) && hasPlanFeature(user, 'inventory')) {
      items.push({ title: "ספקים", url: createPageUrl("Suppliers"), icon: Users });
    }

    // === בוט/אוטומציות - דורש automations ===
    if ((hasPermission(user, 'bot_access') || isAdmin) && hasPlanFeature(user, 'automations')) {
      items.push({ title: "🤖 בוט", url: createPageUrl("Bot"), icon: MessageCircle, highlight: true });
    }

    // === תבניות - דורש templates ===
    // (אם יש דף templates בעתיד)

    // הגדרות מנהל - כל מנהל
    if (hasPermission(user, 'settings_access') || isAdmin) {
      items.push({ title: "הגדרות מנהל", url: createPageUrl("Settings"), icon: Settings });
    }

    // פאנל ניהול ראשי - סופר אדמין בלבד
    if (user.is_super_admin) {
      items.push({ title: "ניהול ראשי", url: createPageUrl("SuperAdmin"), icon: Shield });
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-blue-50" dir="rtl">
        {/* Desktop Top Navigation */}
        <nav className="hidden lg:block fixed top-0 right-0 left-0 bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] shadow-lg z-50 border-b border-white/10">
          <div className="px-6">
            <div className="flex items-center gap-3 h-16">
              {/* Logo Section - Compact */}
              <div className="flex items-center gap-2 min-w-[120px]">
                {businessSettings.business_logo ? (
                  <img src={businessSettings.business_logo} alt="לוגו" className="w-9 h-9 object-contain rounded-xl" />
                ) : (
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="hidden 2xl:block">
                  <h2 className="font-bold text-white text-xs leading-tight">{businessSettings.business_name || "CRM"}</h2>
                </div>
              </div>
              
              {/* Navigation Items - Takes remaining space */}
              <div className="flex-1 flex items-center justify-center overflow-hidden">
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide w-full justify-center px-2">
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    const ItemIcon = item.icon;
                    const isAdminItem = item.icon === Shield || item.icon === Settings;
                    const isTasksPage = item.title === "המשימות שלי";
                    
                    return (
                      <Link
                        key={item.title}
                        to={item.url}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all relative whitespace-nowrap border flex-shrink-0 ${
                          isAdminItem
                            ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white border-white shadow-md'
                            : item.highlight
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-white shadow-md'
                            : isActive
                            ? 'bg-white/20 text-white font-semibold backdrop-blur-sm border-white'
                            : 'text-white hover:bg-white/10 border-white/40 hover:border-white'
                        }`}
                      >
                        <ItemIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-[11px] font-medium">{item.title}</span>
                        {isTasksPage && newJobsCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            {newJobsCount}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
              
              {/* User Section - Compact */}
              <div className="flex items-center gap-1.5 min-w-[100px] justify-end">
                {user && <SubscriptionBell subscriptionEndDate={user.subscription_end_date} />}
                <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1 backdrop-blur-sm">
                  <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1e3a8a] font-bold text-xs">
                      {user?.full_name?.[0] || 'U'}
                    </span>
                  </div>
                  <div className="text-right hidden xl:block">
                    <p className="font-semibold text-white text-[11px] leading-tight truncate max-w-[100px]">{user?.full_name || 'משתמש'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-white hover:bg-white/10 h-7 w-7 p-0 flex-shrink-0"
                  size="sm"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Sidebar */}
        <Sidebar side="right" className="lg:hidden border-r border-slate-200 bg-white shadow-2xl z-50" collapsible="offcanvas">
          <SidebarHeader className="border-b border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {businessSettings.business_logo ? (
                <img src={businessSettings.business_logo} alt="לוגו" className="w-10 h-10 object-contain rounded-xl shadow-md" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{businessSettings.business_name || "CRM"}</h2>
                <p className="text-xs text-slate-500">מערכת ניהול</p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSidebarOpen(false);
              }}
              className="hover:bg-slate-100 h-10 w-10 p-0 rounded-lg flex items-center justify-center transition-colors cursor-pointer z-50 relative"
            >
              <X className="w-5 h-5 text-slate-600 pointer-events-none" />
            </button>
          </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2 mb-1">
                תפריט ראשי
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems
                    .sort((a, b) => {
                        const aIsAdminItem = a.icon === Shield || a.icon === Settings;
                        const bIsAdminItem = b.icon === Shield || b.icon === Settings;

                        if (aIsAdminItem && !bIsAdminItem) return 1;
                        if (!aIsAdminItem && bIsAdminItem) return -1;
                        return 0;
                    })
                    .map((item) => {
                      const isActive = location.pathname === item.url;
                      const ItemIcon = item.icon;
                      const isAdminItem = item.icon === Shield || item.icon === Settings;
                      const isTasksPage = item.title === "המשימות שלי";

                      return (
                        <SidebarMenuItem key={item.title}>
                         <SidebarMenuButton
                           asChild
                           className={`transition-all duration-200 rounded-xl mb-1 ${
                             isAdminItem
                               ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg hover:shadow-xl'
                               : item.highlight
                               ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                               : isActive
                               ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:shadow-lg'
                               : 'hover:bg-slate-50 text-slate-700'
                           }`}
                         >
                           <Link to={item.url} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 relative">
                             <ItemIcon className={`w-5 h-5 ${isAdminItem || item.highlight || isActive ? 'text-white' : 'text-slate-500'}`} />
                             <span className="font-medium">{item.title}</span>
                             {isTasksPage && newJobsCount > 0 && (
                               <span className="absolute left-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                                 {newJobsCount}
                               </span>
                             )}
                           </Link>
                         </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-100 p-4">
            <div className="space-y-3">
               <div className="p-3 bg-slate-50 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white font-bold text-sm">
                        {user?.full_name?.[0] || 'U'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">
                        {user?.full_name || 'משתמש'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user?.email || ''}</p>
                    </div>
                  </div>
                  {user && (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between p-2 bg-white rounded-lg border">
                         <span className="text-sm font-medium">
                           {user.availability_status === "פנוי" && "🟢 פנוי"}
                           {user.availability_status === "בעבודה" && "🟡 בעבודה"}
                           {user.availability_status === "בחופש" && "🔴 בחופש"}
                         </span>
                         {user.availability_status !== "בעבודה" && (
                           <Button 
                             size="sm" 
                             variant="outline"
                             onClick={handleStatusToggle}
                             className="h-7 text-xs"
                           >
                             {user.availability_status === "בחופש" ? "חזרתי" : "בחופש"}
                           </Button>
                         )}
                       </div>
                       {user.availability_status === "בעבודה" && (
                         <p className="text-xs text-slate-500 text-center">
                           הסטטוס ישתנה אוטומטי בסיום העבודה
                         </p>
                       )}
                     </div>
                  )}
               </div>
              <Button
                variant="outline"
                className="w-full justify-start gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                <span>יציאה</span>
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col lg:mr-0 min-w-0 overflow-x-hidden">
          {/* Mobile Header */}
          <header className="lg:hidden bg-white/80 backdrop-blur-sm border-b border-slate-200 px-3 py-3 sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200">
                  <Menu className="w-5 h-5 text-slate-700" />
                </SidebarTrigger>
                <div className="flex items-center gap-2">
                  {businessSettings.business_logo ? (
                    <img src={businessSettings.business_logo} alt="לוגו" className="w-8 h-8 object-contain rounded-xl shadow-md" />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <h1 className="text-base font-bold text-slate-900">{businessSettings.business_name || "CRM"}</h1>
                </div>
              </div>
              {user && <SubscriptionBell subscriptionEndDate={user.subscription_end_date} />}
            </div>
          </header>

          <div className="flex-1 overflow-auto lg:mt-[60px]">
            {children}
          </div>

          {/* Footer */}
          <footer className="bg-white border-t border-slate-200 px-3 py-2 md:px-4 md:py-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs md:text-sm">
              <a 
                href={`https://wa.me/${appConfig.supportWhatsApp}?text=${encodeURIComponent(`הגעתי מהמערכת של ${businessSettings.business_name || 'העסק'} ואני רוצה לשמוע פרטים`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium text-center"
              >
                💬 רוצה מערכת כזו? השאר פרטים
              </a>
              <a 
                href={appConfig.supportSiteUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-500 hover:text-blue-600 transition-colors"
              >
                פותח על ידי <span className="font-semibold">xFlow CRM</span>
              </a>
            </div>
          </footer>
          </main>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
