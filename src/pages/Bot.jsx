import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Loader2, MessageCircle, Send, Bot as BotIcon, User as UserIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Bot() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initBot();
  }, []);

  const initBot = async () => {
    try {
      const currentUser = await supabase.auth.me();
      setUser(currentUser);
      
      try {
        const newConv = await supabase.agents.createConversation({
          agent_name: "crm_setup_assistant",
          metadata: {
            name: "עוזר CRM",
            user_id: currentUser.id
          }
        });
        
        setConversation(newConv);
        
        setTimeout(async () => {
          try {
            await supabase.agents.addMessage(newConv, {
              role: "user",
              content: "שלום! אני צריך עזרה עם המערכת"
            });
          } catch (err) {
            console.log("First message error:", err);
          }
        }, 1000);
        
      } catch (agentErr) {
        console.log("Agent not ready:", agentErr);
        setMessages([
          {
            role: "assistant",
            content: "שלום! 👋 אני העוזר החכם של CRM.\n\nאיך אני יכול לעזור?\n\n**דוגמאות לפקודות:**\n\n1️⃣ **הוסף ליד**\nשם: [שם]\nטלפון: [טלפון]\nכתובת: [כתובת]\n\n2️⃣ **הוסף ספק**\nשם: [שם]\nטלפון: [טלפון]\n\n3️⃣ **שאל אותי כל שאלה** על איך להשתמש במערכת!\n\nפשוט כתוב לי מה אתה צריך... 💬"
          }
        ]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Bot init error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!conversation?.id) return;
    
    const unsubscribe = supabase.agents.subscribeToConversation(
      conversation.id, 
      (data) => {
        if (data?.messages && Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      }
    );
    
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [conversation?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;
    
    const messageToSend = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);
    
    const userMessage = {
      role: "user",
      content: messageToSend,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    try {
      if (conversation) {
        await supabase.agents.addMessage(conversation, {
          role: "user",
          content: messageToSend
        });
      } else {
        setTimeout(() => {
          let botResponse = "";
          
          const lowerMsg = messageToSend.toLowerCase();
          
          if (lowerMsg.includes("ליד") || lowerMsg.includes("לקוח")) {
            botResponse = "מעולה! 👥\n\nכדי להוסיף ליד חדש, אני צריך:\n\n📝 **שם מלא**\n📞 **טלפון**\n📍 **כתובת**\n\nאפשר לכתוב ככה:\n\nהוסף ליד\nשם: יוסי כהן\nטלפון: 050-1234567\nכתובת: תל אביב רחוב הרצל 10\n\nאו שאפשר ללכת ישירות ל**דף הלידים** ולהוסיף משם! 🚀";
          } else if (lowerMsg.includes("ספק")) {
            botResponse = "נהדר! 🏭\n\nכדי להוסיף ספק חדש, אני צריך:\n\n🏢 **שם הספק**\n📞 **טלפון**\n\nאפשר לכתוב ככה:\n\nהוסף ספק\nשם: סופרבאט\nטלפון: 03-1234567\n\nאו ללכת ל**דף הספקים** ולהוסיף משם!";
          } else if (lowerMsg.includes("מלאי") || lowerMsg.includes("מוצר")) {
            botResponse = "🔋 **ניהול מלאי**\n\nיש לך דף מלאי מלא שבו אפשר:\n\n✅ להוסיף מוצרים חדשים\n✅ לראות כמויות\n✅ לעקוב אחר חוסרים\n✅ לקבל התראות\n\nעבור ל**דף המלאי** בתפריט!";
          } else if (lowerMsg.includes("עזרה") || lowerMsg.includes("help")) {
            botResponse = "📚 **מדריך מהיר**\n\n🔹 **לידים** - ניהול לקוחות פוטנציאליים\n🔹 **עבודות** - מעקב ביצועים\n🔹 **מלאי** - ניהול מוצרים\n🔹 **ספקים** - ניהול ספקים\n🔹 **דוחות** - סטטיסטיקות וניתוח\n\nמה תרצה לעשות?";
          } else {
            botResponse = "🤔 לא הבנתי בדיוק...\n\nאני יכול לעזור לך עם:\n\n1️⃣ הוספת לידים\n2️⃣ הוספת ספקים\n3️⃣ שאלות על המערכת\n4️⃣ הדרכה\n\nמה תרצה לעשות?";
          }
          
          setMessages(prev => [...prev, {
            role: "assistant",
            content: botResponse,
            created_at: new Date().toISOString()
          }]);
        }, 1000);
      }
    } catch (error) {
      console.error("Send error:", error);
      toast({
        title: "שגיאה בשליחה",
        description: "נסה שוב",
        variant: "destructive"
      });
    }
    
    setIsSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-slate-600">מכין את העוזר החכם שלך...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-purple-50 to-indigo-100 min-h-screen" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full mb-4 shadow-lg">
            <BotIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">🤖 העוזר החכם שלך</h1>
          <p className="text-lg text-slate-600">שאל אותי כל דבר או תן לי פקודות</p>
        </motion.div>

        <Card className="border-none shadow-2xl bg-white mb-4" style={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
          <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageCircle className="w-6 h-6" />
              שיחה עם העוזר
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-6" style={{ maxHeight: '400px' }}>
            <div className="space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <BotIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                  
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
              
              {isSending && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                    <BotIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          <div className="border-t border-slate-100 p-4 flex-shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="כתוב הודעה... (Enter לשליחה, Shift+Enter לשורה חדשה)"
                className="flex-1 text-base p-3 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[48px] max-h-[120px]"
                disabled={isSending}
                rows={1}
                style={{
                  height: 'auto',
                  overflowY: inputMessage.split('\n').length > 3 ? 'auto' : 'hidden'
                }}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
              <Button
                type="submit"
                disabled={isSending || !inputMessage.trim()}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 h-12 px-6"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
          </div>
        </Card>

        <div className="text-center text-sm text-slate-500">
          💡 טיפ: אפשר לשאול אותי כל שאלה או לתת פקודות להוספת לידים וספקים
        </div>
      </div>
    </div>
  );
}