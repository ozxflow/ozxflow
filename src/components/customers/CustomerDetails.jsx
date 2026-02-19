import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Edit, Trash2, Phone, Mail, MapPin, Car, CheckSquare, FileText, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import EntityNotesDialog from "@/components/EntityNotesDialog";

export default function CustomerDetails({ customer, vehicles, tasks, quotes = [], jobs = [], onEdit, onDelete, onBack }) {
  const navigate = useNavigate();
  const statusColors = {
    "׳₪׳¢׳™׳": "bg-green-100 text-green-800 border-green-200",
    "׳׳ ׳₪׳¢׳™׳": "bg-gray-100 text-gray-800 border-gray-200",
    "VIP": "bg-purple-100 text-purple-800 border-purple-200"
  };

  const taskStatusColors = {
    "׳׳׳×׳™׳": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "׳‘׳˜׳™׳₪׳•׳": "bg-blue-100 text-blue-800 border-blue-200",
    "׳”׳•׳©׳׳": "bg-green-100 text-green-800 border-green-200",
    "׳‘׳•׳˜׳": "bg-gray-100 text-gray-800 border-gray-200"
  };

  const completedTasks = tasks.filter(t => t.status === "׳”׳•׳©׳׳");
  const activeTasks = tasks.filter(t => t.status !== "׳”׳•׳©׳׳" && t.status !== "׳‘׳•׳˜׳");

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4 hover:bg-slate-100"
      >
        <ArrowRight className="w-4 h-4 ml-2" />
        ׳—׳–׳¨׳” ׳׳¨׳©׳™׳׳× ׳׳§׳•׳—׳•׳×
      </Button>

      <Card className="border-none shadow-xl bg-white mb-6">
        <div className={`h-2 bg-gradient-to-r ${
          customer.status === "VIP" ? "from-purple-500 to-purple-600" :
          customer.status === "׳₪׳¢׳™׳" ? "from-green-500 to-green-600" :
          "from-gray-400 to-gray-500"
        }`} />
        <CardHeader className="border-b border-slate-100 px-4 md:px-6">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl md:text-3xl mb-2">{customer.full_name}</CardTitle>
                <div className="flex gap-2">
                  <Badge className={`${statusColors[customer.status]} border`}>
                    {customer.status}
                  </Badge>
                  <Badge variant="outline">{customer.customer_type}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams({
                    customer_name: customer.full_name || "",
                    customer_phone: customer.phone || "",
                    customer_email: customer.email || "",
                  });
                  navigate(`/Quotes?${params.toString()}`);
                }}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-xs md:text-sm"
              >
                <FileText className="w-4 h-4 ml-1" />
                ׳¦׳•׳¨ ׳”׳¦׳¢׳× ׳׳—׳™׳¨
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(customer)}
                className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 text-xs md:text-sm"
              >
                <Edit className="w-4 h-4 ml-1" />
                ׳¢׳¨׳™׳›׳”
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(customer.id)}
                className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs md:text-sm"
              >
                <Trash2 className="w-4 h-4 ml-1" />
                ׳׳—׳™׳§׳”
              </Button>
              <EntityNotesDialog entityType="customer" entityId={customer.id} entityLabel={customer.full_name || "לקוח"} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-base md:text-lg text-slate-900 mb-3">׳₪׳¨׳˜׳™ ׳§׳©׳¨</h3>
              {customer.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Phone className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">׳˜׳׳₪׳•׳</p>
                    <p className="font-medium text-slate-900">{customer.phone}</p>
                  </div>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">׳׳™׳׳™׳™׳</p>
                    <p className="font-medium text-slate-900">{customer.email}</p>
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MapPin className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">׳›׳×׳•׳‘׳×</p>
                    <p className="font-medium text-slate-900">{customer.address}</p>
                  </div>
                </div>
              )}
            </div>

            {customer.notes && (
              <div>
                <h3 className="font-semibold text-lg text-slate-900 mb-3">׳”׳¢׳¨׳•׳×</h3>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="border-b border-slate-100 px-4 md:px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Car className="w-5 h-5 text-blue-500" />
                ׳׳•׳¦׳¨׳™׳ ({vehicles.length})
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {vehicles.length > 0 ? (
              <div className="space-y-3">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-slate-900 text-lg">{vehicle.license_plate}</p>
                        <p className="text-sm text-slate-600">
                          {vehicle.manufacturer} {vehicle.model}
                        </p>
                      </div>
                      {vehicle.year && (
                        <Badge variant="outline">{vehicle.year}</Badge>
                      )}
                    </div>
                    {vehicle.color && (
                      <p className="text-xs text-slate-500">׳¦׳‘׳¢: {vehicle.color}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Car className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>׳׳™׳ ׳₪׳¨׳˜׳™׳ ׳¨׳©׳•׳׳™׳ ׳׳׳§׳•׳— ׳–׳”</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-white">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-orange-500" />
              ׳׳©׳™׳׳•׳× ׳₪׳¢׳™׳׳•׳× ({activeTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {activeTasks.length > 0 ? (
              <div className="space-y-3">
                {activeTasks.map((task) => (
                  <div key={task.id} className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-900">{task.title}</h4>
                      <Badge className={`${taskStatusColors[task.status]} border text-xs`}>
                        {task.status}
                      </Badge>
                    </div>
                    {task.priority && (
                      <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-none text-xs">
                        ׳“׳—׳™׳₪׳•׳× {task.priority}
                      </Badge>
                    )}
                    {(task.estimated_cost > 0 || task.actual_cost > 0) && (
                      <p className="text-xs text-slate-600 mt-2">
                        {task.actual_cost > 0 
                          ? `׳¢׳׳•׳×: ג‚×${task.actual_cost.toLocaleString()}` 
                          : task.estimated_cost > 0 
                          ? `׳׳©׳•׳¢׳¨: ג‚×${task.estimated_cost.toLocaleString()}`
                          : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <CheckSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>׳׳™׳ ׳׳©׳™׳׳•׳× ׳₪׳¢׳™׳׳•׳×</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {completedTasks.length > 0 && (
        <Card className="border-none shadow-xl bg-white mt-6">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-green-500" />
              ׳”׳™׳¡׳˜׳•׳¨׳™׳™׳× ׳׳©׳™׳׳•׳× ({completedTasks.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {completedTasks.slice(0, 10).map((task) => (
                <div key={task.id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 mb-1">{task.title}</h4>
                      {task.completed_date && (
                        <p className="text-xs text-slate-500">
                          ׳”׳•׳©׳׳ ׳‘- {format(new Date(task.completed_date), "dd/MM/yyyy HH:mm", { locale: he })}
                        </p>
                      )}
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200 border">
                      ג“ ׳”׳•׳©׳׳
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quotes history */}
      <Card className="border-none shadow-xl bg-white mt-6">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            ׳”׳¦׳¢׳•׳× ׳׳—׳™׳¨ ({quotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.map((quote) => {
                const statusColors = {
                  "׳˜׳™׳•׳˜׳”": "bg-gray-100 text-gray-800 border-gray-200",
                  "׳ ׳©׳׳—׳”": "bg-blue-100 text-blue-800 border-blue-200",
                  "׳׳•׳©׳¨׳”": "bg-green-100 text-green-800 border-green-200",
                  "׳‘׳•׳˜׳׳”": "bg-red-100 text-red-800 border-red-200",
                };
                return (
                  <div key={quote.id} className="p-4 bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          ׳”׳¦׳¢׳” #{quote.serial_number || "ג€”"}
                        </h4>
                        {quote.created_date && (
                          <p className="text-xs text-slate-500">
                            {format(new Date(quote.created_date), "dd/MM/yyyy", { locale: he })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {quote.grand_total > 0 && (
                          <span className="text-sm font-bold text-slate-700">ג‚×{quote.grand_total?.toLocaleString()}</span>
                        )}
                        <Badge className={`${statusColors[quote.status] || "bg-gray-100 text-gray-800"} border text-xs`}>
                          {quote.status || "׳˜׳™׳•׳˜׳”"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>׳׳™׳ ׳”׳¦׳¢׳•׳× ׳׳—׳™׳¨ ׳׳׳§׳•׳— ׳–׳”</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs history */}
      <Card className="border-none shadow-xl bg-white mt-6">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-orange-500" />
            ׳¢׳‘׳•׳“׳•׳× ({jobs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {jobs.length > 0 ? (
            <div className="space-y-3">
              {jobs.map((job) => {
                const jobStatusColors = {
                  "׳₪׳×׳•׳—": "bg-yellow-100 text-yellow-800 border-yellow-200",
                  "׳‘׳“׳¨׳": "bg-blue-100 text-blue-800 border-blue-200",
                  "׳‘׳•׳¦׳¢": "bg-green-100 text-green-800 border-green-200",
                  "׳ ׳“׳—׳”": "bg-red-100 text-red-800 border-red-200",
                };
                return (
                  <div key={job.id} className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-slate-900">{job.customer_name || "׳¢׳‘׳•׳“׳”"}</h4>
                        {job.created_date && (
                          <p className="text-xs text-slate-500">
                            {format(new Date(job.created_date), "dd/MM/yyyy", { locale: he })}
                          </p>
                        )}
                        {job.address && (
                          <p className="text-xs text-slate-600 mt-1">{job.address}</p>
                        )}
                      </div>
                      <Badge className={`${jobStatusColors[job.status] || "bg-gray-100 text-gray-800"} border text-xs`}>
                        {job.status || "׳₪׳×׳•׳—"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>׳׳™׳ ׳¢׳‘׳•׳“׳•׳× ׳׳׳§׳•׳— ׳–׳”</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

