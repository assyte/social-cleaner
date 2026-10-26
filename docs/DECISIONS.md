# Mimari Kararlar (ADR)

Her karar: bağlam → karar → alternatifler ve neden reddedildi → sonuçlar.

## ADR-001 — Tek Next.js uygulaması (UI + API)
**Bağlam:** v1 tek kullanıcı/yerel; ekip küçük. **Karar:** App Router içinde hem RSC tabanlı UI
hem Route Handler API. İş mantığı `src/server` içinde framework'ten bağımsız.
**Alternatifler:** Ayrı Express/NestJS API + SPA → iki deploy birimi, iki doğrulama katmanı,
CORS ve oturum senkronizasyonu maliyeti. **Sonuç:** Tek süreç; worker ayrı process olarak aynı
modülleri import eder. Ölçek gerekirse API ayrıştırması mekanik olur çünkü handler'lar saf
fonksiyonlardır.

## ADR-002 — SQLite (libsql) + Drizzle, Postgres'e hazır
**Bağlam:** Docker daemon kapalı; kurulum sürtünmesi düşük olmalı; veri hacmi v1'de küçük.
**Karar:** `@libsql/client` dosya modu, WAL, tek yazıcı. Metin kimlikler, integer zaman
damgaları, JSON alanları `text` → Postgres'e taşınabilir.
**Alternatifler:** Postgres (Docker/yerel kurulum zorunlu, v1 için ağır), Prisma (ağır
codegen, libsql desteği dolaylı), `better-sqlite3` (Windows'ta derleme riski).
**Sonuç:** Tek dosya yedekleme; eşzamanlı yazma sınırlı → worker eşzamanlılığı 1.
Çok kullanıcılı dağıtımda Postgres'e geçiş planlı (ADR-010).

## ADR-003 — Alan düzeyinde şifreleme + kör indeks
**Bağlam:** Uygulama kendi başına yeni bir gizlilik riski olmamalı; DB/yedek sızıntısı en olası
tehdit. **Karar:** P2 alanlar AES-256-GCM ile şifreli, arama gereken yerlerde HMAC-SHA256 kör
indeks; anahtarlar HKDF ile amaç bazında ayrık; AAD = alan adı.
**Alternatifler:** Yalnızca disk şifreleme (uygulama düzeyinde erişim kontrolü yok),
tam-DB şifreleme (tek anahtar, kör indeks yok), düz metin + erişim kontrolü (sızıntıda ifşa).
**Sonuç:** Sıralama/aralık sorgusu yapılamaz (gerekmiyor). Anahtar kaybı veri kaybıdır →
yedekleme rehberi zorunlu.

## ADR-004 — DB tabanlı iş kuyruğu, ayrı worker
**Bağlam:** Araştırma işleri uzun sürecek; Redis/BullMQ ek altyapı. **Karar:** `research_jobs`
tablosu, `BEGIN IMMEDIATE` ile atomik `claim`, lease + görünürlük zaman aşımı, üstel backoff.
Worker `npm run worker` ile ayrı süreç.
**Alternatifler:** In-process `setTimeout` (yeniden başlatmada iş kaybı, eşzamanlılık kontrolü
yok), BullMQ (v1 için gereksiz Redis), cron (geri alma/lease yok).
**Sonuç:** Kuyruk semantiği test edilebilir; çok örnekli dağıtımda Postgres `SKIP LOCKED`'a
geçiş kolay.

## ADR-005 — Grafik için ilişkisel tablo
**Bağlam:** Kimlik ilişkileri başlangıçta on binlerce kenarı geçmeyecek. **Karar:**
`identity_relationships` + indeksler; görselleştirme istemci tarafında.
**Alternatifler:** Neo4j (operasyonel yük, yedekleme, lisans), kendi grafik motoru (gereksiz).
**Sonuç:** Çok atlamalı sorgular yavaşlarsa recursive CTE; ölçüm eşiği aşılırsa yeniden değerlendir.

## ADR-006 — Kendi oturum katmanı (Auth.js değil)
**Bağlam:** E-posta/parola; üçüncü tarafa kimlik verisi gitmemeli; az sayıda akış.
**Karar:** scrypt + opak token + DB oturumu; CSRF double-submit; oturum iptali DB'de.
**Alternatifler:** Auth.js (esnek ama bu ölçekte gereğinden çok soyutlama ve tedarikçi yüzeyi),
JWT (iptal zor, çalınan token süresi boyunca geçerli).
**Sonuç:** ~200 satır kod, tam kontrol; 2FA/e-posta doğrulama Faz 6'da eklenecek.

## ADR-007 — Sağlayıcı adaptörleri + mock varsayılan
**Bağlam:** Arama/AI/ihlal servisleri değişken, kotaya tabi, bazıları ücretli. **Karar:**
`SearchProvider`, `AiProvider`, `BreachProvider` arayüzleri; varsayılan `mock` ve arayüzde
"mock" etiketi. Gerçek adaptörler yalnızca anahtar varsa kaydedilir.
**Alternatifler:** Tek sağlayıcıya doğrudan bağlanma (kilitlenme, test edilemezlik).
**Sonuç:** Testler ağsız çalışır; kullanıcı hangi sonucun simülasyon olduğunu görür.

## ADR-008 — AI'ya minimum veri, yapılandırılmış çıktı, karar yetkisi yok
**Bağlam:** AI sağlayıcıları veri saklayabilir/eğitebilir; halüsinasyon riski.
**Karar:** AI yalnızca sınıflandırma/gerekçe üretir; puanlama deterministik tablolarla yapılır;
gönderilen veri maskelenir; çıktı zod şemasına zorlanır; hiçbir dış eylem model çıktısıyla
doğrudan tetiklenmez. Sağlayıcı politikası kullanıcıya hesap sayfasında gösterilir.
**Alternatifler:** Ajanın serbest araç kullanımı (denetlenemez, injection'a açık).
**Sonuç:** Daha az "akıllı" ama denetlenebilir; Faz 3'te skor açıklanabilirliği test edilir.

## ADR-009 — Rate limit süreç içi (v1)
**Bağlam:** Tek örnek; Redis yok. **Karar:** Token bucket, `Map`, periyodik temizlik; auth
uçlarında IP+hesap ekseni. **Alternatifler:** Redis (altyapı), DB tabanlı (her istekte yazma).
**Sonuç:** Çok örnekli dağıtımda etkisiz → v2'de Redis; bu sınır dokümante edildi.

## ADR-010 — Sahiplik beyanı zorunlu, otomatik kaldırma yok
**Bağlam:** Yanlış kişiye ait hesabı kapatmak geri alınamaz zarar. Platform API'leri kaldırma
için güvenilir değil. **Karar:** Araştırma ve kaldırma için "bu benim kimliğim" beyanı + onay
kaydı; hiçbir otomatik gönderim v1'de yok; sahiplik kanıtı yoksa hesap kapatma seçeneği sunulmaz.
**Alternatifler:** Otomatik form gönderimi (ToS/CAPTCHA ihlali, hukuki risk), e-posta ile
platforma doğrudan yazma (kullanıcı adına eylem).
**Sonuç:** Daha yavaş ama güvenli; Faz 4'te yalnızca resmî API destekli kanallar otomatikleşebilir.

## ADR-011 — Varyantlar kanıt değildir
**Bağlam:** Türkçe karakter/ayraç varyantları kapsamı artırır ama yanlış pozitif üretir.
**Karar:** Varyantlar `origin=generated_variant` + `verification=unverified`; bulgu üretiminde
tek başına kullanılamaz; raporda "üretilmiş sorgu" olarak etiketlenir.
**Sonuç:** Kapsam artışı ile doğruluk dengesi korunur.
