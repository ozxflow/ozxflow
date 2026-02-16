import React from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function SubscriptionBell({ subscriptionEndDate }) {
  if (!subscriptionEndDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(subscriptionEndDate);
  endDate.setHours(0, 0, 0, 0);
  
  const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

  if (daysLeft > 7) return null;

  const isUrgent = daysLeft <= 3;
  const isExpired = daysLeft < 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className={`w-6 h-6 ${isUrgent || isExpired ? 'text-red-600 animate-pulse' : 'text-orange-500'}`} />
          {daysLeft >= 0 && (
            <Badge className={`absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs ${
              isUrgent ? 'bg-red-600' : 'bg-orange-500'
            }`}>
              {daysLeft}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <h4 className="font-bold text-slate-900">
            {isExpired ? '⚠️ המנוי פג' : '🔔 תזכורת מנוי'}
          </h4>
          <p className="text-sm text-slate-600">
            {isExpired 
              ? 'המנוי שלך פג. חדש עכשיו כדי להמשיך להשתמש במערכת.'
              : `נותרו ${daysLeft} ${daysLeft === 1 ? 'יום' : 'ימים'} עד תום המנוי.`
            }
          </p>
          <p className="text-xs text-slate-500">
            תאריך סיום: {new Date(subscriptionEndDate).toLocaleDateString('he-IL')}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}