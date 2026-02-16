import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Car, Clock, CheckCircle, Play, Trash2 } from "lucide-react";

export default function QuickTaskCard({ 
  task, 
  customerName, 
  vehiclePlate, 
  onEdit, 
  onDelete, 
  onStatusChange, 
  index,
  isCompleted = false 
}) {
  const statusColors = {
    "ממתין": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "בטיפול": "bg-blue-100 text-blue-800 border-blue-200",
    "הושלם": "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
    >
      <Card className={`hover:shadow-xl transition-all duration-300 border-none overflow-hidden ${
        isCompleted ? 'opacity-75' : ''
      }`}>
        <div className={`h-2 ${isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-purple-500 to-purple-600'}`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-purple-500" />
                <Badge className="bg-purple-100 text-purple-800 border-purple-200 border text-xs">
                  5 דקות
                </Badge>
                <Badge className={`${statusColors[task.status]} border text-xs`}>
                  {task.status}
                </Badge>
              </div>
              <h3 className={`text-lg font-bold mb-2 ${isCompleted ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                {task.title}
              </h3>
            </div>
          </div>

          {task.description && (
            <p className="text-slate-600 text-sm mb-4 line-clamp-2">{task.description}</p>
          )}

          <div className="space-y-2 mb-4">
            {customerName && (
              <div className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                <User className="w-4 h-4 text-blue-500" />
                <span className="text-slate-700">{customerName}</span>
              </div>
            )}
            {vehiclePlate && (
              <div className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                <Car className="w-4 h-4 text-indigo-500" />
                <span className="text-slate-700 font-mono">{vehiclePlate}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4 border-t border-slate-100">
            {!isCompleted ? (
              <>
                {task.status === "ממתין" && (
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(task.id, "בטיפול")}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-4 h-4 ml-2" />
                    התחל
                  </Button>
                )}
                {task.status === "בטיפול" && (
                  <Button
                    size="sm"
                    onClick={() => onStatusChange(task.id, "הושלם")}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 ml-2" />
                    סיים
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(task.id)}
                  className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <div className="flex-1 text-center p-2 bg-green-50 rounded-lg">
                <span className="text-sm text-green-700 font-medium flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  הושלם בהצלחה
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}