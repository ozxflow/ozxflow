import React, { useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, MapPin, Clock, Camera, User as UserIcon, Package, Loader2, DollarSign, Share2, Plus, Trash2, Copy, Check, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { createCardcomPaymentLink } from "@/api/functions"; // Cardcom disabled

// Cardcom disabled - flag for future use
const CARDCOM_ENABLED = false;

export default function Jobs() {
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [quoteItems, setQuoteItems] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [isCreatingPaymentLink, setIsCreatingPaymentLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showChangeInstallerDialog, setShowChangeInstallerDialog] = useState(false);
  const [jobToChangeInstaller, setJobToChangeInstaller] = useState(null);
  const [newInstallerId, setNewInstallerId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => supabase.entities.Job.list('-start_time'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => supabase.entities.Lead.list(),
    initialData: [],
  });
  
  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => supabase.entities.Inventory.list(),
    initialData: [],
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => supabase.entities.Quote.list(),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => supabase.entities.User.list(),
    initialData: [],
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const results = await supabase.entities.Settings.list();
      return results[0] || {};
    },
  });

  const installers = users.filter(u => u.role_type === "איש צוות");

  const changeInstallerMutation = useMutation({
    mutationFn: async ({ jobId, newInstallerEmail }) => {
      const job = jobs.find(j => j.id === jobId);
      if (!job) throw new Error("Job not found");

      const oldInstaller = users.find(u => u.email === job.installer_email);
      const newInstaller = users.find(u => u.email === newInstallerEmail);
      
      if (!newInstaller) throw new Error("New installer not found");

      console.log("🔄 החלפת איש צוות:");
      console.log("   איש צוות ישן:", oldInstaller?.full_name);
      console.log("   איש צוות חדש:", newInstaller.full_name);

      // עדכון העבודה איש צוות חדש
      await supabase.entities.Job.update(jobId, {
        installer_email: newInstaller.email,
        installer_name: newInstaller.full_name
      });

      // עדכון סטטוס איש צוות החדש ל"בטיפול"
      await supabase.entities.User.update(newInstaller.id, {
        availability_status: "בטיפול"
      });

      // בדיקה אם איש צוות הישן יש עוד עבודות פעילות
      if (oldInstaller) {
        const oldInstallerJobs = jobs.filter(j => 
          j.installer_email === oldInstaller.email && 
          j.status !== "בוצע" && 
          j.status !== "נדחה" &&
          j.id !== jobId // לא כולל את העבודה שהעברנו
        );

        console.log(`   עבודות נותרות איש צוות הישן: ${oldInstallerJobs.length}`);

        // אם אין לו עוד עבודות - מחזיר אותו ל"פנוי"
        if (oldInstallerJobs.length === 0) {
          await supabase.entities.User.update(oldInstaller.id, {
            availability_status: "פנוי"
          });
          console.log(`   ✅ ${oldInstaller.full_name} חזר ל"פנוי"`);
        }
      }

      // עדכון הליד אם קיים
      if (job.lead_id) {
        const lead = leads.find(l => l.id === job.lead_id);
        if (lead) {
          await supabase.entities.Lead.update(lead.id, {
            assigned_installer: newInstaller.email,
            assignee_id: newInstaller.id
          });
        }
      }

      return { job, oldInstaller, newInstaller };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      
      setShowChangeInstallerDialog(false);
      setJobToChangeInstaller(null);
      setNewInstallerId("");
      
      toast({ 
        title: "✓ איש צוות הוחלף בהצלחה",
        description: `העבודה הועברה ל${data.newInstaller.full_name}${data.oldInstaller ? ` (${data.oldInstaller.full_name} חזר לפנוי)` : ''}`
      });
    },
    onError: (error) => {
      toast({ 
        title: "שגיאה בהחלפת איש צוות",
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleOpenChangeInstaller = (job) => {
    setJobToChangeInstaller(job);
    setNewInstallerId("");
    setShowChangeInstallerDialog(true);
  };

  const handleChangeInstaller = () => {
    if (!newInstallerId) {
      toast({ 
        title: "לא נבחר איש צוות",
        description: "אנא בחר איש צוות מהרשימה",
        variant: "destructive" 
      });
      return;
    }

    const newInstaller = users.find(u => u.id === newInstallerId);
    if (newInstaller?.email === jobToChangeInstaller?.installer_email) {
      toast({ 
        title: "איש צוות זהה",
        description: "איש צוות שבחרת כבר משובץ לעבודה זו",
        variant: "destructive" 
      });
      return;
    }

    changeInstallerMutation.mutate({
      jobId: jobToChangeInstaller.id,
      newInstallerEmail: newInstaller.email
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Job.update(id, data),
    onSuccess: async (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      
      const allUsers = await supabase.entities.User.list();
      const installer = allUsers.find(u => u.email === updatedJob.installer_email);
      
      if (updatedJob.status === "בדרך" && installer) {
        console.log("🚗 J1: עובד יצא לדרך");
        
        const lead = leads.find(l => l.id === updatedJob.lead_id);
        if (lead) {
          await supabase.entities.Lead.update(lead.id, {
            status: "יצא לדרך"
          });
          console.log("✅ הליד עודכן ל'יצא לדרך'");
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
        
        if (installer.availability_status !== "בעבודה") {
          await supabase.entities.User.update(installer.id, {
            availability_status: "בעבודה"
          });
          console.log(`✅ ${installer.full_name} עודכן ל'בעבודה'`);
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
        
        toast({ title: "✓ בדרך ללקוח!" });
      }
      
      else if (updatedJob.status === "בוצע" && !updatedJob.internal_done_stocked) {
        console.log("==== J2 START ====");
        console.log("✅ J2: העבודה הושלמה, מתחיל תהליך...");
        
        try {
          const lead = updatedJob.lead_id ? leads.find(l => l.id === updatedJob.lead_id) : null;
          console.log("🔍 ליד:", lead ? lead.customer_name : "אין ליד קשור (ממשיך בלי)");

          if (updatedJob.items && updatedJob.items.length > 0) {
            console.log(`📦 יש ${updatedJob.items.length} פריטים בעבודה שבוצעה`);
            
            console.log("🔄 שולף מלאי עדכני...");
            const currentInventory = await supabase.entities.Inventory.list();
            console.log(`📦 סה"כ ${currentInventory.length} פריטים במלאי`);
            
            for (const jobItem of updatedJob.items) {
              console.log("\n--- מעבד פריט מהעבודה ---");
              console.log("פריט:", jobItem);
              
              const inventoryItem = currentInventory.find(i => 
                (jobItem.sku && i.sku === jobItem.sku) || 
                (!jobItem.sku && i.name === jobItem.name)
              );
              
              if (inventoryItem) {
                console.log("✅ מצא פריט במלאי!");
                
                const oldStock = inventoryItem.stock_qty || 0;
                const quantityToDeduct = jobItem.quantity || 1;
                const newStock = oldStock - quantityToDeduct;
                
                console.log(`📊 מלאי ${inventoryItem.name}:`);
                console.log(`   לפני: ${oldStock}`);
                console.log(`   מנכה: ${quantityToDeduct}`);
                console.log(`   אחרי: ${newStock}`);
                
                console.log("⏳ מעדכן מלאי...");
                await supabase.entities.Inventory.update(inventoryItem.id, {
                  ...inventoryItem,
                  stock_qty: newStock
                });
                console.log("✅ מלאי עודכן");
                
                console.log("⏳ יוצר תנועת מלאי...");
                await supabase.entities.StockMove.create({
                  sku: inventoryItem.sku,
                  quantity: -quantityToDeduct,
                  move_type: "יציאה",
                  reference_type: "עבודה",
                  reference_id: updatedJob.id,
                  performed_by: installer?.email || "מערכת",
                  notes: `התקנה ללקוח: ${updatedJob.customer_name} (פריטים מהעבודה שבוצעה)${jobItem.price_note ? ` - הערת מחיר: ${jobItem.price_note}` : ''}`,
                  move_date: new Date().toISOString()
                });
                console.log("✅ תנועת מלאי נוצרה");
                
                if (newStock <= (inventoryItem.reorder_point || 0)) {
                  console.log(`⚠️ מלאי נמוך! ${newStock} <= ${inventoryItem.reorder_point}`);
                  
                  const suppliers = await supabase.entities.Supplier.list();
                  const supplier = suppliers.find(s => s.id === inventoryItem.supplier_id);
                  
                  if (supplier) {
                    console.log(`📦 יוצר הזמנה אצל ספק: ${supplier.name}`);
                    const existingOrders = await supabase.entities.SupplierOrder.list();
                    const openOrder = existingOrders.find(o => 
                      o.supplier_id === supplier.id && o.status === "טיוטה"
                    );
                    
                    if (openOrder) {
                      const updatedItems = [...(openOrder.items || [])];
                      const existingItemIndex = updatedItems.findIndex(i => i.sku === inventoryItem.sku);
                      
                      if (existingItemIndex >= 0) {
                        updatedItems[existingItemIndex].quantity += inventoryItem.reorder_qty || 10;
                      } else {
                        updatedItems.push({
                          sku: inventoryItem.sku,
                          name: inventoryItem.name,
                          quantity: inventoryItem.reorder_qty || 10,
                          cost: inventoryItem.purchase_cost || 0
                        });
                      }
                      
                      const newTotal = updatedItems.reduce((sum, it) => sum + (it.quantity * it.cost), 0);
                      
                      await supabase.entities.SupplierOrder.update(openOrder.id, {
                        ...openOrder,
                        items: updatedItems,
                        total_cost: newTotal
                      });
                      console.log(`✅ עדכן הזמנה קיימת`);
                    } else {
                      await supabase.entities.SupplierOrder.create({
                        supplier_id: supplier.id,
                        supplier_name: supplier.name,
                        order_date: new Date().toISOString(),
                        status: "טיוטה",
                        items: [{
                          sku: inventoryItem.sku,
                          name: inventoryItem.name,
                          quantity: inventoryItem.reorder_qty || 10,
                          cost: inventoryItem.purchase_cost || 0
                        }],
                        total_cost: (inventoryItem.reorder_qty || 10) * (inventoryItem.purchase_cost || 0),
                        notes: `הזמנה אוטומטית - מלאי נמוך`
                      });
                      console.log(`✅ יצר הזמנה חדשה`);
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['supplierOrders'] });
                  }
                }
              } else {
                console.warn(`❌ לא נמצא פריט במלאי עם SKU: "${jobItem.sku}" או שם: "${jobItem.name}"`);
              }
            }
            
            console.log("\n✅ סיימתי לעדכן מלאי לכל הפריטים מהעבודה");
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['stockMoves'] });
          } else {
            console.log("⚠️ אין פריטים בעבודה - מדלג על עדכון מלאי");
          }
          
          if (installer) {
            await supabase.entities.User.update(installer.id, {
              ...installer,
              availability_status: "פנוי"
            });
            console.log(`✅ ${installer.full_name} חזר לסטטוס 'פנוי'`);
            queryClient.invalidateQueries({ queryKey: ['users'] });
            
            console.log("🔍 W1: עובד פנוי, בודק אם יש לידים בתור...");
            
            const allLeads = await supabase.entities.Lead.list();
            const waitingLeads = allLeads
              .filter(l => l.status === "ממתין לטיפול" && !l.assignee_id)
              .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
            
            console.log(`📋 נמצאו ${waitingLeads.length} לידים ממתינים בתור`);
            
            if (waitingLeads.length > 0) {
              const nextLead = waitingLeads[0];
              console.log(`🎯 משבץ ליד הבא: ${nextLead.customer_name}`);
              
              const newJob = await supabase.entities.Job.create({
                lead_id: nextLead.id,
                customer_name: nextLead.customer_name,
                installation_address: nextLead.customer_address,
                service_type: nextLead.service_type,
                installer_email: installer.email,
                installer_name: installer.full_name,
                status: "פתוח",
                items: nextLead.items || [],
                start_time: new Date().toISOString(),
                notes: nextLead.notes || "",
                internal_done_stocked: false
              });
              
              await supabase.entities.Lead.update(nextLead.id, {
                ...nextLead,
                assignee_id: installer.id,
                job_id: newJob.id,
                internal_p_paid_assigned: true,
                status: "בטיפול"
              });
              
              await supabase.entities.User.update(installer.id, {
                ...installer,
                availability_status: "בעבודה"
              });
              
              console.log(`✅ עבודה חדשה נמשכה מהתור ל-${installer.full_name}`);
              
              queryClient.invalidateQueries({ queryKey: ['leads'] });
              queryClient.invalidateQueries({ queryKey: ['jobs'] });
              queryClient.invalidateQueries({ queryKey: ['users'] });
              
              toast({ 
                title: "✓ עבודה הושלמה ועבודה חדשה נמשכה!", 
                description: `${installer.full_name} שובץ ללקוח הבא: ${nextLead.customer_name}` 
              });
              
              console.log("==== J2 END ====");
              return;
            }
          }
          
          if (lead) {
            await supabase.entities.Lead.update(lead.id, {
              status: "הושלם"
            });
            console.log("✅ הליד עודכן ל'הושלם'");
            queryClient.invalidateQueries({ queryKey: ['leads'] });
          }
          
          await supabase.entities.Job.update(updatedJob.id, {
            internal_done_stocked: true,
            end_time: new Date().toISOString()
          });
          
          toast({ 
            title: "✓ העבודה הושלמה והמ מלאי עודכן!", 
            description: `${installer?.full_name || 'העובד'} חזר לסטטוס פנוי` 
          });

          console.log("==== J2 END ====");
          
        } catch (error) {
          console.error("❌ שגיאה ב-J2:", error);
          toast({ 
            title: "שגיאה בעדכונים", 
            description: error.message,
            variant: "destructive" 
          });
          throw error;
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId) => supabase.entities.Job.delete(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({ title: "✓ העבודה נמחקה", variant: "destructive" });
    },
    onError: (error) => {
      toast({ 
        title: "שגיאה במחיקת עבודה", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  const handleDelete = (job) => {
    if (!user || user.role !== "admin") {
      toast({ 
        title: "אין הרשאה", 
        description: "רק מנהל יכול למחוק עבודות", 
        variant: "destructive" 
      });
      return;
    }
    
    if (confirm(`האם למחוק את העבודה של ${job.customer_name}?`)) {
      deleteMutation.mutate(job.id);
    }
  };

  const findQuoteForJob = (job) => {
    // Method 1: Direct quote_id on job
    if (job.quote_id) {
      const q = quotes.find(q => q.id === job.quote_id);
      if (q) return q;
    }
    // Method 2: Through lead
    if (job.lead_id) {
      const lead = leads.find(l => l.id === job.lead_id);
      if (lead?.quote_id) {
        const q = quotes.find(q => q.id === lead.quote_id);
        if (q) return q;
      }
    }
    // Method 3: By customer phone
    if (job.customer_phone) {
      const q = quotes.find(q => q.customer_phone === job.customer_phone && q.status !== "בוטלה");
      if (q) return q;
    }
    return null;
  };

  const handleCompleteJob = async (job) => {
    console.log("✅ עובד לוחץ סיימתי - מתחיל תהליך");

    const quote = findQuoteForJob(job);
    console.log("📄 הצעת מחיר:", quote ? `נמצאה (#${quote.serial_number})` : "לא נמצאה - ממשיך עם פריטי העבודה");

    setSelectedJob(job);
    setQuoteItems(quote?.items || job.items || []);
    setCustomItems([]);
    setShowQuoteDialog(true);
  };

  const addCustomItem = () => {
    setCustomItems([...customItems, { name: "", quantity: 1, price: 0, is_custom: true }]);
  };

  const removeCustomItem = (index) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  const updateCustomItem = (index, field, value) => {
    const newItems = [...customItems];
    newItems[index][field] = field === 'quantity' || field === 'price' ? (parseFloat(value) || 0) : value;
    setCustomItems(newItems);
  };

  const handleUpdateQuote = async () => {
    if (!selectedJob) return;

    const isValid = customItems.every(item =>
      item.name && item.name.trim() !== "" && item.quantity > 0 && item.price >= 0
    );

    if (!isValid) {
      toast({
        title: "שדות חסרים",
        description: "נא למלא את כל פרטי המוצרים החופשיים",
        variant: "destructive"
      });
      return;
    }

    try {
      const quote = findQuoteForJob(selectedJob);
      const allJobItems = [...quoteItems, ...customItems];
      const sub_total = allJobItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const vat = sub_total / 1.17 * 0.17;
      const grand_total = sub_total;

      if (quote) {
        // If the quote was already paid/approved, create a new supplementary quote
        if (quote.status === "אושרה") {
          // Create new quote only with the custom (extra) items
          if (customItems.length > 0) {
            const extraTotal = customItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            const extraVat = extraTotal / 1.17 * 0.17;

            // Generate serial number for new quote
            const allQuotes = await supabase.entities.Quote.list();
            const maxSerial = allQuotes.reduce((max, q) => {
              if (q.serial_number && q.serial_number.startsWith('3')) {
                const num = parseInt(q.serial_number.substring(1), 10);
                if (!isNaN(num)) return num > max ? num : max;
              }
              return max;
            }, 0);
            const newSerial = `3${String(maxSerial + 1).padStart(4, '0')}`;

            await supabase.entities.Quote.create({
              lead_id: selectedJob.lead_id || null,
              customer_name: quote.customer_name,
              customer_phone: quote.customer_phone,
              customer_email: quote.customer_email || "",
              items: customItems,
              sub_total: extraTotal,
              vat: extraVat,
              grand_total: extraTotal,
              status: "טיוטה",
              serial_number: newSerial,
              valid_until: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
            });

            toast({ title: "✓ נוצרה הצעת מחיר נוספת למוצרים החדשים" });
          }
        } else {
          // Quote not yet paid - add items directly to existing quote
          await supabase.entities.Quote.update(quote.id, {
            ...quote,
            items: allJobItems,
            sub_total,
            vat,
            grand_total
          });
        }

        queryClient.invalidateQueries({ queryKey: ['quotes'] });
      }

      // סמן את העבודה כבוצעת
      await updateMutation.mutateAsync({
        id: selectedJob.id,
        data: {
          ...selectedJob,
          status: "בוצע",
          items: allJobItems,
          internal_done_stocked: false
        }
      });

      setShowQuoteDialog(false);

      toast({
        title: "✓ העבודה הושלמה!",
        description: quote?.status === "אושרה" && customItems.length > 0
          ? "נוצרה הצעת מחיר חדשה למוצרים הנוספים"
          : quote ? "הצעת המחיר עודכנה בהצלחה" : "העבודה הושלמה"
      });

    } catch (error) {
      toast({
        title: "שגיאה בעדכון",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSendPaymentLink = () => {
    if (!selectedJob) return;
    
    const lead = leads.find(l => l.id === selectedJob?.lead_id);
    if (!lead) {
      toast({ title: "שגיאה", description: "לא נמצא ליד", variant: "destructive" });
      return;
    }

    const quote = quotes.find(q => q.id === lead.quote_id);
    if (!quote || !quote.payment_link) {
      toast({ title: "שגיאה", description: "לא נמצא לינק תשלום", variant: "destructive" });
      return;
    }
    
    const message = `שלום ${lead.customer_name},\n\nסיימנו את העבודה! 🎉\n\n*סה"כ לתשלום: ₪${quote.grand_total.toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}*\n*(שולם כבר: ₪${(lead?.actual_value || 0).toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})})*\n\n*נשאר לתשלום: ₪${(quote.grand_total - (lead?.actual_value || 0)).toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}*\n\n💳 *לתשלום מאובטח לחץ כאן:*\n${quote.payment_link}\n\nתודה שבחרתם בנו! 🙏`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${lead.customer_phone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast({ title: "✓ וואטסאפ נפתח", description: "ההודעה מוכנה לשליחה" });
  };

  const handleCopyLink = () => {
    const lead = leads.find(l => l.id === selectedJob?.lead_id);
    const quote = quotes.find(q => q.id === lead?.quote_id);
    if (quote?.payment_link) {
      navigator.clipboard.writeText(quote.payment_link);
      setCopiedLink(true);
      toast({ title: "✓ הלינק הועתק", description: "הלינק הועתק ללוח" });
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleStatusChange = (job, newStatus) => {
    if (newStatus === 'בוצע') {
      handleCompleteJob(job);
    } else {
      updateMutation.mutate({
        id: job.id,
        data: {
          status: newStatus
        }
      });
    }
  };

  const handleImageUpload = async (job, type) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const { file_url } = await supabase.integrations.Core.UploadFile({ file });
          
          const images = type === 'before' ? job.before_images || [] : job.after_images || [];
          const updatedImages = [...images, file_url];
          
          await updateMutation.mutateAsync({
            id: job.id,
            data: {
              [type === 'before' ? 'before_images' : 'after_images']: updatedImages
            }
          });
          
          toast({ title: "✓ התמונה הועלתה" });
        } catch (error) {
          toast({ title: "שגיאה בהעלאת תמונה", variant: "destructive" });
        }
      }
    };
    input.click();
  };

  const statusColors = {
    "פתוח": "bg-blue-100 text-blue-800",
    "בדרך": "bg-orange-100 text-orange-800",
    "בוצע": "bg-green-100 text-green-800",
    "נדחה": "bg-red-100 text-red-800"
  };

  const filteredJobs = statusFilter === "all" 
    ? jobs 
    : jobs.filter(j => j.status === statusFilter);

  const myJobs = user?.role_type === "איש צוות" 
    ? filteredJobs.filter(j => j.installer_email === user.email)
    : filteredJobs;

  const isAdmin = user?.role === "admin";

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <CheckSquare className="w-10 h-10 text-blue-600" />
            עבודות טיפול
          </h1>
          <p className="text-slate-600">
            {user?.role_type === "איש צוות" 
              ? `העבודות שלי (${myJobs.length})`
              : `מעקב אחר עבודות בשטח (${jobs.length})`
            }
          </p>
        </motion.div>

        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="grid w-full grid-cols-5 bg-slate-100">
              <TabsTrigger value="all">הכל ({jobs.length})</TabsTrigger>
              <TabsTrigger value="פתוח">פתוח ({jobs.filter(j => j.status === "פתוח").length})</TabsTrigger>
              <TabsTrigger value="בדרך">בדרך ({jobs.filter(j => j.status === "בדרך").length})</TabsTrigger>
              <TabsTrigger value="בוצע">בוצע ({jobs.filter(j => j.status === "בוצע").length})</TabsTrigger>
              <TabsTrigger value="נדחה">נדחה ({jobs.filter(j => j.status === "נדחה").length})</TabsTrigger>
            </TabsList>
          </Tabs>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {myJobs.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-xl transition-all border-none bg-white">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <CardTitle className="text-lg">{job.customer_name}</CardTitle>
                        <Badge className={statusColors[job.status]}>{job.status}</Badge>
                      </div>
                      <Badge variant="outline">{job.service_type}</Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        {job.installation_address}
                      </div>
                      {job.installer_name && (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-slate-600">
                            <UserIcon className="w-4 h-4 text-blue-600" />
                            <span>איש צוות: {job.installer_name}</span>
                          </div>
                          {isAdmin && job.status !== "בוצע" && job.status !== "נדחה" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenChangeInstaller(job)}
                              className="h-7 px-2 text-xs hover:bg-blue-50"
                            >
                              <RefreshCw className="w-3 h-3 ml-1" />
                              החלף
                            </Button>
                          )}
                        </div>
                      )}
                      {job.start_time && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Clock className="w-4 h-4 text-blue-600" />
                          {new Date(job.start_time).toLocaleString('he-IL')}
                        </div>
                      )}
                      {job.items && job.items.length > 0 && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Package className="w-4 h-4 text-green-600" />
                          {job.items.length} פריטים בעבודה
                        </div>
                      )}
                    </div>

                    {job.status !== "בוצע" && job.status !== "נדחה" && (
                      <div className="flex gap-2">
                        {job.status === "פתוח" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(job, "בדרך")}
                            className="flex-1"
                          >
                            {settings?.job_start_button_text || "🚗 יצאתי לדרך"}
                          </Button>
                        )}
                        {job.status === "בדרך" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(job, "בוצע")}
                            className="flex-1 bg-green-50 hover:bg-green-100"
                          >
                            ✓ סיימתי
                          </Button>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageUpload(job, 'before')}
                        className="flex-1"
                      >
                        <Camera className="w-4 h-4 ml-2" />
                        לפני ({job.before_images?.length || 0})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImageUpload(job, 'after')}
                        className="flex-1"
                      >
                        <Camera className="w-4 h-4 ml-2" />
                        אחרי ({job.after_images?.length || 0})
                      </Button>
                    </div>

                    {isAdmin && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(job)}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 ml-2" />
                        מחק עבודה
                      </Button>
                    )}

                    {job.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
                        {job.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {myJobs.length === 0 && (
          <Card className="p-12 text-center border-none shadow-lg bg-white">
            <CheckSquare className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין עבודות להצגה</h3>
            <p className="text-slate-500">
              {user?.role_type === "איש צוות" 
                ? "אין עבודות שהוקצו לך כרגע"
                : "עבודות יווצרו אוטומטית כאשר לידים יאושרו"
              }
            </p>
          </Card>
        )}
      </div>

      {/* דיאלוג החלפת איש צוות */}
      <Dialog open={showChangeInstallerDialog} onOpenChange={setShowChangeInstallerDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>החלפת איש צוות - {jobToChangeInstaller?.customer_name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-sm text-slate-600">איש צוות נוכחי:</p>
              <p className="font-semibold">{jobToChangeInstaller?.installer_name}</p>
            </div>

            <div className="space-y-2">
              <Label>בחר איש צוות חדש</Label>
              <Select value={newInstallerId} onValueChange={setNewInstallerId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר איש צוות..." />
                </SelectTrigger>
                <SelectContent>
                  {installers.map(installer => (
                    <SelectItem 
                      key={installer.id} 
                      value={installer.id}
                      disabled={installer.email === jobToChangeInstaller?.installer_email}
                    >
                      {installer.full_name} - {installer.availability_status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
              <p className="font-semibold mb-1">שים לב:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>איש צוות החדש יעבור לסטטוס "בטיפול"</li>
                <li>איש צוות הישן יחזור ל"פנוי" (אם אין לו עבודות נוספות)</li>
                <li>כל המדדים יתעדכנו בהתאם</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeInstallerDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleChangeInstaller}
              disabled={changeInstallerMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {changeInstallerMutation.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : null}
              אשר החלפה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* דיאלוג עריכת הצעת מחיר */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">עדכון הצעת מחיר - {selectedJob?.customer_name}</DialogTitle>
            {(() => {
              const lead = leads.find(l => l.id === selectedJob?.lead_id);
              const quote = lead ? quotes.find(q => q.id === lead.quote_id) : null;
              if (quote?.status === "אושרה") {
                return (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mt-2">
                    ההצעה המקורית כבר אושרה/שולמה. מוצרים חדשים שתוסיף ייצרו הצעת מחיר נפרדת.
                  </p>
                );
              }
              return null;
            })()}
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <h3 className="font-semibold mb-2">פריטים מההצעה המקורית:</h3>
              {quoteItems.length > 0 ? (
                quoteItems.map((item, index) => (
                  <div key={index} className="flex justify-between p-3 bg-slate-100 rounded-lg mb-2 text-sm">
                    <span>{item.name} ({item.quantity} יח')</span>
                    <span>₪{(item.price * item.quantity).toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-500 text-sm">אין פריטים בהצעה המקורית.</p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">מוצרים חופשיים (תוספות שהותקנו בפועל):</h3>
                <Button onClick={addCustomItem} variant="outline" size="sm">
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף מוצר חופשי
                </Button>
              </div>

              {customItems.map((item, index) => (
                <Card key={index} className="p-4 mb-3 bg-blue-50">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>תיאור המוצר <span className="text-red-500">*</span></Label>
                      <Input
                        value={item.name}
                        onChange={(e) => updateCustomItem(index, 'name', e.target.value)}
                        placeholder="שם המוצר..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>כמות <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateCustomItem(index, 'quantity', e.target.value)}
                          min={1}
                        />
                      </div>
                      <div>
                        <Label>מחיר יחידה (ש"ח) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => updateCustomItem(index, 'price', e.target.value)}
                          min={0}
                          step={0.01}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button 
                        onClick={() => removeCustomItem(index)} 
                        variant="destructive" 
                        size="sm"
                        className="flex gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        מחק פריט
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}

              <div className="flex justify-end gap-2 mt-4">
                <Button 
                  onClick={handleUpdateQuote}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  עדכן הצעת מחיר
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
