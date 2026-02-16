import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, Car, CheckSquare } from "lucide-react";

export default function CustomerCard({ customer, vehicles, tasks, index, onClick }) {
  const statusColors = {
    "פעיל": "bg-green-100 text-green-800 border-green-200",
    "לא פעיל": "bg-gray-100 text-gray-800 border-gray-200",
    "VIP": "bg-purple-100 text-purple-800 border-purple-200"
  };

  const activeTasks = tasks.filter(t => t.status !== "הושלם" && t.status !== "בוטל").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -5 }}
    >
      <Card
        onClick={onClick}
        className="cursor-pointer hover:shadow-xl transition-all duration-300 border-none bg-white overflow-hidden group"
      >
        <div className={`h-2 bg-gradient-to-r ${
          customer.status === "VIP" ? "from-purple-500 to-purple-600" :
          customer.status === "פעיל" ? "from-green-500 to-green-600" :
          "from-gray-400 to-gray-500"
        }`} />
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                {customer.full_name}
              </h3>
              <Badge className={`${statusColors[customer.status]} border text-xs`}>
                {customer.status}
              </Badge>
            </div>
            <div className="text-left">
              <p className="text-sm text-slate-500 mb-1">{customer.customer_type}</p>
            </div>
          </div>

          <div className="space-y-3">
            {customer.phone && (
              <div className="flex items-center gap-3 text-slate-700">
                <Phone className="w-4 h-4 text-blue-500" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 text-slate-700">
                <Mail className="w-4 h-4 text-blue-500" />
                <span className="text-sm truncate">{customer.email}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex items-center gap-3 text-slate-700">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-sm truncate">{customer.address}</span>
              </div>
            )}
          </div>

          <div className="flex gap-4 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Car className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">מוצרים</p>
                <p className="text-sm font-semibold text-slate-900">{vehicles.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-orange-50 rounded-lg">
                <CheckSquare className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">משימות פעילות</p>
                <p className="text-sm font-semibold text-slate-900">{activeTasks}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}