import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
// import { createCardcomPaymentLink } from "@/api/functions"; // Cardcom disabled
import { useToast } from "@/components/ui/use-toast";

export default function QuoteForm({ quote, selectedLead, leads, inventory, onSubmit, onCancel, onQuoteCreated, isSubmitting }) {
  const { toast } = useToast();
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);
  
  // Cardcom disabled - flag for future use
  const CARDCOM_ENABLED = false;
  
  const [formData, setFormData] = useState({
    lead_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    items: [{ name: "", quantity: 1, price: 0 }],
    discount: 0,
    status: "טיוטה",
    valid_until: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
    payment_link: ""
  });

  useEffect(() => {
    if (quote) {
      setFormData({
        ...quote,
        customer_email: quote.customer_email || "",
        valid_until: quote.valid_until ? new Date(quote.valid_until).toISOString().split('T')[0] : new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
      });
    } else if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        lead_id: selectedLead.id,
        customer_name: selectedLead.customer_name,
        customer_phone: selectedLead.customer_phone,
        customer_email: selectedLead.customer_email || ""
      }));
    }
  }, [quote, selectedLead]);

  const handleLeadChange = (leadId) => {
    const selected = leads.find(l => l.id === leadId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        lead_id: leadId,
        customer_name: selected.customer_name,
        customer_phone: selected.customer_phone,
        customer_email: selected.customer_email || ""
      }));
    } else {
        setFormData(prev => ({
            ...prev,
            lead_id: "",
            customer_name: "",
            customer_phone: "",
            customer_email: ""
        }));
    }
  };
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;

    if (field === 'inventoryItem') {
      const selectedItem = inventory.find(i => i.id === value);
      if (selectedItem) {
        newItems[index]['name'] = selectedItem.name;
        newItems[index]['price'] = selectedItem.sell_price;
      }
    } else if (field === 'quantity' || field === 'price') {
      newItems[index][field] = parseFloat(value) || 0;
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };
  
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotals = () => {
    const sub_total = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const grand_total = sub_total - formData.discount;
    const vat_included = grand_total / 1.17 * 0.17;
    
    return { sub_total, vat: vat_included, grand_total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ולידציה - חייב להיות לפחות מוצר אחד עם שם ומחיר
    const validItems = formData.items.filter(item => item.name && item.name.trim() !== '' && item.price > 0);
    if (validItems.length === 0) {
      toast({ title: "לא ניתן ליצור הצעה ללא מוצרים", description: "יש להוסיף לפחות מוצר אחד עם שם ומחיר", variant: "destructive" });
      return;
    }

    const totals = calculateTotals();
    const quoteData = {
      ...formData,
      ...totals,
      lead_id: formData.lead_id || null,
      payment_link: formData.payment_link || null,
      customer_email: formData.customer_email || null,
    };

    // שמירת ההצעה
    const savedQuote = await onSubmit(quoteData);
    
    // Cardcom disabled - skip payment link creation
    if (savedQuote && savedQuote.id) {
      console.log("✅ הצעה נשמרה");
      
      if (CARDCOM_ENABLED) {
        // Cardcom integration - currently disabled
        // When enabled, uncomment and use createCardcomPaymentLink
        console.log("Cardcom disabled - skipping payment link creation");
      }
      
      toast({ 
        title: "✓ הצעת מחיר נשמרה!",
        description: "ניתן לשלוח ללקוח"
      });
      
      if (onQuoteCreated) {
        onQuoteCreated(savedQuote);
      } else {
        onCancel();
      }
    }
  };
  
  const totals = calculateTotals();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 md:p-8 bg-slate-100 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <Button variant="outline" onClick={onCancel} className="mb-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            חזרה
        </Button>
        <Card className="shadow-2xl">
          <CardHeader>
            <CardTitle>{quote ? "עריכת" : "יצירת"} הצעת מחיר</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>שיוך ליד (אופציונלי)</Label>
                  <Select value={formData.lead_id || "none"} onValueChange={(value) => handleLeadChange(value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue placeholder="בחר ליד" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא ליד</SelectItem>
                      {leads.map(lead =>
                        <SelectItem key={lead.id} value={lead.id}>
                          {lead.customer_name} - {lead.status} ({lead.serial_number || lead.id.slice(0,5)})
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>שם לקוח *</Label>
                  <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} required disabled={!!formData.lead_id} placeholder="שם הלקוח" />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>טלפון לקוח *</Label>
                  <Input 
                    value={formData.customer_phone} 
                    onChange={(e) => setFormData({...formData, customer_phone: e.target.value})} 
                    placeholder="050-1234567"
                    disabled={!!formData.lead_id}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>אימייל לקוח</Label>
                  <Input 
                    type="email"
                    value={formData.customer_email} 
                    onChange={(e) => setFormData({...formData, customer_email: e.target.value})} 
                    placeholder="example@email.com"
                    disabled={!!formData.lead_id}
                  />
                </div>
                <div className="space-y-2">
                  <Label>לינק תשלום (אוטומטי)</Label>
                  <Input 
                    value={formData.payment_link} 
                    disabled
                    placeholder="יווצר אוטומטית..."
                  />
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">פריטים</h3>
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 mb-2 items-end p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1 space-y-1">
                      <Label>בחר מהמלאי</Label>
                      <Select onValueChange={(value) => handleItemChange(index, 'inventoryItem', value)}>
                        <SelectTrigger><SelectValue placeholder="בחר פריט..." /></SelectTrigger>
                        <SelectContent>
                          {inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (₪{i.sell_price})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label>תיאור</Label>
                      <Input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} placeholder="תיאור הפריט" />
                    </div>
                    <div className="w-24 space-y-1">
                      <Label>כמות</Label>
                      <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} placeholder="1" />
                    </div>
                    <div className="w-32 space-y-1">
                      <Label>מחיר (כולל מע"מ)</Label>
                      <Input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)} placeholder="0" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addItem}><Plus className="w-4 h-4 ml-2" /> הוסף פריט</Button>
              </div>

              <div className="flex justify-end pt-4 border-t">
                  <div className="w-1/2 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label>סה"כ (כולל מע"מ)</Label> 
                        <span>₪{totals.sub_total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <Label>הנחה</Label> 
                        <Input type="number" value={formData.discount} onChange={(e) => setFormData({...formData, discount: parseFloat(e.target.value) || 0})} className="w-32 text-left" placeholder="0" />
                      </div>
                      <div className="flex justify-between items-center text-sm text-slate-500">
                        <span>מע"מ כלול (17%)</span> 
                        <span>₪{totals.vat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center font-bold text-xl pt-2 border-t">
                        <Label>סה"כ לתשלום</Label> 
                        <span>₪{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>סטטוס</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="טיוטה">טיוטה</SelectItem>
                      <SelectItem value="נשלחה">נשלחה</SelectItem>
                      <SelectItem value="אושרה">אושרה</SelectItem>
                      <SelectItem value="בוטלה">בוטלה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>תוקף</Label>
                  <Input type="date" value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})} />
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onCancel}>ביטול</Button>
                <Button type="submit" disabled={isSubmitting || isCreatingPaymentLink}>
                  {(isSubmitting || isCreatingPaymentLink) ? (
                    <>
                      <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                      {isCreatingPaymentLink ? 'יוצר לינק תשלום...' : 'שומר...'}
                    </>
                  ) : (
                    'שמור הצעת מחיר'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}