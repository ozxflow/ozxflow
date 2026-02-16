import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Edit, Send, Copy, Check, Loader2, FileCheck, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

export default function QuoteView({ quote, onBack, onEdit }) {
    const { toast } = useToast();
    const [copiedLink, setCopiedLink] = useState(false);
    
    const statusColors = {
        "טיוטה": "bg-gray-200 text-gray-800",
        "נשלחה": "bg-blue-200 text-blue-800",
        "אושרה": "bg-green-200 text-green-800",
        "בוטלה": "bg-red-200 text-red-800"
    };

    // 🔥 רענון אוטומטי של ההצעה - רק אם אין עדיין payment_link וחשבונית
    const { data: refreshedQuote } = useQuery({
        queryKey: ['quote-refresh', quote.id],
        queryFn: async () => {
            console.log("🔄 מרענן הצעה...");
            const { data: quotes } = await supabase
                .from('Quote')
                .select('*')
                .eq('id', quote.id);
            
            if (quotes.length > 0) {
                const updatedQuote = quotes[0];
                console.log("📋 הצעה מרוענת:", {
                    id: updatedQuote.id,
                    payment_link: updatedQuote.payment_link ? "✅ יש" : "❌ אין",
                    cardcom_invoice_url: updatedQuote.cardcom_invoice_url ? "✅ יש" : "❌ אין"
                });
                return updatedQuote;
            }
            
            return null;
        },
        enabled: !quote.payment_link && !quote.cardcom_invoice_url && !quote.invoice_id,
        refetchInterval: 3000,
        refetchIntervalInBackground: true,
        initialData: quote
    });

    // 🔥 בדיקה פשוטה - אם יש invoice_id, טוען חשבונית
    const { data: invoiceData } = useQuery({
        queryKey: ['invoice', refreshedQuote?.invoice_id],
        queryFn: async () => {
            if (!refreshedQuote?.invoice_id) return null;
            
            console.log("🔍 טוען חשבונית:", refreshedQuote.invoice_id);
            const { data: invoices } = await supabase
                .from('Invoice')
                .select('*')
                .eq('id', refreshedQuote.invoice_id);
            
            if (invoices.length > 0 && invoices[0].cardcom_invoice_url) {
                console.log("✅ חשבונית נמצאה:", invoices[0].serial_number);
                return invoices[0];
            }
            
            return null;
        },
        enabled: !!refreshedQuote?.invoice_id,
        refetchInterval: false
    });

    const handleSendWhatsApp = () => {
        const currentQuote = refreshedQuote || quote;
        
        let message = ` *הצעת מחיר - CRM*\n\n`;
        message += `שלום ${currentQuote.customer_name},\n\n`;
        message += `להלן הצעת המחיר שלך:\n\n`;
        message += `*מספר הצעה:* ${currentQuote.serial_number || `Q-${currentQuote.id.slice(0, 5)}`}\n`;
        message += `*תאריך:* ${format(new Date(currentQuote.created_date), "dd/MM/yyyy")}\n`;
        message += `*תוקף עד:* ${currentQuote.valid_until ? format(new Date(currentQuote.valid_until), "dd/MM/yyyy") : 'לא מוגדר'}\n\n`;
        
        message += `*פירוט פריטים:*\n`;
        currentQuote.items?.forEach((item, index) => {
            message += `${index + 1}. ${item.name}\n`;
            message += `   כמות: ${item.quantity} | מחיר: ₪${item.price?.toLocaleString()}\n`;
            message += `   סה"כ: ₪${(item.quantity * item.price).toLocaleString()}\n`;
        });
        
        message += `\n*סיכום מחירים:*\n`;
        message += `סה"כ לפני מע"מ: ₪${currentQuote.sub_total?.toLocaleString() || 0}\n`;
        if (currentQuote.discount > 0) {
            message += `הנחה: -₪${currentQuote.discount?.toLocaleString()}\n`;
        }
        message += `מע"מ (17%): ₪${currentQuote.vat?.toLocaleString() || 0}\n`;
        message += `*סה"כ לתשלום: ₪${currentQuote.grand_total?.toLocaleString() || 0}*\n\n`;
        
        if (currentQuote.payment_link) {
            message += `💳 *לתשלום מאובטח לחץ כאן:*\n${currentQuote.payment_link}\n\n`;
        } else {
            message += `💳 לתשלום - נא לפנות אלינו\n\n`;
        }
        
        message += `תודה שבחרתם בנו! 🙏\n`;
        message += `לשאלות נוספות, אנחנו כאן בשבילכם.`;
        
        const encodedMessage = encodeURIComponent(message);
        const phone = currentQuote.customer_phone?.replace(/[^0-9]/g, '');
        
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
            description: "ההודעה מוכנה לשליחה עם לינק התשלום"
        });
    };

    const handleCopyLink = () => {
        const currentQuote = refreshedQuote || quote;
        if (currentQuote.payment_link) {
            navigator.clipboard.writeText(currentQuote.payment_link);
            setCopiedLink(true);
            toast({ title: "✓ הלינק הועתק", description: "הלינק הועתק ללוח" });
            setTimeout(() => setCopiedLink(false), 2000);
        }
    };

    // 🔥🔥🔥 השתמש בהצעה המרוענת
    const currentQuote = refreshedQuote || quote;
    
    // 🔥🔥🔥 קריטי! בדיקה אם יש חשבונית - קודם כל בהצעה עצמה, אחר כך מ-Invoice entity
    const invoiceUrl = currentQuote.cardcom_invoice_url || invoiceData?.cardcom_invoice_url;

    if (invoiceUrl) {
        console.log("✅ מציג חשבונית! URL:", invoiceUrl);
        return (
            <div className="p-4 md:p-8 bg-slate-100 min-h-screen" dir="rtl">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <Button variant="outline" onClick={onBack} className="bg-gray-100 hover:bg-gray-200">
                            <ArrowRight className="w-4 h-4 ml-2" />
                            חזור לרשימה
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                        <div className="lg:col-span-1 space-y-4">
                            <Card className="shadow-xl bg-white">
                                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                                    <div className="flex items-center gap-2">
                                        <FileCheck className="w-6 h-6" />
                                        <h2 className="text-xl font-bold">תשלום אושר!</h2>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="bg-green-50 p-4 rounded-lg text-center">
                                        <p className="text-green-800 font-bold text-lg mb-2">✓ העסקה בוצעה בהצלחה</p>
                                        <p className="text-green-600 text-sm">החשבונית מוכנה לצפייה</p>
                                    </div>

                                    <div>
                                        <p className="text-sm text-slate-500 mb-1">לקוח</p>
                                        <p className="font-semibold text-lg">{currentQuote.customer_name}</p>
                                    </div>
                                    
                                    <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">סה"כ ששולם:</span>
                                            <span className="font-bold">₪{currentQuote.grand_total?.toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-3">
                            <Card className="shadow-2xl overflow-hidden h-[800px]">
                                <iframe 
                                    src={invoiceUrl} 
                                    className="w-full h-full border-0" 
                                    title="Invoice"
                                />
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 🔥 אם יש payment_link - הצג IFRAME במסך מלא עם כפתורים בראש
    if (currentQuote.payment_link) {
        return (
            <div className="min-h-screen bg-white" dir="rtl">
                {/* Header עם כפתורים */}
                <div className="bg-slate-50 border-b p-4 flex flex-wrap gap-3 items-center justify-between">
                    <Button variant="outline" onClick={onBack} className="bg-white hover:bg-gray-100">
                        <ArrowRight className="w-4 h-4 ml-2" />
                        חזור לרשימה
                    </Button>
                    
                    <div className="flex gap-2 items-center">
                        <div className="text-sm font-semibold text-slate-700 hidden md:block">
                            {currentQuote.customer_name} | סה"כ: ₪{currentQuote.grand_total?.toLocaleString('he-IL', {minimumFractionDigits: 0, maximumFractionDigits: 0})}
                        </div>
                        
                        <Button 
                            onClick={handleSendWhatsApp}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                        >
                            <Share2 className="w-4 h-4 ml-2" />
                            שלח בוואטסאפ
                        </Button>
                        
                        <Button 
                            onClick={handleCopyLink}
                            variant="outline"
                            size="sm"
                        >
                            {copiedLink ? <Check className="w-4 h-4 ml-2" /> : <Copy className="w-4 h-4 ml-2" />}
                            {copiedLink ? 'הועתק!' : 'העתק לינק'}
                        </Button>
                    </div>
                </div>

                {/* Iframe מלא */}
                <iframe 
                    src={currentQuote.payment_link} 
                    className="w-full border-0" 
                    style={{ height: 'calc(100vh - 80px)' }}
                    title="Cardcom Payment Gateway"
                    allow="payment"
                />
            </div>
        );
    }

    // 🔥 אם אין payment_link ואין חשבונית - הצג את ההצעה הרגילה
    return (
        <div className="p-4 md:p-8 bg-slate-100 min-h-screen" dir="rtl">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <Button variant="outline" onClick={onBack} className="bg-gray-100 hover:bg-gray-200">
                        <ArrowRight className="w-4 h-4 ml-2" />
                        חזור לרשימה
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onEdit(currentQuote)} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
                            <Edit className="w-4 h-4 ml-2" /> ערוך
                        </Button>
                    </div>
                </div>

                <Card className="shadow-2xl">
                    <CardHeader className="bg-slate-800 text-white rounded-t-lg p-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-4xl font-bold mb-2">הצעת מחיר</h1>
                                <p className="text-slate-300">#{currentQuote.serial_number || `Q-${currentQuote.id.slice(0,5)}`}</p>
                            </div>
                            <div className="text-right">
                                <h2 className="text-2xl font-semibold">CRM Richecom</h2>
                                <p className="text-slate-300">תהליך אישי לבניית חנות שמוכרת</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h3 className="font-semibold text-slate-500 mb-2">לכבוד</h3>
                                <p className="font-bold text-lg text-slate-800">{currentQuote.customer_name}</p>
                                {currentQuote.customer_phone && (
                                    <p className="text-sm text-slate-600">טלפון: {currentQuote.customer_phone}</p>
                                )}
                                {currentQuote.customer_email && (
                                    <p className="text-sm text-slate-600">אימייל: {currentQuote.customer_email}</p>
                                )}
                            </div>
                            <div className="text-left">
                                <p><span className="font-semibold">תאריך:</span> {format(new Date(currentQuote.created_date), "dd/MM/yyyy")}</p>
                                <p><span className="font-semibold">תוקף:</span> {currentQuote.valid_until ? format(new Date(currentQuote.valid_until), "dd/MM/yyyy") : 'N/A'}</p>
                                <Badge className={`${statusColors[currentQuote.status]} mt-2 text-lg`}>{currentQuote.status}</Badge>
                            </div>
                        </div>

                        <table className="w-full text-right mb-8">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="p-3 font-semibold">פריט</th>
                                    <th className="p-3 font-semibold">כמות</th>
                                    <th className="p-3 font-semibold">מחיר יחידה</th>
                                    <th className="p-3 font-semibold text-left">סה"כ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentQuote.items?.map((item, index) => (
                                    <tr key={index} className="border-b">
                                        <td className="p-3">{item.name}</td>
                                        <td className="p-3">{item.quantity}</td>
                                        <td className="p-3">₪{item.price?.toLocaleString()}</td>
                                        <td className="p-3 text-left">₪{(item.quantity * item.price).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className="flex justify-end">
                            <div className="w-1/2 space-y-2">
                                <div className="flex justify-between">
                                    <span>סה"כ לפני מע"מ:</span>
                                    <span>₪{currentQuote.sub_total?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>הנחה:</span>
                                    <span>-₪{currentQuote.discount?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>מע"מ (17%):</span>
                                    <span>₪{currentQuote.vat?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl border-t pt-2">
                                    <span>סה"כ לתשלום:</span>
                                    <span>₪{currentQuote.grand_total?.toLocaleString() || 0}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-slate-50 p-8 rounded-b-lg">
                        <p className="text-xs text-slate-500">
                            תודה שבחרתם בנו! ניתן לשלם באמצעות הקישור המצורף למייל/וואטסאפ.
                            המחירים כוללים מע"מ כחוק. תנאי תשלום: שוטף + 0.
                        </p>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
