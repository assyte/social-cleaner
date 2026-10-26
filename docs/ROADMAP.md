# Social Cleaner — Geliştirme Planı ve Kapsam

Her fazın **kabul kriteri** ve **testleri** vardır. Bir faz "tamamlandı" sayılmaz, kabul
kriterlerinin tamamı testle kanıtlanmışsa. Durum sütunu son güncelleme: 24.10.2026.

| Faz | Kapsam | Durum |
| --- | --- | --- |
| 0 | Ortam analizi, mimari, tehdit modeli, veri modeli, API taslağı | ✅ tamamlandı |
| 1 | Kimlik doğrulama, Identity Vault, şifreli depolama, denetim, güvenlik kontrolleri | ✅ tamamlandı |
| 2A | Kullanıcı adı taraması, platform kataloğu/logo, ücretsiz/Pro limitleri, açık tema, fiyatlandırma | ✅ tamamlandı |
| 2B | Ad/e-posta/telefon sağlayıcı adaptörü, kuyruk/worker, saklama süpürücüsü, önbellek | ⏳ sıradaki |
| 3 | AI ajanları (planner, researcher, correlator, auditor) + korelasyon testleri | ⏳ |
| 4 | Kaldırma merkezi (katalog, taslak, onay, durum takibi) | ⏳ |
| 5 | Doğrulama, izleme, raporlama/dışa aktarma | ⏳ |
| 6 | Güvenlik ve kalite sertleştirme (injection, SSRF, yetki, saklama, maliyet) | ⏳ |

---

## Faz 0 — Temel (✅)

**Çıktılar:** `docs/ARCHITECTURE.md`, `docs/THREAT-MODEL.md`, `docs/DATA-MODEL.md`,
`docs/API.md`, `docs/ROADMAP.md`, `docs/TEST-PLAN.md`, `docs/DECISIONS.md`.
**Kabul:** Ortam analizi yazılı; teknoloji seçimleri gerekçeli; tehdit modeli teste eşlenmiş.

## Faz 1 — Temel altyapı + Identity Vault (✅)

**Çıktılar**
1. Next.js iskeleti, strict TypeScript, Tailwind tabanlı kurumsal arayüz.
2. SQLite + Drizzle şeması, sürümlü SQL migration runner.
3. AES-256-GCM alan şifreleme + HKDF anahtar ayrımı + HMAC kör indeks.
4. scrypt parola özeti, opak oturum token'ı, CSRF double-submit, Origin kontrolü,
   rate limit, güvenlik başlıkları, nonce'lı CSP.
5. Identity Vault: adlar, rumuzlar (+dönem/platform/doğrulama), iletişim bilgileri
   (onay bayraklı), bağlantılar, araştırma kapsamı, sahiplik beyanı.
6. Türkçe karakter katlamalı isim/rumuz varyasyon üretimi — **kanıt değil, sorgu**.
7. Denetim kaydı + maskeleme; JSON dışa aktarma; parola onaylı hesap silme.
8. SSRF guard, güvenilmez içerik sarmalayıcı, sağlayıcı arayüzleri (mock, açıkça işaretli).

**Kabul kriterleri**
- [x] Kayıt → giriş → çıkış akışı çalışıyor; oturum cookie'si `HttpOnly`.
- [x] Aynı e-posta ile ikinci kayıt `409` dönüyor (kör indeks üzerinden).
- [x] CSRF başlığı olmayan mutasyon `403` dönüyor.
- [x] Kullanıcı B, A'nın kaydına erişemiyor (`404`).
- [x] DB'de ad/e-posta/telefon düz metin **yok**; şifreli zarf görünüyor.
- [x] Yanlış anahtarla çözme denemesi hata veriyor (GCM tag).
- [x] Türkçe katlama: `Işık Yılmaz` → `isik yilmaz` varyantları üretiliyor.
- [x] `consentSearch=false` olan iletişim bilgisi arama varyantlarına girmiyor.
- [x] Hesap silme tüm veriyi cascade siliyor; oturum geçersizleşiyor.
- [x] `npm run typecheck`, `npm test`, `npm run build` hatasız.
- [ ] E-posta doğrulama (SMTP) — **Faz 6**, MVP dışı.
- [ ] Parola sıfırlama — **Faz 6**, MVP dışı (yerel kurulumda kurtarma: DB'den sıfırlama aracı).

**Bilinçli MVP dışı:** 2FA, e-posta doğrulama, parola sıfırlama akışı, çoklu dil,
bulgu arama, kaldırma taslakları, grafik görselleştirme.

## Faz 2A — Kullanıcı adı taraması + ürünleştirme (✅)

**Çıktılar**
- Açık tema, maskot **Temiz**, 115 yerel platform SVG logosu, favicon.
- Platform kataloğu (115 kayıt; 56 doğrudan kontrol; 15 kategori) ve politeness kuralları.
- Faz 2A.1: Instagram/TikTok/Facebook/Telegram/X doğrudan adaptörleri, Steam XML düzeltmesi,
  platform bazlı `found / not_found / blocked / unsupported / error` kapsam kaydı.
- Premium arayüz: sol menü, hızlı tarama, animasyonlu gelişmiş platform seçici,
  kategori filtreleri, Manrope/JetBrains Mono yerel fontları, mobil uyum.
- `POST /api/search`: sahiplik beyanı + CSRF + günlük kota + plan limiti.
- Gerçek profil doğrulama: HTTP durumu, JSON API veya sayfa işareti; `evidence_json`.
- `search_runs` + `search_results`, plana göre kırpılmış yanıt, geçmiş/silme.
- Ücretsiz/Pro plan tanımları (`users.plan`), fiyatlandırma sayfası (ödeme yok, açıkça işaretli).
- Brave/Tavily adaptörü; anahtar yokken `503 PROVIDER_NOT_CONFIGURED`.

**Kabul**
- [x] GitHub, CraftRise, Steam, HN, Codeberg gerçek URL + kanıtla dönüyor.
- [x] 403/429 "engellendi", 404 "bulunamadı"; ağ hatası "bulundu" sayılmıyor.
- [x] Ücretsiz planda 5'ten fazla sonuç API'den gitmiyor (`hiddenCount`).
- [x] Başka kullanıcının taraması 404; sahiplik yoksa 403; CSRF yoksa 403.
- [x] Günlük kota 429; ücretsizde 8, Pro'da 40 platform üstü 400.
- [x] Sağlayıcı yokken ad/e-posta/telefon 503; sahte sonuç yok.
- [x] `npm run typecheck`, `npm test` (98), `npm run build` hatasız.

## Faz 2B — Ad/e-posta/telefon + kuyruk (sıradaki)

**Çıktılar**
- Brave/Tavily adaptörünün gerçek anahtarla uçtan uca testi; sonuç → platform alan adı eşleme.
- DB tabanlı iş kuyruğu + `npm run worker`, lease/retry/backoff/iptal.
- 24 saatlik platform yanıt önbelleği; 403 alan platformu geçici devre dışı bırakma.
- Saklama süpürücüsü (ücretsiz 7 gün, Pro 90 gün), bulgu/kanıt tekilleştirme.
- Bütçe: `max_queries`, `max_cost_cents`, `deadline`; aşımda `budget_exceeded`.

**Kabul:** Sağlayıcı ile uçtan uca arama; aynı URL iki kez eklenmiyor; iptal edilen iş 5 sn
içinde duruyor; kota aşımı görünür hata veriyor; tüm testler yeşil.

## Faz 3 — AI ajanları

**Çıktılar:** Identity Profiler, Search Planner, OSINT Researcher, Identity Correlator,
Privacy Auditor. Her karar `rationale` + kaynak + model sürümü ile kayıtlı. Yapılandırılmış
JSON çıktı (zod), araç çağrıları beyaz liste, prompt injection sarmalayıcı.

**Kabul:** Korelasyon için 20 senaryoluk altın veri seti ≥ %90 doğru sınıflama, yanlış
pozitif ≤ %5; aynı girdi deterministik skor (LLM yalnızca gerekçe metni); injection korpusu
(10 saldırı) sistem talimatını değiştirmiyor.

## Faz 4 — Kaldırma merkezi

**Çıktılar:** Platform silme sayfası kataloğu (resmî URL + son kontrol tarihi), talep taslakları
(KVKK/GDPR/platform), onay kaydı, durum makinesi, manuel gönderim rehberi, sonuç belgesi yükleme.

**Kabul:** Onaysız hiçbir taslak `approved` olamıyor; sahiplik beyanı olmayan hesap için hesap
kapatma seçeneği kapalı; her taslakta kanal/gerekçe/ek listesi var; KVKK metni hukuki garanti
içermiyor.

## Faz 5 — Doğrulama ve izleme

**Çıktılar:** `VerificationCheck` (HTTP durum + indeks kontrolü), zamanlanmış izleme, yeniden
ortaya çıkan kayıt tespiti, PDF/JSON rapor, "kaynaktan silindi" ile "arama sonucundan kalktı"
ayrımı.

**Kabul:** Kaldırılan içerik iki ayrı sonuç olarak raporlanıyor; izleme job'u tekrar çalışıyor;
rapor kapsam + tarih + tamamlanmamış işler bölümlerini içeriyor.

## Faz 6 — Güvenlik ve kalite

**Çıktılar:** E-posta doğrulama + parola sıfırlama, 2FA (TOTP), oturum listesi/iptali, anahtar
rotasyon aracı, Redis rate limit (çok örnek), yedekleme/geri yükleme betiği, erişilebilirlik
(klavye, kontrast), yük testi, bağımlılık taraması.

**Kabul:** `docs/TEST-PLAN.md` güvenlik matrisi tamamen yeşil; yedekten geri yükleme tatbikatı
başarılı; erişilebilirlik kontrol listesi geçilmiş.

---

## Gerçekten çalışacak (v1) / sonraya

| v1'de çalışır | Sonraki sürüm |
| --- | --- |
| Kayıt, giriş, çıkış, oturum | 2FA, e-posta doğrulama, parola sıfırlama |
| Şifreli hazne CRUD | Toplu içe aktarma (CSV/JSON) |
| Varyasyon önerisi | Otomatik platform taraması |
| Araştırma kapsamı + onay kayıtları | Gerçek arama/AI sağlayıcıları |
| Denetim kaydı, dışa aktarma, silme | PDF rapor, grafik görselleştirme |
| Güvenlik başlıkları, CSRF, rate limit | Redis tabanlı dağıtık limit |
| SSRF/korumalı URL doğrulama | DNS pinning + yönlendirme zinciri |

## Risk kaydı (proje yönetimi)

| Risk | Etki | Azaltım |
| --- | --- | --- |
| Arama sağlayıcısı kotası/ToS değişimi | Faz 2 gecikir | Adaptör + mock; çoklu sağlayıcı |
| AI maliyeti | Bütçe aşımı | Sert limitler, önbellek, mock varsayılan |
| Yanlış eşleşme | Üçüncü kişiye zarar | Kullanıcı onayı zorunlu, düşük güvende işlem yok |
| Platform kaldırma süreçlerinin yavaşlığı | Memnuniyetsizlik | Durum takibi + gerçekçi beklenti metni |
| Tek geliştirici / kapsam kayması | Gecikme | Faz kapıları, MVP listesi sabit |
