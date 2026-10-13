# מיקרוקוסמוס — אתר תצלומי מיקרוסקופ

אתר חינוכי בעברית על מיקרוסקופים ותצלומי מיקרוסקופ: גלריה, עמוד לכל תמונה, מסע בסולם הגדלים, אור מול אלקטרונים, ציר זמן היסטורי, חידון ומדריך "מיקרוסקופ בבית".

אתר סטטי: HTML + CSS + JavaScript וניל (ES modules), בלי שלב build. כל התוכן נטען מקבצי JSON בתיקיית `data/`.
מסמך האפיון המלא: [`microscope-site-spec.md`](microscope-site-spec.md).

## הרצה מקומית

ES modules לא עובדים מ-`file://`, ולכן צריך שרת קטן:

```bash
python3 -m http.server 8000
# http://localhost:8000/
```

מצב פיתוח: מוסיפים `?dev=1` לכל כתובת. במצב הזה מוצגות גם תמונות עם `verified: false`, והן מסומנות.

## פריסה ל-GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `(root)`.
האתר יעלה בכתובת `https://nadaval56.github.io/microscope/`. כל הנתיבים יחסיים, והקובץ `.nojekyll` כבר קיים.

## מבנה

```
index.html  gallery.html  image.html?id=m123  scale.html  microscopes.html
history.html  quiz.html  diy.html  credits.html  404.html
css/style.css          טוקנים של צבע, ערכה כהה (ברירת מחדל) ובהירה
js/common.js           כותרת, תחתית, ערכת צבע, טעינת נתונים, עזרים
js/pages/*.js          קוד לכל עמוד
data/images.json       כל התמונות (נוצר על ידי הסקריפט, אפשר לערוך ידנית)
data/categories.json   נושאים
data/techniques.json   טכניקות וסוגי מיקרוסקופים
data/timeline.json     ציר הזמן
data/scale-references.json  עצמי ייחוס למסע בגדלים
img/micro/<id>-<w>.webp     400 / 1200 / 1920 פיקסלים, שמות ניטרליים
img/history/                תמונות ציר הזמן
scripts/                    צינור התמונות (Python), לא חלק מהאתר
```

## הוספה או עריכה של תמונה

1. מוסיפים רשומה לאחד הקבצים ב-`scripts/content/*.json`: שם הקובץ ב-Wikimedia Commons, קטגוריה, טקסטים, מסיחים לחידון ועוד (ראו רשומה קיימת).
2. מריצים:
   ```bash
   pip install pillow
   python3 scripts/fetch_images.py
   ```
   הסקריפט קורא את הרישיון מעמוד הקובץ ב-Commons, **דוחה אוטומטית** כל רישיון שאינו נחלת הכלל / CC0 / CC BY / CC BY-SA, מוריד ומייצר WebP, מעניק מזהה ניטרלי (נשמר ב-`scripts/id_map.json`) וכותב את `data/images.json`, `data/timeline.json` ו-`data/techniques.json`.
3. דוח: `scripts/report.md` (כמה התקבלו, כמה נדחו ולמה, וחלוקה לפי נושא וסוג מיקרוסקופ). רשימת כל המועמדים והסטטוס שלהם: `scripts/candidates.yaml`.
4. `python3 scripts/build_credits.py` בודק שלכל תמונה יש רישיון מותר וקרדיט מלא.

כדי להסתיר תמונה מהאתר בלי למחוק אותה, מגדירים לה `"verified": false` ב-`scripts/content/…json` (או ישירות ב-`data/images.json`).

**הערה טכנית:** ה-Action API של Wikimedia מחזיר לעתים HTTP 429 משרתים משותפים. לכן הסקריפט קורא את נתוני הרישיון מעמוד ה-HTML של הקובץ (אותם נתונים מובנים, `licensetpl_*`) ומוריד תמונות מ-`thumb.wikimedia.org` בגדלים הסטנדרטיים. לכן הגודל הגדול ביותר הוא 1920 ולא 2000.

## עקרונות

- **רישוי:** רק נחלת הכלל, CC0, CC BY ו-CC BY-SA. אין NC ואין ND. הקרדיט גלוי מתחת לכל תמונה ובעמוד הקרדיטים.
- **צבעים:** ענבר = מיקרוסקופ אור, ציאן = מיקרוסקופ אלקטרונים, סגול = מיקרוסקופ מחט סורקת, חום-ספיה = איור היסטורי.
- **חידון:** שמות קבצים ניטרליים ו-alt גנרי עד שעונים, כדי שלא יהיה אפשר "לרמות".
- `localStorage` משמש רק לשיא בחידון ולהעדפת ערכת הצבע, ותמיד עטוף ב-try/catch.
