import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp, Users, CheckCircle, Calendar, XCircle, Target, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, isWithinInterval } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

export default function MarketingFunnel({ leads: allLeads, timeRange: parentTimeRange }) {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("month");
  const [questionnaireFilter, setQuestionnaireFilter] = useState("all");
  const [date, setDate] = useState();

  // סינון לידים לפי תאריכים ושאלון
  const leads = useMemo(() => {
    let filtered = [...allLeads];
    
    // סינון לפי תאריך
    const now = new Date();
    let interval;
    
    switch (timeRange) {
      case "week":
        interval = { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
        break;
      case "month":
        interval = { start: startOfMonth(now), end: endOfMonth(now) };
        break;
      case "quarter":
        interval = { start: startOfQuarter(now), end: endOfQuarter(now) };
        break;
      case "custom":
        if (date?.from && date?.to) {
          interval = { start: date.from, end: date.to };
        }
        break;
      case "all":
        interval = null;
        break;
    }
    
    if (interval) {
      filtered = filtered.filter(l => {
        const dateToFilter = l.created_date || l.updated_date;
        if (!dateToFilter) return false;
        return isWithinInterval(new Date(dateToFilter), interval);
      });
    }
    
    // סינון לפי שאלון
    if (questionnaireFilter === "yes") {
      filtered = filtered.filter(l => l.filled_questionnaire === true);
    } else if (questionnaireFilter === "no") {
      filtered = filtered.filter(l => l.filled_questionnaire !== true);
    }
    
    return filtered;
  }, [allLeads, timeRange, questionnaireFilter, date]);

  // חישוב שלבי המשפך
  const totalLeads = leads.length;
  
  // רלוונטים - כל הלידים פרט ל"לא רלוונטי"
  const relevantLeads = leads.filter(l => l.status !== "לא רלוונטי");
  
  // נקבעה פגישה
  const scheduledMeetingLeads = leads.filter(l => 
    l.status === "נקבעה פגישה" || 
    l.status === "התקיימה פגישה" || 
    l.status === "לא סגר" || 
    l.status === "סגר"
  );
  
  // התקיימה פגישה
  const completedMeetingLeads = leads.filter(l => 
    l.status === "התקיימה פגישה" || 
    l.status === "לא סגר" || 
    l.status === "סגר"
  );
  
  // לא סגר
  const lostLeads = leads.filter(l => l.status === "לא סגר");
  
  // סגר
  const wonLeads = leads.filter(l => l.status === "סגר");

  const stages = [
    {
      name: "לידים חדשים",
      count: totalLeads,
      percentage: 100,
      color: "from-blue-500 to-blue-600",
      icon: Users,
      filter: "all"
    },
    {
      name: "רלוונטים",
      count: relevantLeads.length,
      percentage: totalLeads > 0 ? Math.round((relevantLeads.length / totalLeads) * 100) : 0,
      color: "from-green-500 to-green-600",
      icon: CheckCircle,
      filter: "relevant"
    },
    {
      name: "נקבעה פגישה",
      count: scheduledMeetingLeads.length,
      percentage: totalLeads > 0 ? Math.round((scheduledMeetingLeads.length / totalLeads) * 100) : 0,
      color: "from-yellow-500 to-yellow-600",
      icon: Calendar,
      filter: "scheduled"
    },
    {
      name: "התקיימה פגישה",
      count: completedMeetingLeads.length,
      percentage: totalLeads > 0 ? Math.round((completedMeetingLeads.length / totalLeads) * 100) : 0,
      color: "from-purple-500 to-purple-600",
      icon: CheckCircle,
      filter: "completed"
    },
    {
      name: "לא סגר",
      count: lostLeads.length,
      percentage: totalLeads > 0 ? Math.round((lostLeads.length / totalLeads) * 100) : 0,
      color: "from-orange-500 to-orange-600",
      icon: XCircle,
      filter: "lost"
    },
    {
      name: "סגר",
      count: wonLeads.length,
      percentage: totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0,
      color: "from-emerald-500 to-emerald-600",
      icon: Target,
      filter: "won"
    }
  ];

  const handleStageClick = (filter) => {
    // נווט לעמוד הלידים עם הסינון המתאים
    const params = new URLSearchParams();
    
    if (filter !== "all") {
      params.set("filter", filter);
    }
    
    // הוסף פילטר תאריך אם קיים
    if (timeRange && timeRange !== "all") {
      params.set("timeRange", timeRange);
    }
    
    const url = `${createPageUrl("Leads")}${params.toString() ? `?${params.toString()}` : ""}`;
    navigate(url);
  };

  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card className="border-none shadow-lg bg-white overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-6 h-6 text-green-600" />
          <h2 className="text-2xl font-bold text-slate-900">משפך שיווקי</h2>
        </div>

        {/* סינונים */}
        <div className="space-y-4 mb-6 p-4 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-semibold text-slate-700">סינונים</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-slate-600 mb-2 block">תקופה</label>
              <Tabs value={timeRange} onValueChange={(value) => {
                setTimeRange(value);
                if (value !== 'custom') setDate(undefined);
              }}>
                <TabsList className="grid w-full grid-cols-4 bg-white">
                  <TabsTrigger value="week">שבוע</TabsTrigger>
                  <TabsTrigger value="month">חודש</TabsTrigger>
                  <TabsTrigger value="quarter">רבעון</TabsTrigger>
                  <TabsTrigger value="all">הכל</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1">
              <label className="text-xs text-slate-600 mb-2 block">שאלון</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={questionnaireFilter === "all" ? "default" : "outline"}
                  onClick={() => setQuestionnaireFilter("all")}
                  className="flex-1"
                >
                  הכל
                </Button>
                <Button
                  size="sm"
                  variant={questionnaireFilter === "yes" ? "default" : "outline"}
                  onClick={() => setQuestionnaireFilter("yes")}
                  className="flex-1"
                >
                  מילא
                </Button>
                <Button
                  size="sm"
                  variant={questionnaireFilter === "no" ? "default" : "outline"}
                  onClick={() => setQuestionnaireFilter("no")}
                  className="flex-1"
                >
                  לא מילא
                </Button>
              </div>
            </div>

            <div className="flex-1">
              <label className="text-xs text-slate-600 mb-2 block">טווח תאריכים מותאם</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-right">
                    {date?.from ? (
                      date.to ? (
                        <>{format(date.from, "dd/MM")} - {format(date.to, "dd/MM")}</>
                      ) : (
                        format(date.from, "dd/MM/yyyy")
                      )
                    ) : (
                      <span className="text-slate-500">בחר תאריכים</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={date}
                    onSelect={(newDate) => {
                      setDate(newDate);
                      if (newDate?.from && newDate?.to) {
                        setTimeRange("custom");
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="space-y-1 relative">
          {stages.map((stage, index) => {
            const width = 100 - (index * 10); // כל שלב קטן יותר
            const StageIcon = stage.icon;
            
            // צבעי רקע לכל שלב
            const bgColors = [
              "from-cyan-500 to-cyan-600",
              "from-rose-500 to-rose-600", 
              "from-emerald-500 to-emerald-600",
              "from-purple-500 to-purple-600",
              "from-orange-500 to-orange-600",
              "from-green-500 to-green-600"
            ];

            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleStageClick(stage.filter)}
                className="cursor-pointer group relative"
                style={{
                  width: `${width}%`,
                  margin: '0 auto'
                }}
              >
                <div 
                  className={`relative h-24 bg-gradient-to-r ${bgColors[index]} rounded-lg shadow-xl group-hover:shadow-2xl transition-all overflow-hidden`}
                  style={{
                    clipPath: index < stages.length - 1 ? 'polygon(0 0, 100% 0, 95% 100%, 5% 100%)' : 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)'
                  }}
                >
                  {/* גלייז/זוהר */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent"></div>
                  
                  <div className="relative h-full flex items-center justify-between px-8">
                    {/* צד ימין - אייקון ושם */}
                    <div className="flex items-center gap-4">
                      <div className="bg-white/30 backdrop-blur-sm p-3 rounded-xl">
                        <StageIcon className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-white">{stage.name}</p>
                        <p className="text-sm text-white/80">שלב #{index + 1}</p>
                      </div>
                    </div>
                    
                    {/* צד שמאל - מספרים */}
                    <div className="text-left">
                      <p className="text-4xl font-black text-white drop-shadow-lg">{stage.count}</p>
                      <p className="text-xl font-bold text-white/90">{stage.percentage}%</p>
                    </div>
                  </div>
                </div>

                {/* חץ המרה */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <div className="bg-slate-200 px-4 py-1 rounded-full text-slate-700 text-sm font-semibold shadow-sm">
                      {stages[index + 1].count > 0 && stage.count > 0 
                        ? `↓ ${Math.round((stages[index + 1].count / stage.count) * 100)}% המרה`
                        : "↓ 0% המרה"
                      }
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-600 text-center">
            💡 לחץ על כל שלב במשפך כדי לראות את הלידים המתאימים
          </p>
        </div>
      </CardContent>
    </Card>
  );
}