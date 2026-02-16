import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Clock, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import TaskForm from "../components/tasks/TaskForm";
import QuickTaskCard from "../components/tasks/QuickTaskCard";

export default function QuickTasks() {
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  
  const queryClient = useQueryClient();

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => supabase.entities.Task.list('-priority'),
  });

  const quickTasks = allTasks.filter(t => t.is_quick_task);

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => supabase.entities.Customer.list(),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => supabase.entities.Vehicle.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
      toast({
        title: "✓ המשימה נוצרה בהצלחה",
        description: "המשימה הקצרה נוספה למערכת",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowForm(false);
      setEditingTask(null);
      toast({
        title: "✓ המשימה עודכנה בהצלחה",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: "✓ המשימה נמחקה",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data) => {
    const taskData = { ...data, is_quick_task: true };
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      createMutation.mutate(taskData);
    }
  };

  const handleStatusChange = (taskId, newStatus) => {
    const task = allTasks.find(t => t.id === taskId);
    if (task) {
      if (newStatus === "הושלם" && !task.description) {
        toast({
          title: "⚠️ שים לב",
          description: "מומלץ למלא תיאור משימה לפני סגירה",
          variant: "destructive",
        });
        return;
      }
      
      const updateData = { ...task, status: newStatus };
      if (newStatus === "הושלם") {
        updateData.completed_date = new Date().toISOString();
        toast({
          title: "✓ המשימה הושלמה",
          description: "המשימה סומנה כהושלמה בהצלחה",
        });
      }
      updateMutation.mutate({ id: taskId, data: updateData });
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const filteredTasks = quickTasks.filter(task =>
    task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeTasks = filteredTasks.filter(t => t.status !== "הושלם" && t.status !== "בוטל");
  const completedTasks = filteredTasks.filter(t => t.status === "הושלם");

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.full_name || "";
  };

  const getVehiclePlate = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.license_plate || "";
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Clock className="w-10 h-10 text-purple-600" />
              משימות קצרות (5 דקות)
            </h1>
            <p className="text-slate-600">משימות מהירות שדורשות טיפול מיידי</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-xl shadow-md">
              <p className="text-xs text-slate-500">פעילות</p>
              <p className="text-2xl font-bold text-purple-600">{activeTasks.length}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl shadow-md">
              <p className="text-xs text-slate-500">הושלמו</p>
              <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Card className="flex-1 border-none shadow-lg bg-white p-4">
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="חיפוש משימות קצרות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 text-lg h-12 border-slate-200 focus:border-purple-500"
              />
            </div>
          </Card>
          <Button 
            onClick={() => {
              setShowForm(true);
              setEditingTask(null);
            }}
            className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg h-12"
          >
            <Plus className="w-5 h-5 ml-2" />
            משימה קצרה חדשה
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {showForm && (
            <TaskForm
              task={editingTask}
              customers={customers}
              vehicles={vehicles}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
              isQuickTask={true}
            />
          )}
        </AnimatePresence>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-500" />
              משימות פעילות ({activeTasks.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {activeTasks.map((task, index) => (
                  <QuickTaskCard
                    key={task.id}
                    task={task}
                    customerName={getCustomerName(task.customer_id)}
                    vehiclePlate={getVehiclePlate(task.vehicle_id)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onStatusChange={handleStatusChange}
                    index={index}
                  />
                ))}
              </AnimatePresence>
            </div>
            {activeTasks.length === 0 && (
              <Card className="p-12 text-center border-none shadow-lg bg-white">
                <CheckCircle className="w-16 h-16 mx-auto text-green-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">כל המשימות הקצרות טופלו!</h3>
                <p className="text-slate-500">עבודה מצוינת 🎉</p>
              </Card>
            )}
          </div>

          {completedTasks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-green-500" />
                משימות שהושלמו ({completedTasks.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {completedTasks.map((task, index) => (
                    <QuickTaskCard
                      key={task.id}
                      task={task}
                      customerName={getCustomerName(task.customer_id)}
                      vehiclePlate={getVehiclePlate(task.vehicle_id)}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      index={index}
                      isCompleted={true}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}