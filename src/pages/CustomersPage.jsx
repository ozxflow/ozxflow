import React, { useState, useEffect } from "react";
import { supabase } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

import CustomerForm from "../components/customers/CustomerForm";
import CustomerCard from "../components/customers/CustomerCard";
import CustomerDetails from "../components/customers/CustomerDetails";

export default function CustomersPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => supabase.entities.Customer.list('-created_date'),
  });

  // קריאת ID מה-URL כשנכנסים לעמוד
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const customerId = urlParams.get('id');
    if (customerId && customers.length > 0 && !selectedCustomer) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
      }
    }
  }, [customers]);

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => supabase.entities.Vehicle.list(),
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => supabase.entities.Task.list(),
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => supabase.entities.Quote.list(),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => supabase.entities.Job.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => supabase.entities.Customer.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      toast({
        title: "✓ הלקוח נוסף בהצלחה",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => supabase.entities.Customer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowForm(false);
      setEditingCustomer(null);
      if (selectedCustomer) {
        const updated = customers.find(c => c.id === selectedCustomer.id);
        setSelectedCustomer(updated);
      }
      toast({
        title: "✓ הלקוח עודכן בהצלחה",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.entities.Customer.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setSelectedCustomer(null);
      toast({
        title: "✓ הלקוח נמחק",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data) => {
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
    setSelectedCustomer(null);
    window.history.pushState({}, '', `${window.location.pathname}?id=${customer.id}&edit=true`);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCustomerVehicles = (customerId) => {
    return vehicles.filter(v => v.customer_id === customerId);
  };

  const getCustomerTasks = (customerId) => {
    return tasks.filter(t => t.customer_id === customerId);
  };

  const getCustomerQuotes = (customer) => {
    return quotes.filter(q =>
      q.customer_phone === customer.phone ||
      q.customer_name === customer.full_name
    );
  };

  const getCustomerJobs = (customer) => {
    return jobs.filter(j =>
      j.customer_phone === customer.phone ||
      j.customer_name === customer.full_name
    );
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">לקוחות</h1>
            <p className="text-slate-600">ניהול וצפייה בלקוחות ({customers.length})</p>
          </div>
          <Button 
            onClick={() => {
              setShowForm(true);
              setEditingCustomer(null);
              setSelectedCustomer(null);
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            לקוח חדש
          </Button>
        </motion.div>

        <Card className="mb-6 border-none shadow-lg bg-white p-4">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              placeholder="חיפוש לפי שם, טלפון או אימייל..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-12 text-lg h-12 border-slate-200 focus:border-blue-500"
            />
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {showForm && (
            <CustomerForm
              customer={editingCustomer}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingCustomer(null);
              }}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          )}
        </AnimatePresence>

        {selectedCustomer ? (
          <CustomerDetails
            customer={selectedCustomer}
            vehicles={getCustomerVehicles(selectedCustomer.id)}
            tasks={getCustomerTasks(selectedCustomer.id)}
            quotes={getCustomerQuotes(selectedCustomer)}
            jobs={getCustomerJobs(selectedCustomer)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBack={() => {
              setSelectedCustomer(null);
              window.history.pushState({}, '', window.location.pathname);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredCustomers.map((customer, index) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  vehicles={getCustomerVehicles(customer.id)}
                  tasks={getCustomerTasks(customer.id)}
                  onClick={() => {
                    setSelectedCustomer(customer);
                    window.history.pushState({}, '', `${window.location.pathname}?id=${customer.id}`);
                  }}
                  index={index}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {filteredCustomers.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין לקוחות להצגה</h3>
            <p className="text-slate-500 mb-6">
              {searchQuery ? "לא נמצאו לקוחות התואמים את החיפוש" : "התחל בהוספת הלקוח הראשון שלך"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 ml-2" />
                הוסף לקוח
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}