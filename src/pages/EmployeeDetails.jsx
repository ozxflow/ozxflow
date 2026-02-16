import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, DollarSign, CheckSquare, TrendingUp, Loader2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import _ from 'lodash';

const MetricCard = ({ title, value, icon: Icon, color }) => (
  <Card className="border-none shadow-lg bg-white">
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg bg-${color}-100`}>
          <Icon className={`w-6 h-6 text-${color}-600`} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function EmployeeDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => supabase.entities.User.get(userId),
    enabled: !!userId,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs', 'byEmployee', user?.email],
    queryFn: () => supabase.entities.Job.filter({ installer_email: user.email }),
    enabled: !!user?.email,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list(),
  });

  if (isLoadingUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">שגיאה: עובד לא נמצא</h2>
        <Link to={createPageUrl('Employees')} className="text-blue-600 mt-4 inline-block">
          חזור לרשימת העובדים
        </Link>
      </div>
    );
  }

  const completedJobs = jobs.filter(j => j.status === 'בוצע');
  const totalRevenue = _.sumBy(completedJobs, job => {
    const relatedLead = leads.find(l => l.id === job.lead_id);
    return relatedLead?.actual_value || 0;
  });

  const roleColors = {
    "שלומי (Admin)": "bg-red-100 text-red-800",
    "אדמיניסטרציה": "bg-purple-100 text-purple-800",
    "איש צוות": "bg-blue-100 text-blue-800"
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
            <Link to={createPageUrl('Employees')} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4">
                <ArrowRight className="w-4 h-4" />
                חזרה לכל העובדים
            </Link>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-6 bg-white p-6 rounded-xl shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-bold text-4xl">{user.full_name?.[0] || 'U'}</span>
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{user.full_name}</h1>
                <div className="flex items-center gap-4 mt-2">
                    <Badge className={roleColors[user.role_type] || "bg-gray-100 text-gray-800"}>{user.role_type || "לא מוגדר"}</Badge>
                    <span className="text-slate-500">{user.email}</span>
                    {user.phone && <span className="text-slate-500">📞 {user.phone}</span>}
                </div>
              </div>
            </motion.div>
        </div>

        <h2 className="text-2xl font-bold text-slate-800 mb-6">תמונת מצב ביצועים</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard title="סך הכנסות" value={`₪${totalRevenue.toLocaleString()}`} icon={DollarSign} color="green" />
          <MetricCard title="עבודות שבוצעו" value={completedJobs.length} icon={CheckSquare} color="blue" />
          <MetricCard title="ממוצע הכנסה לעבודה" value={completedJobs.length > 0 ? `₪${(totalRevenue / completedJobs.length).toFixed(0)}` : '₪0'} icon={TrendingUp} color="purple" />
        </div>

        <Card className="border-none shadow-xl bg-white">
            <CardHeader>
                <CardTitle>עבודות אחרונות שבוצעו</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {completedJobs.slice(0, 5).map(job => (
                        <div key={job.id} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-semibold text-slate-800">{job.customer_name}</p>
                                <p className="text-sm text-slate-500">{new Date(job.end_time).toLocaleDateString('he-IL')}</p>
                            </div>
                            <Badge variant="secondary">
                                ₪{leads.find(l => l.id === job.lead_id)?.actual_value?.toLocaleString() || '0'}
                            </Badge>
                        </div>
                    ))}
                    {completedJobs.length === 0 && (
                        <p className="text-slate-500 text-center py-4">אין עבודות שבוצעו עדיין.</p>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}