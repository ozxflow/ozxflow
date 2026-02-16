import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight, DollarSign, FileText, Loader2, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import _ from 'lodash';

export default function CustomerDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const customerPhone = urlParams.get('phone');

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['leads', customerPhone],
    queryFn: () => supabase.entities.Lead.filter({ customer_phone: customerPhone }),
    enabled: !!customerPhone,
  });

  const { data: quotes = [], isLoading: isLoadingQuotes } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => supabase.entities.Quote.list(),
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => supabase.entities.Job.list(),
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => supabase.entities.Invoice.list(),
  });

  if (isLoadingLeads || isLoadingQuotes || isLoadingJobs || isLoadingInvoices) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!leads || leads.length === 0) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-2xl font-bold text-red-600">שגיאה: לקוח לא נמצא</h2>
        <Link to={createPageUrl('Customers')} className="text-blue-600 mt-4 inline-block">
          חזור לרשימת הלקוחות
        </Link>
      </div>
    );
  }

  const customer = leads[0];
  const customerQuotes = quotes.filter(q => leads.some(l => l.quote_id === q.id));
  const customerJobs = jobs.filter(j => leads.some(l => l.job_id === j.id));
  const customerInvoices = invoices.filter(inv => leads.some(l => l.id === inv.lead_id));
  
  const totalPaid = _.sumBy(leads.filter(l => l.payment_status === 'שולם'), l => l.actual_value || 0);
  const totalQuotes = customerQuotes.length;

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to={createPageUrl('Customers')} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mb-4">
            <ArrowRight className="w-4 h-4" />
            חזרה לכל הלקוחות
          </Link>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{customer.customer_name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-slate-500">📞 {customer.customer_phone}</span>
                  {customer.customer_email && <span className="text-slate-500">✉️ {customer.customer_email}</span>}
                </div>
                {customer.customer_address && (
                  <p className="text-slate-600 mt-2">📍 {customer.customer_address}</p>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">סה"כ סליקה</p>
                  <p className="text-2xl font-bold text-slate-900">₪{totalPaid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">הצעות מחיר</p>
                  <p className="text-2xl font-bold text-slate-900">{totalQuotes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">חשבוניות</p>
                  <p className="text-2xl font-bold text-slate-900">{customerInvoices.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-xl bg-white mb-6">
          <CardHeader>
            <CardTitle>הצעות מחיר ({customerQuotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customerQuotes.length > 0 ? (
              <div className="space-y-3">
                {_.orderBy(customerQuotes, 'created_date', 'desc').map(quote => (
                  <div key={quote.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">הצעת מחיר #{quote.serial_number}</p>
                        <p className="text-sm text-slate-500">{format(new Date(quote.created_date), 'dd/MM/yyyy HH:mm')}</p>
                        <Badge className="mt-2">{quote.status}</Badge>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">₪{quote.grand_total?.toLocaleString()}</p>
                        <Link to={createPageUrl(`Quotes?id=${quote.id}`)}>
                          <Button variant="outline" size="sm" className="mt-2">
                            <Edit className="w-3 h-3 ml-2" />
                            ערוך
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">אין הצעות מחיר עדיין</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white mb-6">
          <CardHeader>
            <CardTitle>עבודות ({customerJobs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customerJobs.length > 0 ? (
              <div className="space-y-3">
                {_.orderBy(customerJobs, 'start_time', 'desc').map(job => (
                  <div key={job.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">{job.service_type}</p>
                        <p className="text-sm text-slate-500">{format(new Date(job.start_time), 'dd/MM/yyyy HH:mm')}</p>
                        <p className="text-xs text-slate-500">איש צוות: {job.installer_name}</p>
                      </div>
                      <Badge>{job.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">אין עבודות עדיין</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white">
          <CardHeader>
            <CardTitle>חשבוניות ({customerInvoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {customerInvoices.length > 0 ? (
              <div className="space-y-3">
                {_.orderBy(customerInvoices, 'issue_date', 'desc').map(invoice => (
                  <div key={invoice.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-800">חשבונית #{invoice.serial_number}</p>
                        <p className="text-sm text-slate-500">{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</p>
                        {invoice.cardcom_invoice_number && (
                          <p className="text-xs text-slate-500">Cardcom: {invoice.cardcom_invoice_number}</p>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">₪{invoice.grand_total?.toLocaleString()}</p>
                        {invoice.cardcom_invoice_url && (
                          <a href={invoice.cardcom_invoice_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="mt-2">
                              צפה בחשבונית
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-4">אין חשבוניות עדיין</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}