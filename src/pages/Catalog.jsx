import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Edit, Trash2, Search, Loader2, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

export default function Catalog() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    sell_price: 0,
    category: "",
    supplier_id: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: catalog = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => supabase.entities.Inventory.list(),
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supabase.entities.Supplier.list(),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (itemData) => supabase.entities.Inventory.create(itemData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowForm(false);
      resetForm();
      toast({ title: "✓ הפריט נוסף לקטלוג" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Inventory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setShowForm(false);
      setEditingItem(null);
      toast({ title: "✓ הפריט עודכן" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Inventory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "✓ הפריט נמחק" });
    },
  });

  const resetForm = () => {
    setFormData({
      sku: "",
      name: "",
      description: "",
      sell_price: 0,
      category: "",
      supplier_id: ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      supplier_id: formData.supplier_id || null
    };
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      sku: item.sku || "",
      name: item.name || "",
      description: item.description || "",
      sell_price: item.sell_price || 0,
      category: item.category || "",
      supplier_id: item.supplier_id || ""
    });
    setShowForm(true);
  };

  const handleDelete = (item) => {
    if (confirm(`האם למחוק את ${item.name}?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const filteredCatalog = catalog.filter(item =>
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <Package className="w-10 h-10 text-blue-600" />
              קטלוג שירותים
            </h1>
            <p className="text-slate-600">רשימת השירותים והמוצרים ({catalog.length})</p>
          </div>
          <Button onClick={() => {
            setShowForm(true);
            setEditingItem(null);
            resetForm();
          }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 ml-2" />
            הוסף פריט
          </Button>
        </motion.div>

        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="חיפוש (שם, קוד, קטגוריה)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12"
            />
          </div>
        </Card>

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
                  <CardTitle>{editingItem ? "עריכת פריט" : "פריט חדש"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>קוד פריט (SKU)</Label>
                        <Input 
                          value={formData.sku} 
                          onChange={(e) => setFormData({...formData, sku: e.target.value})} 
                          placeholder="SRV-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>שם הפריט *</Label>
                        <Input 
                          value={formData.name} 
                          onChange={(e) => setFormData({...formData, name: e.target.value})} 
                          required 
                          placeholder="שם השירות/מוצר"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>קטגוריה</Label>
                        <Input 
                          value={formData.category} 
                          onChange={(e) => setFormData({...formData, category: e.target.value})} 
                          placeholder="שירות / מוצר / אחר"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>מחיר *</Label>
                        <Input 
                          type="number" 
                          value={formData.sell_price} 
                          onChange={(e) => setFormData({...formData, sell_price: parseFloat(e.target.value) || 0})} 
                          required 
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>תיאור</Label>
                        <Input
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          placeholder="תיאור קצר של הפריט..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ספק</Label>
                        <Select value={formData.supplier_id || "none"} onValueChange={(value) => setFormData({...formData, supplier_id: value === "none" ? "" : value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר ספק..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">ללא ספק</SelectItem>
                            {suppliers.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false);
                          setEditingItem(null);
                        }}
                        className="bg-gray-100 hover:bg-gray-200"
                      >
                        ביטול
                      </Button>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        {editingItem ? "עדכן" : "שמור"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-xl transition-all border-none bg-white">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{item.name}</CardTitle>
                        {item.sku && <p className="text-xs text-slate-500 font-mono">{item.sku}</p>}
                      </div>
                      {item.category && (
                        <Badge variant="outline">{item.category}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3">
                    {item.description && (
                      <p className="text-sm text-slate-600">{item.description}</p>
                    )}

                    {item.supplier_id && (() => {
                      const supplier = suppliers.find(s => s.id === item.supplier_id);
                      return supplier ? (
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Truck className="w-4 h-4" />
                          <span>{supplier.name}</span>
                        </div>
                      ) : null;
                    })()}

                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg">
                        <span className="text-slate-600">מחיר:</span>
                        <span className="font-bold text-green-600">₪{item.sell_price?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleEdit(item)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Edit className="w-4 h-4 ml-2" />
                        ערוך
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item)}
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
        )}

        {filteredCatalog.length === 0 && !isLoading && (
          <Card className="p-12 text-center border-none shadow-lg bg-white">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין פריטים בקטלוג</h3>
            <p className="text-slate-500">התחל בהוספת הפריט הראשון</p>
          </Card>
        )}
      </div>
    </div>
  );
}