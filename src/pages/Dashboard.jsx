import React, { useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Users, Calendar, Target, Award, DollarSign } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import { he } from "date-fns/locale";

const MetricCard = ({ title, value, color, icon: Icon }) => (
  <Card className="border-none shadow-md bg-white hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
        </div>
        {Icon && <Icon className={`w-12 h-12 ${color} opacity-20`} />}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [timeFilter, setTimeFilter] = useState("all");
  const [questionnaireFilter, setQuestionnaireFilter] = useState("all");

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list('-created_date'),
  });

  const filteredLeadsByTime = leads.filter(lead => {
    if (timeFilter === "all") return true;
    
    const createdDate = new Date(lead.created_date);
    const now = new Date();
    
    if (timeFilter === "month") {
      return createdDate >= startOfMonth(now) && createdDate <= endOfMonth(now);
    } else if (timeFilter === "quarter") {
      return createdDate >= startOfQuarter(now) && createdDate <= endOfQuarter(now);
    } else if (timeFilter === "year") {
      return createdDate >= startOfYear(now) && createdDate <= endOfYear(now);
    }
    return true;
  });

  const filteredLeads = filteredLeadsByTime.filter(lead => {
    if (questionnaireFilter === "all") return true;
    if (questionnaireFilter === "filled") return lead.filled_questionnaire === true;
    if (questionnaireFilter === "not_filled") return lead.filled_questionnaire !== true;
    return true;
  });

  // סטטיסטיקות משפך
  const funnelStats = {
    new: filteredLeads.filter(l => l.status === "חדש").length,
    inProcess: filteredLeads.filter(l => l.status === "בתהליך").length,
    notRelevant: filteredLeads.filter(l => l.status === "לא רלוונטי").length,
    meetingScheduled: filteredLeads.filter(l => l.status === "נקבעה פגישה").length,
    meetingHeld: filteredLeads.filter(l => l.status === "התקיימה פגישה").length,
    notClosed: filteredLeads.filter(l => l.status === "לא סגר").length,
    closed: filteredLeads.filter(l => l.status === "סגר").length
  };

  // סטטיסטיקות מקורות
  const trafficSources = filteredLeads.reduce((acc, lead) => {
    const source = lead.traffic_source || "לא צוין";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const conversionSources = filteredLeads.reduce((acc, lead) => {
    const source = lead.conversion_source || "לא צוין";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const registrationSources = filteredLeads.reduce((acc, lead) => {
    const source = lead.registration_source || "לא צוין";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  const adMethods = filteredLeads.reduce((acc, lead) => {
    const method = lead.ad_method || "לא צוין";
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  // שיעור המרה
  const conversionRate = filteredLeads.length > 0 
    ? ((funnelStats.closed / filteredLeads.length) * 100).toFixed(1) 
    : 0;

  const totalRevenue = filteredLeads
    .filter(l => l.status === "סגר")
    .reduce((sum, l) => sum + (l.actual_value || 0), 0);

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">דשבורד</h1>
          <p className="text-slate-600">סטטיסטיקות ליווי אישי לבניית חנות שופיפי</p>
        </motion.div>

        {/* פילטרים */}
        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">תקופה</label>
              <Tabs value={timeFilter} onValueChange={setTimeFilter}>
                <TabsList className="grid w-full grid-cols-4 bg-slate-100">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="month">חודש</TabsTrigger>
                  <TabsTrigger value="quarter">רבעון</TabsTrigger>
                  <TabsTrigger value="year">שנה</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">שאלון</label>
              <Tabs value={questionnaireFilter} onValueChange={setQuestionnaireFilter}>
                <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="filled">מילאו</TabsTrigger>
                  <TabsTrigger value="not_filled">לא מילאו</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        {/* מטריקות ראשיות */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard title="סה״כ לידים" value={filteredLeads.length} color="text-blue-600" icon={Users} />
          <MetricCard title="סגרו עסקה" value={funnelStats.closed} color="text-green-600" icon={Award} />
          <MetricCard title="שיעור המרה" value={`${conversionRate}%`} color="text-purple-600" icon={Target} />
          <MetricCard title="הכנסות" value={`₪${totalRevenue.toLocaleString()}`} color="text-orange-600" icon={DollarSign} />
        </div>

        {/* משפך */}
        <Card className="mb-6 border-none shadow-lg bg-white">
          <CardHeader>
            <CardTitle>משפך מכירה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className="text-2xl font-bold text-slate-700">{funnelStats.new}</p>
                <p className="text-sm text-slate-500">חדש</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{funnelStats.inProcess}</p>
                <p className="text-sm text-slate-500">בתהליך</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{funnelStats.notRelevant}</p>
                <p className="text-sm text-slate-500">לא רלוונטי</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{funnelStats.meetingScheduled}</p>
                <p className="text-sm text-slate-500">נקבעה פגישה</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-lg">
                <p className="text-2xl font-bold text-indigo-600">{funnelStats.meetingHeld}</p>
                <p className="text-sm text-slate-500">התקיימה פגישה</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{funnelStats.notClosed}</p>
                <p className="text-sm text-slate-500">לא סגר</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{funnelStats.closed}</p>
                <p className="text-sm text-slate-500">סגר</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* מקורות */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle>מקורות הגעה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(trafficSources).map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-slate-700">{source}</span>
                    <span className="font-bold text-blue-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle>מקורות המרה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(conversionSources).map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-slate-700">{source}</span>
                    <span className="font-bold text-green-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle>מקורות הרשמה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(registrationSources).map(([source, count]) => (
                  <div key={source} className="flex justify-between items-center">
                    <span className="text-slate-700">{source}</span>
                    <span className="font-bold text-purple-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardHeader>
              <CardTitle>שיטות פירסום</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(adMethods).map(([method, count]) => (
                  <div key={method} className="flex justify-between items-center">
                    <span className="text-slate-700">{method}</span>
                    <span className="font-bold text-orange-600">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}