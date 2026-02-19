function normalizeText(value = "") {
  return value
    .toLowerCase()
    .replace(/[^\u0590-\u05FFa-z0-9\s\-:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractName(text) {
  const match = text.match(/(?:שם|לקוח|ליד)\s*[:\-]?\s*([^\n,]+)/i);
  return match?.[1]?.trim() || "";
}

function extractPhone(text) {
  const match = text.match(/(?:טלפון|נייד|פלאפון)\s*[:\-]?\s*([0-9\-\s]{7,})/i);
  return match?.[1]?.replace(/\D/g, "") || "";
}

function extractTaskTitle(text) {
  const match =
    text.match(/(?:כותרת|משימה)\s*[:\-]?\s*([^\n,]+)/i) ||
    text.match(/(?:בשם|שם)\s+([^\n,]+)/i);
  return match?.[1]?.trim() || "";
}

function extractLeadHint(text) {
  const match =
    text.match(/(?:על הליד|לליד|ליד)\s*[:\-]?\s*([^\n,]+)/i) ||
    text.match(/(?:עבור)\s+([^\n,]+)/i);
  return match?.[1]?.trim() || "";
}

function detectIntent(normalized) {
  if (/(הוסף|מוסיף|להוסיף|צור|יוצר|ליצור).*(ליד|לקוח פוטנציאלי)/.test(normalized)) {
    return "create_lead";
  }
  if (/(חפש|תחפש|תמצא|מצא|בדוק).*(ליד|לקוח)/.test(normalized)) {
    return "search_contact";
  }
  if (/(סטטיסטיקה|דשבורד|כמה לידים|מצב חודשי|דוח)/.test(normalized)) {
    return "dashboard_stats";
  }
  if (/(הוסף|מוסיף|צור|ליצור).*(משימה)/.test(normalized)) {
    return "create_task";
  }
  if (/(לשייך|שיוך|שמור קובץ|לקובץ|קובץ)/.test(normalized)) {
    return "file_action";
  }
  return null;
}

function detectFilePurpose(normalized) {
  if (/משימה/.test(normalized)) return "task";
  if (/הזמנת ספק|ספק|הזמנה/.test(normalized)) return "supplier_order";
  if (/ליד|פוטנציאלי/.test(normalized)) return "lead";
  if (/לקוח/.test(normalized)) return "customer";
  if (/שמור|ארכיון|סתם/.test(normalized)) return "archive";
  return null;
}

async function handleCreateLead(text, session, services) {
  const next = { ...session, pending: { type: "create_lead", data: { ...(session.pending?.data || {}) } } };

  if (!next.pending.data.name) next.pending.data.name = extractName(text);
  if (!next.pending.data.phone) next.pending.data.phone = extractPhone(text);

  if (!next.pending.data.name) {
    return { reply: "מה שם הליד?", session: next };
  }
  if (!next.pending.data.phone) {
    return { reply: "מה הטלפון של הליד?", session: next };
  }

  const created = await services.createLead({
    customer_name: next.pending.data.name,
    customer_phone: next.pending.data.phone,
    status: "חדש",
    created_date: new Date().toISOString(),
  });

  return {
    reply: `הליד נוצר בהצלחה: ${created.customer_name} (${created.customer_phone}).`,
    session: { ...session, pending: null },
    lead: created,
  };
}

async function handleCreateTask(text, session, services) {
  const next = { ...session, pending: { type: "create_task", data: { ...(session.pending?.data || {}) } } };
  if (!next.pending.data.title) next.pending.data.title = extractTaskTitle(text);

  if (!next.pending.data.title) {
    return { reply: "מה כותרת המשימה?", session: next };
  }

  const created = await services.createTask({
    title: next.pending.data.title,
    status: "פתוח",
    created_date: new Date().toISOString(),
  });

  return {
    reply: `המשימה נוצרה: ${created.title}`,
    session: { ...session, pending: null },
    task: created,
  };
}

async function handleSearch(text, services) {
  const raw = extractName(text) || text.replace(/.*(ליד|לקוח)\s*/i, "").trim();
  const term = normalizeText(raw);
  const results = await services.searchContacts(term);
  if (!results.length) {
    return `לא מצאתי תוצאה עבור "${raw}".`;
  }
  const top = results
    .slice(0, 5)
    .map((r) => `- ${r.customer_name || r.full_name} (${r.customer_phone || r.phone || "-"})`);
  return `מצאתי ${results.length} תוצאות:\n${top.join("\n")}`;
}

async function handleStats(services) {
  const stats = await services.getDashboardStats();
  return `סטטוס מהיר:\n- לידים: ${stats.totalLeads}\n- לידים החודש: ${stats.monthLeads}\n- עבודות פתוחות: ${stats.openJobs}\n- משימות פתוחות: ${stats.openTasks}`;
}

async function handleFilePurpose(text, session, services, extra = {}) {
  const purpose = extra.forcedPurpose || detectFilePurpose(normalizeText(text));
  if (!purpose) {
    return {
      reply: "מה לעשות עם הקובץ? אפשר: לשייך למשימה / להזמנת ספק / לליד / ללקוח / סתם לשמור",
      session,
    };
  }

  const taskTitle = purpose === "task" ? extractTaskTitle(text) : "";
  const leadQuery = purpose === "lead" ? (extra.leadQuery || extractLeadHint(text)) : "";

  if (purpose === "lead" && !extra.leadId) {
    const searchTerm = leadQuery || extractName(text) || extractPhone(text);
    if (!searchTerm) {
      return {
        reply: "כדי לשייך לליד, כתוב שם ליד או טלפון. אני אציג לך כפתורי בחירה.",
        session,
      };
    }

    const allMatches = await services.searchContacts(searchTerm);
    const leadCandidates = (allMatches || [])
      .filter((row) => row?.customer_name || row?.customer_phone)
      .slice(0, 5)
      .map((row) => ({
        id: row.id,
        name: row.customer_name || "ליד ללא שם",
        phone: row.customer_phone || "",
      }));

    if (!leadCandidates.length) {
      return {
        reply: `לא מצאתי ליד לפי "${searchTerm}". נסה שם/טלפון אחר.`,
        session,
      };
    }

    return {
      reply: "מצאתי את הלידים הבאים. בחר את הליד לעדכון:",
      session,
      ui: { lead_candidates: leadCandidates },
    };
  }

  const result = await services.assignFilePurpose(session.pendingFile.fileId, purpose, {
    taskTitle,
    leadId: extra.leadId || null,
    leadQuery,
    customerId: extra.customerId || null,
  });

  if (purpose === "task" && result?.task?.title) {
    return {
      reply: `הקובץ נשמר ושויך למשימה: "${result.task.title}".`,
      session: { ...session, pendingFile: null },
    };
  }

  if (purpose === "lead" && (result?.linked_entity_id || extra.leadId)) {
    return {
      reply: "הקובץ נשמר ושויך לליד בהצלחה.",
      session: { ...session, pendingFile: null },
    };
  }

  if (purpose === "lead" && !result?.linked_entity_id) {
    return {
      reply: "לא מצאתי ליד לשיוך הקובץ. כתוב לי: לשייך לליד [שם ליד או טלפון].",
      session,
    };
  }

  return {
    reply: "הקובץ נשמר בהצלחה.",
    session: { ...session, pendingFile: null },
  };
}

function continuePendingFlow(input, session) {
  if (!input) return session;
  if (session.pending?.type === "create_lead") {
    const data = { ...(session.pending.data || {}) };
    if (!data.name) data.name = input;
    else if (!data.phone) data.phone = input.replace(/\D/g, "");
    return { ...session, pending: { type: "create_lead", data } };
  }
  if (session.pending?.type === "create_task") {
    const data = { ...(session.pending.data || {}) };
    if (!data.title) data.title = input;
    return { ...session, pending: { type: "create_task", data } };
  }
  return session;
}

export async function processBotInput({ text, fileMeta, action = null, session = {}, services }) {
  const input = (text || "").trim();
  const normalized = normalizeText(input);
  let nextSession = { ...session };

  if (action?.type === "attach_file_to_lead") {
    if (!nextSession.pendingFile?.fileId) {
      return {
        reply: "אין כרגע קובץ ממתין לשיוך. העלה קובץ ואז נמשיך.",
        session: nextSession,
      };
    }
    return handleFilePurpose("", nextSession, services, {
      forcedPurpose: "lead",
      leadId: action.leadId,
    });
  }

  if (fileMeta) {
    nextSession.pendingFile = fileMeta;
    if (!input) {
      return {
        reply: "קיבלתי את הקובץ. מה לעשות איתו? (לשייך למשימה / להזמנת ספק / לליד / ללקוח / סתם לשמור)",
        session: nextSession,
      };
    }
  }

  const intent = detectIntent(normalized);

  if (!intent && nextSession.pending) {
    nextSession = continuePendingFlow(input, nextSession);
    if (nextSession.pending?.type === "create_lead") {
      const leadFlow = await handleCreateLead(
        `${nextSession.pending.data.name ? `שם: ${nextSession.pending.data.name}\n` : ""}${nextSession.pending.data.phone ? `טלפון: ${nextSession.pending.data.phone}` : ""}`,
        nextSession,
        services
      );

      if (nextSession.pendingFile && leadFlow?.lead?.id) {
        const fileResult = await handleFilePurpose(input, leadFlow.session, services, {
          forcedPurpose: "lead",
          leadId: leadFlow.lead.id,
        });
        return {
          reply: `${leadFlow.reply}\n${fileResult.reply}`,
          session: fileResult.session,
        };
      }

      return leadFlow;
    }
    if (nextSession.pending?.type === "create_task") {
      return handleCreateTask(`כותרת: ${nextSession.pending.data.title || ""}`, nextSession, services);
    }
  }

  if (nextSession.pendingFile && intent === "create_lead") {
    const leadFlow = await handleCreateLead(input, nextSession, services);
    if (leadFlow?.lead?.id) {
      const fileResult = await handleFilePurpose(input, leadFlow.session, services, {
        forcedPurpose: "lead",
        leadId: leadFlow.lead.id,
      });
      return {
        reply: `${leadFlow.reply}\n${fileResult.reply}`,
        session: fileResult.session,
      };
    }
    return leadFlow;
  }

  if (nextSession.pendingFile && (!intent || intent === "file_action" || intent === "create_task")) {
    return handleFilePurpose(input, nextSession, services);
  }

  if (intent === "create_lead") {
    return handleCreateLead(input, nextSession, services);
  }
  if (intent === "create_task") {
    return handleCreateTask(input, nextSession, services);
  }
  if (intent === "search_contact") {
    return { reply: await handleSearch(input, services), session: nextSession };
  }
  if (intent === "dashboard_stats") {
    return { reply: await handleStats(services), session: nextSession };
  }

  const qa = await services.searchQA(input);
  if (qa) {
    return { reply: qa.answer, session: nextSession };
  }

  return {
    reply: "לא הבנתי לגמרי. אפשר לבקש: יצירת ליד, חיפוש ליד/לקוח, סטטיסטיקות, יצירת משימה, או לצרף קובץ ולומר מה לעשות איתו.",
    session: nextSession,
  };
}
