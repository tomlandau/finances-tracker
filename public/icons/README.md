# PWA Icons

יש צורך ליצור שני קובצי PNG מקובץ ה-SVG:

## דרכים ליצירת האייקונים:

### אופציה 1: Online Tool
1. פתח את [https://svgtopng.com](https://svgtopng.com) או [https://cloudconvert.com/svg-to-png](https://cloudconvert.com/svg-to-png)
2. העלה את קובץ `icon.svg`
3. צור שני גדלים:
   - `icon-192.png` בגודל 192x192
   - `icon-512.png` בגודל 512x512
4. שמור את הקבצים בתיקייה זו

### אופציה 2: ImageMagick (אם מותקן)
```bash
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 512x512 icon-512.png
```

### אופציה 3: Figma/Sketch/Adobe XD
1. פתח את הSVG בכלי העיצוב
2. ייצא כPNG בגדלים הנדרשים

## הערה
האייקונים לא חיוניים לפיתוח מקומי, אבל נדרשים ל-PWA deployment.
