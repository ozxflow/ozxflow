import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Building2,
  Users,
  BarChart3,
  Pencil,
  Loader2,
  Save,
  UserPlus,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "@/api/base44Client";
import { PLAN_NAMES, ALL_PLANS } from "@/lib/planFeatures";

const PLAN_COLORS = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-green-100 text-green-700",
  premium: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function SuperAdmin() {
  const queryClient = useQueryClient();

  // Edit org state
  const [editOrg, setEditOrg] = useState(null);
  const [editPlan, setEditPlan] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [editSubEndDate, setEditSubEndDate] = useState("");
  const [editAutoRenew, setEditAutoRenew] = useState(false);
  const [editAutoRenewMonths, setEditAutoRenewMonths] = useState(1);

  // Add client state
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({
    businessName: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    plan: "free",
  });
  const [addError, setAddError] = useState("");

  // Fetch organizations
  const {
    data: orgs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["superadmin", "orgs"],
    queryFn: () => supabase.superAdmin.listOrgs(),
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: ({ orgId, plan }) =>
      supabase.superAdmin.updatePlan(orgId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "orgs"] });
    },
  });

  // Toggle org active/inactive mutation
  const toggleOrgMutation = useMutation({
    mutationFn: ({ orgId, active }) =>
      supabase.superAdmin.toggleOrg(orgId, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "orgs"] });
    },
  });

  // Add client mutation
  const addClientMutation = useMutation({
    mutationFn: async (client) => {
      return await supabase.superAdmin.createClient(client);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "orgs"] });
      setShowAddClient(false);
      setNewClient({ businessName: "", fullName: "", email: "", phone: "", password: "", plan: "free" });
      setAddError("");
    },
    onError: (err) => {
      setAddError(err.message || "שגיאה ביצירת הלקוח");
    },
  });

  const handleOpenEdit = (org) => {
    setEditOrg(org);
    setEditPlan(org.plan || "free");
    setEditActive(org.is_active !== false);
    setEditNotes(org.notes || "");
    setEditSubEndDate(org.subscription_end_date ? new Date(org.subscription_end_date).toISOString().split('T')[0] : "");
    setEditAutoRenew(org.auto_renew || false);
    setEditAutoRenewMonths(org.auto_renew_months || 1);
  };

  const handleSave = async () => {
    if (!editOrg) return;

    try {
      if (editPlan !== editOrg.plan) {
        await updatePlanMutation.mutateAsync({
          orgId: editOrg.id,
          plan: editPlan,
        });
      }

      if (editActive !== (editOrg.is_active !== false)) {
        await toggleOrgMutation.mutateAsync({
          orgId: editOrg.id,
          active: editActive,
        });
      }

      // עדכון שדות מנוי
      await supabase.superAdmin.updateOrg(editOrg.id, {
        subscription_end_date: editSubEndDate || null,
        auto_renew: editAutoRenew,
        auto_renew_months: editAutoRenewMonths,
        notes: editNotes,
      });

      queryClient.invalidateQueries({ queryKey: ["superadmin", "orgs"] });
      setEditOrg(null);
    } catch (err) {
      console.error("Error saving org:", err);
    }
  };

  const handleAddClient = () => {
    setAddError("");
    if (!newClient.businessName || !newClient.fullName || !newClient.email || !newClient.password) {
      setAddError("יש למלא את כל השדות החובה");
      return;
    }
    if (newClient.password.length < 6) {
      setAddError("סיסמה חייבת להכיל לפחות 6 תווים");
      return;
    }
    addClientMutation.mutate(newClient);
  };

  const isSaving = updatePlanMutation.isPending || toggleOrgMutation.isPending;

  // Compute stats
  const totalOrgs = orgs.length;
  const totalUsers = orgs.reduce((sum, org) => sum + (org.member_count || 0), 0);
  const planBreakdown = orgs.reduce((acc, org) => {
    const plan = org.plan || "free";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          שגיאה בטעינת הנתונים: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">פאנל ניהול ראשי</h1>
            <p className="text-sm text-slate-500">ניהול ארגונים ותוכניות</p>
          </div>
        </div>
        <Button
          onClick={() => setShowAddClient(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <UserPlus className="w-4 h-4 ml-2" />
          הוסף לקוח חדש
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">סה"כ ארגונים</p>
              <p className="text-2xl font-bold text-slate-900">{totalOrgs}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">סה"כ משתמשים</p>
              <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
            </div>
          </CardContent>
        </Card>

        {Object.entries(planBreakdown).map(([plan, count]) => (
          <Card key={plan}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {PLAN_NAMES[plan] || plan}
                </p>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">ארגונים</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם העסק</TableHead>
                  <TableHead className="text-right">מנהל</TableHead>
                  <TableHead className="text-right">תוכנית</TableHead>
                  <TableHead className="text-right">משתמשים</TableHead>
                  <TableHead className="text-right">לידים החודש</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.map((org) => {
                  const plan = org.plan || "free";
                  const maxLeads =
                    org.max_leads_per_month ||
                    (plan === "enterprise" ? "999+" : { free: 40, starter: 99, growth: 300, premium: 500 }[plan] || 40);

                  return (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{org.owner_name || "-"}</div>
                          {org.owner_email && (
                            <div className="text-slate-400 text-xs flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {org.owner_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={PLAN_COLORS[plan] || PLAN_COLORS.free}
                        >
                          {PLAN_NAMES[plan] || plan}
                        </Badge>
                      </TableCell>
                      <TableCell>{org.member_count || 0}</TableCell>
                      <TableCell>
                        {org.lead_usage || 0} / {maxLeads}
                      </TableCell>
                      <TableCell>
                        {org.is_active !== false ? (
                          <Badge className="bg-green-100 text-green-700">
                            פעיל
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            לא פעיל
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(org)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {orgs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                      לא נמצאו ארגונים
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" />
              הוסף לקוח חדש
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>שם העסק *</Label>
              <Input
                placeholder="שם העסק"
                value={newClient.businessName}
                onChange={(e) => setNewClient({ ...newClient, businessName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>שם מנהל העסק *</Label>
              <Input
                placeholder="שם מלא"
                value={newClient.fullName}
                onChange={(e) => setNewClient({ ...newClient, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>אימייל *</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={newClient.email}
                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>טלפון</Label>
              <Input
                type="tel"
                placeholder="050-0000000"
                value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>סיסמה *</Label>
              <Input
                type="password"
                placeholder="לפחות 6 תווים"
                value={newClient.password}
                onChange={(e) => setNewClient({ ...newClient, password: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>תוכנית</Label>
              <Select value={newClient.plan} onValueChange={(val) => setNewClient({ ...newClient, plan: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PLANS.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price} ({plan.leads} לידים, {plan.users} משתמשים)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {addError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setShowAddClient(false); setAddError(""); }}
              disabled={addClientMutation.isPending}
            >
              ביטול
            </Button>
            <Button
              onClick={handleAddClient}
              disabled={addClientMutation.isPending}
              className="bg-gradient-to-r from-green-600 to-green-700"
            >
              {addClientMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <UserPlus className="w-4 h-4 ml-2" />
              )}
              צור לקוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Organization Dialog */}
      <Dialog open={!!editOrg} onOpenChange={(open) => !open && setEditOrg(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת ארגון - {editOrg?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>תוכנית</Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PLANS.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active-toggle">סטטוס פעיל</Label>
              <Switch
                id="active-toggle"
                checked={editActive}
                onCheckedChange={setEditActive}
              />
            </div>

            <div className="space-y-2">
              <Label>תוקף מנוי</Label>
              <Input
                type="date"
                value={editSubEndDate}
                onChange={(e) => setEditSubEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-renew-toggle">חידוש אוטומטי</Label>
              <Switch
                id="auto-renew-toggle"
                checked={editAutoRenew}
                onCheckedChange={setEditAutoRenew}
              />
            </div>

            {editAutoRenew && (
              <div className="space-y-2">
                <Label>תקופת חידוש (חודשים)</Label>
                <Select value={String(editAutoRenewMonths)} onValueChange={(v) => setEditAutoRenewMonths(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">חודש</SelectItem>
                    <SelectItem value="3">3 חודשים</SelectItem>
                    <SelectItem value="6">6 חודשים</SelectItem>
                    <SelectItem value="12">שנה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                placeholder="הערות לארגון..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOrg(null)}
              disabled={isSaving}
            >
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
