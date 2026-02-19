import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { MessageSquare, Paperclip, Loader2, Trash2, Eye, Download } from "lucide-react";
import { supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function EntityNotesDialog({ entityType, entityId, entityLabel = "רשומה" }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [previewNoteId, setPreviewNoteId] = useState(null);
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
  const previewNote = useMemo(() => notes.find((n) => n.id === previewNoteId) || null, [notes, previewNoteId]);

  const getFileKind = (fileName = "") => {
    const ext = fileName.toLowerCase().split(".").pop();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (ext === "pdf") return "pdf";
    return "other";
  };

  const handleDownload = async (note) => {
    if (!note?.file_url) return;
    try {
      const res = await fetch(note.file_url);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = note.file_name || "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast({ title: "שגיאה בהורדת הקובץ", description: err.message, variant: "destructive" });
    }
  };

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
                <div className="space-y-2">
                  <div className="text-sm text-slate-600">{note.file_name || "קובץ מצורף"}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewNoteId(note.id)}
                    >
                      <Eye className="w-4 h-4 ml-1" />
                      תצוגה מקדימה
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(note)}
                    >
                      <Download className="w-4 h-4 ml-1" />
                      הורדה
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Dialog open={!!previewNote} onOpenChange={(v) => !v && setPreviewNoteId(null)}>
          <DialogContent dir="rtl" className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>תצוגה מקדימה - {previewNote?.file_name || "קובץ"}</DialogTitle>
            </DialogHeader>
            {previewNote?.file_url && (
              <div className="space-y-3">
                {getFileKind(previewNote.file_name) === "image" && (
                  <img
                    src={previewNote.file_url}
                    alt={previewNote.file_name || "preview"}
                    className="max-h-[70vh] w-full object-contain rounded border"
                  />
                )}
                {getFileKind(previewNote.file_name) === "pdf" && (
                  <iframe
                    src={previewNote.file_url}
                    title={previewNote.file_name || "preview"}
                    className="w-full h-[70vh] rounded border"
                  />
                )}
                {getFileKind(previewNote.file_name) === "other" && (
                  <div className="text-sm text-slate-600 border rounded p-3 bg-slate-50">
                    לא ניתן להציג תצוגה מקדימה לסוג הקובץ הזה.
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={() => handleDownload(previewNote)}>
                    <Download className="w-4 h-4 ml-1" />
                    הורדה
                  </Button>
                  <Button type="button" variant="secondary" asChild>
                    <a href={previewNote.file_url} target="_blank" rel="noopener noreferrer">
                      פתיחה בכרטיסייה חדשה
                    </a>
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
