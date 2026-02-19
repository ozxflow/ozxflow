import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, CheckCircle, Bell, Briefcase, MapPin, Clock, X, Edit, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import EntityNotesDialog from "@/components/EntityNotesDialog";

export default function Tasks() {
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "", due_time: "", customer_id: "", lead_id: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me()
  });

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['tasks', user?.email],
    queryFn: () => supabase.entities.Task.filter({ assigned_to: user.email }),
    enabled: !!user?.email,
  });

  const { data: jobs = [], isLoading: isLoadingJobs } = useQuery({
    queryKey: ['jobs', user?.email],
    queryFn: () => supabase.entities.Job.list('-start_time'),
    enabled: !!user?.email,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list(),
    initialData: []
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskData) => {
      const dueDateTime = taskData.due_date && taskData.due_time 
        ? `${taskData.due_date}T${taskData.due_time}:00`
        : taskData.due_date 
        ? `${taskData.due_date}T00:00:00`
        : undefined;
      
      const cleanData = {
        title: taskData.title,
        description: taskData.description,
        due_date: dueDateTime,
        assigned_to: user.email,
        status: "ממתין"
      };
      
      if (taskData.customer_id) cleanData.customer_id = taskData.customer_id;
      if (taskData.lead_id) cleanData.lead_id = taskData.lead_id;
      
      return supabase.entities.Task.create(cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.email] });
      setShowAddTaskDialog(false);
      setEditingTask(null);
      setNewTask({ title: "", description: "", due_date: "", due_time: "", customer_id: "", lead_id: "" });
      toast({ title: "✓ המשימה נוספה" });
    },
    onError: (error) => {
      console.error("שגיאה ביצירת משימה:", error);
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
      
      const cleanData = {
        title: taskData.title,
        description: taskData.description,
        due_date: dueDateTime,
        assigned_to: user.email,
        status: taskData.status || "ממתין"
      };
      
      if (taskData.customer_id) cleanData.customer_id = taskData.customer_id;
      if (taskData.lead_id) cleanData.lead_id = taskData.lead_id;
      
      return supabase.entities.Task.update(id, cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.email] });
      setShowAddTaskDialog(false);
      setEditingTask(null);
      setNewTask({ title: "", description: "", due_date: "", due_time: "", customer_id: "", lead_id: "" });
      toast({ title: "✓ המשימה עודכנה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון", description: error.message, variant: "destructive" });
    }
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId) => supabase.entities.Task.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.email] });
      toast({ title: "✓ המשימה נמחקה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה במחיקה", description: error.message, variant: "destructive" });
    }
  });

  const handleAddTask = () => {
    if (!newTask.title || newTask.title.trim() === "") {
      toast({ title: "חסר כותרת למשימה", description: "אנא הזן כותרת למשימה.", variant: "destructive" });
      return;
    }
    
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, taskData: newTask });
    } else {
      createTaskMutation.mutate(newTask);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    
    let dateOnly = "";
    let timeOnly = "";
    
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      dateOnly = dueDate.toISOString().split('T')[0];
      timeOnly = dueDate.toTimeString().slice(0, 5);
    }
    
    setNewTask({
      title: task.title || "",
      description: task.description || "",
      due_date: dateOnly,
      due_time: timeOnly,
      status: task.status || "ממתין",
      customer_id: task.customer_id || "",
      lead_id: task.lead_id || ""
    });
    setShowAddTaskDialog(true);
  };

  const handleDeleteTask = (task) => {
    if (confirm(`האם למחוק את המשימה "${task.title}"?`)) {
      deleteTaskMutation.mutate(task.id);
    }
  };

  const myJobs = jobs.filter(j => j.installer_email === user?.email && j.status !== "בוצע" && j.status !== "נדחה");
  const newJobs = myJobs.filter(j => j.status === "פתוח");

  useEffect(() => {
    setNewJobsCount(newJobs.length);
  }, [newJobs.length]);

  if (isLoadingUser || isLoadingTasks || isLoadingJobs) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const statusColors = {
    "ממתין": "bg-gray-100 text-gray-800",
    "בטיפול": "bg-yellow-100 text-yellow-800",
    "הושלם": "bg-green-100 text-green-800",
    "בוטל": "bg-red-100 text-red-800"
  };

  const jobStatusColors = {
    "פתוח": "bg-blue-100 text-blue-800",
    "בדרך": "bg-orange-100 text-orange-800"
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
                <ClipboardList className="w-10 h-10 text-blue-600" />
                המשימות שלי
              </h1>
              <p className="text-slate-600">כל המשימות והעבודות שהוקצו לך</p>
            </div>
            <Button onClick={() => { setEditingTask(null); setNewTask({ title: "", description: "", due_date: "", due_time: "", customer_id: "", lead_id: "" }); setShowAddTaskDialog(true); }} className="bg-blue-600 hover:bg-blue-700">
              <ClipboardList className="w-5 h-5 ml-2" />
              משימה חדשה
            </Button>
          </div>
        </div>

        {newJobsCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-2 border-blue-500 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-8 h-8 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="font-bold text-blue-900 text-lg">🎉 יש לך {newJobsCount} עבודות חדשות!</h3>
                    <p className="text-blue-700 text-sm">עבודות התקנה ממתינות לטיפול</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-600">{myJobs.length}</p>
                  <p className="text-xs text-slate-500">עבודות פעילות</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Bell className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">{newJobsCount}</p>
                  <p className="text-xs text-slate-500">עבודות חדשות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-600">{tasks.length}</p>
                  <p className="text-xs text-slate-500">משימות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{user?.availability_status === "פנוי" ? "פנוי" : "בעבודה"}</p>
                  <p className="text-xs text-slate-500">הסטטוס שלי</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {myJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-600" />
              עבודות התקנה שלי ({myJobs.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {myJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`hover:shadow-xl transition-all ${job.status === 'פתוח' ? 'border-2 border-blue-500' : 'border-none'} bg-white`}>
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{job.customer_name}</CardTitle>
                            <Badge className={jobStatusColors[job.status]}>{job.status}</Badge>
                            {job.status === 'פתוח' && (
                              <Badge className="mr-2 bg-red-500 text-white">חדש!</Badge>
                            )}
                          </div>
                          <Badge variant="outline">{job.service_type}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                          <span className="text-slate-700">{job.installation_address}</span>
                        </div>
                        {job.start_time && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-slate-700">{format(new Date(job.start_time), "dd/MM/yyyy HH:mm")}</span>
                          </div>
                        )}
                        {job.notes && (
                          <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                            {job.notes}
                          </div>
                        )}
                        <Link to={createPageUrl("Jobs")}>
                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            פתח עבודה
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ClipboardList className="w-6 h-6 text-purple-600" />
              משימות נוספות ({tasks.length})
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <Badge className={statusColors[task.status] || 'bg-gray-200'}>{task.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {task.description && <p className="text-slate-600 mb-4">{task.description}</p>}
                      {task.due_date && (
                        <p className="text-sm text-slate-500 flex items-center gap-2 mb-4">
                          <Clock className="w-4 h-4" />
                          תאריך יעד: {format(new Date(task.due_date), "dd/MM/yyyy HH:mm")}
                        </p>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                        <EntityNotesDialog entityType="task" entityId={task.id} entityLabel={task.title || "משימה"} />
                        <Button
                          size="sm"
                          onClick={() => handleEditTask(task)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit className="w-3 h-3 ml-2" />
                          ערוך
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTask(task)}
                          className="w-full hover:bg-red-600"
                          disabled={deleteTaskMutation.isPending}
                        >
                          {deleteTaskMutation.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 && myJobs.length === 0 && (
          <div className="text-center p-12 bg-white rounded-xl shadow-lg">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700">אין לך משימות או עבודות פתוחות</h3>
            <p className="text-slate-500">הכל נקי, כל הכבוד! 🎉</p>
          </div>
        )}
        
        <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingTask ? "עריכת משימה" : "משימה חדשה"}</DialogTitle>
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
              
              <div className="space-y-2">
                <Label>שייך ללקוח</Label>
                <Select 
                  value={newTask.customer_id || "none"} 
                  onValueChange={(value) => setNewTask({...newTask, customer_id: value === "none" ? "" : value, lead_id: ""})}
                >
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder="בחר לקוח (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא לקוח</SelectItem>
                    {leads.filter(l => ["סגר", "שולם", "ממתין לטיפול", "בטיפול", "יצא לדרך", "הושלם", "מבוטל"].includes(l.status)).map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.customer_name} - {customer.customer_phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>שייך לליד</Label>
                <Select 
                  value={newTask.lead_id || "none"} 
                  onValueChange={(value) => setNewTask({...newTask, lead_id: value === "none" ? "" : value, customer_id: ""})}
                >
                  <SelectTrigger className="text-right" dir="rtl">
                    <SelectValue placeholder="בחר ליד (אופציונלי)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">ללא ליד</SelectItem>
                    {leads.filter(l => !["סגר", "שולם", "ממתין לטיפול", "בטיפול", "יצא לדרך", "הושלם", "מבוטל"].includes(l.status)).map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.customer_name} - {lead.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAddTaskDialog(false); setEditingTask(null); }} className="bg-gray-100 hover:bg-gray-200">ביטול</Button>
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
