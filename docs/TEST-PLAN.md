# Social Cleaner — Test Planı

Amaç: güvenlik ve doğruluk iddialarını **kanıtlanabilir** kılmak. Her test, tehdit modelindeki
bir maddeye veya yol haritasındaki bir kabul kriterine bağlıdır.

## Çalıştırma

```bash
npm run typecheck     # strict TS, tüm kaynak + testler
npm test              # Vitest, tek seferlik (izole geçici DB)
npm run build         # üretim derlemesi
npm run verify        # üçü birden
```

Testler geçici bir SQLite dosyası kullanır (`data/test-<uuid>.db`, dosya başına bir tane), her
koşuda migration'lar sıfırdan uygulanır ve sonunda dosya silinir. Test dosyaları paralel
çalıştırılmaz (`fileParallelism: false`). Gerçek kullanıcı verisine dokunulmaz.

## 1. Birim testleri

| Dosya | Kapsam | Bağlı tehdit/kabul |
| --- | --- | --- |
| `tests/crypto.test.ts` | AES-GCM gidiş-dönüş, rastgele IV, AAD alan ayrımı, kurcalama tespiti, yanlış anahtar, HKDF anahtar ayrımı, kör indeks determinizmi + alan ayrımı, scrypt doğrulama, parola politikası, token üretimi/uzunluğu, sabit zamanlı karşılaştırma | T4, Faz 1 kabul |
| `tests/variants.test.ts` | Türkçe katlama (ı/İ/ş/ğ/ü/ö/ç), e-posta/kullanıcı adı/telefon kanonikleştirme, ayraç ve ad-sıra varyantları, tekrar temizliği, 64 karakter sınırı, `generated` işareti, iletişim bilgisi onaysızsa üretilmemesi | Faz 1 kabul, T9 |
| `tests/security.test.ts` | SSRF: `localhost`, `127.0.0.1`, `::1`, `10.x`, `192.168.x`, `169.254.169.254`, `100.64.x`, `.internal`, `file:`, `javascript:`, kimlik bilgili URL, standart dışı port; güvenilmez içerik sarmalama + sınırlayıcı temizliği; log maskeleme (e-posta/telefon/ad) | T5, T6, T4 |
| `tests/db-integrity.test.ts` | Migration idempotency, FK cascade, benzersizlik kısıtları, P2 alanların düz metin olmaması, dışa aktarımda çözülmüş değerler | T4, T12 |
| `tests/search.test.ts` | 115 platformluk katalog benzersizliği + 115 yerel logo varlığı, 56 doğrudan kontrol, Instagram/TikTok/Facebook/Telegram/X adaptörleri, Steam XML, handle normalizasyonu, HTTP 200/404/403 ayrımı, HN/CraftRise işaretleri, ağ hatası, sahiplik/CSRF kapıları, bulgu+kanıt kaydı, platform kapsamı, ücretsiz 5 sonuç kırpma, 8 platform limiti, IDOR 404, `PLAN_REQUIRED`, `PROVIDER_NOT_CONFIGURED`, günlük kota 429, tarama silme | Faz 2A/2A.1 kabul, T5, T7 |

## 2. Entegrasyon testleri (HTTP katmanı, gerçek handler'lar)

Handler'lar `src/server/api/*` içinde saf fonksiyonlardır; testler `Request`/`Response` ile
doğrudan çağırır. Böylece cookie, CSRF ve yetki davranışı gerçek yoldan sınanır.

| Dosya | Senaryo |
| --- | --- |
| `tests/api-auth.test.ts` | Kayıt 201 + cookie; zayıf parola/geçersiz e-posta 400; aynı e-posta 409; yabancı Origin 403; yanlış parola ve var olmayan hesapta tek tip 401; doğru giriş 200; çıkış 204; çıkış sonrası 401; CSRF'siz çıkış 403; oturum cookie'si `HttpOnly` ve `SameSite=Lax`; 5 hatalı denemede kilit; IP bazlı limit 429 |
| `tests/api-vault.test.ts` | Oturumsuz 401; CSRF'siz POST 403; yabancı Origin 403; ad/rumuz/iletişim/bağlantı ekleme; yinelenen ad 409; onaysız iletişim bilgisinin maskelenmesi ve aramada kullanılmaması; onaylı iletişimin varyantlara girmesi; telefon normalizasyonu; kapsam güncelleme; limit dışı değer 400; özel IP'ye işaret eden bağlantının reddi; sahiplik beyanı; bozuk kimlik 404 |
| `tests/api-authz.test.ts` | Kullanıcı B, A'nın rumuzunu silemez/göremez (404); B'nin haznesinde A'nın verisi yok; tahmin edilemez kimlik biçimi |
| `tests/api-account.test.ts` | Dışa aktarımda P2 açık ve `Content-Disposition` var; oturumsuz dışa aktarım 401; yanlış parola ve yanlış onay metni reddi; doğru parolayla silme 204; sonrasında giriş 401; DB'de kullanıcı satırı yok; denetim kaydında PII yok ve sayfalanıyor |
| `tests/search.test.ts` | Arama handler'ları: sahiplik/CSRF zorunluluğu, gerçek profil kontrolü (stub HTTP), kanıt alanları, plan kırpma, kota, yetkisiz erişim, sağlayıcı yokluğu, silme |

## 3. Güvenlik matrisi (Faz 6'da tamamlanacak)

| Kontrol | Yöntem | Durum |
| --- | --- | --- |
| Yetkilendirme (IDOR) | `api-authz.test.ts` | ✅ |
| CSRF | `api-vault.test.ts` | ✅ |
| XSS | React otomatik kaçış + kullanıcı metni `dangerouslySetInnerHTML` ile basılmıyor (kod incelemesi) | ✅ (statik) |
| SQL injection | Drizzle parametreli sorgular; ham SQL yalnızca migration'larda | ✅ (tasarım) |
| SSRF | `security.test.ts` | ✅ (util) |
| Prompt injection | `security.test.ts` + Faz 3 korpusu | ◐ |
| Rate limit | `api-auth.test.ts` | ✅ (tek süreç) |
| Parola/kimlik bilgisi sızıntısı | `db-integrity.test.ts`, log taraması | ✅ |
| Bağımlılık taraması | `npm audit` | ⏳ Faz 6 |
| Erişilebilirlik | manuel + axe | ⏳ Faz 6 |

## 4. Manuel kabul kontrol listesi (Faz 1 + 2A)

1. `npm run setup && npm run db:migrate && npm run dev` → `http://localhost:3000`.
2. Kayıt ol; Dashboard açılıyor, plan rozeti ve "Yeni tarama" düğmesi görünüyor.
3. Identity Vault → ad ekle (`Işık Yılmaz`), varyant önerilerinde `isik yilmaz` görünüyor.
4. Rumuz ekle (`isikyilmaz`), platform seç, doğrulama durumunu değiştir.
5. E-posta ekle, "aramalarda kullanılsın" kutusunu işaretlemeden kaydet → kapsam ekranında
   "iletişim araması kapalı" uyarısı kalıyor.
6. Araştırma kapsamını `deep` yap, limitleri düşür → kaydet → yenile → değerler korunuyor.
7. Sahiplik beyanını tamamla. Derin Arama → `torvalds` + GitHub/Codeberg/HN/Steam seç →
   tarama 201; kartlarda logo, gerçek URL, güven ve `HTTP 200` kanıtı var.
8. `Kurucu` + CraftRise seç → CraftRise kartı `profileTitle-gene` kanıtıyla dönüyor.
9. Ücretsiz planda 6 bulgu üreten bir tarama → 5 kart + "1 sonuç daha" paneli; ağ yanıtında
   6. sonuç yok.
10. Başka kullanıcıyla aynı tarama ID'sine git → 404.
11. Hesap sayfası → dışa aktar → JSON indir; içinde ad/e-posta açık, audit kaydı var.
12. Çıkış yap → korumalı sayfaya git → login'e yönleniyor.
13. Geliştirici araçları → cookie'lerde `sc_session` değerinin `HttpOnly` olduğu görülüyor.
14. `data/app.db` dosyasını bir SQLite aracıyla aç → `identity_names.value_enc` `v1:` ile
    başlıyor, düz metin ad yok; `search_runs.query_enc` şifreli.
15. Hesabı sil (parola + `HESABIMI SİL`) → giriş yapılamıyor.

## 5. Faz 2A testleri (tamamlandı)

- [x] Platform kataloğu ve yerel logo varlığı.
- [x] HTTP 200/404/403 ve işaret tabanlı doğrulama; "engellendi" ≠ "bulunamadı".
- [x] Sahiplik beyanı ve CSRF olmadan arama reddi.
- [x] Ücretsiz plan sonuç kırpma ve platform limiti.
- [x] Günlük kota ve 429.
- [x] IDOR: başka kullanıcının taraması 404.
- [x] Sağlayıcı yokken 503; sahte sonuç yok.
- [x] Tarama silme ve cascade.

### Faz 2B (planlanan)

- Sağlayıcı adaptör sözleşme testleri (Brave/Tavily, kayıt/oynatma).
- Ad/e-posta/telefon → alan adı eşleme ve "bahsedilme" sınıflandırması.
- Kuyruk: atomik alma, lease süresi, retry backoff, iptal, ölü iş.
- Tekilleştirme: URL normalizasyonu (`utm_*`, `#fragment`, `www`, sondaki `/`).
- Kanıt: hash bütünlüğü, plana göre saklama süpürücüsü.
- Bütçe: limit aşımında durma ve görünür hata.

## 6. Faz 3 testleri (planlanan)

- Korelasyon altın veri seti: 20 pozitif/negatif senaryo.
- Skor açıklanabilirliği: her skorun sinyal dökümü var.
- Prompt injection korpusu: 10 saldırı, sistem talimatı değişmiyor, araç çağrısı tetiklenmiyor.
- Aynı girdi → aynı skor (deterministik), LLM yalnızca metin üretiyor.
- Yanlış eşleşme oranı ≤ %5.

## 7. Son ölçülen sonuçlar (24.10.2026)

| Kontrol | Komut | Sonuç |
| --- | --- | --- |
| Tip denetimi | `npm run typecheck` | 0 hata |
| Birim + entegrasyon | `npm test` | 9 dosya, **88/88 test geçti** (~16 sn) |
| Üretim derlemesi | `npm run build` | Başarılı; 22 API route, 9 sayfa, middleware |
| Gerçek HTTP duman testi | `next dev` + `fetch` | Kayıt 201 → sahiplik 200 → arama 201 (8 platform, ~1 sn) → geçmiş 200 → tarama silme 204 → hesap silme 204 |
| Gerçek arama sonuçları | `assyte` / `Kurucu` | YouTube, GitHub, CraftRise, Steam gerçek URL + kanıtla döndü; 403 alan platformlar "engellendi" |
| Pro 40 platform canlı tarama | Pro test kullanıcısı | 40 kontrol ~3,5 sn; 4 bulgu, 1 engellendi, 0 hata; API `PLATFORM_LIMIT` yok |
| Arayüz / responsive | Chrome headless 1440 px + 390 px | `/`, `/pricing`, `/dashboard`, `/search` 200; yatay taşma 0; Manrope yüklü; paneller animasyonlu açılıyor |
| Plan kırpma | `npm test` | 6 bulgu → 5 sonuç, `hiddenCount=1`; API yanıtında 6. sonuç yok |
| Sahiplik kapısı | `npm test` | Beyan yokken `OWNERSHIP_NOT_DECLARED` 403 |
| IDOR | `npm test` | Başka kullanıcının taraması 404 |
| Türkçe gidiş-dönüş | duman testi | `Işık Yılmaz` aynen saklandı; `isik yilmaz` varyantı üretildi ve `usedAsEvidence=false` |
| Rest'te düz metin | SQLite taraması | `users`, `identity_names`, `identity_contacts`, `audit_events` içinde e-posta/ad/telefon düz metni yok; yalnızca `identity_aliases.handle` düz metin (tasarım gereği); `search_runs.query_enc` `v1:` |
| CSRF | duman testi | Oturum varken CSRF başlıksız çıkış/arama 403 |
| CSP | duman testi | Yanıtta `nonce-…` içeren `Content-Security-Policy` başlığı var |
| Arayüz | duman testi | `/`, `/pricing`, `/login` 200; `/search` oturumla 200, maskot/platform logoları HTML'de; 27 SVG logo 200 |

## 8. Hata ve dayanıklılık

| Senaryo | Beklenen |
| --- | --- |
| DB dosyası kilitli | 500 değil, `503` + tekrar deneme mesajı |
| `SC_MASTER_KEY` eksik/yanlış uzunluk | Uygulama başlamaz, açık hata mesajı |
| Şifreli alan çözülemiyor | Alan `[çözülemedi]` olarak gösterilir, diğer veriler çalışır |
| Sağlayıcı zaman aşımı (Faz 2) | İş `retry`, kullanıcıya görünür durum |
| Kota aşımı (Faz 2) | `budget_exceeded`, yeni sorgu üretilmez |
