/**
 * ════════════════════════════════════════════════════════════════════
 *  סקר משוב 42 → Google Sheets  |  Google Apps Script Backend
 * ════════════════════════════════════════════════════════════════════
 *  מה זה עושה:
 *  מקבל את תשובות הסקר (POST) מדף ה-GitHub Pages וכותב אותן כשורה
 *  חדשה בגיליון Google Sheets. כותרות העמודות נבנות אוטומטית לפי
 *  השאלות, ובעברית — כך שהגיליון קריא וברור.
 *
 *  התקנה (מפורט ב-README.md):
 *   1. פתחו גיליון Google Sheets חדש.
 *   2. Extensions → Apps Script, הדביקו את הקוד הזה.
 *   3. Deploy → New deployment → Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *   4. העתיקו את כתובת ה-Web App אל config.js באתר (SCRIPT_URL).
 * ════════════════════════════════════════════════════════════════════
 */

// שם הלשונית בגיליון שאליה נכתבות התשובות (תיווצר אוטומטית אם לא קיימת)
var SHEET_NAME = 'תשובות';

// עמודות המטא-דאטה הקבועות (תמיד ראשונות, לפי סדר זה)
var META_COLS = ['חותמת זמן', 'קורס', 'מזהה קורס', 'מחזור'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // מונע התנגשות בין שליחות במקביל
  try {
    // הנתונים מגיעים כפרמטר מקודד (payload) כדי לשמור על עברית תקינה (UTF-8).
    // נשמרת גם תאימות לאחור למי ששולח JSON גולמי בגוף הבקשה.
    var raw = (e.parameter && e.parameter.payload)
      ? e.parameter.payload
      : (e.postData ? e.postData.contents : '{}');
    var data = JSON.parse(raw);
    var meta = data.meta || {};
    var answers = data.answers || [];

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    // ודא שיש שורת כותרת
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(META_COLS);
      sheet.getRange(1, 1, 1, META_COLS.length)
           .setFontWeight('bold').setBackground('#33173D').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    // הוסף עמודות חדשות לכל שאלה שעדיין אין לה עמודה
    answers.forEach(function (item) {
      if (headers.indexOf(item.q) === -1) {
        headers.push(item.q);
        sheet.getRange(1, headers.length)
             .setValue(item.q).setFontWeight('bold')
             .setBackground('#7D4C90').setFontColor('#ffffff');
      }
    });

    // בנה מפה של תשובות לפי שם השאלה
    var map = {};
    answers.forEach(function (item) { map[item.q] = item.a; });

    // חותמת זמן בשעון ישראל
    var tz = ss.getSpreadsheetTimeZone() || 'Asia/Jerusalem';
    var stamp = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');

    // בנה את השורה בסדר הכותרות
    var row = headers.map(function (h) {
      switch (h) {
        case 'חותמת זמן': return stamp;
        case 'קורס':      return meta.course || '';
        case 'מזהה קורס': return meta.courseId || '';
        case 'מחזור':     return meta.cohort || '';
        default:          return (map[h] !== undefined) ? map[h] : '';
      }
    });

    sheet.appendRow(row);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// בדיקה מהירה שה-Web App חי (פתיחה בדפדפן).
// אבחון: הוספת ?check=42data מחזירה כמה שורות נאספו ותקציר של השורה האחרונה,
// כדי לוודא שהכתיבה עובדת והעברית תקינה — בלי צורך לפתוח את הגיליון.
function doGet(e) {
  var base = { ok: true, service: 'סקר 42', status: 'live' };
  try {
    if (e && e.parameter && e.parameter.check === '42data') {
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
      if (!sheet || sheet.getLastRow() < 2) {
        base.rows = 0;
      } else {
        var lastRow = sheet.getLastRow();
        base.rows = lastRow - 1; // פחות שורת הכותרת
        base.lastRow = sheet.getRange(lastRow, 1, 1, Math.min(3, sheet.getLastColumn()))
                            .getDisplayValues()[0]; // חותמת זמן, קורס, מזהה
      }
    }
  } catch (err) {
    base.diagError = String(err);
  }
  return json(base);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
