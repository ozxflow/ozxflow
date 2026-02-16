import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Check, Loader2, Zap, Edit, Trash2, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from 'date-fns';
import SupplierOrderForm from "../components/supplier_orders/SupplierOrderForm";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SupplierOrders() {
  const [showForm, setShowForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewMode, setViewMode] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: orders = [], isLoading: isLoadingOrders } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: () => supabase.entities.SupplierOrder.list('-order_date')
  });

  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => supabase.entities.Supplier.list()
  });

  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => supabase.entities.Inventory.list()
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => supabase.auth.me()
  });

  const isAdmin = currentUser?.role === "admin";

  // עדכון מספרים סידוריים להזמנות ישנות
  React.useEffect(() => {
    const updateOldOrders = async () => {
      const ordersWithoutSerial = orders.filter(o => !o.serial_number);
      if (ordersWithoutSerial.length > 0) {
        console.log(`🔢 מעדכן ${ordersWithoutSerial.length} הזמנות ללא מספר סידורי`);
        for (let i = 0; i < ordersWithoutSerial.length; i++) {
          const order = ordersWithoutSerial[i];
          const serialNum = `4${String(i + 1).padStart(4, '0')}`;
          await supabase.entities.SupplierOrder.update(order.id, { ...order, serial_number: serialNum });
        }
        queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      }
    };
    
    if (orders.length > 0) {
      updateOldOrders();
    }
  }, [orders.length]);

  const createOrderMutation = useMutation({
    mutationFn: async (orderData) => {
      const allOrders = await supabase.entities.SupplierOrder.list();
      const maxSerial = allOrders.reduce((max, order) => {
        if (order.serial_number && order.serial_number.startsWith('4')) {
          const num = parseInt(order.serial_number.substring(1), 10);
          if (!isNaN(num)) {
            return num > max ? num : max;
          }
        }
        return max;
      }, 0);
      const newSerial = `4${String(maxSerial + 1).padStart(4, '0')}`;
      
      return supabase.entities.SupplierOrder.create({
        ...orderData,
        serial_number: newSerial
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      setShowForm(false);
      setEditingOrder(null);
      toast({ title: "✓ ההזמנה נוצרה בהצלחה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה ביצירת הזמנה", description: error.message, variant: "destructive" });
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.SupplierOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      setShowForm(false);
      setEditingOrder(null);
      toast({ title: "✓ ההזמנה עודכנה בהצלחה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בעדכון הזמנה", description: error.message, variant: "destructive" });
    }
  });

  const deleteOrderMutation = useMutation({
    mutationFn: (orderId) => supabase.entities.SupplierOrder.delete(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      toast({ title: "✓ ההזמנה נמחקה" });
    },
    onError: (error) => {
      toast({ title: "שגיאה במחיקת הזמנה", description: error.message, variant: "destructive" });
    }
  });

  const receiveOrderMutation = useMutation({
    mutationFn: async (order) => {
      const inventoryUpdates = order.items.map(async (item) => {
        const inventoryItems = await supabase.entities.Inventory.list();
        const inventoryItem = inventoryItems.find(i => i.sku === item.sku);
        
        if (inventoryItem) {
          const newStock = (inventoryItem.stock_qty || 0) + item.quantity;
          await supabase.entities.Inventory.update(inventoryItem.id, { 
            ...inventoryItem,
            stock_qty: newStock 
          });
          
          await supabase.entities.StockMove.create({
            sku: item.sku,
            quantity: item.quantity,
            move_type: "כניסה",
            reference_type: "רכש",
            reference_id: order.id,
            performed_by: "מערכת",
            notes: `קבלת סחורה מספק: ${order.supplier_name}`,
            move_date: new Date().toISOString()
          });
        }
      });
      
      await Promise.all(inventoryUpdates);

      return supabase.entities.SupplierOrder.update(order.id, { 
        ...order,
        status: 'התקבלה',
        actual_delivery: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast({ title: "✓ ההזמנה התקבלה והמלאי עודכן!" });
    },
    onError: (error) => {
      toast({ title: "שגיאה בקבלת הזמנה", description: error.message, variant: "destructive" });
    }
  });

  const statusColors = {
    "טיוטה": "bg-gray-100 text-gray-800",
    "נשלחה": "bg-blue-100 text-blue-800",
    "התקבלה חלקית": "bg-yellow-100 text-yellow-800",
    "התקבלה": "bg-green-100 text-green-800",
  };
  
  const autoOrders = orders.filter(o => 
    o.status === "טיוטה" && 
    (o.notes?.includes("הזמנה אוטומטית") || o.notes?.includes("מלאי נמוך"))
  );
  
  const manualOrders = orders.filter(o => 
    !(o.status === "טיוטה" && (o.notes?.includes("הזמנה אוטומטית") || o.notes?.includes("מלאי נמוך")))
  );

  const displayOrders = viewMode === "all" ? orders : 
                        viewMode === "auto" ? autoOrders : 
                        manualOrders;
  
  const isLoading = isLoadingOrders || isLoadingSuppliers || isLoadingInventory;

  const handleEdit = (order) => {
    setEditingOrder(order);
    setShowForm(true);
  };

  const handleDelete = (order) => {
    if (!isAdmin) {
      toast({ title: "אין הרשאה", description: "רק מנהל יכול למחוק הזמנות", variant: "destructive" });
      return;
    }
    
    if (confirm(`האם אתה בטוח שברצונך למחוק את ההזמנה מ${order.supplier_name}?`)) {
      deleteOrderMutation.mutate(order.id);
    }
  };

  const handleSendWhatsApp = (order) => {
    const supplier = suppliers.find(s => s.id === order.supplier_id);
    if (!supplier || !supplier.phone) {
      toast({ title: "שגיאה", description: "לא נמצא מספר טלפון לספק", variant: "destructive" });
      return;
    }
    
    const itemsList = order.items.map(item => `• ${item.name} x${item.quantity}`).join('\n');
    const message = `שלום ${supplier.name},\n\nהזמנה #${order.serial_number}\n\nפריטים:\n${itemsList}\n\nסה"כ: ₪${order.total_cost.toLocaleString()}\n\nתודה!`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${supplier.phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast({ title: "✓ וואטסאפ נפתח" });
  };

  if (showForm) {
    return (
      <SupplierOrderForm
        order={editingOrder}
        suppliers={suppliers}
        inventory={inventory}
        onSubmit={(orderData) => {
          if (editingOrder) {
            updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
          } else {
            createOrderMutation.mutate(orderData);
          }
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingOrder(null);
        }}
        isSubmitting={createOrderMutation.isPending || updateOrderMutation.isPending}
      />
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
              <Truck className="w-10 h-10 text-blue-600" />
              הזמנות מספקים
            </h1>
            <p className="text-slate-600">מעקב אחר הזמנות וקבלת סחורה ({orders.length})</p>
          </div>
          <Button onClick={() => { setEditingOrder(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-5 h-5 ml-2" />
            הזמנה חדשה
          </Button>
        </div>

        {autoOrders.length > 0 && (
          <Card className="mb-6 border-2 border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-orange-600" />
                <div>
                  <h3 className="font-bold text-orange-900 text-lg">⚡ יש {autoOrders.length} הזמנות אוטומטיות ממתינות!</h3>
                  <p className="text-orange-700 text-sm">הזמנות אלו נוצרו אוטומטית בגלל מלאי נמוך</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="grid w-full grid-cols-3 bg-slate-100">
              <TabsTrigger value="all">
                כל ההזמנות ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="auto">
                <Zap className="w-4 h-4 ml-2" />
                אוטומטיות ({autoOrders.length})
              </TabsTrigger>
              <TabsTrigger value="manual">
                ידניות ({manualOrders.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>

        {isLoading ? <div className="text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div> :
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayOrders.map(order => {
            const isAutoOrder = order.status === "טיוטה" && 
              (order.notes?.includes("הזמנה אוטומטית") || order.notes?.includes("מלאי נמוך"));
            
            return (
              <Card key={order.id} className={`border-none shadow-lg bg-white ${isAutoOrder ? 'ring-2 ring-orange-400' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      {order.serial_number && <div className="text-xs text-slate-500 mb-1 font-mono">#{order.serial_number}</div>}
                      <CardTitle className="flex items-center gap-2">
                        {isAutoOrder && <Zap className="w-5 h-5 text-orange-500" />}
                        {order.supplier_name}
                      </CardTitle>
                      {isAutoOrder && (
                        <Badge className="bg-orange-100 text-orange-800 mt-1">אוטומטית</Badge>
                      )}
                    </div>
                    <Badge className={statusColors[order.status]}>{order.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    הזמנה מתאריך: {format(new Date(order.order_date), 'dd/MM/yyyy')}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm mb-4">
                    {order.items?.map(item => (
                      <li key={item.sku} className="flex justify-between">
                        <span>{item.name}</span>
                        <span className="font-mono">x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="font-bold text-lg text-right border-t pt-2">
                    סה"כ: ₪{order.total_cost?.toLocaleString()}
                  </div>
                  {order.notes && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded mt-2">
                      💬 {order.notes}
                    </div>
                  )}
                  
                  <div className="space-y-2 mt-4 pt-4 border-t">
                    {order.status === 'טיוטה' && (
                      <>
                        <Button 
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleSendWhatsApp(order)}
                        >
                          <MessageCircle className="w-4 h-4 ml-2" />
                          שלח בוואטסאפ
                        </Button>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => handleEdit(order)}
                          >
                            <Edit className="w-4 h-4 ml-2" />
                            ערוך
                          </Button>
                          {isAdmin && (
                            <Button 
                              variant="destructive"
                              size="sm"
                              className="w-full hover:bg-red-600"
                              onClick={() => handleDelete(order)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                    
                    {order.status === 'נשלחה' && (
                      <Button 
                        size="sm"
                        className="w-full bg-green-500 hover:bg-green-600"
                        onClick={() => receiveOrderMutation.mutate(order)}
                        disabled={receiveOrderMutation.isPending}
                      >
                        {receiveOrderMutation.isPending && receiveOrderMutation.variables?.id === order.id ? 
                          <Loader2 className="w-4 h-4 animate-spin ml-2" /> : 
                          <Check className="w-4 h-4 ml-2" />}
                        קבלת סחורה
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        }
      </div>
    </div>
  );
}
