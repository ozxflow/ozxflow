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
  const match = text.match(/(?:משימה|כותרת)\s*[:\-]?\s*([^\n,]+)/i);
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
  if (/ספק|הזמנה/.test(normalized)) return "supplier_order";
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
  return `סטטוס מהיר:
- לידים: ${stats.totalLeads}
- לידים החודש: ${stats.monthLeads}
- עבודות פתוחות: ${stats.openJobs}
- משימות פתוחות: ${stats.openTasks}`;
}

async function handleFilePurpose(text, session, services) {
  const purpose = detectFilePurpose(normalizeText(text));
  if (!purpose) {
    return {
      reply: "מה לעשות עם הקובץ? אפשר: לשייך למשימה / להזמנת ספק / ללקוח / סתם לשמור",
      session,
    };
  }
  await services.assignFilePurpose(session.pendingFile.fileId, purpose);
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

export async function processBotInput({ text, fileMeta, session = {}, services }) {
  const input = (text || "").trim();
  const normalized = normalizeText(input);
  let nextSession = { ...session };

  if (fileMeta) {
    nextSession.pendingFile = fileMeta;
    if (!input) {
      return {
        reply: "קיבלתי את הקובץ. מה לעשות איתו? (לשייך למשימה / להזמנת ספק / ללקוח / סתם לשמור)",
        session: nextSession,
      };
    }
  }

  const intent = detectIntent(normalized);

  // Fallback mechanism: continue pending question when user answers free text.
  if (!intent && nextSession.pending) {
    nextSession = continuePendingFlow(input, nextSession);
    if (nextSession.pending?.type === "create_lead") {
      return handleCreateLead(
        `${nextSession.pending.data.name ? `שם: ${nextSession.pending.data.name}\n` : ""}${nextSession.pending.data.phone ? `טלפון: ${nextSession.pending.data.phone}` : ""}`,
        nextSession,
        services
      );
    }
    if (nextSession.pending?.type === "create_task") {
      return handleCreateTask(`כותרת: ${nextSession.pending.data.title || ""}`, nextSession, services);
    }
  }

  if (nextSession.pendingFile && (!intent || intent === "file_action")) {
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

  // Q&A fallback: should include org-specific + global (NULL org_id).
  const qa = await services.searchQA(input);
  if (qa) {
    return { reply: qa.answer, session: nextSession };
  }

  return {
    reply: "לא הבנתי לגמרי. אפשר לבקש: יצירת ליד, חיפוש ליד/לקוח, סטטיסטיקות, יצירת משימה, או לצרף קובץ ולומר מה לעשות איתו.",
    session: nextSession,
  };
}
