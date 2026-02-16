import React, { useState } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, RotateCcw, User, Settings as SettingsIcon, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { useToast } from "@/components/ui/use-toast";

export default function SystemHistory() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery({
    queryKey: ['systemHistory'],
    queryFn: () => supabase.entities.SystemHistory.list('-created_date'),
  });

  const revertMutation = useMutation({
    mutationFn: async (record) => {
      // שחזר את הנתונים הקודמים
      if (record.entity_type === "User" && record.previous_data) {
        await supabase.entities.User.update(record.entity_id, record.previous_data);
      } else if (record.entity_type === "Settings" && record.previous_data) {
        await supabase.entities.Settings.update(record.entity_id, record.previous_data);
      } else if (record.entity_type === "LeadSource" && record.action_type === "delete_lead_source") {
        // אם זה מחיקה - צור מחדש
        await supabase.entities.LeadSource.create(record.previous_data);
      }
      
      // סמן כמשוחזר
      await supabase.entities.SystemHistory.update(record.id, { reverted: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemHistory'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['leadSources'] });
      toast({
        title: "✓ השינוי שוחזר בהצלחה",
        description: "המערכת חזרה למצב הקודם"
      });
    },
  });

  const actionIcons = {
    "create_user": User,
    "update_user": User,
    "update_settings": SettingsIcon,
    "create_lead_source": TrendingUp,
    "delete_lead_source": TrendingUp,
    "other": SettingsIcon
  };

  const actionColors = {
    "create_user": "bg-green-100 text-green-800",
    "update_user": "bg-blue-100 text-blue-800",
    "update_settings": "bg-purple-100 text-purple-800",
    "create_lead_source": "bg-orange-100 text-orange-800",
    "delete_lead_source": "bg-red-100 text-red-800",
    "other": "bg-gray-100 text-gray-800"
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 flex items-center gap-3">
            <History className="w-10 h-10 text-blue-600" />
            היסטוריית שינויים
          </h1>
          <p className="text-slate-600">כל השינויים שבוצעו במערכת עם אפשרות לשחזור</p>
        </motion.div>

        <div className="space-y-4">
          {history.map((record, index) => {
            const Icon = actionIcons[record.action_type] || SettingsIcon;
            
            return (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-none shadow-lg bg-white">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4 flex-1">
                        <div className={`p-3 rounded-xl ${actionColors[record.action_type]}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1">{record.description}</h3>
                          <div className="flex gap-3 text-xs text-slate-500 mb-2">
                            <span>📅 {format(new Date(record.created_date), "dd/MM/yyyy HH:mm", { locale: he })}</span>
                            <span>👤 {record.performed_by}</span>
                          </div>
                          {record.reverted && (
                            <Badge className="bg-green-100 text-green-800">✓ שוחזר</Badge>
                          )}
                        </div>
                      </div>
                      {record.can_revert && !record.reverted && (
                        <Button
                          onClick={() => revertMutation.mutate(record)}
                          disabled={revertMutation.isPending}
                          variant="outline"
                          className="hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                        >
                          <RotateCcw className="w-4 h-4 ml-2" />
                          שחזר
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {history.length === 0 && (
            <Card className="border-none shadow-lg bg-white p-12 text-center">
              <History className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">אין היסטוריית שינויים</h3>
              <p className="text-slate-500">שינויים שיבוצעו במערכת יופיעו כאן</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}