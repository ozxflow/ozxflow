import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Phone, Mail, Truck, Edit, Trash2, MapPin, Clock } from "lucide-react"; // Added MapPin and Clock
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export default function Suppliers() {
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    lead_time_days: 3,
    notes: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supabase.entities.Supplier.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Supplier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        lead_time_days: 3,
        notes: ""
      });
      toast({ title: "✓ הספק נוסף" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Supplier.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setShowForm(false);
      setEditingSupplier(null);
      toast({ title: "✓ הספק עודכן" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Supplier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: "✓ הספק נמחק", variant: "destructive" });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingSupplier) {
      updateMutation.mutate({ id: editingSupplier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData(supplier);
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Users className="w-10 h-10 text-blue-600" />
              ספקים
            </h1>
            <p className="text-slate-600">ניהול ספקי מוצרים ({suppliers.length})</p>
          </div>
          <Button onClick={() => {
            setShowForm(true);
            setEditingSupplier(null);
          }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 ml-2" />
            הוסף ספק
          </Button>
        </motion.div>

        <AnimatePresence mode="wait">
          {showForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mb-6"
            >
              <Card className="border-none shadow-xl bg-white">
                <CardHeader>
                  <CardTitle>{editingSupplier ? "עריכת ספק" : "ספק חדש"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>שם ספק *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          required 
                          placeholder="לדוגמה: סופרבאט"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>טלפון *</Label>
                        <Input 
                          value={formData.phone} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                          required 
                          placeholder="03-1234567"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>דואר אלקטרוני</Label>
                        <Input 
                          type="email" 
                          value={formData.email} 
                          onChange={(e) => setFormData({...formData, email: e.target.value})} 
                          placeholder="info@supplier.co.il"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ימי אספקה</Label>
                        <Input 
                          type="number" 
                          value={formData.lead_time_days} 
                          onChange={(e) => setFormData({...formData, lead_time_days: parseInt(e.target.value) || 0})}
                          placeholder="מספר ימים"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>כתובת</Label>
                      <Input 
                        value={formData.address} 
                        onChange={(e) => setFormData({...formData, address: e.target.value})} 
                        placeholder="כתובת הספק"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>הערות</Label>
                      <Textarea 
                        value={formData.notes} 
                        onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                        className="h-24"
                        placeholder="הערות כלליות על הספק"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEditingSupplier(null);
                        }}
                        className="bg-gray-100 hover:bg-gray-200"
                      >
                        ביטול
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        {editingSupplier ? "עדכן" : "שמור"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suppliers.map((supplier, index) => (
            <motion.div
              key={supplier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-xl transition-all border-none bg-white">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">{supplier.name}</h3>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-4 h-4 text-blue-600" />
                      {supplier.phone}
                    </div>
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-blue-600" />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        {supplier.address}
                      </div>
                    )}
                    {supplier.lead_time_days && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Clock className="w-4 h-4 text-blue-600" />
                        זמן אספקה: {supplier.lead_time_days} ימים
                      </div>
                    )}
                  </div>

                  {supplier.notes && (
                    <div className="bg-slate-50 p-3 rounded-lg mb-4">
                      <p className="text-xs text-slate-600">{supplier.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(supplier)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Edit className="w-4 h-4 ml-2" />
                      ערוך
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(supplier.id)}
                      className="w-full hover:bg-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {suppliers.length === 0 && (
          <Card className="p-12 text-center border-none shadow-lg bg-white">
            <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין ספקים</h3>
            <p className="text-slate-500">התחל בהוספת הספק הראשון</p>
          </Card>
        )}
      </div>
    </div>
  );
}
