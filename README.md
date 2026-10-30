# Tez Baani News — GitHub Pages + Supabase

इस पैकेज में मोबाइल-फ्रेंडली न्यूज़ वेबसाइट, अलग खबर पेज, WhatsApp शेयर, कैटेगरी फ़िल्टर और Supabase Auth वाला एडमिन पैनल है।

## फाइलें
- `index.html` — होमपेज
- `article.html` — हर खबर का अलग URL (`?slug=...`)
- `admin.html` — लॉगिन और खबर प्रकाशित/एडिट/डिलीट
- `config.js` — Supabase और सोशल मीडिया URL
- `supabase-schema.sql` — डेटाबेस, सुरक्षा नीतियाँ और फोटो स्टोरेज
- `style.css`, `app.js`, `article.js`, `admin.js` — डिज़ाइन और व्यवहार

## 1. GitHub Pages पर अपलोड
1. अपने `Tez-Baani-News-` GitHub repository में जाएँ।
2. **Add file → Upload files** चुनें और इस ZIP की सभी फाइलें repository के मुख्य root में अपलोड करें (ZIP को extract करके)।
3. **Commit changes** दबाएँ।
4. **Settings → Pages** में `Deploy from a branch`, branch `main`, folder `/(root)` चुनें और Save करें।
5. कुछ मिनट बाद अपनी GitHub Pages वेबसाइट खोलें। Admin URL `https://YOUR-SITE/admin.html` होगा।

## 2. Supabase का मुफ्त backend बनाना
1. https://supabase.com पर अकाउंट बनाकर New project बनाएँ।
2. Project Dashboard में **SQL Editor** खोलें, `supabase-schema.sql` की पूरी सामग्री चलाएँ।
3. **Project Settings → API** (या Connect panel) में Project URL और publishable key / legacy anon key लें।
4. `config.js` में `SUPABASE_URL` और `SUPABASE_ANON_KEY` की जगह ये सार्वजनिक browser keys डालें। `service_role` या secret key कभी न डालें।
5. **Authentication → Providers → Email** में Email provider चालू रखें। Admin के लिए एक account **Authentication → Users → Add user** से बनाएँ।
6. SQL Editor में नीचे की query चलाएँ, `ADMIN-USER-UUID` को उस Auth user की UUID से बदलें:
   ```sql
   insert into public.profiles (id, role)
   values ('ADMIN-USER-UUID', 'admin')
   on conflict (id) do update set role = 'admin';
   ```
   UUID Auth → Users में उस user के विवरण में मिलेगा। Admin account केवल अपने लिए बनाएँ; किसी को password न दें।
7. GitHub repository में `config.js` commit करें। Public URL और publishable/anon key frontend में दिखना सामान्य है; सुरक्षा Row Level Security policies और server-side permissions से आती है। Secret/service_role key कभी expose न करें।
8. Admin page पर अपने email/password से login करें। फोटो चुनें, category/title/body भरें, Published या Draft चुनें, Save दबाएँ।

## 3. सोशल मीडिया लिंक
`config.js` के `SOCIAL_URLS` में Facebook, Instagram, YouTube और WhatsApp के वास्तविक लिंक डालें। कोई लिंक खाली/placeholder हो तो वह दिखाई नहीं देगा।

## 4. महत्वपूर्ण सुरक्षा नोट
- GitHub Pages केवल static hosting है; यह अपने आप database या private backend नहीं देता। Supabase Auth + Postgres + Storage इस सेटअप का backend है।
- `supabase-schema.sql` में public readers को सिर्फ published news पढ़ने की अनुमति है; draft और write operations admin policy से सुरक्षित हैं।
- पहले deployment के बाद एक incognito/private browser से जाँचें कि `admin.html` पर बिना लॉगिन खबरें एडिट/डिलीट नहीं हो सकतीं।
- Admin password GitHub files में कभी न रखें। मजबूत, unique password और account पर उपलब्ध होने पर MFA इस्तेमाल करें।
- सार्वजनिक खबर के URL में `article.html?slug=...` है; यह अलग लेख पेज है, लेकिन URL में slug query string रहती है। पूरी तरह अलग SEO-friendly `/news/story-name/` paths के लिए static-site build या अलग hosting/rewrites चाहिए।
- यह starter setup है; production use से पहले Supabase Auth settings, email verification, backups, rate limits और security policies की जाँच करें। सार्वजनिक image bucket में फोटो सार्वजनिक रूप से देखी जा सकती हैं—निजी दस्तावेज़ अपलोड न करें।
- Browser में `crypto.randomUUID()` इस्तेमाल होता है; GitHub Pages HTTPS पर यह supported है।
