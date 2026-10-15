/**
 * REPORT-IT Google Apps Script backend
 * Sheet columns:
 * A TICKET | B DATE/TIME | C USER | D DEPARTMENT | E SUBJECT
 * F DESCRIPTION | G NameReport | H STATUS | I IMAGE
 */
const SPREADSHEET_ID = "1m42Pci0v8q3Ilednss5CoR1jmS2qbXR58LpKo0xCu9k";
const ISSUE_SHEET_NAME = "Reports";
const NOTIFY_EMAIL = "it@kftc.co.th";
const TIME_ZONE = "Asia/Bangkok";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function doPost(e) {
  let result;
  try {
    if (!e || !e.parameter) throw new Error("ไม่พบข้อมูลที่ส่งเข้ามา");
    const data = e.parameter.payload ? JSON.parse(e.parameter.payload) : e.parameter;
    const action = String(data.action || e.parameter.action || "createIssue");
    if (action === "createIssue" || action === "addIssue") {
      result = createIssue(data);
    } else if (action === "updateStatus") {
      result = updateStatus(data);
    } else {
      result = { success: false, message: "ไม่พบ Action ที่รองรับ: " + action };
    }
  } catch (error) {
    console.error("doPost error: " + (error.stack || error));
    result = { success: false, message: String(error.message || error) };
  }
  return htmlResponse_(result);
}

function doGet(e) {
  try {
    const action = e && e.parameter ? String(e.parameter.action || "") : "";
    if (action !== "getIssues") {
      return json({ success: false, message: "Invalid action" });
    }

    const sheet = getIssueSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return json({ success: true, data: [] });

    const values = sheet.getRange(1, 1, lastRow, Math.max(9, sheet.getLastColumn())).getDisplayValues();
    const headers = values[0].map(normalizeHeader_);
    const issues = values.slice(1)
      .filter(row => row.some(value => String(value).trim() !== ""))
      .map(row => {
        const get = aliases => {
          const index = headers.findIndex(header => aliases.includes(header));
          return index >= 0 ? String(row[index] || "") : "";
        };
        return {
          "TICKET": get(["TICKET"]),
          "DATE/TIME": get(["DATE/TIME", "DATE", "DATETIME"]),
          "USER": get(["USER", "USERNAME"]),
          "DEPARTMENT": get(["DEPARTMENT", "DEPT"]),
          "SUBJECT": get(["SUBJECT", "CATEGORY", "ISSUE TYPE"]),
          "DESCRIPTION": get(["DESCRIPTION", "DETAIL"]),
          "ชื่อผู้แจ้งปัญหา": get(["ชื่อผู้แจ้งปัญหา", "NAMEREPORT", "REPORTERNAME"]),
          "STATUS": get(["STATUS"]),
          "IMAGE": get(["IMAGE", "IMAGE URL", "IMAGEURL"])
        };
      });
    return json({ success: true, data: issues });
  } catch (error) {
    console.error("doGet error: " + (error.stack || error));
    return json({ success: false, message: String(error.message || error) });
  }
}

function createIssue(data) {
  try {
    if (!data) throw new Error("ไม่พบข้อมูลแจ้งปัญหา");
    const category = String(data.category || data.issueType || "").trim();
    const description = String(data.description || "").trim();
    const reporterName = String(data.reporterName || data.nameReport || data.fullname || "").trim();
    if (!category) throw new Error("กรุณาเลือกประเภทปัญหา");
    if (!description) throw new Error("กรุณากรอกรายละเอียดปัญหา");
    if (!reporterName) throw new Error("กรุณากรอกชื่อผู้แจ้งปัญหา");

    const sheet = getIssueSheet_();
    const ticket = String(data.ticket || createTicketNumber_());
    const dateTime = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss");
    const user = String(data.user || "");
    const department = String(data.department || "");
    const status = String(data.status || "รอดำเนินการ");
    const imageData = String(data.image || "");

    let imageUrl = "";
    if (imageData) imageUrl = saveImageToDrive_(imageData, ticket);

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    let savedRow;
    try {
      sheet.appendRow([ticket, dateTime, user, department, category, description, reporterName, status, imageUrl]);
      SpreadsheetApp.flush();
      savedRow = sheet.getLastRow();
    } finally {
      lock.releaseLock();
    }

    let emailSent = false;
    let emailError = "";
    try {
      sendIssueEmail_({ ticket, dateTime, user, department, category, description, reporterName, status, imageUrl });
      emailSent = true;
    } catch (error) {
      emailError = String(error.message || error);
      console.error("Email error: " + emailError);
    }

    return {
      success: true,
      message: imageUrl
        ? "บันทึกข้อมูลและรูปภาพลงระบบสำเร็จ"
        : "บันทึกข้อมูลลง Google Sheets สำเร็จ",
      ticket: ticket,
      savedRow: savedRow,
      imageUrl: imageUrl,
      emailSent: emailSent,
      emailError: emailError
    };
  } catch (error) {
    console.error("createIssue error: " + (error.stack || error));
    return { success: false, message: String(error.message || "ไม่สามารถบันทึกข้อมูลได้") };
  }
}

function updateStatus(data) {
  try {
    const ticket = String(data.ticket || "").trim();
    const status = String(data.status || "").trim();
    const allowedStatuses = ["รอดำเนินการ", "เสร็จสิ้น"];
    if (!ticket) throw new Error("ไม่พบ Ticket");
    if (!allowedStatuses.includes(status)) throw new Error("สถานะไม่ถูกต้อง");

    const sheet = getIssueSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("ยังไม่มีรายการแจ้งปัญหา");
    const tickets = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    for (let i = 0; i < tickets.length; i++) {
      if (String(tickets[i][0]).trim() === ticket) {
        sheet.getRange(i + 2, 8).setValue(status);
        SpreadsheetApp.flush();
        return { success: true, message: "อัปเดตสถานะสำเร็จ", ticket: ticket, status: status };
      }
    }
    throw new Error("ไม่พบ Ticket: " + ticket);
  } catch (error) {
    console.error("updateStatus error: " + (error.stack || error));
    return { success: false, message: String(error.message || error) };
  }
}

function getIssueSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(ISSUE_SHEET_NAME);
  if (!sheet) throw new Error("ไม่พบชีต " + ISSUE_SHEET_NAME + " ใน " + ss.getName());
  if (sheet.getLastColumn() < 9) sheet.getRange(1, 9).setValue("IMAGE");
  return sheet;
}

function saveImageToDrive_(dataUrl, ticket) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) throw new Error("รูปภาพมีรูปแบบไม่ถูกต้อง กรุณาเลือกไฟล์รูปภาพใหม่");
  const mimeType = match[1].toLowerCase();
  const bytes = Utilities.base64Decode(match[2]);
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 5 MB");

  const extensionMap = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif"
  };
  const extension = extensionMap[mimeType];
  if (!extension) throw new Error("รองรับเฉพาะรูป JPG, PNG, WEBP หรือ GIF");
  const safeTicket = ticket.replace(/[^a-zA-Z0-9_-]/g, "_");
  const blob = Utilities.newBlob(bytes, mimeType, safeTicket + "." + extension);
  const file = DriveApp.createFile(blob);
  // Dashboard เป็น GitHub Pages จึงต้องเปิดดูไฟล์ผ่านลิงก์ได้
  // โปรดอย่าแนบรูปที่มีข้อมูลลับ/ข้อมูลส่วนบุคคลอ่อนไหว
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return "https://drive.google.com/uc?export=view&id=" + file.getId();
}

function sendIssueEmail_(issue) {
  if (!NOTIFY_EMAIL) return;
  const body = [
    "มีการแจ้งปัญหาใหม่เข้าระบบ Report-IT", "",
    "Ticket: " + issue.ticket,
    "วันที่แจ้ง: " + issue.dateTime,
    "ผู้ใช้: " + (issue.user || "-"),
    "ชื่อผู้แจ้งปัญหา: " + (issue.reporterName || "-"),
    "แผนก: " + (issue.department || "-"),
    "ประเภทปัญหา: " + (issue.category || "-"),
    "สถานะ: " + (issue.status || "รอดำเนินการ"), "",
    "รายละเอียดปัญหา:", issue.description || "-",
    issue.imageUrl ? "รูปภาพ: " + issue.imageUrl : "",
    "", "Report-IT System / IT Support"
  ].join("\n");
  MailApp.sendEmail({ to: NOTIFY_EMAIL, subject: "IT Issue ใหม่ | " + issue.ticket, body: body });
}

function htmlResponse_(result) {
  const safeJson = JSON.stringify(result)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
    'window.top.postMessage({type:"REPORT_IT_RESULT",result:' + safeJson + '},"*");' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function normalizeHeader_(value) {
  return String(value || "").trim().toUpperCase();
}

function createTicketNumber_() {
  return "IT-" + Utilities.formatDate(new Date(), TIME_ZONE, "yyyyMMdd-HHmmss") +
    "-" + Math.floor(Math.random() * 900 + 100);
}
