import React, { useMemo, useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, CreditCard, ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { PLAN_NAMES } from "@/lib/planFeatures";

function formatPlanPrice(plan) {
  if (plan.id === "free") return "חינם";
  if (plan.id === "enterprise") return "מותאם אישית";

  const setup = Number(plan.setup_cost || 0).toLocaleString("he-IL");
  const monthly = Number(plan.price_per_user || 0).toLocaleString("he-IL");
  return `${setup}₪ הקמה + ${monthly}₪ למשתמש`;
}

export default function RenewSubscription() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["renew", "currentUser"],
    queryFn: () => supabase.auth.me(),
  });

  const { data: plans = [], isLoading: isPlansLoading } = useQuery({
    queryKey: ["renew", "plans"],
    queryFn: () => supabase.org.listPlans(),
  });

  const visiblePlans = useMemo(
    () => plans.filter((p) => ["free", "starter", "growth", "premium"].includes(p.id)),
    [plans],
  );

  if (isUserLoading || isPlansLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-blue-600" />
              חידוש ושדרוג מנוי
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-700 space-y-2">
            <p>
              תכנית נוכחית: <strong>{PLAN_NAMES[user?.org?.plan] || user?.org?.plan || "לא מוגדרת"}</strong>
            </p>
            <p>
              תאריך סיום: <strong>{user?.org?.subscription_end_date ? new Date(user.org.subscription_end_date).toLocaleDateString("he-IL") : "לא מוגדר"}</strong>
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {visiblePlans.map((plan) => {
            const isCurrent = user?.org?.plan === plan.id;
            const isPopular = plan.id === "growth";
            return (
              <Card key={plan.id} className={`border-none shadow-md ${isPopular ? "ring-2 ring-emerald-500" : ""}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{PLAN_NAMES[plan.id] || plan.name_he || plan.name}</CardTitle>
                    {isCurrent ? <Badge variant="secondary">נוכחית</Badge> : null}
                  </div>
                  {isPopular ? <Badge className="w-fit bg-emerald-100 text-emerald-700">הנמכרת ביותר</Badge> : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-semibold text-slate-900">{formatPlanPrice(plan)}</p>
                  <p className="text-sm text-slate-600">עד {plan.max_leads_per_month} לידים בחודש</p>
                  <p className="text-sm text-slate-600">עד {plan.max_users === -1 ? "ללא הגבלה" : plan.max_users} משתמשים</p>

                  <Button
                    className="w-full"
                    disabled={plan.id === "free" || (!plan.setup_payment_url && !plan.monthly_payment_url)}
                    onClick={() => {
                      setSelectedPlan(plan);
                      setCheckoutOpen(true);
                    }}
                  >
                    <CreditCard className="w-4 h-4 ml-2" />
                    לתשלום החבילה
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              תשלום חבילת {selectedPlan ? (PLAN_NAMES[selectedPlan.id] || selectedPlan.name_he || selectedPlan.name) : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              תהליך התשלום בנוי בשני שלבים: הקמה חד-פעמית ולאחריה מנוי חודשי.
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">שלב 1 - תשלום הקמה</span>
                <CheckCircle2 className={`w-4 h-4 ${selectedPlan?.setup_payment_url ? "text-green-600" : "text-slate-300"}`} />
              </div>
              <Button
                className="w-full mt-3"
                variant="outline"
                disabled={!selectedPlan?.setup_payment_url}
                onClick={() => window.open(selectedPlan.setup_payment_url, "_blank", "noopener,noreferrer")}
              >
                מעבר לתשלום הקמה
              </Button>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-slate-400" />
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">שלב 2 - הפעלת מנוי חודשי</span>
                <CheckCircle2 className={`w-4 h-4 ${selectedPlan?.monthly_payment_url ? "text-green-600" : "text-slate-300"}`} />
              </div>
              <Button
                className="w-full mt-3"
                disabled={!selectedPlan?.monthly_payment_url}
                onClick={() => window.open(selectedPlan.monthly_payment_url, "_blank", "noopener,noreferrer")}
              >
                מעבר למנוי חודשי
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
