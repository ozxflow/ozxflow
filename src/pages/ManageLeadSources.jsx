import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function ManageLeadSources() {
  const [showForm, setShowForm] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "אחר",
    is_active: true
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sources = [] } = useQuery({
    queryKey: ['leadSources'],
    queryFn: () => supabase.entities.LeadSource.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.LeadSource.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadSources'] });
      setShowForm(false);
      setFormData({ name: "", type: "אחר", is_active: true });
      toast({ title: "✓ מקור נוסף בהצלחה" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.LeadSource.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadSources'] });
      setShowForm(false);
      setEditingSource(null);
      setFormData({ name: "", type: "אחר", is_active: true });
      toast({ title: "✓ מקור עודכן" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.LeadSource.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leadSources'] });
      toast({ title: "✓ מקור נמחק", variant: "destructive" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSource) {
      updateMutation.mutate({ id: editingSource.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (source) => {
    setEditingSource(source);
    setFormData({
      name: source.name,
      type: source.type,
      is_active: source.is_active
    });
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Settings className="w-10 h-10 text-blue-600" />
              ניהול מקורות הגעה
            </h1>
            <p className="text-slate-600">הוסף והגדר מקורות שיווק ללידים</p>
          </div>
          <Button 
            onClick={() => {
              setShowForm(true);
              setEditingSource(null);
              setFormData({ name: "", type: "אחר", is_active: true });
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            מקור חדש
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <Card className="border-none shadow-xl bg-white mb-6">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>{editingSource ? "עריכת מקור" : "מקור חדש"}</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">שם המקור *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="למשל: קמפיין קיץ 2024"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">סוג המקור</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({...formData, type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="פייסבוק">פייסבוק</SelectItem>
                          <SelectItem value="אינסטגרם">אינסטגרם</SelectItem>
                          <SelectItem value="גוגל">גוגל</SelectItem>
                          <SelectItem value="דף נחיתה">דף נחיתה</SelectItem>
                          <SelectItem value="קמפיין">קמפיין</SelectItem>
                          <SelectItem value="המלצה">המלצה</SelectItem>
                          <SelectItem value="טלפון">טלפון</SelectItem>
                          <SelectItem value="אחר">אחר</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="w-4 h-4"
                      />
                      <Label htmlFor="is_active">מקור פעיל</Label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setShowForm(false);
                          setEditingSource(null);
                          setFormData({ name: "", type: "אחר", is_active: true });
                        }}
                      >
                        ביטול
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        {editingSource ? "עדכן" : "הוסף"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-none shadow-lg bg-white hover:shadow-xl transition-all">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg mb-1">{source.name}</h3>
                      <Badge variant="outline">{source.type}</Badge>
                    </div>
                    <Badge className={source.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {source.is_active ? "פעיל" : "לא פעיל"}
                    </Badge>
                  </div>

                  {(source.total_leads > 0 || source.converted_leads > 0) && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-slate-600">סך לידים: <span className="font-bold">{source.total_leads || 0}</span></p>
                      <p className="text-sm text-slate-600">נסגרו: <span className="font-bold text-green-600">{source.converted_leads || 0}</span></p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(source)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(source.id)}
                      className="flex-1 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4 ml-2" />
                      מחק
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}