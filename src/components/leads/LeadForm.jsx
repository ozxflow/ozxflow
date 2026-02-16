
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Save } from "lucide-react";

export default function LeadForm({ lead, leadSources, users, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(lead || {
    full_name: "",
    phone: "",
    email: "",
    source: "",
    status: "חדש",
    temperature: "פושר",
    estimated_value: 0,
    actual_value: 0,
    notes: "",
    interest: "",
    assigned_to: "",
    follow_up_date: "",
    number_of_calls: 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const salesPeople = users.filter(u => u.role_type === "איש מכירות");

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
              {lead ? "עריכת ליד" : "ליד חדש"}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="full_name">שם מלא *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="שם הליד"
                  required
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="מספר טלפון"
                  required
                  className="text-lg"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="כתובת אימייל"
                  className="text-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">מקור הגעה *</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  placeholder="למשל: פייסבוק, גוגל, קמפיין קיץ"
                  required
                  list="sources"
                />
                <datalist id="sources">
                  {leadSources.map(source => (
                    <option key={source.id} value={source.name} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
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
                    <SelectItem value="חדש">חדש</SelectItem>
                    <SelectItem value="בטיפול">בטיפול</SelectItem>
                    <SelectItem value="התעניין">התתעניין</SelectItem>
                    <SelectItem value="לא מעוניין">לא מעוניין</SelectItem>
                    <SelectItem value="נסגר">נסגר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">טמפרטורה</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value) => setFormData({...formData, temperature: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="חם">🔥 חם</SelectItem>
                    <SelectItem value="פושר">💨 פושר</SelectItem>
                    <SelectItem value="קר">❄️ קר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="number_of_calls">מספר שיחות</Label>
                <Input
                  id="number_of_calls"
                  type="number"
                  value={formData.number_of_calls}
                  onChange={(e) => setFormData({...formData, number_of_calls: parseInt(e.target.value) || 0})}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="estimated_value">ערך משוער (₪)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({...formData, estimated_value: parseFloat(e.target.value) || 0})}
                  min="0"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual_value">ערך בפועל (₪)</Label>
                <Input
                  id="actual_value"
                  type="number"
                  value={formData.actual_value}
                  onChange={(e) => setFormData({...formData, actual_value: parseFloat(e.target.value) || 0})}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="assigned_to">איש מכירות</Label>
                <Select
                  value={formData.assigned_to}
                  onValueChange={(value) => setFormData({...formData, assigned_to: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר איש מכירות" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>אוטומטי</SelectItem>
                    {salesPeople.map(person => (
                      <SelectItem key={person.id} value={person.email}>
                        {person.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="follow_up_date">תאריך לחזרה</Label>
                <Input
                  id="follow_up_date"
                  type="datetime-local"
                  value={formData.follow_up_date}
                  onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interest">מה מעניין אותו</Label>
              <Input
                id="interest"
                value={formData.interest}
                onChange={(e) => setFormData({...formData, interest: e.target.value})}
                placeholder="שירות/מוצר ספציפי..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="הערות נוספות..."
                className="h-24"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 border-t border-slate-100 p-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <Save className="w-4 h-4 ml-2" />
              {lead ? "עדכן" : "שמור"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
