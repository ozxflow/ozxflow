import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Phone, Mail, MapPin, Calendar, TrendingUp, Edit, Trash2, MessageSquare, Plus, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "", due_time: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list('-created_date'),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me()
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => supabase.entities.Task.list(),
  });

  const isAdmin = currentUser?.role === "admin";

  // הגדרת customers לפני השימוש
  const customers = leads.filter(l => 
    ["סגר", "שולם", "ממתין לטיפול", "בטיפול", "יצא לדרך", "הושלם", "מבוטל", "רכש קורס", "רכש ליווי מלא"].includes(l.status)
  );



  const deleteMutation = useMutation({
    mutationFn: (leadId) => supabase.entities.Lead.delete(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({ title: "✓ הלקוח נמחק" });
    },
    onError: (error) => {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
    }
  });

  const handleDelete = (customer) => {
    if (!isAdmin) {
      toast({ title: "אין הרשאה", description: "רק מנהל יכול למחוק", variant: "destructive" });
      return;
    }
    
    if (confirm(`האם למחוק את ${customer.customer_name}?`)) {
      deleteMutation.mutate(customer.id);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowEditDialog(true);
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Lead.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowEditDialog(false);
      setEditingCustomer(null);
      toast({ title: "✓ הלקוח עודכן" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveEdit = () => {
    if (!editingCustomer) return;
    updateMutation.mutate({ id: editingCustomer.id, data: editingCustomer });
  };

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => {
      const dueDateTime = taskData.due_date && taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : taskData.due_date 
        ? `${taskData.due_date}T00:00:00`
        : undefined;
      
      return supabase.entities.Task.create({
        title: taskData.title,
        description: taskData.description,
        customer_id: selectedCustomer.id,
        due_date: dueDateTime,
        assigned_to: currentUser.email,
        status: taskData.status || "ממתין"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskDialog(false);
      setSelectedCustomer(null);
      setEditingTask(null);
      setNewTask({ title: "", description: "", due_date: "", due_time: "" });
      toast({ title: "✓ המשימה נוספה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, taskData }) => {
      const dueDateTime = taskData.due_date && taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : taskData.due_date 
        ? `${taskData.due_date}T00:00:00`
        : undefined;
      
      return supabase.entities.Task.update(id, {
        title: taskData.title,
        description: taskData.description,
        customer_id: selectedCustomer.id,
        due_date: dueDateTime,
        assigned_to: currentUser.email,
        status: taskData.status || "ממתין"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowTaskDialog(false);
      setSelectedCustomer(null);
      setEditingTask(null);
      setNewTask({ title: "", description: "", due_date: "", due_time: "" });
      toast({ title: "✓ המשימה עודכנה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => supabase.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: "✓ המשימה נמחקה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
    }
  });

  const handleAddTask = () => {
    if (!newTask.title || newTask.title.trim() === "") {
      toast({ title: "חסר כותרת למשימה", variant: "destructive" });
      return;
    }
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, taskData: newTask });
    } else {
      createTaskMutation.mutate(newTask);
    }
  };

  const filteredByTime = customers.filter(c => {
    if (timeFilter === "all") return true;
    
    const createdDate = new Date(c.created_date);
    const now = new Date();
    
    if (timeFilter === "today") {
      return createdDate.toDateString() === now.toDateString();
    } else if (timeFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return createdDate >= weekAgo;
    } else if (timeFilter === "month") {
      return createdDate.getMonth() === now.getMonth() && 
             createdDate.getFullYear() === now.getFullYear();
    } else if (timeFilter === "quarter") {
      const quarter = Math.floor(now.getMonth() / 3);
      const customerQuarter = Math.floor(createdDate.getMonth() / 3);
      return customerQuarter === quarter && 
             createdDate.getFullYear() === now.getFullYear();
    } else if (timeFilter === "year") {
      return createdDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  const phoneGroups = leads.reduce((acc, lead) => {
    if (!lead.customer_phone) return acc;
    if (!acc[lead.customer_phone]) acc[lead.customer_phone] = [];
    acc[lead.customer_phone].push(lead);
    return acc;
  }, {});

  const returningCustomers = Object.values(phoneGroups).filter(group => 
    group.filter(l => ["שולם", "ממתין לטיפול", "בטיפול", "יצא לדרך", "הושלם"].includes(l.status)).length > 1
  ).map(group => group[0].customer_phone);

  const filteredByType = filteredByTime.filter(c => {
    if (typeFilter === "all") return true;
    if (typeFilter === "new") return !returningCustomers.includes(c.customer_phone);
    if (typeFilter === "returning") return returningCustomers.includes(c.customer_phone);
    if (typeFilter === "waiting") return c.status === "ממתין לטיפול";
    if (typeFilter === "cancelled") return c.status === "מבוטל";
    if (typeFilter === "course") return c.status === "רכש קורס";
    if (typeFilter === "mentoring") return c.status === "רכש ליווי מלא";
    return true;
  });

  const filteredCustomers = filteredByType.filter(c =>
    c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.customer_phone?.includes(searchQuery) ||
    c.serial_number?.includes(searchQuery)
  );

  const statusColors = {
    "סגר": "bg-green-100 text-green-800",
    "שולם": "bg-green-100 text-green-800",
    "ממתין לטיפול": "bg-yellow-100 text-yellow-800",
    "בטיפול": "bg-orange-100 text-orange-800",
    "יצא לדרך": "bg-amber-100 text-amber-800",
    "הושלם": "bg-emerald-100 text-emerald-800",
    "מבוטל": "bg-red-100 text-red-800",
    "רכש קורס": "bg-teal-100 text-teal-800",
    "רכש ליווי מלא": "bg-purple-100 text-purple-800"
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            לקוחות
          </h1>
          <p className="text-slate-600">רשימת כל הלקוחות שסגרו עסקה ({customers.length})</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-blue-600">{customers.length}</p>
              <p className="text-sm text-slate-500">סה"כ לקוחות</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-green-600">{returningCustomers.length}</p>
              <p className="text-sm text-slate-500">לקוחות חוזרים</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-yellow-600">{customers.filter(c => c.status === "ממתין לטיפול").length}</p>
              <p className="text-sm text-slate-500">ממתינים לטיפול</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-emerald-600">{customers.filter(c => c.status === "הושלם").length}</p>
              <p className="text-sm text-slate-500">הושלמו</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-teal-600">{customers.filter(c => c.status === "רכש קורס").length}</p>
              <p className="text-sm text-slate-500">לקוחות קורס</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-purple-600">{customers.filter(c => c.status === "רכש ליווי מלא").length}</p>
              <p className="text-sm text-slate-500">לקוחות ליווי</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <p className="text-3xl font-bold text-red-600">{customers.filter(c => c.status === "מבוטל").length}</p>
              <p className="text-sm text-slate-500">מבוטלים</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-none shadow-lg bg-white p-4 space-y-4">
          <Input
            placeholder="חיפוש לקוח (שם, טלפון, מספר סידורי)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">סינון לפי תאריך</label>
              <Tabs value={timeFilter} onValueChange={setTimeFilter}>
                <TabsList className="grid w-full grid-cols-6 bg-slate-100">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="today">היום</TabsTrigger>
                  <TabsTrigger value="week">שבוע</TabsTrigger>
                  <TabsTrigger value="month">חודש</TabsTrigger>
                  <TabsTrigger value="quarter">רבעון</TabsTrigger>
                  <TabsTrigger value="year">שנה</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">סינון לפי סוג</label>
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList className="grid w-full grid-cols-7 bg-slate-100">
                  <TabsTrigger value="all">הכל</TabsTrigger>
                  <TabsTrigger value="new">חדשים</TabsTrigger>
                  <TabsTrigger value="returning">חוזרים</TabsTrigger>
                  <TabsTrigger value="course">קורס</TabsTrigger>
                  <TabsTrigger value="mentoring">ליווי</TabsTrigger>
                  <TabsTrigger value="waiting">ממתינים</TabsTrigger>
                  <TabsTrigger value="cancelled">מבוטלים</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer, index) => {
            const isReturning = returningCustomers.includes(customer.customer_phone);
            
            return (
              <motion.div
                key={customer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-xl transition-all border-none bg-white">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        {customer.serial_number && <div className="text-xs text-slate-500 mb-1 font-mono">#{customer.serial_number}</div>}
                        <CardTitle className="text-lg flex items-center gap-2">
                          {customer.customer_name}
                          {isReturning && <Badge className="bg-purple-100 text-purple-800">חוזר</Badge>}
                        </CardTitle>
                      </div>
                      <Badge className={statusColors[customer.status]}>{customer.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-blue-600" />
                      0{customer.customer_phone}
                    </div>
                    {customer.customer_email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-blue-600" />
                        {customer.customer_email}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      {customer.customer_address}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      {format(new Date(customer.created_date), "dd/MM/yyyy")}
                    </div>
                    {customer.actual_value > 0 && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        ₪{customer.actual_value.toLocaleString()}
                      </div>
                    )}
                    {customer.closure_reason && (
                      <div className="text-xs text-red-700 bg-red-50 p-2 rounded mt-2">
                        <strong>סיבת ביטול:</strong> {customer.closure_reason}
                      </div>
                    )}
                    
                    {(() => {
                      const customerTasks = tasks.filter(t => t.customer_id === customer.id);
                      return (
                        <>
                          {customerTasks.length > 0 && (
                            <div className="bg-purple-50 p-3 rounded-lg mt-2">
                              <h4 className="text-sm font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                <ClipboardList className="w-4 h-4" />
                                משימות ({customerTasks.length})
                              </h4>
                              <div className="space-y-1">
                                {customerTasks.slice(0, 3).map(task => (
                                  <div key={task.id} className="text-xs text-slate-700 bg-white p-2 rounded border">
                                    <div className="font-medium">{task.title}</div>
                                    {task.description && <div className="text-slate-500 truncate">{task.description}</div>}
                                  </div>
                                ))}
                                {customerTasks.length > 3 && (
                                  <p className="text-xs text-purple-700">ועוד {customerTasks.length - 3} משימות...</p>
                                )}
                              </div>
                            </div>
                          )}
                          <div className="pt-3 border-t mt-3 space-y-2">
                            {customer.customer_phone && (
                              <a 
                                href={`https://wa.me/972${customer.customer_phone}?text=${encodeURIComponent(`היי ${customer.customer_name}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                                  <MessageSquare className="w-4 h-4 ml-2" />
                                  שלח וואטסאפ
                                </Button>
                              </a>
                            )}
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setNewTask({ title: "", description: "", due_date: "", due_time: "" });
                                setShowTaskDialog(true);
                              }}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Plus className="w-4 h-4 ml-2" />
                              משימה חדשה
                            </Button>
                            {isAdmin && (
                              <div className="grid grid-cols-2 gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEdit(customer)}
                                  className="w-full bg-slate-600 hover:bg-slate-700 text-white"
                                >
                                  <Edit className="w-3 h-3 ml-2" />
                                  ערוך
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(customer)}
                                  className="w-full hover:bg-red-600"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredCustomers.length === 0 && (
          <Card className="p-12 text-center border-none shadow-lg bg-white">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין לקוחות להצגה</h3>
            <p className="text-slate-500">לקוחות יופיעו כאן אחרי שישלמו</p>
          </Card>
        )}

        <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditingCustomer(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת לקוח - {editingCustomer?.customer_name}</DialogTitle>
            </DialogHeader>
            {editingCustomer && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>שם מלא</Label>
                  <Input
                    value={editingCustomer.customer_name || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, customer_name: e.target.value})}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>טלפון</Label>
                  <Input
                    value={editingCustomer.customer_phone ? `0${editingCustomer.customer_phone}` : ""}
                    onChange={(e) => {
                      const value = e.target.value.startsWith('0') ? e.target.value.substring(1) : e.target.value;
                      setEditingCustomer({...editingCustomer, customer_phone: value});
                    }}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל</Label>
                  <Input
                    value={editingCustomer.customer_email || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, customer_email: e.target.value})}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>כתובת</Label>
                  <Input
                    value={editingCustomer.customer_address || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, customer_address: e.target.value})}
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>הערות</Label>
                  <Textarea
                    value={editingCustomer.notes || ""}
                    onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                    className="h-24 text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select 
                    value={editingCustomer.status} 
                    onValueChange={(value) => setEditingCustomer({...editingCustomer, status: value})}
                  >
                    <SelectTrigger className="text-right" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="שולם">שולם</SelectItem>
                      <SelectItem value="ממתין לטיפול">ממתין לטיפול</SelectItem>
                      <SelectItem value="בטיפול">בטיפול</SelectItem>
                      <SelectItem value="יצא לדרך">יצא לדרך</SelectItem>
                      <SelectItem value="הושלם">הושלם</SelectItem>
                      <SelectItem value="מבוטל">מבוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(() => {
                  const customerTasks = tasks.filter(t => t.customer_id === editingCustomer.id);
                  return customerTasks.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                        <ClipboardList className="w-5 h-5 text-purple-600" />
                        משימות ({customerTasks.length})
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {customerTasks.map(task => (
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
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      const dateOnly = task.due_date ? new Date(task.due_date).toISOString().split('T')[0] : "";
                                      const timeOnly = task.due_date ? new Date(task.due_date).toTimeString().slice(0, 5) : "";
                                      setNewTask({
                                        title: task.title || "",
                                        description: task.description || "",
                                        due_date: dateOnly,
                                        due_time: timeOnly,
                                        status: task.status || "ממתין"
                                      });
                                      setSelectedCustomer(editingCustomer);
                                      setEditingTask(task);
                                      setShowTaskDialog(true);
                                    }}
                                    className="h-7 w-7 p-0"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      if (confirm(`האם למחוק את המשימה "${task.title}"?`)) {
                                        deleteTaskMutation.mutate(task.id);
                                      }
                                    }}
                                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                ביטול
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTaskDialog} onOpenChange={(open) => {
          if (!open) {
            setShowTaskDialog(false);
            setEditingTask(null);
            setNewTask({ title: "", description: "", due_date: "", due_time: "" });
          }
        }}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingTask ? "עריכת משימה" : "משימה חדשה"} ל{selectedCustomer?.customer_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="task-title">כותרת *</Label>
                <Input 
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="שם המשימה"
                  required
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">תיאור</Label>
                <Textarea 
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="פרטים נוספים..."
                  className="h-24 text-right"
                  dir="rtl"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-due-date">תאריך יעד</Label>
                  <Input 
                    id="task-due-date"
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-due-time">שעה</Label>
                  <Input 
                    id="task-due-time"
                    type="time"
                    value={newTask.due_time}
                    onChange={(e) => setNewTask({...newTask, due_time: e.target.value})}
                  />
                </div>
              </div>
              {editingTask && (
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select 
                    value={newTask.status || "ממתין"} 
                    onValueChange={(value) => setNewTask({...newTask, status: value})}
                  >
                    <SelectTrigger className="text-right" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ממתין">ממתין</SelectItem>
                      <SelectItem value="בטיפול">בטיפול</SelectItem>
                      <SelectItem value="הושלם">הושלם</SelectItem>
                      <SelectItem value="בוטל">בוטל</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setShowTaskDialog(false);
                setEditingTask(null);
                setNewTask({ title: "", description: "", due_date: "", due_time: "" });
              }} className="bg-gray-100 hover:bg-gray-200">ביטול</Button>
              <Button onClick={handleAddTask} disabled={createTaskMutation.isPending || updateTaskMutation.isPending || !newTask.title.trim()} className="bg-blue-600 hover:bg-blue-700">
                {(createTaskMutation.isPending || updateTaskMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                {editingTask ? "עדכן משימה" : "הוסף משימה"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
        </div>
        );
        }