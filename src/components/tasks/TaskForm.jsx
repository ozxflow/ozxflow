import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";

export default function TaskForm({ task, customers, vehicles, onSubmit, onCancel, isSubmitting, isQuickTask = false }) {
  const [formData, setFormData] = useState(task || {
    title: "",
    description: "",
    customer_id: "",
    vehicle_id: "",
    status: "ממתין",
    priority: 5,
    is_quick_task: isQuickTask,
    due_date: "",
    estimated_cost: 0,
    actual_cost: 0,
    assigned_to: ""
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState(task?.customer_id || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const customerVehicles = vehicles.filter(v => v.customer_id === selectedCustomerId);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="mb-8"
    >
      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">
              {task ? "עריכת משימה" : isQuickTask ? "משימה קצרה חדשה" : "משימה חדשה"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">כותרת המשימה *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="תיאור קצר של המשימה"
                required
                className="text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">תיאור מפורט</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="פרטים נוספים על המשימה..."
                className="h-32"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer_id">לקוח *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => {
                    setFormData({...formData, customer_id: value, vehicle_id: ""});
                    setSelectedCustomerId(value);
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר לקוח" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicle_id">פריט (אופציונלי)</Label>
                <Select
                  value={formData.vehicle_id}
                  onValueChange={(value) => setFormData({...formData, vehicle_id: value})}
                  disabled={!selectedCustomerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCustomerId ? "בחר פריט" : "בחר תחילה לקוח"} />
                  </SelectTrigger>
                  <SelectContent>
                    {customerVehicles.map(vehicle => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.license_plate} - {vehicle.manufacturer} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                >
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="due_date">תאריך יעד</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>דירוג דחיפות: {formData.priority}</Label>
              <Slider
                value={[formData.priority]}
                onValueChange={([value]) => setFormData({...formData, priority: value})}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>נמוכה (1)</span>
                <span>בינונית (5)</span>
                <span>גבוהה (10)</span>
              </div>
            </div>

            {!isQuickTask && (
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="is_quick_task"
                  checked={formData.is_quick_task}
                  onCheckedChange={(checked) => setFormData({...formData, is_quick_task: checked})}
                />
                <Label htmlFor="is_quick_task" className="cursor-pointer">
                  משימה קצרה (5 דקות)
                </Label>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="estimated_cost">עלות משוערת (₪)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  value={formData.estimated_cost}
                  onChange={(e) => setFormData({...formData, estimated_cost: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual_cost">עלות בפועל (₪)</Label>
                <Input
                  id="actual_cost"
                  type="number"
                  value={formData.actual_cost}
                  onChange={(e) => setFormData({...formData, actual_cost: parseFloat(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-slate-100 p-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Save className="w-4 h-4 ml-2" />
              {task ? "עדכן" : "שמור"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}