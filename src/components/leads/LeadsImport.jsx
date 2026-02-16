import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, AlertCircle, CheckCircle, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function LeadsImport({ open, onOpenChange, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState(1); // 1: upload, 2: mapping, 3: preview/import
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("רשום לאתר הרכב");
  const { toast } = useToast();

  const availableStatuses = [
    "רשום לאתר הרכב",
    "מודעת דרוש",
    "מודעת רכב",
    "נרשם לוובינר",
    "קיבל הקלטה",
    "רכש קורס",
    "לידים לליווי המלא",
    "רכש ליווי מלא",
    "לא סגר ליווי",
    "לא רלוונטי"
  ];

  const leadFields = [
    { value: "customer_name", label: "שם איש קשר" },
    { value: "customer_phone", label: "טלפון" },
    { value: "customer_email", label: "אימייל" },
    { value: "company_name", label: "שם עסק" },
    { value: "age", label: "גיל" },
    { value: "lead_rating", label: "דירוג חום" },
    { value: "status", label: "סטטוס" },
    { value: "traffic_source", label: "מקור הגעה" },
    { value: "conversion_source", label: "מקור המרה" },
    { value: "registration_source", label: "מקור הרשמה" },
    { value: "ad_method", label: "שיטת פירסום" },
    { value: "lead_source_type", label: "סוג מקור הליד" },
    { value: "car_looking_for", label: "רכב מחפש" },
    { value: "budget", label: "תקציב" },
    { value: "car_selling", label: "רכב מוכר" },
    { value: "asking_price", label: "מחיר דרישה" },
    { value: "actual_value", label: "שווי עסקה" },
    { value: "notes", label: "הערות" },
    { value: "skip", label: "דלג על עמודה זו" }
  ];

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: "שגיאה", description: "יש לבחור קובץ CSV בלבד", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast({ title: "שגיאה", description: "הקובץ ריק", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });

      setCsvHeaders(headers);
      setCsvData(dataRows);
      
      // ניסיון מיפוי אוטומטי
      const autoMapping = {};
      headers.forEach(header => {
        const normalized = header.toLowerCase().trim();
        if (normalized.includes('name') || normalized.includes('שם')) autoMapping[header] = 'customer_name';
        else if (normalized.includes('phone') || normalized.includes('טלפון')) autoMapping[header] = 'customer_phone';
        else if (normalized.includes('email') || normalized.includes('מייל')) autoMapping[header] = 'customer_email';
        else if (normalized.includes('company') || normalized.includes('חברה') || normalized.includes('עסק')) autoMapping[header] = 'company_name';
        else if (normalized.includes('age') || normalized.includes('גיל')) autoMapping[header] = 'age';
        else if (normalized.includes('note') || normalized.includes('הערה')) autoMapping[header] = 'notes';
        else if (normalized.includes('status') || normalized.includes('סטטוס')) autoMapping[header] = 'status';
        else autoMapping[header] = 'skip';
      });
      
      setMapping(autoMapping);
      setStep(2);
    };
    
    reader.readAsText(selectedFile);
  };

  const validateAndImport = async () => {
    setImporting(true);
    const errors = [];
    const successLeads = [];
    
    try {
      const allLeads = await supabase.entities.Lead.list();
      const maxSerial = allLeads.reduce((max, lead) => {
        if (lead.serial_number && lead.serial_number.startsWith('1')) {
          const num = parseInt(lead.serial_number.substring(1), 10);
          if (!isNaN(num)) return num > max ? num : max;
        }
        return max;
      }, 0);
      
      let currentSerial = maxSerial;

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const leadData = {
          status: selectedStatus,
          traffic_source: "אחר",
          conversion_source: "אחר",
          registration_source: "אחר",
          ad_method: "אורגני",
          filled_questionnaire: false,
          questionnaire: {},
          actual_value: 0
        };
        
        const rowErrors = [];
        
        // מיפוי הנתונים
        Object.keys(mapping).forEach(csvHeader => {
          const leadField = mapping[csvHeader];
          if (leadField === 'skip') return;
          
          const value = row[csvHeader];
          
          if (leadField === 'customer_phone') {
            if (value) {
              let cleanPhone = value.replace(/\D/g, '');
              if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
              if (cleanPhone.length >= 9) {
                leadData[leadField] = cleanPhone;
              } else {
                rowErrors.push(`טלפון לא תקין: ${value}`);
              }
            }
          } else if (leadField === 'age' || leadField === 'budget' || leadField === 'asking_price' || leadField === 'actual_value') {
            if (value) {
              const num = parseFloat(value);
              if (!isNaN(num)) {
                leadData[leadField] = num;
              }
            }
          } else {
            if (value) {
              leadData[leadField] = value;
            }
          }
        });
        
        // ולידציה בסיסית
        if (!leadData.customer_name && !leadData.customer_phone) {
          rowErrors.push("חסר שם ו/או טלפון");
        }
        
        if (rowErrors.length > 0) {
          errors.push({
            row: i + 2, // +2 כי שורה 1 זה הכותרות ו-array מתחיל מ-0
            data: row,
            errors: rowErrors
          });
        } else {
          try {
            currentSerial++;
            const newSerial = `1${String(currentSerial).padStart(4, '0')}`;
            const now = new Date().toISOString();
            
            const createdLead = await supabase.entities.Lead.create({
              ...leadData,
              serial_number: newSerial,
              registration_date: now,
              initial_registration_date: now,
              created_date: now
            });
            
            successLeads.push({ row: i + 2, lead: createdLead });
          } catch (error) {
            errors.push({
              row: i + 2,
              data: row,
              errors: [`שגיאת שרת: ${error.message}`]
            });
          }
        }
      }
      
      setImportResults({
        success: successLeads.length,
        errors: errors.length,
        errorDetails: errors
      });
      
      setStep(3);
      
      if (errors.length === 0) {
        toast({ title: `✓ יובאו ${successLeads.length} לידים בהצלחה!` });
        setTimeout(() => {
          onImportComplete();
          handleClose();
        }, 2000);
      }
      
    } catch (error) {
      toast({ title: "שגיאה כללית", description: error.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setCsvHeaders([]);
    setCsvData([]);
    setMapping({});
    setStep(1);
    setImporting(false);
    setImportResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            יבוא לידים מ-CSV
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <Label htmlFor="csv-file" className="cursor-pointer">
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-slate-700">בחר קובץ CSV</p>
                  <p className="text-sm text-slate-500">או גרור ושחרר כאן</p>
                </div>
              </Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button asChild className="mt-4 bg-blue-600 hover:bg-blue-700">
                <Label htmlFor="csv-file" className="cursor-pointer">
                  <Upload className="w-4 h-4 ml-2" />
                  בחר קובץ
                </Label>
              </Button>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">💡 טיפים ליבוא מוצלח:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• הקובץ חייב להיות בפורמט CSV</li>
                <li>• השורה הראשונה צריכה להכיל כותרות עמודות</li>
                <li>• טלפון ושם לקוח הם שדות מומלצים</li>
                <li>• ניתן לדלג על עמודות שלא רלוונטיות</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-slate-900">
                  נמצאו {csvData.length} שורות, {csvHeaders.length} עמודות
                </p>
              </div>
            </div>

            <h3 className="font-bold text-lg mb-4">התאם עמודות מהקובץ לשדות במערכת:</h3>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg mb-4 border-2 border-blue-300">
              <Label className="text-base font-semibold text-slate-900 mb-2 block">
                📌 באיזה סטטוס ליצור את הלידים? *
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="text-right bg-white" dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {availableStatuses.map(status => (
                    <SelectItem key={status} value={status} className="text-right">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-600 mt-2">כל הלידים המיובאים יוגדרו עם סטטוס זה</p>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4">
              {csvHeaders.map(header => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center bg-slate-50 p-3 rounded-lg">
                  <div>
                    <Label className="text-sm font-semibold text-slate-700">
                      עמודה בקובץ: <span className="text-blue-600">{header}</span>
                    </Label>
                    <p className="text-xs text-slate-500 mt-1">
                      דוגמה: {csvData[0]?.[header] || 'אין ערך'}
                    </p>
                  </div>
                  <Select
                    value={mapping[header] || 'skip'}
                    onValueChange={(value) => setMapping({...mapping, [header]: value})}
                  >
                    <SelectTrigger className="text-right" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {leadFields.map(field => (
                        <SelectItem key={field.value} value={field.value} className="text-right">
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && importResults && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-600 mb-2" />
                  <p className="text-3xl font-bold text-green-700">{importResults.success}</p>
                  <p className="text-sm text-green-600">יובאו בהצלחה</p>
                </CardContent>
              </Card>
              
              <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-red-600 mb-2" />
                  <p className="text-3xl font-bold text-red-700">{importResults.errors}</p>
                  <p className="text-sm text-red-600">שגיאות</p>
                </CardContent>
              </Card>
            </div>

            {importResults.errorDetails.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-bold text-lg mb-3 text-red-700">שגיאות שנמצאו:</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {importResults.errorDetails.map((error, idx) => (
                    <Card key={idx} className="bg-red-50 border-red-300">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <Badge className="bg-red-600 text-white">שורה {error.row}</Badge>
                          <div className="flex-1">
                            <div className="text-xs text-slate-600 mb-1">
                              {Object.entries(error.data).slice(0, 3).map(([key, value]) => (
                                <span key={key} className="mr-2">
                                  <strong>{key}:</strong> {value}
                                </span>
                              ))}
                            </div>
                            <div className="space-y-1">
                              {error.errors.map((err, i) => (
                                <p key={i} className="text-sm text-red-700 font-semibold">
                                  ❌ {err}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="bg-gray-100 hover:bg-gray-200">
            {step === 3 ? 'סגור' : 'ביטול'}
          </Button>
          
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                חזור
              </Button>
              <Button onClick={validateAndImport} disabled={importing} className="bg-green-600 hover:bg-green-700">
                {importing ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
                יבא לידים
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}