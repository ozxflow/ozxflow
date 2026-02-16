import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Loader2, Building2, Mail, ArrowRight } from "lucide-react";
import { supabase } from "@/api/base44Client";
import { appConfig } from "@/config/appConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // login | forgot | sent
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await supabase.auth.signIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.message || "שגיאה בהתחברות");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await supabase.auth.resetPassword(email);
      setMode("sent");
    } catch (err) {
      setError(err.message || "שגיאה בשליחת מייל איפוס");
    } finally {
      setLoading(false);
    }
  };

  if (mode === "sent") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4" dir="rtl">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8 text-center">
            <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">נשלח מייל איפוס!</h2>
            <p className="text-slate-500 mb-4">בדוק את תיבת המייל שלך ב-{email}</p>
            <Button variant="outline" onClick={() => setMode("login")}>
              <ArrowRight className="w-4 h-4 ml-2" />
              חזור להתחברות
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4" dir="rtl">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">{appConfig.appName}</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            {mode === "login" ? "התחבר למערכת" : "איפוס סיסמה"}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="הזן סיסמה"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <LogIn className="w-4 h-4 ml-2" />
                )}
                התחבר
              </Button>
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                שכחתי סיסמה
              </button>
              <Link
                to="/signup"
                className="block w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                אין לך חשבון? הירשם
              </Link>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">אימייל</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="text-left"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                ) : (
                  <Mail className="w-4 h-4 ml-2" />
                )}
                שלח מייל איפוס
              </Button>
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                חזור להתחברות
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
