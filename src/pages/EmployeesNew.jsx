import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, Plus, X, RefreshCw, Trash2, Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast";
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, isWithinInterval } from 'date-fns';
import _ from 'lodash';

const calculateUserMetrics = (user, jobs, leads, timeRange) => {
  if (!user) return { totalInstallations: 0, totalRevenue: 0, totalBatteries: 0, uniqueCustomers: 0, avgTime: 0 };
  
  const now = new Date();
  let interval;
  
  switch(timeRange) {
    case "day": interval = { start: startOfDay(now), end: now }; break;
    case "week": interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: now }; break;
    case "month": interval = { start: startOfMonth(now), end: now }; break;
    case "quarter": interval = { start: startOfQuarter(now), end: now }; break;
    default: interval = null;
  }
  
  let userJobs = jobs.filter(j => j.installer_email === user.email && j.status === "בוצע");
  
  if (interval) {
    userJobs = userJobs.filter(j => j.end_time && isWithinInterval(new Date(j.end_time), interval));
  }
  
  const totalInstallations = userJobs.length;
  const jobLeadIds = userJobs.map(j => j.lead_id).filter(Boolean);
  const relatedLeads = leads.filter(l => jobLeadIds.includes(l.id));
  const totalRevenue = _.sumBy(relatedLeads, l => l.actual_value || 0);
  const totalBatteries = userJobs.reduce((sum, job) => sum + (job.items?.length || 0), 0);
  const uniqueCustomers = _.uniq(userJobs.map(j => j.customer_name).filter(Boolean)).length;
  
  const jobsWithTime = userJobs.filter(j => j.start_time && j.end_time);
  let avgTime = 0;
  
  if (jobsWithTime.length > 0) {
    const totalMinutes = jobsWithTime.reduce((sum, job) => {
      const start = new Date(job.start_time);
      const end = new Date(job.end_time);
      const diffMins = Math.floor((end - start) / 60000);
      return sum + Math.max(0, diffMins);
    }, 0);
    avgTime = Math.round(totalMinutes / jobsWithTime.length);
  }
  
  return { totalInstallations, totalRevenue, totalBatteries, uniqueCustomers, avgTime };
};

export default function EmployeesNew() {
  const [metricsTimeRange, setMetricsTimeRange] = useState("month");
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast({ title: "✓ העובד עודכן בהצלחה" });
    },
  });

  const isAdmin = currentUser?.role === "admin";
  const displayedUsers = isAdmin ? users : users.filter(u => u.id === currentUser?.id);
  
  const usersWithMetrics = useMemo(() => {
    return displayedUsers.map(user => ({
      ...user,
      metrics: calculateUserMetrics(user, jobs, leads, metricsTimeRange)
    }));
  }, [displayedUsers, jobs, leads, metricsTimeRange]);

  const handleVacationToggle = (user) => {
    const newStatus = user.availability_status === "בחופש" ? "פנוי" : "בחופש";
    updateMutation.mutate({ id: user.id, data: { availability_status: newStatus } });
  };

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

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
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
        </motion.div>

        {!isAdmin && (
          <div className="mb-6 flex gap-2 flex-wrap">
            <Button size="sm" variant={metricsTimeRange === "day" ? "default" : "outline"} onClick={() => setMetricsTimeRange("day")}>היום</Button>
            <Button size="sm" variant={metricsTimeRange === "week" ? "default" : "outline"} onClick={() => setMetricsTimeRange("week")}>שבוע</Button>
            <Button size="sm" variant={metricsTimeRange === "month" ? "default" : "outline"} onClick={() => setMetricsTimeRange("month")}>חודש</Button>
            <Button size="sm" variant={metricsTimeRange === "quarter" ? "default" : "outline"} onClick={() => setMetricsTimeRange("quarter")}>רבעון</Button>
            <Button size="sm" variant={metricsTimeRange === "all" ? "default" : "outline"} onClick={() => setMetricsTimeRange("all")}>כל הזמן</Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {usersWithMetrics.map((user) => (
            <motion.div key={user.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all">
                <CardContent className="p-6">
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
                    {user.phone && <Badge variant="outline">📞 {user.phone}</Badge>}
                  </div>

                  <div className="mt-4 pt-4 border-t space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">📊 מדדי ביצועים:</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 bg-blue-50 rounded">
                        <span className="text-blue-600 font-bold">{user.metrics.totalInstallations}</span>
                        <span className="text-slate-600"> התקנות</span>
                      </div>
                      <div className="p-2 bg-green-50 rounded">
                        <span className="text-green-600 font-bold">₪{user.metrics.totalRevenue.toLocaleString()}</span>
                        <span className="text-slate-600 text-xs block">הכנסות</span>
                      </div>
                      <div className="p-2 bg-purple-50 rounded">
                        <span className="text-purple-600 font-bold">{user.metrics.totalBatteries}</span>
                        <span className="text-slate-600"> מוצרים</span>
                      </div>
                      <div className="p-2 bg-orange-50 rounded">
                        <span className="text-orange-600 font-bold">{user.metrics.uniqueCustomers}</span>
                        <span className="text-slate-600"> לקוחות</span>
                      </div>
                    </div>
                    <div className="p-2 bg-pink-50 rounded text-center">
                      <span className="text-pink-600 font-bold">{user.metrics.avgTime}</span>
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
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}