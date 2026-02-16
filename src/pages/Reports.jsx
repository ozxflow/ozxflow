import React, { useState, useMemo } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  Users,
  CheckSquare,
  DollarSign,
  Phone,
  Target,
  Repeat,
  UserPlus,
  Percent,
  RefreshCw,
  Gift,
  HandCoins,
  LineChart,
  Calendar as CalendarIcon,
  Trophy,
  Zap,
  Package,
  Clock,
  UserCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  startOfQuarter,
  endOfQuarter,
  startOfDay,
  isWithinInterval,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line,
  ComposedChart
} from "recharts";
import _ from 'lodash';
import { Badge } from "@/components/ui/badge";
import MarketingFunnel from "@/components/reports/MarketingFunnel";

const MetricCard = ({ title, value, icon: Icon, subtext, color }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
    <Card className="border-none shadow-lg bg-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg bg-${color}-100`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

// פונקציה לחישוב מדדי עובד
const calculateEmployeeMetrics = (user, jobs, leads, timeRange) => {
  if (!user) return null;
  
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
      interval = { start: new Date(0), end: now };
      break;
    default: // Default to 'all' if an unexpected timeRange is passed
      interval = { start: new Date(0), end: now };
  }
  
  let userJobs = jobs.filter(j => j.installer_email === user.email && j.status === "בוצע");
  
  if (interval) {
    userJobs = userJobs.filter(j => {
      // If end_time is missing, don't include it in time-filtered jobs unless timeRange is 'all'
      if (!j.end_time) return timeRange === "all"; 
      return isWithinInterval(new Date(j.end_time), interval);
    });
  }
  
  const totalInstallations = userJobs.length;
  
  const jobLeadIds = userJobs.map(j => j.lead_id).filter(Boolean);
  const relatedLeads = leads.filter(l => jobLeadIds.includes(l.id));
  const totalRevenue = _.sumBy(relatedLeads, l => l.actual_value || 0);
  
  const totalBatteries = userJobs.reduce((sum, job) => {
    return sum + (job.items?.length || 0); // Assuming each item in job.items is a battery
  }, 0);
  
  const uniqueCustomers = _.uniq(userJobs.map(j => j.customer_name)).filter(Boolean).length;
  
  const jobsWithTime = userJobs.filter(j => j.start_time && j.end_time);
  let avgTime = 0;
  
  if (jobsWithTime.length > 0) {
    const totalMinutes = jobsWithTime.reduce((sum, job) => {
      const start = new Date(job.start_time);
      const end = new Date(job.end_time);
      // Ensure end time is not before start time
      if (end.getTime() < start.getTime()) return sum;
      const diffMs = end - start;
      const diffMins = Math.floor(diffMs / 60000);
      return sum + diffMins;
    }, 0);
    
    avgTime = Math.round(totalMinutes / jobsWithTime.length);
  }
  
  return {
    totalInstallations,
    totalRevenue,
    totalBatteries,
    uniqueCustomers,
    avgTime,
    user
  };
};

export default function Reports() {
  const [timeRange, setTimeRange] = useState("month");
  const [date, setDate] = useState();
  const [employeeTimeRange, setEmployeeTimeRange] = useState("month");
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(null);

  const { data: leads = [] } = useQuery({ queryKey: ["leads"], queryFn: () => supabase.entities.Lead.list() });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => supabase.entities.Job.list() });
  const { data: inventory = [] } = useQuery({ queryKey: ["inventory"], queryFn: () => supabase.entities.Inventory.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => supabase.entities.User.list(), initialData: [] });

  console.log("🔍 נתונים גולמיים:", { 
    totalLeads: leads.length, 
    totalJobs: jobs.length,
    leadsWithCreatedDate: leads.filter(l => l.created_date).length,
    closedLeads: leads.filter(l => l.status === 'נסגר' || l.status === 'הושלם').length
  });

  const { allTimeCustomers, dateFilteredData, currentInterval } = useMemo(() => {
    // תיקון: נשתמש בכל הלידים שנסגרו, גם אם אין להם created_date
    const allClosedLeads = leads.filter(l => 
      (l.status === 'נסגר' || l.status === 'הושלם') && l.customer_name
    );
    
    const customerFirstDeal = {};
    
    // מיון לפי תאריך (אם יש) או לפי ID
    const sortedLeads = _.sortBy(allClosedLeads, l => {
      if (l.created_date) return new Date(l.created_date);
      if (l.updated_date) return new Date(l.updated_date);
      return new Date(0); // לידים ישנים ללא תאריך
    });
    
    sortedLeads.forEach(lead => {
      if (!customerFirstDeal[lead.customer_name]) {
        const leadDate = lead.created_date || lead.updated_date || new Date().toISOString();
        customerFirstDeal[lead.customer_name] = new Date(leadDate);
      }
    });

    const now = new Date();
    let interval;
    
    switch (timeRange) {
      case "week": 
        interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) }; 
        break;
      case "month": 
        interval = { start: startOfMonth(now), end: endOfMonth(now) }; 
        break;
      case "quarter": 
        interval = { start: startOfQuarter(now), end: endOfQuarter(now) }; 
        break;
      case "custom":
        if (date?.from && date?.to) {
          interval = { start: date.from, end: date.to };
        } else {
          interval = null;
        }
        break;
      case "all":
        interval = { start: new Date(0), end: now };
        break;
      default:
        interval = { start: new Date(0), end: now };
    }

    // סינון לידים לפי תאריך - אם אין תאריך, נכלול אותם ב"כל הזמן"
    const filteredLeads = interval ? leads.filter(l => {
      const dateToFilter = l.created_date || l.updated_date;
      if (!dateToFilter) {
        // אם אין תאריך בכלל, נכלול רק ב"כל הזמן"
        return timeRange === "all";
      }
      return isWithinInterval(new Date(dateToFilter), interval);
    }) : [];

    const closedLeadsInTime = filteredLeads.filter(l => 
      (l.status === 'נסגר' || l.status === 'הושלם') && l.customer_name
    );

    console.log("📊 לאחר סינון:", {
      timeRange,
      filteredLeads: filteredLeads.length,
      closedLeadsInTime: closedLeadsInTime.length
    });

    return { 
      allTimeCustomers: customerFirstDeal, 
      dateFilteredData: { filteredLeads, closedLeadsInTime }, 
      currentInterval: interval 
    };
  }, [leads, timeRange, date]);

  const allTimeMetrics = useMemo(() => {
    const allClosedLeads = leads.filter(l => l.status === 'נסגר' || l.status === 'הושלם');
    const customersWithDeals = _.groupBy(allClosedLeads.filter(l => l.customer_name), 'customer_name');
    const returningCustomersCount = Object.values(customersWithDeals).filter(deals => deals.length > 1).length;
    const totalUniqueCustomers = Object.keys(customersWithDeals).length;
    const returningCustomerPercentage = totalUniqueCustomers > 0 
      ? (returningCustomersCount / totalUniqueCustomers * 100).toFixed(1) + "%" 
      : "0%";
    
    console.log("🔄 לקוחות חוזרים:", {
      totalUniqueCustomers,
      returningCustomersCount,
      returningCustomerPercentage
    });
    
    return { returningCustomerPercentage };
  }, [leads]);

  const metrics = useMemo(() => {
    const { filteredLeads, closedLeadsInTime } = dateFilteredData;

    // 1. Leads
    const totalLeads = filteredLeads.length;
    const leadsBySource = _.groupBy(filteredLeads, 'source');
    const closedLeadsBySource = _.groupBy(closedLeadsInTime, 'source');

    // 2. Closing Percentage & 3. Sales Calls
    const totalCalls = _.sumBy(filteredLeads, l => l.number_of_calls || 0);
    const closingPercentage = totalCalls > 0 
      ? ((closedLeadsInTime.length / totalCalls) * 100).toFixed(1) + "%" 
      : "0%";

    // 4. Sales Turnover
    const salesTurnover = _.sumBy(closedLeadsInTime, l => l.actual_value || 0);

    // 6. Avg Revenue Per Customer
    const uniqueCustomersInPeriod = _.uniq(closedLeadsInTime.map(l => l.customer_name)).filter(Boolean);
    const avgRevenuePerCustomer = uniqueCustomersInPeriod.length > 0 
      ? (salesTurnover / uniqueCustomersInPeriod.length) 
      : 0;

    // 7. Total Referrals
    const totalReferrals = filteredLeads.filter(l => l.source === 'המלצה').length;

    // 9. Total New Customers
    const totalNewCustomers = uniqueCustomersInPeriod.length;

    // 10. Profitability
    const totalCost = _.sumBy(closedLeadsInTime, lead => {
      const job = jobs.find(j => j.lead_id === lead.id);
      if (!job || !job.items) return 0;
      
      return job.items.reduce((sum, item) => {
        const inventoryItem = inventory.find(i => i.sku === item.sku);
        const itemCost = inventoryItem?.purchase_cost || 0;
        const itemQty = item.quantity || 1;
        return sum + (itemCost * itemQty);
      }, 0);
    });
    
    const totalProfit = salesTurnover - totalCost;
    const profitPercentage = salesTurnover > 0 
      ? ((totalProfit / salesTurnover) * 100).toFixed(1) + "%" 
      : "0%";

    // Revenue from new vs returning customers
    let newCustomerRevenue = 0;
    let returningCustomerRevenue = 0;
    
    if (currentInterval) {
      closedLeadsInTime.forEach(lead => {
        const firstDealDate = allTimeCustomers[lead.customer_name];
        // A customer is "new" if their first deal date falls within the current reporting interval.
        // Otherwise, they are "returning".
        if (firstDealDate && isWithinInterval(firstDealDate, currentInterval)) {
          newCustomerRevenue += lead.actual_value || 0;
        } else if (firstDealDate) { // if first deal is outside current interval, they are returning
          returningCustomerRevenue += lead.actual_value || 0;
        }
      });
    }

    console.log("💰 מדדים:", {
      totalLeads,
      closedLeadsInTime: closedLeadsInTime.length,
      totalCalls,
      salesTurnover,
      totalNewCustomers,
      profitPercentage
    });

    return {
      totalLeads,
      leadsBySource,
      closingPercentage,
      totalCalls,
      salesTurnover,
      avgRevenuePerCustomer,
      totalReferrals,
      totalNewCustomers,
      profitPercentage,
      totalProfit,
      closedLeadsBySource,
      newCustomerRevenue,
      returningCustomerRevenue
    };
  }, [dateFilteredData, allTimeCustomers, currentInterval, jobs, inventory]);

  // מדדי עובדים
  const employeeMetrics = useMemo(() => {
    const installers = users.filter(u => u.role_type === "איש צוות");
    
    let metricsData = installers
      .map(user => calculateEmployeeMetrics(user, jobs, leads, employeeTimeRange))
      .filter(Boolean); // Remove any nulls if user is not valid for some reason
    
    if (selectedEmployee !== "all") {
      metricsData = metricsData.filter(m => m.user.id === selectedEmployee);
    }
    
    // מיון לפי הכנסות (ברירת מחדל)
    metricsData.sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    return metricsData;
  }, [users, jobs, leads, employeeTimeRange, selectedEmployee]);

  const topPerformers = useMemo(() => {
    if (employeeMetrics.length === 0) return null;
    
    // Ensure we're working with sorted copies if the original employeeMetrics is sorted differently
    const byRevenue = [...employeeMetrics].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
    // Filter out entries with avgTime 0 before sorting for speed, as 0 might indicate no jobs
    const sortableBySpeed = employeeMetrics.filter(m => m.avgTime > 0);
    const bySpeed = sortableBySpeed.length > 0 ? [...sortableBySpeed].sort((a, b) => a.avgTime - b.avgTime)[0] : null;
    const byInstallations = [...employeeMetrics].sort((a, b) => b.totalInstallations - a.totalInstallations)[0];
    
    return { byRevenue, bySpeed, byInstallations };
  }, [employeeMetrics]);

  // Chart data for Leads by Source (stacked bar)
  const leadsBySourceChartData = Object.keys(metrics.leadsBySource).map(source => ({
    name: source,
    'לידים שנסגרו': (metrics.closedLeadsBySource[source] || []).length,
    'לידים פתוחים': metrics.leadsBySource[source].length - (metrics.closedLeadsBySource[source] || []).length,
  }));
  
  // Chart data for New vs Returning Customer Revenue
  const revenueChartData = [{
    name: 'מחזור',
    'לקוחות חדשים': metrics.newCustomerRevenue,
    'לקוחות חוזרים': metrics.returningCustomerRevenue,
  }];

  // חישוב רווחים לפי חודש
  const monthlyRevenue = useMemo(() => {
    const closedLeads = leads.filter(l => l.status === 'סגר');
    
    const byMonth = {};
    
    closedLeads.forEach(lead => {
      const dateToUse = lead.created_date || lead.updated_date;
      if (!dateToUse) return;
      
      const date = new Date(dateToUse);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = format(date, 'MM/yyyy');
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {
          month: monthName,
          monthKey,
          revenue: 0,
          count: 0,
          leads: []
        };
      }
      
      byMonth[monthKey].revenue += lead.actual_value || 0;
      byMonth[monthKey].count += 1;
      byMonth[monthKey].leads.push(lead);
    });
    
    const sorted = Object.values(byMonth).sort((a, b) => 
      b.monthKey.localeCompare(a.monthKey)
    );
    
    const topMonth = sorted.reduce((max, current) => 
      current.revenue > max.revenue ? current : max
    , sorted[0] || { revenue: 0 });
    
    return { byMonth: sorted, topMonth };
  }, [leads]);

  // פירוט מקורות לחודש נבחר
  const selectedMonthDetails = useMemo(() => {
    if (!selectedMonth) return null;
    
    const monthData = monthlyRevenue.byMonth.find(m => m.monthKey === selectedMonth);
    if (!monthData) return null;
    
    const bySource = {};
    const byAdMethod = {};
    const byConversion = {};
    
    monthData.leads.forEach(lead => {
      // לפי מקור תעבורה
      const source = lead.traffic_source || 'לא מוגדר';
      if (!bySource[source]) bySource[source] = { count: 0, revenue: 0 };
      bySource[source].count += 1;
      bySource[source].revenue += lead.actual_value || 0;
      
      // לפי שיטת פרסום
      const adMethod = lead.ad_method || 'לא מוגדר';
      if (!byAdMethod[adMethod]) byAdMethod[adMethod] = { count: 0, revenue: 0 };
      byAdMethod[adMethod].count += 1;
      byAdMethod[adMethod].revenue += lead.actual_value || 0;
      
      // לפי מקור המרה
      const conversion = lead.conversion_source || 'לא מוגדר';
      if (!byConversion[conversion]) byConversion[conversion] = { count: 0, revenue: 0 };
      byConversion[conversion].count += 1;
      byConversion[conversion].revenue += lead.actual_value || 0;
    });
    
    return {
      monthData,
      bySource: Object.entries(bySource).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue),
      byAdMethod: Object.entries(byAdMethod).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue),
      byConversion: Object.entries(byConversion).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue)
    };
  }, [selectedMonth, monthlyRevenue]);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <LineChart className="w-10 h-10 text-blue-600" />
                דשבורד מדדים
              </h1>
              <p className="text-slate-600">ניתוח ביצועים עסקיים לפי תקופה</p>
            </div>
          </div>
        </motion.div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white shadow-lg">
            <TabsTrigger value="business">📊 מדדים עסקיים</TabsTrigger>
            <TabsTrigger value="employees">👥 מדדי עובדים</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-6">
            {/* Top Month Card */}
            {monthlyRevenue.topMonth && monthlyRevenue.topMonth.revenue > 0 && (
              <Card className="border-none shadow-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <Trophy className="w-10 h-10 text-yellow-300" />
                        <div>
                          <p className="text-sm text-emerald-100">החודש הרווחי ביותר</p>
                          <h2 className="text-4xl font-black">{monthlyRevenue.topMonth.month}</h2>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-5xl font-black mb-2">₪{monthlyRevenue.topMonth.revenue.toLocaleString()}</p>
                        <p className="text-emerald-100 text-lg">{monthlyRevenue.topMonth.count} עסקאות נסגרו</p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedMonth(selectedMonth === monthlyRevenue.topMonth.monthKey ? null : monthlyRevenue.topMonth.monthKey)}
                      className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm"
                    >
                      {selectedMonth === monthlyRevenue.topMonth.monthKey ? "סגור פירוט" : "🔍 למה זה עבד?"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Selected Month Details */}
            {selectedMonthDetails && (
              <Card className="border-none shadow-xl bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    פירוט {selectedMonthDetails.monthData.month} - מה הכניס את הכסף?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* מקור תעבורה */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        מקור תעבורה
                      </h3>
                      <div className="space-y-2">
                        {selectedMonthDetails.bySource.map((item, idx) => (
                          <div key={idx} className="bg-purple-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-purple-900">{item.name}</span>
                              <Badge className="bg-purple-600 text-white">{item.count} לידים</Badge>
                            </div>
                            <p className="text-2xl font-bold text-purple-700">₪{item.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* שיטת פרסום */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        שיטת פרסום
                      </h3>
                      <div className="space-y-2">
                        {selectedMonthDetails.byAdMethod.map((item, idx) => (
                          <div key={idx} className="bg-blue-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-blue-900">{item.name}</span>
                              <Badge className="bg-blue-600 text-white">{item.count} לידים</Badge>
                            </div>
                            <p className="text-2xl font-bold text-blue-700">₪{item.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* מקור המרה */}
                    <div>
                      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <CheckSquare className="w-5 h-5 text-green-600" />
                        מקור המרה
                      </h3>
                      <div className="space-y-2">
                        {selectedMonthDetails.byConversion.map((item, idx) => (
                          <div key={idx} className="bg-green-50 p-3 rounded-lg">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-green-900">{item.name}</span>
                              <Badge className="bg-green-600 text-white">{item.count} לידים</Badge>
                            </div>
                            <p className="text-2xl font-bold text-green-700">₪{item.revenue.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Monthly Revenue Chart */}
            <Card className="border-none shadow-xl bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  רווחים לפי חודש
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={monthlyRevenue.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₪${value.toLocaleString()}`} />
                    <Bar 
                      dataKey="revenue" 
                      fill="#10b981" 
                      onClick={(data) => setSelectedMonth(data.monthKey)}
                      cursor="pointer"
                      radius={[8, 8, 0, 0]}
                      label={{ 
                        position: 'top', 
                        formatter: (value) => `₪${(value / 1000).toFixed(0)}K`,
                        fill: '#059669',
                        fontWeight: 'bold'
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-center text-sm text-slate-500 mt-4">💡 לחץ על עמודה לראות פירוט</p>
              </CardContent>
            </Card>

            {/* Marketing Funnel */}
            <MarketingFunnel leads={dateFilteredData.filteredLeads} timeRange={timeRange} />

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Tabs value={timeRange} onValueChange={(value) => {
                setTimeRange(value);
                if (value !== 'custom') {
                  setDate(undefined);
                }
              }} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-4 bg-white shadow-lg">
                  <TabsTrigger value="week">שבוע</TabsTrigger>
                  <TabsTrigger value="month">חודש</TabsTrigger>
                  <TabsTrigger value="quarter">רבעון</TabsTrigger>
                  <TabsTrigger value="all">כל הזמן</TabsTrigger>
                </TabsList>
              </Tabs>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={`w-full sm:w-[300px] justify-start text-right font-normal shadow-lg bg-white ${!date?.from && "text-muted-foreground"}`}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        <>
                          {format(date.from, "LLL dd, y")} -{" "}
                          {format(date.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>בחר טווח תאריכים</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate?.from && newDate?.to) {
                        setTimeRange("custom");
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <MetricCard title="סה״כ לידים" value={metrics.totalLeads} icon={TrendingUp} color="blue" subtext={timeRange === 'all' ? 'כל הזמן' : `בתקופה שנבחרה`} />
              <MetricCard title="אחוז סגירה (מעסקאות/שיחות)" value={metrics.closingPercentage} icon={Target} color="green" subtext={`${dateFilteredData.closedLeadsInTime.length} עסקאות מתוך ${metrics.totalCalls} שיחות`} />
              <MetricCard title="מחזור מכירות" value={`₪${metrics.salesTurnover.toLocaleString()}`} icon={DollarSign} color="purple" subtext="סך הכסף שנכנס מעסקאות סגורות" />
              <MetricCard title="סה״כ שיחות מכירה" value={metrics.totalCalls} icon={Phone} color="orange" subtext="תועד במערכת" />
              <MetricCard title="הכנסה ממוצעת מלקוח" value={`₪${Math.round(metrics.avgRevenuePerCustomer).toLocaleString()}`} icon={HandCoins} color="teal" subtext="בתקופה שנבחרה"/>
              <MetricCard title="סה״כ הפניות" value={metrics.totalReferrals} icon={Gift} color="pink" subtext="לידים שהגיעו מהמלצות"/>
              <MetricCard title="לקוחות חדשים" value={metrics.totalNewCustomers} icon={UserPlus} color="cyan" subtext="לקוחות שסגרו עסקה ראשונה בתקופה"/>
              <MetricCard title="אחוז לקוחות חוזרים" value={allTimeMetrics.returningCustomerPercentage} icon={Repeat} color="indigo" subtext="מכלל הלקוחות הסוגרים"/>
              <MetricCard title="אחוז רווחיות" value={metrics.profitPercentage} icon={Percent} color="lime" subtext={`רווח נקי: ₪${Math.round(metrics.totalProfit).toLocaleString()}`} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <Card className="border-none shadow-xl bg-white">
                <CardHeader><CardTitle>התפלגות לידים לפי מקור</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={leadsBySourceChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={80}/>
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="לידים שנסגרו" stackId="a" fill="#10b981" />
                      <Bar dataKey="לידים פתוחים" stackId="a" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-none shadow-xl bg-white">
                <CardHeader><CardTitle>מחזור מכירות: לקוחות חדשים מול חוזרים</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₪${value.toLocaleString()}`} />
                      <Legend />
                      <Bar dataKey="לקוחות חדשים" fill="#3b82f6" />
                      <Bar dataKey="לקוחות חוזרים" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant={employeeTimeRange === "day" ? "default" : "outline"}
                  onClick={() => setEmployeeTimeRange("day")}
                >
                  היום
                </Button>
                <Button 
                  size="sm" 
                  variant={employeeTimeRange === "week" ? "default" : "outline"}
                  onClick={() => setEmployeeTimeRange("week")}
                >
                  שבוע
                </Button>
                <Button 
                  size="sm" 
                  variant={employeeTimeRange === "month" ? "default" : "outline"}
                  onClick={() => setEmployeeTimeRange("month")}
                >
                  חודש
                </Button>
                <Button 
                  size="sm" 
                  variant={employeeTimeRange === "quarter" ? "default" : "outline"}
                  onClick={() => setEmployeeTimeRange("quarter")}
                >
                  רבעון
                </Button>
                <Button 
                  size="sm" 
                  variant={employeeTimeRange === "all" ? "default" : "outline"}
                  onClick={() => setEmployeeTimeRange("all")}
                >
                  כל הזמן
                </Button>
              </div>
              
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="בחר עובד" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל העובדים</SelectItem>
                  {users.filter(u => u.role_type === "איש צוות").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {topPerformers && selectedEmployee === "all" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Trophy className="w-8 h-8 text-yellow-600" />
                      <div>
                        <p className="text-sm text-yellow-700">🥇 זוכה בהכנסות</p>
                        <p className="text-xl font-bold text-yellow-900">{topPerformers.byRevenue.user.full_name}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-yellow-900">₪{topPerformers.byRevenue.totalRevenue.toLocaleString()}</p>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-blue-700">⚡ הכי מהיר</p>
                        <p className="text-xl font-bold text-blue-900">
                          {topPerformers.bySpeed ? `${topPerformers.bySpeed.user.full_name}` : 'אין נתונים'}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {topPerformers.bySpeed ? `${topPerformers.bySpeed.avgTime} דקות` : 'אין נתונים'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <TrendingUp className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm text-green-700">🔥 מרבה התקנות</p>
                        <p className="text-xl font-bold text-green-900">{topPerformers.byInstallations.user.full_name}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-900">{topPerformers.byInstallations.totalInstallations} התקנות</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="border-none shadow-xl bg-white">
              <CardHeader>
                <CardTitle>טבלת ביצועים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3 text-right">#</th>
                        <th className="p-3 text-right">שם</th>
                        <th className="p-3 text-center">התקנות</th>
                        <th className="p-3 text-center">הכנסות</th>
                        <th className="p-3 text-center">מוצרים</th>
                        <th className="p-3 text-center">לקוחות</th>
                        <th className="p-3 text-center">זמן ממוצע</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeMetrics.map((metric, index) => (
                        <tr key={metric.user.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">
                            {index === 0 && selectedEmployee === "all" && "🥇"}
                            {index === 1 && selectedEmployee === "all" && "🥈"}
                            {index === 2 && selectedEmployee === "all" && "🥉"}
                            {index > 2 && (index + 1)}
                          </td>
                          <td className="p-3 font-medium">{metric.user.full_name}</td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{metric.totalInstallations}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-green-100 text-green-800">
                              ₪{metric.totalRevenue.toLocaleString()}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{metric.totalBatteries}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{metric.uniqueCustomers}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-blue-100 text-blue-800">
                              {metric.avgTime} דק'
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {employeeMetrics.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      אין נתונים להצגה
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}