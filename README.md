# 💜 סקר המשוב של 42

סקר משוב למשתתפי **סדנת קריאייטיב סושיאל** (כתיבה · צילום · עריכה), מעוצב במיתוג של 42.
דף אינטרנט סטטי שרץ על **GitHub Pages**, כל התשובות נאספות אוטומטית ל-**Google Sheets**.

```
docs/                    ← זו התיקייה ש-GitHub Pages מגיש
├─ index.html          ← הסקר עצמו (מה שהמשתתפים ממלאים)
├─ admin.html          ← מחולל הלינקים (לשימוש פנימי שלכם)
├─ config.js           ← כאן מדביקים את כתובת ה-Google Script
├─ assets/logo.jpg     ← הלוגו "קורס הסושיאל של 42"
└─ apps-script/Code.gs ← הקוד שרץ בצד גוגל וכותב לגיליון
```

---

## איך זה עובד (בקצרה)

1. **אתם** נכנסים ל-`admin.html`, ממלאים את שם הלקוח → מקבלים **לינק אישי לקורס**.
2. שולחים את הלינק למשתתפים (וואטסאפ / מייל / QR).
3. המשתתף פותח, ממלא ~2 דקות, לוחץ שליחה.
4. התשובה נכתבת **אוטומטית כשורה חדשה** בגיליון ה-Google Sheets שלכם.

---

## התקנה — פעם אחת (10 דקות)

### שלב 1 · גיליון Google Sheets + הסקריפט
1. פתחו גיליון חדש ב-[sheets.google.com](https://sheets.google.com).
2. בתפריט: **Extensions → Apps Script**.
3. מחקו את הקוד שיש שם, והדביקו את כל התוכן של [`apps-script/Code.gs`](apps-script/Code.gs).
4. שמרו (💾).

### שלב 2 · פרסום הסקריפט (Deploy)
1. למעלה מימין: **Deploy → New deployment**.
2. ליד "Select type" לחצו על גלגל השיניים ⚙️ ובחרו **Web app**.
3. הגדירו:
   - **Execute as:** `Me` (החשבון שלכם)
   - **Who has access:** `Anyone`
4. **Deploy** → תתבקשו לאשר הרשאות (Authorize access) → אשרו עם חשבון הגוגל שלכם.
   > אם גוגל מציגה "Google hasn't verified this app" — לחצו **Advanced → Go to (unsafe)**. זה הסקריפט שלכם, זה בסדר.
5. העתיקו את ה-**Web app URL** שמופיע. הוא נראה כך:
   `https://script.google.com/macros/s/AKfycb.....................​/exec`

### שלב 3 · חיבור האתר לגיליון
פתחו את [`config.js`](config.js) והדביקו את הכתובת:
```js
window.SURVEY_CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycb.../exec",
  DEFAULT_COURSE: "סדנת הסושיאל של 42",
};
```

### שלב 4 · הפעלת GitHub Pages
> הריפו כבר קיים: **[social-workshop-survey](https://github.com/or-42creative/social-workshop-survey)**. צריך רק להפעיל את Pages פעם אחת:

1. בריפו: **Settings → Pages**.
2. תחת "Build and deployment" → Source: **Deploy from a branch**.
3. בחרו branch `main` ותיקייה **`/docs`** → **Save**.
4. אחרי דקה-שתיים האתר יהיה זמין בכתובת:
   `https://or-42creative.github.io/social-workshop-survey/`

> בעתיד, אחרי כל שינוי בקבצים — פשוט `git push` והאתר מתעדכן לבד.

זהו. 🎉

---

## שימוש שוטף · יצירת לינק לקורס

1. היכנסו ל-`https://or-42creative.github.io/social-workshop-survey/admin.html`
2. מלאו:
   - **שם הלקוח / הקורס** — מה שיראו המשתתפים (למשל "הסוכנים של מגדל")
   - **מזהה קורס** (רשות) — קוד פנימי לסינון בגיליון (למשל `migdal-2026-07`)
   - **מחזור / קבוצה** (רשות)
3. לחצו **"צרו לי לינק"** → העתיקו / סרקו QR → שלחו למשתתפים.

הלינק שנוצר נראה כך:
```
https://or-42creative.github.io/social-workshop-survey/index.html?course=הסוכנים%20של%20מגדל&id=migdal-2026-07
```

> 🔒 **טיפ:** `admin.html` הוא רק כלי עזר בצד הלקוח (לא מכיל סיסמאות). אם לא רוצים שיהיה גלוי, פשוט אל תפרסמו/תשתפו את הכתובת שלו — או מחקו אותו מהריפו ותשמרו עותק מקומי.

---

## הגיליון

- לשונית בשם **"תשובות"** נוצרת אוטומטית בשליחה הראשונה.
- עמודות קבועות ראשונות: `חותמת זמן`, `קורס`, `מזהה קורס`, `מחזור`.
- אחר כך עמודה לכל שאלה (בעברית). שאלות חדשות שתוסיפו יקבלו עמודה חדשה אוטומטית.

---

## לשנות את השאלות

השאלות מוגדרות בתוך [`index.html`](index.html) — כל שאלה היא בלוק `<div class="q" ...>`:

```html
<div class="q" data-q="שם השאלה בגיליון" data-type="scale" data-required="1">
  <label class="qlabel">הטקסט שהמשתתף רואה?<span class="req">*</span></label>
</div>
```

- `data-q` — שם העמודה שייכתב בגיליון.
- `data-required="1"` — שאלת חובה (`0` = רשות).
- `data-type` — סוג השאלה:
  | ערך | משמעות |
  |------|---------|
  | `scale`  | דירוג 1–5 עם אימוג'י |
  | `nps`    | דירוג 0–10 (המלצה) |
  | `choice` | בחירה מרשימה — הוסיפו `data-options="אפשרות א\|אפשרות ב\|אפשרות ג"` |
  | `text`   | טקסט חופשי ארוך (צריך `<textarea>` בפנים) |
  | `short`  | שורת טקסט קצרה (צריך `<input type="text">` בפנים) |

לאחר שינוי — פשוט העלו מחדש ל-GitHub. **אין צורך** לפרסם מחדש את ה-Apps Script.

---

## פתרון תקלות

| בעיה | פתרון |
|------|--------|
| הודעה "הסקר עדיין לא חובר ל-Google Sheets" | לא הודבק `SCRIPT_URL` תקין ב-`config.js`. |
| נשלח אבל לא מופיע בגיליון | ודאו שב-Deploy בחרתם **Who has access: Anyone**. אחרי כל שינוי בקוד ה-Apps Script צריך **Deploy → Manage deployments → עריכה → New version**. |
| רוצים לבדוק שהסקריפט חי | פתחו את ה-`SCRIPT_URL` בדפדפן — אמור להחזיר `{"ok":true,"service":"סקר 42",...}`. |
| הלוגו לא נטען | ודאו שהתיקייה `assets/` עלתה גם היא ל-GitHub. |

---

*נבנה עבור 42 · ארבעים ושתיים — קריאייטיב & דיגיטל 💜*
