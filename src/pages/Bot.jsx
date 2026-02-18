import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/api/base44Client";
import { processBotInput } from "@/lib/botEngine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Bot as BotIcon, User as UserIcon, Send, Paperclip } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Bot() {
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessionState, setSessionState] = useState({});
  const [inputMessage, setInputMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const services = useMemo(
    () => ({
      createLead: (payload) => supabase.entities.Lead.create(payload),
      createTask: (payload) => supabase.entities.Task.create(payload),
      searchContacts: (term) => supabase.bot.searchContacts(term),
      getDashboardStats: () => supabase.bot.getDashboardStats(),
      searchQA: (text) => supabase.bot.searchQA(text),
      assignFilePurpose: (fileId, purpose) => supabase.bot.assignFilePurpose(fileId, purpose),
    }),
    []
  );

  const init = async () => {
    try {
      const currentUser = await supabase.auth.me();
      if (!currentUser) throw new Error("Not authenticated");
      setUser(currentUser);

      const conv = await supabase.bot.getOrCreateConversation(currentUser.id);
      setConversation(conv);
      setSessionState(conv.session_state || {});

      const dbMessages = await supabase.bot.listMessages(conv.id);
      setMessages(dbMessages);

      if (!dbMessages.length) {
        const hello = "׳©׳׳•׳, ׳׳ ׳™ ׳‘׳•׳˜ ׳—׳•׳§׳™׳ ׳₪׳ ׳™׳׳™. ׳׳₪׳©׳¨ ׳׳‘׳§׳©: ׳™׳¦׳™׳¨׳× ׳׳™׳“, ׳—׳™׳₪׳•׳© ׳׳§׳•׳—, ׳¡׳˜׳˜׳™׳¡׳˜׳™׳§׳•׳×, ׳™׳¦׳™׳¨׳× ׳׳©׳™׳׳”, ׳׳• ׳׳”׳¢׳׳•׳× ׳§׳•׳‘׳¥.";
        const firstMsg = await supabase.bot.addMessage(conv.id, {
          role: "assistant",
          content: hello,
          userId: currentUser.id,
        });
        setMessages([firstMsg]);
      }
    } catch (error) {
      toast({
        title: "׳©׳’׳™׳׳” ׳‘׳˜׳¢׳™׳ ׳× ׳”׳‘׳•׳˜",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!conversation || !user) return;
    if (!inputMessage.trim() && !selectedFile) return;
    if (isSending) return;

    setIsSending(true);
    try {
      let fileMeta = null;
      if (selectedFile) {
        const uploaded = await supabase.bot.uploadFile(conversation.id, selectedFile, user.id);
        fileMeta = {
          fileId: uploaded.id,
          filePath: uploaded.file_path,
          fileName: uploaded.file_name,
        };
      }

      const userText = inputMessage.trim();
      const userContent = userText || `׳”׳•׳¢׳׳” ׳§׳•׳‘׳¥: ${fileMeta?.fileName || selectedFile?.name || "file"}`;

      const userDbMessage = await supabase.bot.addMessage(conversation.id, {
        role: "user",
        content: userContent,
        metadata: fileMeta ? { file_id: fileMeta.fileId, file_name: fileMeta.fileName } : {},
        userId: user.id,
      });

      setMessages((prev) => [...prev, userDbMessage]);

      const botResult = await processBotInput({
        text: userText,
        fileMeta,
        session: sessionState,
        services,
      });

      const assistantDbMessage = await supabase.bot.addMessage(conversation.id, {
        role: "assistant",
        content: botResult.reply,
        userId: user.id,
      });

      setMessages((prev) => [...prev, assistantDbMessage]);
      setSessionState(botResult.session || {});
      await supabase.bot.updateConversationSession(conversation.id, botResult.session || {});
      setInputMessage("");
      setSelectedFile(null);
    } catch (error) {
      toast({
        title: "׳©׳’׳™׳׳” ׳‘׳©׳׳™׳—׳”",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card>
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle className="flex items-center gap-2">
              <BotIcon className="w-5 h-5" />
              CRM Bot
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[520px] overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center">
                      <BotIcon className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                      msg.role === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2 items-end">
              <label className="inline-flex items-center gap-2 cursor-pointer border rounded-md px-3 h-10 bg-white">
                <Paperclip className="w-4 h-4" />
                <span className="text-sm">׳¦׳¨׳£ ׳§׳•׳‘׳¥</span>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  disabled={isSending}
                />
              </label>
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="כתוב הודעה או העלה קובץ..."
                className="flex-1 border rounded-md p-2 min-h-[44px] max-h-[120px]"
                disabled={isSending}
              />
              <Button type="submit" disabled={isSending || (!inputMessage.trim() && !selectedFile)}>
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            {selectedFile && (
              <div className="px-3 pb-3 text-xs text-slate-600">קובץ נבחר: {selectedFile.name}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


