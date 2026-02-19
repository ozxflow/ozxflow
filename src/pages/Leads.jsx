import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, TrendingUp, Edit, Trash2, DollarSign, Phone, Loader2, MessageSquare, FileText, User, ClipboardList, Upload, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import _ from 'lodash';
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import LeadsImport from "@/components/leads/LeadsImport";
import EntityNotesDialog from "@/components/EntityNotesDialog";
import { appConfig } from "@/config/appConfig";

const MetricCard = ({ title, value, color, isActive, onClick }) => (
  <Card 
    className={`border-none shadow-md cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
      isActive ? 'ring-4 ring-blue-500 bg-blue-50' : 'bg-white'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <p className={`text-xl md:text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-slate-500">{title}</p>
    </CardContent>
  </Card>
);

export default function Leads() {
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLostReasonDialogOpen, setIsLostReasonDialogOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [leadToUpdate, setLeadToUpdate] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [isAddingCustomReason, setIsAddingCustomReason] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [user, setUser] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirmDialog, setShowExitConfirmDialog] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [statusFilter, setStatusFilter] = useState(null);
  const [temperatureFilter, setTemperatureFilter] = useState(null);

  const [formData, setFormData] = useState({
    company_name: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    age: undefined,
    lead_rating: undefined,
    status: "חדש",
    rejection_reason: "",
    traffic_source: "אינסטגרם",
    conversion_source: "DM",
    registration_source: "מתנה חינמית",
    ad_method: "אורגני",
    filled_questionnaire: false,
    questionnaire: {},
    meeting_date: undefined,
    quote_id: "",
    actual_value: 0,
    notes: "",
    serial_number: "",
    lead_source_type: undefined,
    registration_date: new Date().toISOString(),
    initial_registration_date: new Date().toISOString()
    });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list('-created_date'),
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const results = await supabase.entities.Settings.list();
      return results[0] || { rejection_reasons: ["לא מעוניין", "לא מתאים", "מצא פתרון אחר", "מחיר גבוה מדי", "לא עונה"] };
    },
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => supabase.entities.Quote.list(),
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => supabase.entities.Task.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: async (taskData) => {
      const allLeads = await supabase.entities.Lead.list();
      const maxSerial = allLeads.reduce((max, lead) => {
        if (lead.serial_number && lead.serial_number.startsWith('1')) {
          const num = parseInt(lead.serial_number.substring(1), 10);
          if (!isNaN(num)) {
            return num > max ? num : max;
          }
        }
        return max;
      }, 0);
      const newSerial = `1${String(maxSerial + 1).padStart(4, '0')}`;
      
      const cleanData = { ...taskData, serial_number: newSerial };
      
      // ניקוי טלפון - הסרת 0 מההתחלה אם קיים
      if (cleanData.customer_phone && cleanData.customer_phone.startsWith('0')) {
        cleanData.customer_phone = cleanData.customer_phone.substring(1);
      }
      
      // בדיקה אם יש ליד קיים עם אותו טלפון
      const existingLead = allLeads.find(l => l.customer_phone === cleanData.customer_phone);
      const now = new Date().toISOString();
      
      // טיפול בתאריכי הרשמה
      if (existingLead && existingLead.initial_registration_date) {
        // ליד קיים - נשמור את התאריך הראשוני
        cleanData.initial_registration_date = existingLead.initial_registration_date;
        // תאריך ההרשמה הנוכחי - אם המשתמש בחר ידנית נשתמש בו, אחרת תאריך נוכחי
        cleanData.registration_date = cleanData.registration_date || now;
      } else {
        // ליד חדש לגמרי
        if (cleanData.registration_date) {
          // המשתמש בחר תאריך ידנית - נשתמש בו לשני השדות
          cleanData.initial_registration_date = cleanData.registration_date;
        } else {
          // אין תאריך ידני - נשתמש בתאריך הנוכחי
          cleanData.initial_registration_date = now;
          cleanData.registration_date = now;
        }
      }
      
      if (cleanData.age === undefined || cleanData.age === "") delete cleanData.age;
      if (!cleanData.customer_email) delete cleanData.customer_email;
      if (!cleanData.notes) delete cleanData.notes;
      if (!cleanData.rejection_reason) delete cleanData.rejection_reason;
      if (!cleanData.meeting_date) delete cleanData.meeting_date;
      if (!cleanData.quote_id) delete cleanData.quote_id;

      return supabase.entities.Lead.create({
        ...cleanData,
        created_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setFormData({
        company_name: "",
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        age: undefined,
        lead_rating: settings?.default_lead_rating || undefined,
        status: settings?.default_lead_status || "חדש",
        rejection_reason: "",
        traffic_source: "אינסטגרם",
        conversion_source: "DM",
        registration_source: "מתנה חינמית",
        ad_method: "אורגני",
        filled_questionnaire: false,
        questionnaire: {},
        meeting_date: undefined,
        quote_id: "",
        actual_value: 0,
        notes: "",
        serial_number: "",
        registration_date: new Date().toISOString(),
        initial_registration_date: new Date().toISOString()
        });
      toast({ title: "✓ הליד נוסף בהצלחה" });
    },
    onError: (error) => {
      toast({ 
        title: "שגיאה בשמירת ליד", 
        description: error.message || "נסה שוב",
        variant: "destructive" 
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      const cleanData = { ...data };
      if (cleanData.age === undefined || cleanData.age === "") delete cleanData.age;
      if (!cleanData.customer_email) delete cleanData.customer_email;
      if (!cleanData.notes) delete cleanData.notes;
      if (!cleanData.rejection_reason) delete cleanData.rejection_reason;
      if (!cleanData.meeting_date) delete cleanData.meeting_date;
      if (!cleanData.quote_id) delete cleanData.quote_id;

      return supabase.entities.Lead.update(id, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowForm(false);
      setShowEditDialog(false);
      setEditingLead(null);
      setIsLostReasonDialogOpen(false);
      setLeadToUpdate(null);
      setLostReason("");
      toast({ title: "✓ הליד עודכן" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Lead.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "✓ הליד נמחק", variant: "destructive" });
    },
  });

  const handleDelete = (lead) => {
    if (!user || user.role !== "admin") {
      toast({ title: "אין הרשאה", description: "רק מנהל יכול למחוק לידים", variant: "destructive" });
      return;
    }
    
    setLeadToDelete(lead);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (leadToDelete) {
      deleteMutation.mutate(leadToDelete.id);
      setShowDeleteDialog(false);
      setLeadToDelete(null);
    }
  };

  useEffect(() => {
    if (originalFormData && showEditDialog) {
      const hasChanges = JSON.stringify(formData) !== JSON.stringify(originalFormData);
      setHasUnsavedChanges(hasChanges);
    }
  }, [formData, originalFormData, showEditDialog]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    setHasUnsavedChanges(false);
  };

  const handleCloseDialog = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirmDialog(true);
    } else {
      setShowEditDialog(false);
      setEditingLead(null);
      setOriginalFormData(null);
    }
  };

  const handleForceClose = () => {
    setShowExitConfirmDialog(false);
    setShowEditDialog(false);
    setEditingLead(null);
    setOriginalFormData(null);
    setHasUnsavedChanges(false);
  };

  const handleSaveAndClose = () => {
    if (editingLead) {
      updateMutation.mutate({ id: editingLead.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
    setShowExitConfirmDialog(false);
    setHasUnsavedChanges(false);
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    const initialData = {
      company_name: lead.company_name || "",
      customer_name: lead.customer_name || "",
      customer_phone: lead.customer_phone || "",
      customer_email: lead.customer_email || "",
      age: lead.age || undefined,
      lead_rating: lead.lead_rating || undefined,
      status: lead.status || "חדש",
      rejection_reason: lead.rejection_reason || "",
      traffic_source: lead.traffic_source || "אינסטגרם",
      conversion_source: lead.conversion_source || "DM",
      registration_source: lead.registration_source || "מתנה חינמית",
      ad_method: lead.ad_method || "אורגני",
      filled_questionnaire: lead.filled_questionnaire || false,
      questionnaire: lead.questionnaire || {},
      meeting_date: lead.meeting_date || undefined,
      quote_id: lead.quote_id || "",
      actual_value: lead.actual_value || 0,
      notes: lead.notes || "",
      serial_number: lead.serial_number || "",
      registration_date: lead.registration_date || undefined,
      initial_registration_date: lead.initial_registration_date || undefined,
      lead_source_type: lead.lead_source_type || undefined,
      car_looking_for: lead.car_looking_for || "",
      budget: lead.budget || undefined,
      car_selling: lead.car_selling || "",
      asking_price: lead.asking_price || undefined
      };
    setFormData(initialData);
    setOriginalFormData(initialData);
    setHasUnsavedChanges(false);
    setShowEditDialog(true);
  };
  
  const handleStatusChange = (lead, newStatus) => {
    if (newStatus === 'לא רלוונטי' || newStatus === 'לא סגר') {
      setLeadToUpdate({ ...lead, status: newStatus });
      setIsLostReasonDialogOpen(true);
    } else {
      updateMutation.mutate({ id: lead.id, data: { ...lead, status: newStatus }});
    }
  };

  const handleSaveLostReason = async () => {
    if (!lostReason && !customReason) {
      toast({ title: "נא לבחור סיבה", variant: "destructive" });
      return;
    }
    
    const finalReason = lostReason === "אחר - הוסף חדש" ? customReason : lostReason;
    
    if (!finalReason) {
      toast({ title: "נא למלא סיבה", variant: "destructive" });
      return;
    }
    
    // אם זו סיבה חדשה, נוסיף אותה להגדרות
    if (lostReason === "אחר - הוסף חדש" && settings) {
      const currentReasons = settings.rejection_reasons || [];
      if (!currentReasons.includes(finalReason)) {
        if (settings.id) {
          await supabase.entities.Settings.update(settings.id, {
            ...settings,
            rejection_reasons: [...currentReasons, finalReason]
          });
        } else {
          await supabase.entities.Settings.create({
            rejection_reasons: [...currentReasons, finalReason]
          });
        }
        queryClient.invalidateQueries({ queryKey: ['settings'] });
      }
    }
    
    if (leadToUpdate) {
      updateMutation.mutate({ id: leadToUpdate.id, data: { ...leadToUpdate, rejection_reason: finalReason } });
    }
  };

  const handleQuickReject = (lead) => {
    setLeadToUpdate({ ...lead, status: 'לא רלוונטי' });
    setLostReason("");
    setCustomReason("");
    setIsAddingCustomReason(false);
    setIsLostReasonDialogOpen(true);
  };



  const filteredLeadsBySearch = leads.filter(lead =>
    lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.customer_phone?.includes(searchQuery) ||
    lead.serial_number?.includes(searchQuery)
  );

  let filteredLeads = filteredLeadsBySearch;

  // סינון לפי סטטוס
  if (statusFilter) {
    filteredLeads = filteredLeads.filter(lead => lead.status === statusFilter);
  }

  // סינון לפי תאריך
  if (dateFilter !== 'all') {
    const now = new Date();
    let startDate;
    
    switch(dateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          filteredLeads = filteredLeads.filter(lead => {
            const leadDate = new Date(lead.initial_registration_date || lead.registration_date || lead.created_date);
            return leadDate >= start && leadDate <= end;
          });
        }
        break;
    }
    
    if (dateFilter !== 'custom' && startDate) {
      filteredLeads = filteredLeads.filter(lead => {
        const leadDate = new Date(lead.initial_registration_date || lead.registration_date || lead.created_date);
        return leadDate >= startDate;
      });
    }
  }

  // סינון לפי טמפרטורת ליד
  if (temperatureFilter) {
    filteredLeads = filteredLeads.filter(lead => lead.lead_rating === temperatureFilter);
  }

  // Infinite scroll - show only visible count
  const paginatedLeads = filteredLeads.slice(0, visibleCount);

  // Reset visible count when filters change
  React.useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, dateFilter, customStartDate, customEndDate, statusFilter]);

  // Infinite scroll
  React.useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (visibleCount < filteredLeads.length) {
          setVisibleCount(prev => Math.min(prev + 20, filteredLeads.length));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleCount, filteredLeads.length]);

  // מציאת כל קבוצות הלידים הקשורים (לפי טלפון או מייל)
  const leadGroups = useMemo(() => {
    const groups = {};
    const processed = new Set();
    
    leads.forEach(lead => {
      if (processed.has(lead.id)) return;
      
      const group = [lead];
      processed.add(lead.id);
      
      // מציאת כל הלידים הקשורים (BFS)
      const queue = [lead];
      while (queue.length > 0) {
        const current = queue.shift();
        
        leads.forEach(otherLead => {
          if (processed.has(otherLead.id)) return;
          
          const samePhone = current.customer_phone && otherLead.customer_phone && 
                           current.customer_phone === otherLead.customer_phone;
          const sameEmail = current.customer_email && otherLead.customer_email && 
                           current.customer_email.toLowerCase() === otherLead.customer_email.toLowerCase();
          
          if (samePhone || sameEmail) {
            group.push(otherLead);
            processed.add(otherLead.id);
            queue.push(otherLead);
          }
        });
      }
      
      // שמירת הקבוצה לכל חברי הקבוצה
      group.forEach(l => {
        groups[l.id] = group.sort((a, b) => 
          new Date(b.registration_date || b.created_date) - new Date(a.registration_date || a.created_date)
        );
      });
    });
    
    return groups;
  }, [leads]);

  const statusColors = {
    "חדש": "bg-sky-100 text-sky-800",
    "ממתין להצעה": "bg-yellow-100 text-yellow-800",
    "התקיימה פגישה": "bg-indigo-100 text-indigo-800",
    "הצעה אושרה": "bg-emerald-100 text-emerald-800",
    "סגר": "bg-green-100 text-green-800",
    "לא סגר": "bg-red-100 text-red-800",
    "רשום לאתר הרכב": "bg-blue-100 text-blue-800",
    "מודעת דרוש": "bg-purple-100 text-purple-800",
    "מודעת רכב": "bg-green-100 text-green-800",
    "נרשם לוובינר": "bg-indigo-100 text-indigo-800",
    "קיבל הקלטה": "bg-cyan-100 text-cyan-800",
    "רכש קורס": "bg-teal-100 text-teal-800",
    "לידים לליווי המלא": "bg-amber-100 text-amber-800",
    "רכש ליווי מלא": "bg-emerald-100 text-emerald-800",
    "לא סגר ליווי": "bg-orange-100 text-orange-800",
    "לא רלוונטי": "bg-red-100 text-red-800"
  };
  
  const ratingColors = {
    "ליד קריר": "bg-blue-100 text-blue-800 border-2 border-blue-300",
    "ליד קר קרח": "bg-cyan-100 text-cyan-800 border-2 border-cyan-300",
    "ליד נחמד": "bg-orange-100 text-orange-800 border-2 border-orange-300",
    "ליד חם אש": "bg-red-100 text-red-800 border-2 border-red-400 shadow-lg"
  };
  
  const ratingIcons = {
    "ליד קריר": "❄️",
    "ליד קר קרח": "🧊",
    "ליד נחמד": "🌤️",
    "ליד חם אש": "🔥"
  };
  
  const statusCounts = _.countBy(leads, 'status');

  // חישוב לידים חודשיים וגבול החבילה
  const maxLeads = user?.org?.max_leads_per_month || 40;
  const monthlyLeadsCount = useMemo(() => {
    if (!leads.length) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return leads.filter(l => {
      const created = new Date(l.created_date);
      return created >= startOfMonth;
    }).length;
  }, [leads]);
  const leadUsagePercent = Math.round((monthlyLeadsCount / maxLeads) * 100);
  const isNearLimit = leadUsagePercent >= 80 && leadUsagePercent < 100;
  const isAtLimit = monthlyLeadsCount >= maxLeads;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* התראת גבול לידים */}
        {isAtLimit && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800">הגעת לגבול הלידים החודשי ({monthlyLeadsCount}/{maxLeads})</p>
                <p className="text-sm text-red-600">כדי להוסיף לידים נוספים יש לשדרג את החבילה</p>
              </div>
            </div>
            <a href={`https://wa.me/${appConfig.supportWhatsApp}?text=${encodeURIComponent('היי, אני רוצה לשדרג את החבילה שלי במערכת')}`} target="_blank" rel="noopener noreferrer">
              <Button className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap">שדרג עכשיו</Button>
            </a>
          </motion.div>
        )}
        {isNearLimit && !isAtLimit && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-bold text-yellow-800">את/ה מתקרב/ת לגבול הלידים החודשי ({monthlyLeadsCount}/{maxLeads})</p>
                <p className="text-sm text-yellow-600">שדרג את החבילה כדי להמשיך להוסיף לידים ללא הגבלה</p>
              </div>
            </div>
            <a href={`https://wa.me/${appConfig.supportWhatsApp}?text=${encodeURIComponent('היי, אני רוצה לשדרג את החבילה שלי במערכת')}`} target="_blank" rel="noopener noreferrer">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white whitespace-nowrap">שדרג עכשיו</Button>
            </a>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <TrendingUp className="w-10 h-10 text-blue-600" />
              לידים
            </h1>
            <p className="text-slate-600">ניהול לקוחות פוטנציאליים ({filteredLeads.length}) · החודש: {monthlyLeadsCount}/{maxLeads}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImportDialog(true)}
              className="bg-purple-700 hover:bg-purple-800 shadow-lg text-white"
              disabled={isAtLimit}
            >
              <Upload className="w-5 h-5 mr-2" />
              יבא לידים
            </Button>
            <Button
              disabled={isAtLimit}
              onClick={() => {
                setShowForm(true);
                setEditingLead(null);
                setFormData({
                  company_name: "",
                  customer_name: "",
                  customer_phone: "",
                  age: undefined,
                  lead_rating: settings?.default_lead_rating || undefined,
                  status: settings?.default_lead_status || "חדש",
                  rejection_reason: "",
                  traffic_source: "אינסטגרם",
                  conversion_source: "DM",
                  registration_source: "מתנה חינמית",
                  ad_method: "אורגני",
                  filled_questionnaire: false,
                  questionnaire: {},
                  meeting_date: undefined,
                  quote_id: "",
                  actual_value: 0,
                  notes: "",
                  serial_number: "",
                  registration_date: new Date().toISOString(),
                  initial_registration_date: new Date().toISOString()
                });
              }}
              className="bg-[#1e3a8a] hover:bg-[#1e40af] shadow-lg text-white"
            >
              <Plus className="w-5 h-5 mr-2" />
              ליד חדש
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
          {(settings?.lead_status_cubes?.length > 0 ? settings.lead_status_cubes : [
            { status: "חדש", color: "text-blue-600" },
            { status: "בטיפול", color: "text-purple-600" },
            { status: "נקבעה פגישה", color: "text-green-600" },
            { status: "התקיימה פגישה", color: "text-indigo-600" },
            { status: "הצעת מחיר", color: "text-cyan-600" },
            { status: "לא סגר", color: "text-red-600" },
            { status: "סגר", color: "text-emerald-600" },
          ]).map((cube) => (
            <MetricCard
              key={cube.status}
              title={cube.status}
              value={statusCounts[cube.status] || 0}
              color={cube.color}
              isActive={statusFilter === cube.status}
              onClick={() => setStatusFilter(statusFilter === cube.status ? null : cube.status)}
            />
          ))}
        </div>



        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <div className="flex flex-col gap-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600 block">סינון לפי תאריך:</span>
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                  <Button 
                    variant={dateFilter === "all" ? "default" : "outline"} 
                    onClick={() => setDateFilter("all")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    כל הזמן
                  </Button>
                  <Button 
                    variant={dateFilter === "today" ? "default" : "outline"} 
                    onClick={() => setDateFilter("today")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    📅 היום
                  </Button>
                  <Button 
                    variant={dateFilter === "week" ? "default" : "outline"} 
                    onClick={() => setDateFilter("week")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    📆 שבוע
                  </Button>
                  <Button 
                    variant={dateFilter === "month" ? "default" : "outline"} 
                    onClick={() => setDateFilter("month")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    🗓️ חודש
                  </Button>
                  <Button 
                    variant={dateFilter === "custom" ? "default" : "outline"} 
                    onClick={() => setDateFilter("custom")}
                    className="w-full md:w-auto h-10 md:h-9 col-span-2"
                  >
                    🔧 מותאם אישית
                  </Button>
                </div>
              </div>

              {dateFilter === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">מתאריך</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-right w-full h-11"
                      dir="rtl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">עד תאריך</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-right w-full h-11"
                      dir="rtl"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-600 block">סינון לפי חום ליד:</span>
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                  <Button
                    variant={temperatureFilter === null ? "default" : "outline"}
                    onClick={() => setTemperatureFilter(null)}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    הכל
                  </Button>
                  <Button
                    variant={temperatureFilter === "ליד קר קרח" ? "default" : "outline"}
                    onClick={() => setTemperatureFilter(temperatureFilter === "ליד קר קרח" ? null : "ליד קר קרח")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    🧊 קר קרח
                  </Button>
                  <Button
                    variant={temperatureFilter === "ליד קריר" ? "default" : "outline"}
                    onClick={() => setTemperatureFilter(temperatureFilter === "ליד קריר" ? null : "ליד קריר")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    ❄️ קריר
                  </Button>
                  <Button
                    variant={temperatureFilter === "ליד נחמד" ? "default" : "outline"}
                    onClick={() => setTemperatureFilter(temperatureFilter === "ליד נחמד" ? null : "ליד נחמד")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    🌤️ חם
                  </Button>
                  <Button
                    variant={temperatureFilter === "ליד חם אש" ? "default" : "outline"}
                    onClick={() => setTemperatureFilter(temperatureFilter === "ליד חם אש" ? null : "ליד חם אש")}
                    className="w-full md:w-auto h-10 md:h-9"
                  >
                    🔥 רותח
                  </Button>
                </div>
              </div>

            </div>

            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="חיפוש לידים (שם, טלפון, מספר סידורי)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 text-lg h-12"
              />
            </div>
          </div>
        </Card>

        {/* Dialog for New Lead */}
        <Dialog open={showForm && !editingLead} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingLead(null); } }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ליד חדש</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>שם עסק (אופציונלי)</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="שם החברה"
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם איש קשר</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="שם הלקוח"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    placeholder="מספר טלפון"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>דואר אלקטרוני</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    placeholder="כתובת אימייל (אופציונלי)"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>גיל</Label>
                  <Input
                    type="number"
                    value={formData.age || ""}
                    onChange={(e) => setFormData({...formData, age: e.target.value ? parseInt(e.target.value) : undefined})}
                    placeholder="גיל"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>שווי עסקה</Label>
                  <Input
                    type="number"
                    value={formData.actual_value}
                    onChange={(e) => setFormData({...formData, actual_value: parseFloat(e.target.value) || 0})}
                    placeholder="7500 - ליווי אישי"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>דירוג חום ליד</Label>
                  <Select value={formData.lead_rating || ""} onValueChange={(value) => setFormData({...formData, lead_rating: value})}>
                    <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                      <SelectValue placeholder="בחר דירוג..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="ליד קר קרח" className="text-right">🧊 ליד קר קרח</SelectItem>
                      <SelectItem value="ליד קריר" className="text-right">❄️ ליד קריר</SelectItem>
                      <SelectItem value="ליד נחמד" className="text-right">🌤️ ליד נחמד</SelectItem>
                      <SelectItem value="ליד חם אש" className="text-right">🔥 ליד חם אש</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {(() => {
                        const cubeStatuses = (settings?.lead_status_cubes?.length > 0 ? settings.lead_status_cubes : []).map(c => c.status);
                        const allStatuses = cubeStatuses.length > 0 ? cubeStatuses : ["חדש", "בטיפול", "נקבעה פגישה", "התקיימה פגישה", "הצעת מחיר", "לא סגר", "סגר"];
                        return allStatuses.map(s => (
                          <SelectItem key={s} value={s} className="text-right">{s}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>תאריך הרשמה (אופציונלי - ברירת מחדל: עכשיו)</Label>
                <Input
                  type="datetime-local"
                  value={formData.registration_date && !isNaN(new Date(formData.registration_date)) ? new Date(formData.registration_date).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const selectedDate = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                    setFormData({...formData, registration_date: selectedDate, initial_registration_date: selectedDate});
                  }}
                  className="text-right"
                  dir="rtl"
                />
                <p className="text-xs text-slate-500">ברירת מחדל: תאריך ושעה נוכחיים</p>
              </div>

              <div className="space-y-2">
                <Label>מילא שאלון?</Label>
                <Select value={formData.filled_questionnaire ? "yes" : "no"} onValueChange={(value) => setFormData({...formData, filled_questionnaire: value === "yes"})}>
                  <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                    <SelectValue placeholder="בחר..." />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="yes" className="text-right">כן</SelectItem>
                    <SelectItem value="no" className="text-right">לא</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">מקורות</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>מקור הגעה</Label>
                    <Select value={formData.traffic_source} onValueChange={(value) => setFormData({...formData, traffic_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="אינסטגרם" className="text-right">אינסטגרם</SelectItem>
                        <SelectItem value="יוטיוב" className="text-right">יוטיוב</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>מקור המרה</Label>
                    <Select value={formData.conversion_source} onValueChange={(value) => setFormData({...formData, conversion_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="DM" className="text-right">DM</SelectItem>
                        <SelectItem value="ביו" className="text-right">ביו</SelectItem>
                        <SelectItem value="וואטסאפ" className="text-right">וואטסאפ</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>מקור הרשמה</Label>
                    <Select value={formData.registration_source} onValueChange={(value) => setFormData({...formData, registration_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="מתנה חינמית" className="text-right">מתנה חינמית</SelectItem>
                        <SelectItem value="דף נחיתה ראשי" className="text-right">דף נחיתה ראשי</SelectItem>
                        <SelectItem value="דף נחיתה וובינר" className="text-right">דף נחיתה וובינר</SelectItem>
                        <SelectItem value="שאלון" className="text-right">שאלון</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>שיטת פירסום</Label>
                    <Select value={formData.ad_method} onValueChange={(value) => setFormData({...formData, ad_method: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="אורגני" className="text-right">אורגני</SelectItem>
                        <SelectItem value="ממומן" className="text-right">ממומן</SelectItem>
                        <SelectItem value="חבר מביא חבר" className="text-right">חבר מביא חבר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="h-24"
                  placeholder="הערות נוספות (אופציונלי)..."
                />
              </div>
              {(formData.status === 'לא רלוונטי' || formData.status === 'לא סגר') && (
                  <div className="space-y-2">
                      <Label>סיבת {formData.status === 'לא רלוונטי' ? 'אי רלוונטיות' : 'אי סגירה'}</Label>
                      <Textarea
                          value={formData.rejection_reason}
                          onChange={(e) => setFormData({...formData, rejection_reason: e.target.value})}
                          className="h-24"
                          placeholder="לדוגמה: לא מעוניין, לא מתאים, מצא פתרון אחר..."
                      />
                  </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="bg-gray-100 hover:bg-gray-200">
                  ביטול
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm md:text-lg font-bold py-3 px-4 md:py-6 md:px-8 shadow-lg hover:shadow-xl transition-all" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                  💾 שמור שינויים
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog for Edit Lead */}
        <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { handleCloseDialog(); } }}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת ליד</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>שם עסק (אופציונלי)</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  placeholder="שם החברה"
                  className="text-right"
                  dir="rtl"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שם מלא</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="שם הלקוח"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                    placeholder="מספר טלפון"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>דואר אלקטרוני</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})}
                    placeholder="כתובת אימייל (אופציונלי)"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>גיל</Label>
                  <Input
                    type="number"
                    value={formData.age || ""}
                    onChange={(e) => setFormData({...formData, age: e.target.value ? parseInt(e.target.value) : undefined})}
                    placeholder="גיל"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>שווי עסקה</Label>
                  <Input
                    type="number"
                    value={formData.actual_value}
                    onChange={(e) => setFormData({...formData, actual_value: parseFloat(e.target.value) || 0})}
                    placeholder="7500 - ליווי אישי"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>דירוג חום ליד</Label>
                  <Select value={formData.lead_rating || ""} onValueChange={(value) => setFormData({...formData, lead_rating: value})}>
                    <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                      <SelectValue placeholder="בחר דירוג..." />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="ליד קר קרח" className="text-right">🧊 ליד קר קרח</SelectItem>
                      <SelectItem value="ליד קריר" className="text-right">❄️ ליד קריר</SelectItem>
                      <SelectItem value="ליד נחמד" className="text-right">🌤️ ליד נחמד</SelectItem>
                      <SelectItem value="ליד חם אש" className="text-right">🔥 ליד חם אש</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {(() => {
                        const cubeStatuses = (settings?.lead_status_cubes?.length > 0 ? settings.lead_status_cubes : []).map(c => c.status);
                        const allStatuses = cubeStatuses.length > 0 ? cubeStatuses : ["חדש", "בטיפול", "נקבעה פגישה", "התקיימה פגישה", "הצעת מחיר", "לא סגר", "סגר"];
                        // Also include the current lead's status if it's not in the list
                        if (formData.status && !allStatuses.includes(formData.status)) {
                          allStatuses.push(formData.status);
                        }
                        return allStatuses.map(s => (
                          <SelectItem key={s} value={s} className="text-right">{s}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>תאריך הרשמה נוכחי</Label>
                  <Input
                    type="datetime-local"
                    value={formData.registration_date && !isNaN(new Date(formData.registration_date)) ? new Date(formData.registration_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setFormData({...formData, registration_date: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>תאריך הרשמה ראשוני</Label>
                  <Input
                    type="datetime-local"
                    value={formData.initial_registration_date && !isNaN(new Date(formData.initial_registration_date)) ? new Date(formData.initial_registration_date).toISOString().slice(0, 16) : ""}
                    onChange={(e) => setFormData({...formData, initial_registration_date: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>מילא שאלון?</Label>
                <Select value={formData.filled_questionnaire ? "yes" : "no"} onValueChange={(value) => setFormData({...formData, filled_questionnaire: value === "yes"})}>
                  <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">כן</SelectItem>
                    <SelectItem value="no">לא</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.lead_source_type === "מודעת דרוש" && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4 text-purple-700">📋 פרטי מודעת דרוש</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>איזה רכב מחפש?</Label>
                      <Input
                        value={formData.car_looking_for || ""}
                        onChange={(e) => setFormData({...formData, car_looking_for: e.target.value})}
                        placeholder="לדוגמה: טויוטה קורולה 2015"
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>תקציב (₪)</Label>
                      <Input
                        type="number"
                        value={formData.budget || ""}
                        onChange={(e) => setFormData({...formData, budget: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder="50000"
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {formData.lead_source_type === "מודעת רכב" && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4 text-green-700">🚗 פרטי מודעת רכב</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>איזה רכב מוכר?</Label>
                      <Input
                        value={formData.car_selling || ""}
                        onChange={(e) => setFormData({...formData, car_selling: e.target.value})}
                        placeholder="לדוגמה: מאזדה 3 2018"
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>כמה דורש על הרכב? (₪)</Label>
                      <Input
                        type="number"
                        value={formData.asking_price || ""}
                        onChange={(e) => setFormData({...formData, asking_price: e.target.value ? parseFloat(e.target.value) : undefined})}
                        placeholder="75000"
                        className="text-right"
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">מקורות</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>מקור הגעה</Label>
                    <Select value={formData.traffic_source} onValueChange={(value) => setFormData({...formData, traffic_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="אינסטגרם" className="text-right">אינסטגרם</SelectItem>
                        <SelectItem value="יוטיוב" className="text-right">יוטיוב</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>מקור המרה</Label>
                    <Select value={formData.conversion_source} onValueChange={(value) => setFormData({...formData, conversion_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="DM" className="text-right">DM</SelectItem>
                        <SelectItem value="ביו" className="text-right">ביו</SelectItem>
                        <SelectItem value="וואטסאפ" className="text-right">וואטסאפ</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>מקור הרשמה</Label>
                    <Select value={formData.registration_source} onValueChange={(value) => setFormData({...formData, registration_source: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="מתנה חינמית" className="text-right">מתנה חינמית</SelectItem>
                        <SelectItem value="דף נחיתה ראשי" className="text-right">דף נחיתה ראשי</SelectItem>
                        <SelectItem value="דף נחיתה וובינר" className="text-right">דף נחיתה וובינר</SelectItem>
                        <SelectItem value="שאלון" className="text-right">שאלון</SelectItem>
                        <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>שיטת פירסום</Label>
                    <Select value={formData.ad_method} onValueChange={(value) => setFormData({...formData, ad_method: value})}>
                      <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="אורגני" className="text-right">אורגני</SelectItem>
                        <SelectItem value="ממומן" className="text-right">ממומן</SelectItem>
                        <SelectItem value="חבר מביא חבר" className="text-right">חבר מביא חבר</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {formData.filled_questionnaire && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">📋 שאלון</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>האם ניסית בעבר להקים חנות אונליין?</Label>
                      <Select 
                        value={formData.questionnaire?.tried_before || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, tried_before: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="כן, ועדיין לא הצלחתי" className="text-right">כן, ועדיין לא הצלחתי</SelectItem>
                          <SelectItem value="נסיתי קצת" className="text-right">נסיתי קצת</SelectItem>
                          <SelectItem value="לא, זו הפעם הראשונה שלי" className="text-right">לא, זו הפעם הראשונה שלי</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

...

                    <div className="space-y-2">
                      <Label>מה האתגר הכי גדול שלך?</Label>
                      <Select 
                        value={formData.questionnaire?.biggest_challenge || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, biggest_challenge: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="מציאת מוצרים שמוכרים" className="text-right">מציאת מוצרים שמוכרים</SelectItem>
                          <SelectItem value="בניית חנות מקצועית" className="text-right">בניית חנות מקצועית</SelectItem>
                          <SelectItem value="שיווק וקידום" className="text-right">שיווק וקידום</SelectItem>
                          <SelectItem value="מיתוג ובידול" className="text-right">מיתוג ובידול</SelectItem>
                          <SelectItem value="ניהול כסף ורווחיות" className="text-right">ניהול כסף ורווחיות</SelectItem>
                          <SelectItem value="אחר" className="text-right">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>מה יעד המכירות החודשי שלך?</Label>
                      <Select 
                        value={formData.questionnaire?.target_sales || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, target_sales: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="עד 5,000 ₪" className="text-right">עד 5,000 ₪</SelectItem>
                          <SelectItem value="5,000-15,000 ₪" className="text-right">5,000-15,000 ₪</SelectItem>
                          <SelectItem value="15,000-30,000 ₪" className="text-right">15,000-30,000 ₪</SelectItem>
                          <SelectItem value="מעל 30,000 ₪" className="text-right">מעל 30,000 ₪</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>מה היית רוצה להשיג בליווי?</Label>
                      <Select 
                        value={formData.questionnaire?.mentoring_goal || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, mentoring_goal: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="להקים חנות שעובדת" className="text-right">להקים חנות שעובדת</SelectItem>
                          <SelectItem value="להתחיל למכור מהר" className="text-right">להתחיל למכור מהר</SelectItem>
                          <SelectItem value="לבנות מותג אמיתי לטווח ארוך" className="text-right">לבנות מותג אמיתי לטווח ארוך</SelectItem>
                          <SelectItem value="להגיע להכנסה קבועה מהאיקומרס" className="text-right">להגיע להכנסה קבועה מהאיקומרס</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>מה ייחשב עבורך הצלחה?</Label>
                      <Textarea
                        value={formData.questionnaire?.success_definition || ""}
                        onChange={(e) => setFormData({...formData, questionnaire: {...formData.questionnaire, success_definition: e.target.value}})}
                        placeholder="למשל: הכנסה קבועה של 10,000 ש״ח בחודש"
                        className="h-20 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>מה חשוב לך במי שמלווה אותך?</Label>
                      <Textarea
                        value={formData.questionnaire?.mentor_importance || ""}
                        onChange={(e) => setFormData({...formData, questionnaire: {...formData.questionnaire, mentor_importance: e.target.value}})}
                        placeholder="למשל: ניסיון מוכח, זמינות, סבלנות..."
                        className="h-20 text-right"
                        dir="rtl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>כמה זמן בשבוע אתה מוכן להשקיע?</Label>
                      <Select 
                        value={formData.questionnaire?.weekly_hours || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, weekly_hours: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="פחות מ-5 שעות" className="text-right">פחות מ-5 שעות</SelectItem>
                          <SelectItem value="5-10 שעות" className="text-right">5-10 שעות</SelectItem>
                          <SelectItem value="מעל 10 שעות" className="text-right">מעל 10 שעות</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>מתי הזמן הכי טוב לשיחה?</Label>
                      <Select 
                        value={formData.questionnaire?.best_time_to_call || ""} 
                        onValueChange={(value) => setFormData({...formData, questionnaire: {...formData.questionnaire, best_time_to_call: value}})}
                      >
                        <SelectTrigger className="w-full" dir="rtl" style={{ textAlign: 'right', direction: 'rtl' }}>
                          <SelectValue placeholder="בחר..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value="9:00 - 12:00" className="text-right">9:00 - 12:00</SelectItem>
                          <SelectItem value="12:00 - 15:00" className="text-right">12:00 - 15:00</SelectItem>
                          <SelectItem value="15:00 - 18:00" className="text-right">15:00 - 18:00</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="h-24 text-right"
                  dir="rtl"
                  placeholder="הערות נוספות (אופציונלי)..."
                />
              </div>
              {(formData.status === 'לא רלוונטי' || formData.status === 'לא סגר') && (
                  <div className="space-y-2">
                      <Label>סיבת {formData.status === 'לא רלוונטי' ? 'אי רלוונטיות' : 'אי סגירה'}</Label>
                      <Textarea
                          value={formData.rejection_reason}
                          onChange={(e) => setFormData({...formData, rejection_reason: e.target.value})}
                          className="h-24 text-right"
                          dir="rtl"
                          placeholder="לדוגמה: לא מעוניין, לא מתאים, מצא פתרון אחר..."
                      />
                  </div>
              )}

              {editingLead && (() => {
                const leadTasks = tasks.filter(t => t.lead_id === editingLead.id);
                return leadTasks.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-purple-600" />
                      משימות ({leadTasks.length})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {leadTasks.map(task => (
                        <Card key={task.id} className="bg-purple-50 border-purple-200">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1">
                                <div className="font-medium text-sm">{task.title}</div>
                                {task.description && (
                                  <div className="text-xs text-slate-600 mt-1">{task.description}</div>
                                )}
                                {task.due_date && (
                                  <div className="text-xs text-slate-500 mt-1">
                                    📅 {format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}
                                  </div>
                                )}
                                <Badge className="mt-2 text-xs">{task.status}</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {editingLead && (
                <div className="pt-3 border-t mt-4">
                  <EntityNotesDialog entityType="lead" entityId={editingLead.id} entityLabel={editingLead.customer_name || "ליד"} />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog} className="bg-gray-100 hover:bg-gray-200">
                  ביטול
                </Button>
                <Button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm md:text-lg font-bold py-3 px-4 md:py-6 md:px-8 shadow-lg hover:shadow-xl transition-all" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                  💾 שמור שינויים
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showExitConfirmDialog} onOpenChange={setShowExitConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>יש לך שינויים שלא נשמרו</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600 py-4">האם אתה בטוח שברצונך לצאת ללא שמירת השינויים?</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowExitConfirmDialog(false)} className="bg-gray-100 hover:bg-gray-200">
                חזור לעריכה
              </Button>
              <Button onClick={handleSaveAndClose} className="bg-green-600 hover:bg-green-700 text-white" disabled={updateMutation.isPending || createMutation.isPending}>
                {(updateMutation.isPending || createMutation.isPending) ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : "💾"} שמור וצא
              </Button>
              <Button variant="destructive" onClick={handleForceClose} className="bg-red-600 hover:bg-red-700">
                צא ללא שמירה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>אישור מחיקת ליד</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600 py-4">
              האם אתה בטוח שברצונך למחוק את הליד של <strong>{leadToDelete?.customer_name}</strong>?
              <br />
              <span className="text-red-600 text-sm">פעולה זו לא ניתנת לביטול.</span>
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="bg-gray-100 hover:bg-gray-200">
                ביטול
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending} className="bg-red-600 hover:bg-red-700">
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : "🗑️"} מחק ליד
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        {/* Desktop Table View */}
        <Card className="hidden lg:block border-none shadow-lg bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" dir="rtl">
              <thead className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] text-white">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-semibold">תאריך הרשמה ראשון</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">שם</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">טלפון</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">מקור הגעה</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">הרשמות אתר</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">מודעות רכב</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">מודעות דרוש</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">קליקים אתר</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedLeads.map((lead, index) => {
                  const leadGroup = leadGroups[lead.id] || [lead];
                  const isDuplicate = leadGroup.length > 1;
                  
                  // חישוב מספר הרשמות לפי סוג
                  const websiteRegistrations = leadGroup.filter(l => l.lead_source_type === 'רשום לאתר' || l.lead_source_type === 'רשום לוובינר').length;
                  const carAds = leadGroup.filter(l => l.lead_source_type === 'מודעת רכב').length;
                  const jobAds = leadGroup.filter(l => l.lead_source_type === 'מודעת דרוש').length;

                  return (
                    <motion.tr
                      key={lead.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className={`hover:bg-blue-100 transition-colors ${isDuplicate ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-4 py-4 text-sm text-slate-700">
                        {lead.initial_registration_date 
                          ? format(new Date(lead.initial_registration_date), "dd/MM/yyyy HH:mm")
                          : lead.registration_date 
                            ? format(new Date(lead.registration_date), "dd/MM/yyyy HH:mm")
                            : format(new Date(lead.created_date), "dd/MM/yyyy HH:mm")
                        }
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{lead.customer_name}</p>
                          {lead.serial_number && (
                            <p className="text-xs text-slate-500 font-mono">#{lead.serial_number}</p>
                          )}
                          <Badge className={`${statusColors[lead.status]} mt-1 text-xs`}>{lead.status}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-700">
                        0{lead.customer_phone}
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600">
                        {lead.traffic_source}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className="bg-blue-100 text-blue-800 font-bold">
                          {websiteRegistrations}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className="bg-green-100 text-green-800 font-bold">
                          {carAds}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className="bg-purple-100 text-purple-800 font-bold">
                          {jobAds}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-slate-500">-</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(lead)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4 text-[#1e3a8a]" />
                          </Button>
                          {lead.customer_phone && (
                            <a 
                              href={`https://wa.me/${lead.customer_phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              <Button size="sm" variant="outline" className="h-8 w-8 p-0">
                                <MessageSquare className="w-4 h-4 text-green-600" />
                              </Button>
                            </a>
                          )}
                          {user?.role === "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(lead)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile Card View */}
        <div className="lg:hidden grid grid-cols-1 gap-4">
          {paginatedLeads.map((lead, index) => {
            const leadGroup = leadGroups[lead.id] || [lead];
            const isDuplicate = leadGroup.length > 1;
            const totalRegistrations = leadGroup.length;
            const duplicateLeads = leadGroup.filter(l => l.id !== lead.id);
            const websiteRegistrations = leadGroup.filter(l => l.lead_source_type === 'רשום לאתר' || l.lead_source_type === 'רשום לוובינר').length;
            const carAds = leadGroup.filter(l => l.lead_source_type === 'מודעת רכב').length;
            const jobAds = leadGroup.filter(l => l.lead_source_type === 'מודעת דרוש').length;

            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`hover:shadow-xl transition-all border-none ${isDuplicate ? 'ring-4 ring-orange-400 bg-orange-50' : 'bg-white'}`}>
                  <CardContent className="p-4">
                    {isDuplicate && (
                      <div className="mb-3 p-2 bg-orange-500 text-white rounded-lg font-bold text-center text-sm animate-pulse">
                        ⚠️ ליד כפול - {totalRegistrations} הרשמות!
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        {lead.serial_number && <div className="text-xs text-slate-500 mb-1 font-mono">#{lead.serial_number}</div>}
                        {lead.company_name && (
                          <h3 className="text-lg font-bold text-slate-900 mb-1">{lead.company_name}</h3>
                        )}
                        <h3 className={`${lead.company_name ? 'text-base text-slate-700' : 'text-lg font-bold text-slate-900'}`}>
                          {lead.customer_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                          {isDuplicate && (
                            <Badge className="bg-orange-600 text-white font-bold">
                              🔄 כפול ×{totalRegistrations}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3 text-sm">
                      {lead.lead_rating && (
                        <div className="mb-2">
                          <Badge className={`${ratingColors[lead.lead_rating]} text-sm px-2 py-1 font-bold`}>
                            {ratingIcons[lead.lead_rating]} {lead.lead_rating}
                          </Badge>
                        </div>
                      )}
                      <p className="text-slate-600 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-500"/> 0{lead.customer_phone}
                      </p>
                      {lead.age && (
                        <p className="text-slate-600">
                          👤 גיל: {lead.age}
                        </p>
                      )}
                      {lead.actual_value > 0 && (
                        <p className="text-slate-600 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500"/> 
                          שווי עסקה: ₪{lead.actual_value.toLocaleString()}
                        </p>
                      )}
                      {lead.traffic_source && (
                        <p className="text-xs text-slate-500">
                          📍 {lead.traffic_source} → {lead.conversion_source}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-3 gap-1 md:gap-2 pt-2 border-t">
                        <div className="text-center">
                          <Badge className="bg-blue-100 text-blue-800 font-bold text-xs">
                            {websiteRegistrations}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">אתר</p>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-green-100 text-green-800 font-bold text-xs">
                            {carAds}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">מודעות רכב</p>
                        </div>
                        <div className="text-center">
                          <Badge className="bg-purple-100 text-purple-800 font-bold text-xs">
                            {jobAds}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">מודעות דרוש</p>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📅 הרשמה:</span>
                          {lead.registration_date 
                            ? format(new Date(lead.registration_date), "dd/MM/yyyy HH:mm")
                            : format(new Date(lead.created_date), "dd/MM/yyyy HH:mm")
                          }
                        </div>
                        {lead.initial_registration_date && lead.registration_date && lead.initial_registration_date !== lead.registration_date && (
                          <div className="flex items-center gap-1 text-purple-600 mt-1">
                            <span className="font-medium">🔄 ראשוני:</span>
                            {format(new Date(lead.initial_registration_date), "dd/MM/yyyy HH:mm")}
                          </div>
                        )}
                      </div>
                    </div>

                    {lead.notes && (
                      <div className="bg-yellow-50 border-r-4 border-yellow-400 p-2 rounded-lg mb-3">
                        <h4 className="font-semibold text-xs text-yellow-900 mb-1 flex items-center gap-1">
                          📝 הערות
                        </h4>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{lead.notes}</p>
                      </div>
                    )}

                    <div className="space-y-2 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => handleEdit(lead)} 
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9"
                        >
                          <Edit className="w-4 h-4 ml-2" />
                          ערוך
                        </Button>
                        {lead.customer_phone && (
                          <a 
                            href={`https://wa.me/${lead.customer_phone.replace(/\D/g, '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white h-9">
                              <MessageSquare className="w-4 h-4 ml-2" />
                              וואטסאפ
                            </Button>
                          </a>
                        )}
                      </div>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleQuickReject(lead)}
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 h-9"
                      >
                        ❌ לא רלוונטי
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center text-sm text-slate-500 mt-4">
          מציג {visibleCount} מתוך {filteredLeads.length} לידים
          {visibleCount < filteredLeads.length && (
            <div className="mt-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            </div>
          )}
        </div>

        {filteredLeads.length === 0 && !isLoading && (
          <Card className="p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין לידים עדיין</h3>
            <p className="text-slate-500">התחל בהוספת הליד הראשון</p>
          </Card>
        )}



        <LeadsImport 
          open={showImportDialog} 
          onOpenChange={setShowImportDialog}
          onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['leads'] })}
        />

        <Dialog open={isLostReasonDialogOpen} onOpenChange={(open) => {
          setIsLostReasonDialogOpen(open);
          if (!open) {
            setLostReason("");
            setCustomReason("");
            setIsAddingCustomReason(false);
          }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>סיבת {leadToUpdate?.status === 'לא רלוונטי' ? 'אי רלוונטיות' : 'אי סגירה'}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                      <Label>בחר סיבה *</Label>
                      <Select value={lostReason} onValueChange={(value) => {
                        setLostReason(value);
                        setIsAddingCustomReason(value === "אחר - הוסף חדש");
                        if (value !== "אחר - הוסף חדש") {
                          setCustomReason("");
                        }
                      }}>
                        <SelectTrigger className="text-right [&>span]:text-right [&>span]:w-full [&>span]:flex [&>span]:justify-end" dir="rtl">
                          <SelectValue placeholder="בחר סיבה..." />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {settings?.rejection_reasons?.map((reason, idx) => (
                            <SelectItem key={idx} value={reason} className="text-right">{reason}</SelectItem>
                          ))}
                          <SelectItem value="אחר - הוסף חדש" className="text-right">אחר - הוסף חדש</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isAddingCustomReason && (
                      <div className="space-y-2">
                        <Label htmlFor="custom-reason">סיבה חדשה *</Label>
                        <Input
                          id="custom-reason"
                          value={customReason}
                          onChange={(e) => setCustomReason(e.target.value)}
                          placeholder="הקלד סיבה חדשה..."
                          className="text-right"
                          dir="rtl"
                        />
                      </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" className="bg-gray-100 hover:bg-gray-200">ביטול</Button>
                    </DialogClose>
                    <Button onClick={handleSaveLostReason} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "שמור"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
