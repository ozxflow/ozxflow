
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SupplierOrderForm({ order, suppliers, inventory, onSubmit, onCancel, isSubmitting }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState(order?.supplier_id || "");
  const [orderItems, setOrderItems] = useState(() => {
    const initialItems = {};
    if (order?.items) {
      order.items.forEach(item => {
        initialItems[item.sku] = item.quantity;
      });
    }
    return initialItems;
  });
  const [notes, setNotes] = useState(order?.notes || "");

  const productsForSupplier = useMemo(() => {
    if (!selectedSupplierId) return [];
    return inventory.filter(item => item.supplier_id === selectedSupplierId);
  }, [selectedSupplierId, inventory]);

  const handleQuantityChange = (sku, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    setOrderItems(prev => ({
      ...prev,
      [sku]: isNaN(numQuantity) ? 0 : numQuantity
    }));
  };

  const totalCost = useMemo(() => {
    return Object.entries(orderItems).reduce((total, [sku, quantity]) => {
      if (quantity > 0) {
        const product = inventory.find(item => item.sku === sku);
        return total + (product?.purchase_cost || 0) * quantity;
      }
      return total;
    }, 0);
  }, [orderItems, inventory]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    if (!selectedSupplier) return;

    const itemsToSubmit = Object.entries(orderItems)
      .filter(([_, quantity]) => quantity > 0)
      .map(([sku, quantity]) => {
        const product = inventory.find(item => item.sku === sku);
        return {
          sku: product.sku,
          name: product.name,
          quantity: quantity,
          cost: product.purchase_cost || 0
        };
      });

    const orderData = {
      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier.name,
      order_date: new Date().toISOString(),
      status: order?.status || "טיוטה", // Changed from "נשלחה" to "טיוטה"
      items: itemsToSubmit,
      total_cost: totalCost,
      notes: notes,
    };
    
    onSubmit(orderData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8"
    >
      <form onSubmit={handleSubmit}>
        <Card className="max-w-4xl mx-auto border-none shadow-2xl">
          <CardHeader>
            <CardTitle>{order ? "עריכת הזמנה" : "יצירת הזמנה חדשה מספק"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="supplier">שלב 1: בחר ספק</Label>
              <Select onValueChange={setSelectedSupplierId} defaultValue={selectedSupplierId}>
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="בחר ספק..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSupplierId && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-4 border-t"
              >
                <h3 className="font-semibold">שלב 2: בחר מוצרים וכמויות</h3>
                <div className="max-h-72 overflow-y-auto space-y-3 pr-2">
                  {productsForSupplier.length > 0 ? productsForSupplier.map(product => (
                    <div key={product.sku} className="flex items-center gap-4 p-2 rounded-md bg-slate-50">
                      <div className="flex-1">
                        <p className="font-medium text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">SKU: {product.sku} | עלות: ₪{product.purchase_cost}</p>
                      </div>
                      <Input
                        type="number"
                        min="0"
                        placeholder="כמות"
                        className="w-24 h-9"
                        value={orderItems[product.sku] || ""}
                        onChange={(e) => handleQuantityChange(product.sku, e.target.value)}
                      />
                    </div>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">לא נמצאו מוצרים המשויכים לספק זה.</p>
                  )}
                </div>
              </motion.div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="notes">הערות להזמנה</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="text-xl font-bold text-right">
              סה"כ עלות הזמנה: ₪{totalCost.toLocaleString()}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>ביטול</Button>
            <Button type="submit" disabled={isSubmitting || !selectedSupplierId}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {order ? "עדכן הזמנה" : "שלח הזמנה"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </motion.div>
  );
}
