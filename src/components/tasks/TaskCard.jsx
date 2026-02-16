
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Car, Calendar, DollarSign, Edit, Trash2, MoreVertical, CheckCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function TaskCard({ task, customerName, vehiclePlate, onEdit, onDelete, onStatusChange, index }) {
  const statusColors = {
    "ממתין": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "בטיפול": "bg-blue-100 text-blue-800 border-blue-200",
    "הושלם": "bg-green-100 text-green-800 border-green-200",
    "בוטל": "bg-gray-100 text-gray-800 border-gray-200"
  };

  const getPriorityColor = (priority) => {
    if (priority >= 8) return "from-red-500 to-red-600";
    if (priority >= 4) return "from-orange-500 to-orange-600";
    return "from-blue-500 to-blue-600";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
    >
      <Card className="hover:shadow-xl transition-all duration-300 border-none bg-white overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${getPriorityColor(task.priority)}`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{task.title}</h3>
              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusColors[task.status]} border`}>
                  {task.status}
                </Badge>
                <Badge className={`bg-gradient-to-r ${getPriorityColor(task.priority)} text-white border-none`}>
                  דחיפות {task.priority}
                </Badge>
                {task.is_quick_task && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 border">
                    <Clock className="w-3 h-3 ml-1" />
                    5 דקות
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="w-4 h-4 ml-2" />
                  ערוך
                </DropdownMenuItem>
                {task.status !== "הושלם" && (
                  <DropdownMenuItem onClick={() => onStatusChange(task.id, "הושלם")}>
                    <CheckCircle className="w-4 h-4 ml-2" />
                    סמן כהושלם
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4 ml-2" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-slate-600 text-sm mb-4 line-clamp-3">{task.description}</p>
          )}

          <div className="space-y-3">
            {customerName && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-slate-700 font-medium">{customerName}</span>
              </div>
            )}
            {vehiclePlate && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <Car className="w-4 h-4 text-indigo-500" />
                <span className="text-sm text-slate-700 font-mono">{vehiclePlate}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <Calendar className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-slate-700">
                  יעד: {format(new Date(task.due_date), "dd/MM/yyyy", { locale: he })}
                </span>
              </div>
            )}
            {(task.estimated_cost > 0 || task.actual_cost > 0) && (
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div className="text-sm text-slate-700">
                  {task.actual_cost > 0 ? (
                    <span>עלות: ₪{task.actual_cost.toLocaleString()}</span>
                  ) : task.estimated_cost > 0 ? (
                    <span>משוער: ₪{task.estimated_cost.toLocaleString()}</span>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
            {task.status !== "הושלם" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onStatusChange(task.id, task.status === "ממתין" ? "בטיפול" : "הושלם")}
                  className="flex-1 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
                >
                  {task.status === "ממתין" ? "התחל טיפול" : "סיים"}
                </Button>
              </>
            )}
            {task.status === "הושלם" && (
              <div className="flex-1 text-center p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700 font-medium">✓ הושלם</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
