import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, TrendingUp, Edit, Trash2, Clock, DollarSign, Flame, Wind, Snowflake, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function LeadCard({ lead, onEdit, onDelete, onAddCall, index }) {
  const statusColors = {
    "חדש": "bg-blue-100 text-blue-800 border-blue-200",
    "בטיפול": "bg-orange-100 text-orange-800 border-orange-200",
    "התעניין": "bg-purple-100 text-purple-800 border-purple-200",
    "לא מעוניין": "bg-gray-100 text-gray-800 border-gray-200",
    "נסגר": "bg-green-100 text-green-800 border-green-200"
  };

  const tempColors = {
    "חם": { color: "from-red-500 to-orange-500", icon: Flame, text: "text-red-600" },
    "פושר": { color: "from-blue-500 to-cyan-500", icon: Wind, text: "text-blue-600" },
    "קר": { color: "from-slate-400 to-slate-500", icon: Snowflake, text: "text-slate-600" }
  };

  const tempConfig = tempColors[lead.temperature] || tempColors["פושר"];
  const TempIcon = tempConfig.icon;

  const isNew = lead.contact_time && 
    (new Date() - new Date(lead.contact_time)) < 24 * 60 * 60 * 1000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
    >
      <Card className="hover:shadow-xl transition-all duration-300 border-none bg-white overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${tempConfig.color}`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900">{lead.full_name}</h3>
                {isNew && <Badge className="bg-blue-500 text-white border-none text-xs">חדש</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusColors[lead.status]} border`}>
                  {lead.status}
                </Badge>
                <Badge className={`border-0 ${tempConfig.text} bg-${tempConfig.text.split('-')[1]}-50`}>
                  <TempIcon className="w-3 h-3 ml-1" />
                  {lead.temperature}
                </Badge>
                <Badge variant="outline">{lead.source}</Badge>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-4">
            {lead.phone && (
              <div className="flex items-center justify-between gap-3 p-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700">{lead.phone}</span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAddCall(lead)}
                  className="h-7 px-2 hover:bg-blue-100"
                >
                  <Phone className="w-3 h-3 ml-1" />
                  {lead.number_of_calls || 0}
                </Button>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <Mail className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-slate-700 truncate">{lead.email}</span>
              </div>
            )}
            {lead.assigned_to && (
              <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-slate-700">{lead.assigned_to}</span>
              </div>
            )}
            {(lead.estimated_value > 0 || lead.actual_value > 0) && (
              <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  ₪{(lead.actual_value || lead.estimated_value).toLocaleString()}
                  {lead.status === "נסגר" && lead.actual_value && " (נסגר)"}
                </span>
              </div>
            )}
            {lead.last_call_date && (
              <div className="flex items-center gap-3 p-2 bg-purple-50 rounded-lg">
                <Clock className="w-4 h-4 text-purple-500" />
                <span className="text-xs text-slate-600">
                  שיחה אחרונה: {format(new Date(lead.last_call_date), "dd/MM HH:mm", { locale: he })}
                </span>
              </div>
            )}
            {lead.contact_time && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-600">
                  {format(new Date(lead.contact_time), "dd/MM/yyyy HH:mm", { locale: he })}
                </span>
              </div>
            )}
          </div>

          {lead.interest && (
            <div className="p-3 bg-purple-50 rounded-lg mb-4 border border-purple-100">
              <p className="text-xs font-semibold text-purple-700 mb-1">עניין:</p>
              <p className="text-sm text-slate-700">{lead.interest}</p>
            </div>
          )}

          {lead.notes && (
            <div className="p-3 bg-amber-50 rounded-lg mb-4 border border-amber-100">
              <p className="text-xs text-slate-600 line-clamp-2">{lead.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(lead)}
              className="flex-1 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
            >
              <Edit className="w-4 h-4 ml-2" />
              ערוך
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(lead.id)}
              className="flex-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              מחק
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}