import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MessageSquare, Paperclip, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function EntityNotesDialog({ entityType, entityId, entityLabel = "רשומה" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => supabase.auth.me(),
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["entity-notes", entityType, entityId, open],
    queryFn: () => supabase.notes.list(entityType, entityId),
    enabled: !!entityId && open,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      supabase.notes.create({
        entityType,
        entityId,
        noteText: text.trim(),
        file,
        createdBy: user?.id,
        createdByEmail: user?.email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
      setText("");
      setFile(null);
      toast({ title: "הערה נשמרה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה בשמירת הערה", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => supabase.notes.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-notes", entityType, entityId] });
      toast({ title: "הערה נמחקה" });
    },
    onError: (err) => {
      toast({ title: "שגיאה במחיקת הערה", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = text.trim() || file;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <MessageSquare className="w-4 h-4 ml-2" />
          הערות
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>הערות וקבצים - {entityLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            placeholder="כתוב הערה..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <label className="inline-flex items-center gap-2 cursor-pointer border rounded-md px-3 py-2 bg-white">
            <Paperclip className="w-4 h-4" />
            <span className="text-sm">צרף קובץ</span>
            <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
          {file && <div className="text-xs text-slate-600">קובץ נבחר: {file.name}</div>}
          <Button onClick={() => addMutation.mutate()} disabled={!canSubmit || addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
            הוסף הערה
          </Button>
        </div>

        <div className="max-h-[360px] overflow-y-auto space-y-2 border rounded-lg p-3 bg-slate-50">
          {isLoading && <div className="text-sm text-slate-500">טוען הערות...</div>}
          {!isLoading && !notes.length && <div className="text-sm text-slate-500">עדיין אין הערות</div>}
          {notes.map((note) => (
            <div key={note.id} className="bg-white border rounded-lg p-3 space-y-2">
              <div className="text-xs text-slate-500 flex items-center justify-between">
                <span>
                  {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                  {note.created_by_email ? ` • ${note.created_by_email}` : ""}
                </span>
                <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(note.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
              {note.note_text && <div className="text-sm whitespace-pre-wrap">{note.note_text}</div>}
              {note.file_url && (
                <a href={note.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 underline">
                  פתח קובץ: {note.file_name || "קובץ מצורף"}
                </a>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
