import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Gift, Copy, Users, TrendingUp, Wallet, Loader2 } from "lucide-react";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("he-IL");
}

export default function Referrals() {
  const { toast } = useToast();

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["referrals", "user"],
    queryFn: () => supabase.auth.me(),
  });

  const { data: refCode, isLoading: isRefLoading } = useQuery({
    queryKey: ["referrals", "code"],
    queryFn: () => supabase.org.getOrCreateReferralCode(),
    enabled: !!user?.org_id,
  });

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["referrals", "stats"],
    queryFn: () => supabase.org.getReferralStats(),
    enabled: !!user?.org_id,
  });

  const { data: wallet, isLoading: isWalletLoading } = useQuery({
    queryKey: ["referrals", "wallet"],
    queryFn: () => supabase.org.getWalletInfo(),
    enabled: !!user?.org_id,
  });

  const { data: referrals = [], isLoading: isListLoading } = useQuery({
    queryKey: ["referrals", "list"],
    queryFn: () => supabase.org.listReferrals(),
    enabled: !!user?.org_id,
  });

  const shareUrl = useMemo(() => {
    if (!refCode) return "";
    return `${window.location.origin}/signup?ref=${encodeURIComponent(refCode)}`;
  }, [refCode]);

  const isLoading =
    isUserLoading || isRefLoading || isStatsLoading || isWalletLoading || isListLoading;

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast({ title: "לינק הועתק", description: shareUrl });
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-purple-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">חבר מביא חבר</h1>
            <p className="text-slate-600">שתף את הלינק האישי שלך וקבל קרדיטים לארנק המערכת.</p>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">הלינק האישי שלך</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <div className="rounded-lg border bg-white p-3 text-sm break-all">{shareUrl || "לא זמין כרגע"}</div>
                <Button onClick={copyLink} disabled={!shareUrl}>
                  <Copy className="w-4 h-4 ml-2" />
                  העתק לינק שיתוף
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">סה״כ נרשמו דרך הלינק</p>
                <p className="text-2xl font-bold">{stats?.total_signups || 0}</p>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">שדרגו לחבילה בתשלום</p>
                <p className="text-2xl font-bold">{stats?.total_upgraded || 0}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </CardContent>
          </Card>
          <Card className="border-none shadow-md">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">יתרת קרדיטים בארנק</p>
                <p className="text-2xl font-bold">₪{Number(wallet?.credit_balance || 0).toLocaleString("he-IL")}</p>
              </div>
              <Wallet className="w-6 h-6 text-purple-600" />
            </CardContent>
          </Card>
        </div>

        <Card className="border-none shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">נרשמים מהלינק שלך</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right py-2">קוד</th>
                    <th className="text-right py-2">סטטוס</th>
                    <th className="text-right py-2">סוג מקור</th>
                    <th className="text-right py-2">תאריך הרשמה</th>
                    <th className="text-right py-2">תאריך שדרוג</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="py-2 font-mono">{row.ref_code}</td>
                      <td className="py-2">
                        <Badge variant="secondary">{row.status}</Badge>
                      </td>
                      <td className="py-2">{row.source_type}</td>
                      <td className="py-2">{formatDate(row.signup_at)}</td>
                      <td className="py-2">{formatDate(row.upgraded_at)}</td>
                    </tr>
                  ))}
                  {referrals.length === 0 && (
                    <tr>
                      <td className="py-4 text-center text-slate-500" colSpan={5}>
                        עדיין אין נרשמים דרך הלינק שלך.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
