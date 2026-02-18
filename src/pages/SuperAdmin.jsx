import React, { useEffect, useState } from "react";
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
  Trash2,
  MessageSquare,
  FileText as FileIcon,
} from "lucide-react";
import { supabase } from "@/api/base44Client";
import { PLAN_NAMES, ALL_PLANS } from "@/lib/planFeatures";
import { useToast } from "@/components/ui/use-toast";

const PLAN_COLORS = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  growth: "bg-green-100 text-green-700",
  premium: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

export default function SuperAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
  const [planLinksDraft, setPlanLinksDraft] = useState({});
  const [qaForm, setQaForm] = useState({
    question: "",
    answer: "",
    keywords: "",
    category: "general",
    priority: 100,
  });
  const [instructionForm, setInstructionForm] = useState({
    id: "",
    title: "הנחיה כללית",
    instruction: "",
    priority: 10,
    is_active: true,
  });

  // Fetch organizations
  const {
    data: orgs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["superadmin", "orgs"],
    queryFn: () => supabase.superAdmin.listOrgs(),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["superadmin", "plans"],
    queryFn: () => supabase.superAdmin.listPlans(),
  });

  const { data: botQa = [] } = useQuery({
    queryKey: ["superadmin", "botQa"],
    queryFn: () => supabase.superAdmin.listBotQA(),
  });
  const { data: botInstructions = [] } = useQuery({
    queryKey: ["superadmin", "botInstructions"],
    queryFn: () => supabase.superAdmin.listBotInstructions(),
  });

  const { data: botConversations = [] } = useQuery({
    queryKey: ["superadmin", "botConversations"],
    queryFn: () => supabase.superAdmin.listBotConversations(50),
  });

  const { data: botFiles = [] } = useQuery({
    queryKey: ["superadmin", "botFiles"],
    queryFn: () => supabase.superAdmin.listBotFiles(50),
  });

  const createBotQaMutation = useMutation({
    mutationFn: (payload) => supabase.superAdmin.createBotQA(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "botQa"] });
      setQaForm({ question: "", answer: "", keywords: "", category: "general", priority: 100 });
      toast({ title: "רשומת Q&A נוספה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה בהוספה", description: err.message, variant: "destructive" });
    },
  });

  const deleteBotQaMutation = useMutation({
    mutationFn: (id) => supabase.superAdmin.deleteBotQA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "botQa"] });
      toast({ title: "רשומת Q&A נמחקה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה במחיקה", description: err.message, variant: "destructive" });
    },
  });

  const upsertInstructionMutation = useMutation({
    mutationFn: (payload) => supabase.superAdmin.upsertGlobalBotInstruction(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "botInstructions"] });
      toast({ title: "הנחיות הבוט נשמרו" });
    },
    onError: (err) => {
      toast({ title: "שגיאה בשמירת הנחיות", description: err.message, variant: "destructive" });
    },
  });

  const deleteInstructionMutation = useMutation({
    mutationFn: (id) => supabase.superAdmin.deleteBotInstruction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "botInstructions"] });
      toast({ title: "הנחיה נמחקה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה במחיקת הנחיה", description: err.message, variant: "destructive" });
    },
  });

  const updatePlanConfigMutation = useMutation({
    mutationFn: ({ planId, updates }) => supabase.superAdmin.updatePlanConfig(planId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["superadmin", "plans"] });
    },
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

  const handleSavePlanLinks = async (planId) => {
    const row = planLinksDraft[planId];
    if (!row) return;

    try {
      await updatePlanConfigMutation.mutateAsync({
        planId,
        updates: {
          setup_payment_url: row.setup_payment_url || null,
          monthly_payment_url: row.monthly_payment_url || null,
        },
      });
      toast({ title: "קישורי התשלום נשמרו" });
    } catch (err) {
      toast({ title: "שגיאה בשמירת קישורים", description: err.message, variant: "destructive" });
    }
  };

  useEffect(() => {
    if (!botInstructions.length) return;
    const primary = botInstructions[0];
    setInstructionForm({
      id: primary.id,
      title: primary.title || "הנחיה כללית",
      instruction: primary.instruction || "",
      priority: primary.priority ?? 10,
      is_active: primary.is_active !== false,
    });
  }, [botInstructions]);

  const handleCreateBotQA = () => {
    if (!qaForm.question.trim() || !qaForm.answer.trim()) {
      toast({ title: "יש למלא שאלה ותשובה", variant: "destructive" });
      return;
    }

    const keywords = qaForm.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    createBotQaMutation.mutate({
      question: qaForm.question.trim(),
      answer: qaForm.answer.trim(),
      keywords,
      category: qaForm.category.trim() || "general",
      priority: Number(qaForm.priority) || 100,
    });
  };

  const handleSaveInstructions = () => {
    if (!instructionForm.instruction.trim()) {
      toast({ title: "יש למלא הנחיה", variant: "destructive" });
      return;
    }
    upsertInstructionMutation.mutate({
      id: instructionForm.id || undefined,
      title: instructionForm.title.trim() || "הנחיה כללית",
      instruction: instructionForm.instruction.trim(),
      priority: Number(instructionForm.priority) || 10,
      is_active: instructionForm.is_active,
    });
  };

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

      {/* Plan Payment Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">קישורי תשלום לחבילות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans
            .filter((p) => ["starter", "growth", "premium"].includes(p.id))
            .map((plan) => {
              const draft = planLinksDraft[plan.id] || {
                setup_payment_url: plan.setup_payment_url || "",
                monthly_payment_url: plan.monthly_payment_url || "",
              };
              return (
                <div key={plan.id} className="rounded-lg border p-4 space-y-3">
                  <div className="font-semibold">{PLAN_NAMES[plan.id] || plan.name_he || plan.name}</div>
                  <div className="space-y-2">
                    <Label>לינק תשלום הקמה</Label>
                    <Input
                      dir="ltr"
                      className="text-left"
                      value={draft.setup_payment_url}
                      placeholder="https://..."
                      onChange={(e) =>
                        setPlanLinksDraft((prev) => ({
                          ...prev,
                          [plan.id]: {
                            ...draft,
                            setup_payment_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>לינק מנוי חודשי</Label>
                    <Input
                      dir="ltr"
                      className="text-left"
                      value={draft.monthly_payment_url}
                      placeholder="https://..."
                      onChange={(e) =>
                        setPlanLinksDraft((prev) => ({
                          ...prev,
                          [plan.id]: {
                            ...draft,
                            monthly_payment_url: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={() => handleSavePlanLinks(plan.id)}
                    disabled={updatePlanConfigMutation.isPending}
                  >
                    {updatePlanConfigMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    שמור קישורים
                  </Button>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* הגדרות בוט גלובליות */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">הגדרות בוט גלובליות</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500">
            כאן אפשר להגדיר ברמה גבוהה איך הבוט מגיב בכל המערכת.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label>כותרת ההנחיה</Label>
              <Input
                value={instructionForm.title}
                onChange={(e) => setInstructionForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="לדוגמה: מדיניות תגובת בוט"
              />
            </div>
            <div className="space-y-2">
              <Label>עדיפות</Label>
              <Input
                type="number"
                value={instructionForm.priority}
                onChange={(e) => setInstructionForm((prev) => ({ ...prev, priority: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>הנחיה</Label>
            <Textarea
              rows={5}
              value={instructionForm.instruction}
              onChange={(e) => setInstructionForm((prev) => ({ ...prev, instruction: e.target.value }))}
              placeholder="לדוגמה: תמיד לבקש שם+טלפון לפני יצירת ליד, ולענות בקצרה ובבהירות."
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={instructionForm.is_active}
                onCheckedChange={(checked) => setInstructionForm((prev) => ({ ...prev, is_active: checked }))}
              />
              <Label>הנחיה פעילה</Label>
            </div>
            <Button onClick={handleSaveInstructions} disabled={upsertInstructionMutation.isPending}>
              {upsertInstructionMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Save className="w-4 h-4 ml-2" />
              )}
              שמור הנחיות
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bot Global Q&A */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">שאלות ותשובות גלובליות לבוט</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>שאלה</Label>
              <Input
                value={qaForm.question}
                onChange={(e) => setQaForm((prev) => ({ ...prev, question: e.target.value }))}
                placeholder="לדוגמה: איך מוסיפים ליד?"
              />
            </div>
            <div className="space-y-2">
              <Label>מילות מפתח (מופרד בפסיק)</Label>
              <Input
                value={qaForm.keywords}
                onChange={(e) => setQaForm((prev) => ({ ...prev, keywords: e.target.value }))}
                placeholder="ליד, יצירה, הוספה"
              />
            </div>
            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Input
                value={qaForm.category}
                onChange={(e) => setQaForm((prev) => ({ ...prev, category: e.target.value }))}
                placeholder="כללי"
              />
            </div>
            <div className="space-y-2">
              <Label>עדיפות (מספר קטן = עדיפות גבוהה)</Label>
              <Input
                type="number"
                value={qaForm.priority}
                onChange={(e) => setQaForm((prev) => ({ ...prev, priority: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>תשובה</Label>
            <Textarea
              value={qaForm.answer}
              onChange={(e) => setQaForm((prev) => ({ ...prev, answer: e.target.value }))}
              rows={4}
              placeholder="תשובת הבוט"
            />
          </div>
          <Button onClick={handleCreateBotQA} disabled={createBotQaMutation.isPending}>
            {createBotQaMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Save className="w-4 h-4 ml-2" />
            )}
            הוסף תשובה גלובלית
          </Button>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שאלה</TableHead>
                  <TableHead className="text-right">קטגוריה</TableHead>
                  <TableHead className="text-right">עדיפות</TableHead>
                  <TableHead className="text-right">מילות מפתח</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {botQa.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[260px] truncate">{row.question}</TableCell>
                    <TableCell>{row.category || "-"}</TableCell>
                    <TableCell>{row.priority}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {(row.keywords || []).join(", ")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBotQaMutation.mutate(row.id)}
                        disabled={deleteBotQaMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!botQa.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                      עדיין לא נוספו תשובות גלובליות
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ניטור בוט */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ניטור בוט (שיחות וקבצים)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              שיחות אחרונות
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto text-sm">
              {botConversations.map((conv) => (
                <div key={conv.id} className="rounded border p-2">
                  <div className="font-medium">{conv.title || "CRM Bot"}</div>
                  <div className="text-slate-500 text-xs">ארגון: {conv.org_id}</div>
                  <div className="text-slate-500 text-xs">משתמש: {conv.user_id}</div>
                </div>
              ))}
              {!botConversations.length && <div className="text-slate-500">אין שיחות להצגה</div>}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-semibold mb-2 flex items-center gap-2">
              <FileIcon className="w-4 h-4" />
              קבצים אחרונים
            </div>
            <div className="space-y-2 max-h-[260px] overflow-y-auto text-sm">
              {botFiles.map((file) => (
                <div key={file.id} className="rounded border p-2">
                  <div className="font-medium truncate">{file.file_name}</div>
                  <div className="text-slate-500 text-xs">שיוך: {file.purpose || "לא משויך"}</div>
                  <div className="text-slate-500 text-xs truncate">{file.file_path}</div>
                </div>
              ))}
              {!botFiles.length && <div className="text-slate-500">אין קבצים להצגה</div>}
            </div>
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
