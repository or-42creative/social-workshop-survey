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

// לשונית ברירת המחדל: לכאן נכתבות תשובות שהגיעו מלינק בלי שם קורס
var SHEET_NAME = 'תשובות';

// לשונית נפרדת לכל סדנה, לפי שם הקורס שבלינק (?course=).
// כבו (false) כדי שהכול יחזור ללשונית אחת.
var SHEET_PER_COURSE = true;

// עמודות המטא-דאטה הקבועות (תמיד ראשונות, לפי סדר זה)
var META_COLS = ['חותמת זמן', 'קורס', 'מזהה קורס', 'מחזור'];

// קישור למצגת הקורס שיישלח במייל למשתתפים שהשאירו כתובת
var PRESENTATION_URL = 'https://drive.google.com/file/d/1h6KMJOVSmViE-m4u3KpM7JLBfh512pA6/view?usp=sharing';
// קישור לכל הקורסים + כתובת ליצירת קשר (מופיעים במייל)
var COURSES_URL = 'https://42creative.co.il/social-course/';
var CONTACT_EMAIL = 'contact@42creative.co.il';
// שם השאלה בטופס שמכילה את כתובת המייל
var EMAIL_FIELD = 'מייל';

/**
 * שם הלשונית של סדנה. שמות לשוניות בגוגל לא יכולים להכיל : \ / ? * [ ]
 * ולא להתחיל או להסתיים בגרש, ומוגבלים באורך — לכן מנקים.
 * בלי שם קורס (לינק סתמי) מחזיר את לשונית ברירת המחדל.
 */
function tabName_(course) {
  var name = String(course || '').replace(/[:\\/?*\[\]]/g, ' ')
                                 .replace(/\s+/g, ' ')
                                 .replace(/^'+|'+$/g, '')
                                 .trim()
                                 .slice(0, 90)
                                 .trim();
  return name || SHEET_NAME;
}

/** הלשונית של הסדנה — נוצרת עם שורת כותרת מעוצבת אם היא עוד לא קיימת. */
function sheetFor_(ss, meta) {
  var name = SHEET_PER_COURSE ? tabName_(meta.course) : SHEET_NAME;
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(META_COLS);
    sheet.getRange(1, 1, 1, META_COLS.length)
         .setFontWeight('bold').setBackground('#33173D').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * תיקון עצמי לשורת הכותרת. השורה היא מה שקובע לאן נכתב כל ערך, ולכן כותרת
 * שנדרסה בטעות גורמת לנתונים ליפול לעמודה הלא נכונה בשקט. המקרה שקרה בפועל:
 * B1 נדרס מ-'קורס' ל-'חותמת זמן', ומאז שם הקורס לא נשמר באף שורה חדשה.
 * מתקנים רק את המקרה הזה בדיוק — כותרת כפולה ב-B שזהה ל-A.
 */
function repairHeaders_(sheet, headers) {
  if (headers.length > 1 && headers[0] === META_COLS[0] && headers[1] === META_COLS[0]) {
    sheet.getRange(1, 2).setValue(META_COLS[1]);
    headers[1] = META_COLS[1];
  }
  return headers;
}

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
    var sheet = sheetFor_(ss, meta);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers = repairHeaders_(sheet, headers);

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

    // שליחת מצגת הקורס למייל שהמשתתף השאיר (אם תקין)
    var sent = false;
    var email = (map[EMAIL_FIELD] || '').toString().trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      try {
        sendPresentation_(email);
        sent = true;
      } catch (mailErr) {
        // לא מפילים את הבקשה אם המייל נכשל (למשל מכסת שליחה) — השורה כבר נשמרה
        return json({ ok: true, mailError: String(mailErr) });
      }
    }

    return json({ ok: true, mailSent: sent });
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
      base.mailFeature = (typeof sendPresentation_ === 'function'); // האם גרסת המייל פרוסה
      base.sheetPerCourse = SHEET_PER_COURSE;
      // כמה תשובות יש בכל לשונית, כדי לראות שכל סדנה נוחתת במקום שלה
      base.tabs = {};
      base.rows = 0;
      SpreadsheetApp.getActiveSpreadsheet().getSheets().forEach(function (sh) {
        var n = Math.max(0, sh.getLastRow() - 1); // פחות שורת הכותרת
        base.tabs[sh.getName()] = n;
        base.rows += n;
      });
      // ?check=42data&sendtest=EMAIL — שולח מייל בדיקה ומחזיר הצלחה/שגיאה מדויקת
      if (e.parameter.sendtest) {
        try {
          sendPresentation_(e.parameter.sendtest);
          base.mailTest = 'OK — נשלח אל ' + e.parameter.sendtest;
        } catch (mErr) {
          base.mailTest = 'ERROR: ' + String(mErr);
        }
      }
    }
  } catch (err) {
    base.diagError = String(err);
  }
  return json(base);
}

// ▶️ הריצו את הפונקציה הזו פעם אחת מהעורך (בחרו אותה בתפריט למעלה ולחצו Run)
//    כדי לאשר את הרשאת שליחת המייל. היא גם תשלח מייל בדיקה לכתובת שלמטה.
//    (פונקציות שמסתיימות ב-_ הן פרטיות ולא מופיעות ברשימת ה-Run — לכן זו בלי _)
function authorizeMail() {
  var TEST_EMAIL = 'or@42creative.co.il'; // שנו לכתובת שאליה תרצו לקבל את מייל הבדיקה
  sendPresentation_(TEST_EMAIL);
  Logger.log('נשלח מייל בדיקה אל ' + TEST_EMAIL);
}

// שולח את מצגת הקורס במייל מעוצב (מהחשבון שמריץ את הסקריפט)
function sendPresentation_(email) {
  var subject = 'מצגת הקורס · קורס הסושיאל של 42 💜';
  var html =
    '<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#2b1533;line-height:1.7;max-width:520px;margin:0 auto">' +
      '<h2 style="color:#33173D;margin:0 0 12px">תודה על המשוב! 🎉</h2>' +
      '<p style="margin:0 0 16px">כמו שהובטח — הנה מצגת הקורס מסדנת הקריאייטיב סושיאל שלנו. ' +
      'שמרו אותה, חזרו אליה, ובעיקר — לכו לעשות תוכן מעולה 🚀</p>' +
      '<p style="margin:0 0 22px">' +
        '<a href="' + PRESENTATION_URL + '" ' +
        'style="display:inline-block;background:#ED2E7C;color:#fff;text-decoration:none;' +
        'font-weight:bold;font-size:16px;padding:14px 28px;border-radius:12px">📊 צפייה במצגת הקורס</a>' +
      '</p>' +
      '<p style="margin:0 0 4px;color:#7a6b82;font-size:13px">אם הכפתור לא עובד, זה הקישור:</p>' +
      '<p style="margin:0 0 22px;font-size:12px;word-break:break-all"><a href="' + PRESENTATION_URL + '" style="color:#7D4C90">' + PRESENTATION_URL + '</a></p>' +
      // בלוק המלצה על קורסים נוספים + יצירת קשר
      '<div style="background:#faf1f7;border:1px solid #f4d3e6;border-radius:14px;padding:18px 18px;margin:0 0 22px">' +
        '<p style="margin:0 0 14px;color:#33173D">אהבתם את הסדנה? יש לנו מגוון קורסים דיגיטליים — מוזמנים להמליץ לחברים 💜</p>' +
        '<p style="margin:0 0 14px">' +
          '<a href="' + COURSES_URL + '" style="display:inline-block;background:#F7AD00;color:#33173D;' +
          'text-decoration:none;font-weight:bold;font-size:15px;padding:12px 24px;border-radius:999px">לכל הקורסים שלנו ←</a>' +
        '</p>' +
        '<p style="margin:0;color:#7a6b82;font-size:13.5px">מוזמנים לשמור איתנו על קשר: ' +
        '<a href="mailto:' + CONTACT_EMAIL + '" style="color:#ED2E7C;font-weight:bold">' + CONTACT_EMAIL + '</a></p>' +
      '</div>' +
      '<p style="margin:0;color:#33173D;font-weight:bold">— צוות 42 · ארבעים ושתיים</p>' +
    '</div>';

  MailApp.sendEmail({
    to: email,
    subject: subject,
    htmlBody: html,
    name: '42 · קורס הסושיאל',
    body: 'תודה על המשוב! הנה מצגת הקורס: ' + PRESENTATION_URL +
          '\n\nאהבתם את הסדנה? יש לנו מגוון קורסים דיגיטליים, מוזמנים להמליץ לחברים: ' + COURSES_URL +
          '\nלשמור איתנו על קשר: ' + CONTACT_EMAIL +
          '\n\n— צוות 42'
  });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
