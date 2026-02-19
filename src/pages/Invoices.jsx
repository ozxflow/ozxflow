import React, { useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Search, Loader2, Eye, X, Copy, Check, Send, Trash2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cancelInvoice } from "@/api/functions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EntityNotesDialog from "@/components/EntityNotesDialog";

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState(null);
  const [user, setUser] = useState(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState(null);
  const [cancelType, setCancelType] = useState("אשראי");
  const [isFullCredit, setIsFullCredit] = useState(true);
  const [partialAmount, setPartialAmount] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [creditInvoiceForStock, setCreditInvoiceForStock] = useState(null);
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => supabase.entities.Invoice.list('-issue_date'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (invoiceId) => supabase.entities.Invoice.delete(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: "✓ החשבונית נמחקה", variant: "destructive" });
    },
    onError: (error) => {
      toast({ 
        title: "שגיאה במחיקת חשבונית", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleDelete = (invoice) => {
    if (!user || user.role !== "admin") {
      toast({ 
        title: "אין הרשאה", 
        description: "רק מנהל יכול למחוק חשבוניות", 
        variant: "destructive" 
      });
      return;
    }
    
    if (confirm(`האם למחוק את החשבונית של ${invoice.customer_name}?\nמספר: ${invoice.serial_number}`)) {
      deleteMutation.mutate(invoice.id);
    }
  };

  const handleCopyLink = (invoice) => {
    if (invoice.cardcom_invoice_url) {
      navigator.clipboard.writeText(invoice.cardcom_invoice_url);
      setCopiedInvoiceId(invoice.id);
      toast({ title: "✓ הלינק הועתק", description: "לינק החשבונית הועתק ללוח" });
      setTimeout(() => setCopiedInvoiceId(null), 2000);
    }
  };

  const handleSendWhatsApp = (invoice) => {
    const dateToDisplay = invoice.invoice_datetime || invoice.issue_date;
    const formattedDate = dateToDisplay ? format(new Date(dateToDisplay), 'dd/MM/yyyy HH:mm') : '';
    
    const isCredit = invoice.invoice_type === "חשבונית זיכוי";
    
    let message = isCredit 
      ? `🧾 *חשבונית זיכוי - CRM*\n\n`
      : `🧾 *חשבונית - CRM*\n\n`;
    
    message += `שלום ${invoice.customer_name},\n\n`;
    message += isCredit
      ? `להלן חשבונית זיכוי:\n\n`
      : `להלן חשבונית עבור העסקה שביצענו:\n\n`;
    
    message += `*מספר חשבונית:* ${invoice.serial_number}\n`;
    message += `*תאריך הפקה:* ${formattedDate}\n`;
    message += `*סכום:* ₪${Math.abs(invoice.grand_total)?.toLocaleString()}\n\n`;
    
    if (invoice.cardcom_invoice_url) {
      message += `📄 *לצפייה ${isCredit ? 'בחשבונית זיכוי' : 'בחשבונית'} לחץ כאן:*\n${invoice.cardcom_invoice_url}\n\n`;
    }
    
    message += `תודה! 🙏\n`;
    message += `לשאלות נוספות, אנחנו כאן בשבילכם.`;
    
    const encodedMessage = encodeURIComponent(message);
    const phone = invoice.customer_phone?.replace(/[^0-9]/g, '');
    
    if (!phone) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מספר טלפון ללקוח",
        variant: "destructive"
      });
      return;
    }
    
    const whatsappUrl = `https://wa.me/972${phone.startsWith('0') ? phone.slice(1) : phone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: "✓ נפתח וואטסאפ",
      description: "ההודעה מוכנה לשליחה"
    });
  };

  const handleCancelClick = (invoice) => {
    if (!user || user.role !== "admin") {
      toast({ 
        title: "אין הרשאה", 
        description: "רק מנהל יכול לבטל חשבוניות", 
        variant: "destructive" 
      });
      return;
    }

    setInvoiceToCancel(invoice);
    setCancelType("אשראי");
    setIsFullCredit(true);
    setPartialAmount("");
    setIsCancelDialogOpen(true);
  };

  const handleCancelSubmit = async () => {
    if (!invoiceToCancel) return;

    if (!isFullCredit && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      toast({
        title: "שגיאה",
        description: "יש להזין סכום תקין לזיכוי חלקי",
        variant: "destructive"
      });
      return;
    }

    setIsCanceling(true);

    try {
      const { data } = await cancelInvoice({
        invoiceId: invoiceToCancel.id,
        cancelType: cancelType,
        partialAmount: isFullCredit ? null : parseFloat(partialAmount)
      });

      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
        
        setIsCancelDialogOpen(false);
        
        // פתיחת חשבונית הזיכוי
        const creditInvoices = await supabase.entities.Invoice.list();
        const creditInvoice = creditInvoices.find(inv => inv.id === data.credit_invoice_id);
        
        if (creditInvoice) {
          setViewingInvoice(creditInvoice);
          setCreditInvoiceForStock(creditInvoice);
        }

        toast({
          title: "✅ החשבונית בוטלה בהצלחה",
          description: "חשבונית זיכוי נוצרה"
        });
      } else {
        // ✅ טיפול מיוחד בחשבונית שכבר בוטלה
        if (data.alreadyCancelled) {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          setIsCancelDialogOpen(false);
          
          toast({
            title: "⚠️ חשבונית כבר בוטלה",
            description: data.userMessage || "חשבונית זו כבר בוטלה בעבר",
            variant: "default"
          });
        } else if (data.requiresCreditCard) {
          // ✅ טיפול מיוחד - חשבונית שנוצרה באשראי
          toast({
            title: "⚠️ חובה לבחור אשראי",
            description: data.userMessage || "חשבונית זו נוצרה בתשלום אשראי - חובה לבחור 'אשראי' כאמצעי תשלום",
            variant: "destructive",
            duration: 6000
          });
        } else {
          toast({
            title: "שגיאה",
            description: data.userMessage || data.error || "לא ניתן לבטל את החשבונית",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error.message || "תקלה בביטול החשבונית",
        variant: "destructive"
      });
    } finally {
      setIsCanceling(false);
    }
  };

  const handleStockReturn = async (returnToStock) => {
    if (!creditInvoiceForStock) return;

    if (returnToStock && creditInvoiceForStock.items && creditInvoiceForStock.items.length > 0) {
      try {
        const currentInventory = await supabase.entities.Inventory.list();
        
        for (const item of creditInvoiceForStock.items) {
          const inventoryItem = currentInventory.find(i => i.sku === item.sku);
          
          if (inventoryItem) {
            await supabase.entities.Inventory.update(inventoryItem.id, {
              ...inventoryItem,
              stock_qty: (inventoryItem.stock_qty || 0) + Math.abs(item.quantity || 1)
            });

            await supabase.entities.StockMove.create({
              sku: inventoryItem.sku,
              quantity: Math.abs(item.quantity || 1),
              move_type: "כניסה",
              reference_type: "ביטול",
              reference_id: creditInvoiceForStock.id,
              performed_by: user.email,
              notes: `זיכוי חשבונית - החזרת מלאי: ${creditInvoiceForStock.customer_name}`,
              move_date: new Date().toISOString()
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ['inventory'] });

        toast({
          title: "✅ המלאי עודכן",
          description: `${creditInvoiceForStock.items.length} פריטים הוחזרו למלאי`
        });
      } catch (error) {
        toast({
          title: "שגיאה בעדכון מלאי",
          description: error.message,
          variant: "destructive"
        });
      }
    }

    setIsStockDialogOpen(false);
    setCreditInvoiceForStock(null);
    setViewingInvoice(null);
  };

  const filteredByType = invoiceTypeFilter === "all" 
    ? invoices 
    : invoices.filter(inv => inv.invoice_type === invoiceTypeFilter);

  const filteredInvoices = filteredByType.filter(inv => {
    const dateToDisplay = inv.invoice_datetime || inv.issue_date;
    const formattedDate = dateToDisplay ? format(new Date(dateToDisplay), 'dd/MM/yyyy') : '';
    
    return inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.serial_number?.includes(searchQuery) ||
      formattedDate.includes(searchQuery);
  });

  const isAdmin = user?.role === "admin";

  const regularInvoices = invoices.filter(inv => inv.invoice_type !== "חשבונית זיכוי");
  const creditInvoices = invoices.filter(inv => inv.invoice_type === "חשבונית זיכוי");

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <FileText className="w-10 h-10 text-blue-600" />
            חשבוניות
          </h1>
          <p className="text-slate-600">כל החשבוניות של העסק ({invoices.length})</p>
        </motion.div>

        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <div className="space-y-4">
            <Tabs value={invoiceTypeFilter} onValueChange={setInvoiceTypeFilter}>
              <TabsList className="grid w-full grid-cols-3 bg-slate-100">
                <TabsTrigger value="all">הכל ({invoices.length})</TabsTrigger>
                <TabsTrigger value="חשבונית רגילה">חשבוניות ({regularInvoices.length})</TabsTrigger>
                <TabsTrigger value="חשבונית זיכוי">חשבוניות זיכוי ({creditInvoices.length})</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="relative">
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                placeholder="חיפוש לפי שם, מספר סידורי או תאריך..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-12 text-lg h-12"
              />
            </div>
          </div>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInvoices.map((invoice, index) => {
              const dateToDisplay = invoice.invoice_datetime || invoice.issue_date;
              const isCredit = invoice.invoice_type === "חשבונית זיכוי";
              
              return (
                <motion.div
                  key={invoice.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-xl transition-all border-none bg-white">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">#{invoice.serial_number}</div>
                          <CardTitle className="text-lg">{invoice.customer_name}</CardTitle>
                        </div>
                        {isCredit ? (
                          <Badge className="bg-orange-100 text-orange-800">זיכוי</Badge>
                        ) : (
                          <Badge className={invoice.status === "מבוטל" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            {invoice.status || "שולם"}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">תאריך והפקה:</span>
                        <span className="font-semibold">
                          {dateToDisplay ? format(new Date(dateToDisplay), 'dd/MM/yyyy HH:mm') : 'N/A'}
                        </span>
                      </div>
                      {invoice.cardcom_invoice_number && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Cardcom:</span>
                          <span className="font-mono text-xs">{invoice.cardcom_invoice_number}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-slate-600">סכום:</span>
                        <span className="font-bold text-lg">₪{Math.abs(invoice.grand_total).toLocaleString()}</span>
                      </div>
                      
                      {invoice.cardcom_invoice_url && (
                        <div className={`grid ${isAdmin && !isCredit ? 'grid-cols-5' : 'grid-cols-4'} gap-2 pt-3 border-t`}>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setViewingInvoice(invoice)}
                            className="w-full"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleCopyLink(invoice)}
                            className="w-full"
                          >
                            {copiedInvoiceId === invoice.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSendWhatsApp(invoice)}
                            className="w-full bg-green-50 hover:bg-green-100"
                          >
                            <Send className="w-3 h-3 text-green-600" />
                          </Button>

                          {isAdmin && !isCredit && invoice.status !== "מבוטל" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelClick(invoice)}
                              className="w-full bg-red-50 hover:bg-red-100"
                            >
                              <XCircle className="w-3 h-3 text-red-600" />
                            </Button>
                          )}

                          {isAdmin && (
                            <Button 
                              variant="destructive" 
                              size="sm"
                              onClick={() => handleDelete(invoice)}
                              className="w-full"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      <div className="pt-2">
                        <EntityNotesDialog entityType="invoice" entityId={invoice.id} entityLabel={`חשבונית #${invoice.serial_number || ""}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {filteredInvoices.length === 0 && !isLoading && (
          <Card className="p-12 text-center border-none shadow-lg bg-white">
            <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין חשבוניות</h3>
            <p className="text-slate-500">חשבוניות יופיעו כאן אחרי שקארדקום ישלח אותן</p>
          </Card>
        )}
      </div>

      {/* Dialog לצפייה בחשבונית */}
      <Dialog open={!!viewingInvoice} onOpenChange={() => {
        if (creditInvoiceForStock) {
          setIsStockDialogOpen(true);
        } else {
          setViewingInvoice(null);
        }
      }}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full" dir="rtl">
            <div className="flex justify-between items-center p-6 border-b bg-slate-50">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {viewingInvoice?.invoice_type === "חשבונית זיכוי" ? "חשבונית זיכוי" : "חשבונית"} #{viewingInvoice?.serial_number}
                </DialogTitle>
                <p className="text-sm text-slate-600 mt-1">{viewingInvoice?.customer_name}</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (creditInvoiceForStock) {
                    setIsStockDialogOpen(true);
                  } else {
                    setViewingInvoice(null);
                  }
                }}
                className="hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex-1 bg-white overflow-hidden">
              {viewingInvoice?.cardcom_invoice_url ? (
                <iframe 
                  src={viewingInvoice.cardcom_invoice_url} 
                  className="w-full h-[calc(95vh-80px)] border-0" 
                  title="Invoice Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <FileText className="w-16 h-16 mb-4" />
                  <p>אין חשבונית זמינה</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog לביטול חשבונית */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ביטול חשבונית #{invoiceToCancel?.serial_number}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>אמצעי תשלום</Label>
              <Select value={cancelType} onValueChange={setCancelType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="אשראי">אשראי</SelectItem>
                  <SelectItem value="מזומן">מזומן</SelectItem>
                  <SelectItem value="העברה בנקאית">העברה בנקאית</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סוג זיכוי</Label>
              <Select value={isFullCredit ? "full" : "partial"} onValueChange={(val) => setIsFullCredit(val === "full")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">זיכוי מלא</SelectItem>
                  <SelectItem value="partial">זיכוי חלקי</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!isFullCredit && (
              <div className="space-y-2">
                <Label>סכום לזיכוי</Label>
                <Input
                  type="number"
                  placeholder="הזן סכום"
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  max={invoiceToCancel?.grand_total || 0}
                />
                <p className="text-xs text-slate-500">
                  מקסימום: ₪{invoiceToCancel?.grand_total?.toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)} disabled={isCanceling}>
              ביטול
            </Button>
            <Button 
              onClick={handleCancelSubmit} 
              disabled={isCanceling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCanceling ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              אשר ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog לזיכוי מלאי */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>זיכוי מלאי</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-slate-600">
              האם לזכות את המוצרים חזרה למלאי?
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleStockReturn(false)}>
              לא
            </Button>
            <Button onClick={() => handleStockReturn(true)} className="bg-blue-600 hover:bg-blue-700">
              כן, זכה למלאי
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
