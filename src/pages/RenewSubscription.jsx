import React, { useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RenewSubscription() {
  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await supabase.functions.invoke('sendSubscriptionRenewal', {
        full_name: user.full_name,
        phone: user.phone,
        email: user.email,
        current_end_date: user.subscription_end_date
      });

      toast({
        title: "✓ בקשה נשלחה!",
        description: "נציג יצור איתך קשר בהקדם"
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-6" dir="rtl">
      <Card className="max-w-md w-full shadow-2xl">
        <CardHeader className="text-center bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-t-lg">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" />
          <CardTitle className="text-2xl">המנוי שלך פג</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-6 text-center">
            <p className="text-slate-700 mb-2">
              כדי להמשיך להשתמש במערכת, יש לחדש את המנוי
            </p>
            <p className="text-sm text-slate-500">
              תאריך סיום: {user.subscription_end_date ? new Date(user.subscription_end_date).toLocaleDateString('he-IL') : 'לא הוגדר'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>שם מלא</Label>
              <Input value={user.full_name || ''} disabled />
            </div>
            
            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input value={user.phone || ''} disabled />
            </div>

            {user.email && (
              <div className="space-y-2">
                <Label>אימייל</Label>
                <Input value={user.email} disabled />
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : null}
              שלח בקשה לחידוש מנוי
            </Button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
            💡 לאחר שליחת הבקשה, נציג יצור איתך קשר בהקדם לחידוש המנוי
          </div>
        </CardContent>
      </Card>
    </div>
  );
}