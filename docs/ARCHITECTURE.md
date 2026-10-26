# Social Cleaner — Mimari

> Durum: **Faz 1 uygulandı** (kimlik doğrulama + Identity Vault + şifreli depolama + denetim kaydı).
> Bu doküman hedef mimariyi tanımlar; hangi parçanın gerçekten çalıştığı `README.md` içindeki
> "Uygulama Durumu" tablosunda tutulur. Buradaki bir bileşenin var olması, onun tamamlandığı
> anlamına gelmez.

## 1. Ortam analizi (24.10.2026)

| Bulgu | Sonuç |
| --- | --- |
| Depo | Boş dizin, git deposu değildi. `git init` ile başlatıldı. |
| Node / npm | v24.19.0 / 11.17.0 — yeterli. |
| Python / git | 3.12.10 / 2.55.0 — yalnızca yardımcı script'ler için. |
| .NET | SDK yok — kullanılmayacak. |
| Docker | Kurulu, **daemon kapalı** — v1 altyapısı Docker'a bağımlı olmayacak. |
| Platform | Windows 11. Geliştirme akışı PowerShell uyumlu olmalı. |
| Ağ | npm registry erişimi var; dış arama/AI servisleri için anahtar yok. |

Sonuç: **sıfırdan kurulum**. v1, tek makinede çalışan, harici servis gerektirmeyen bir
uygulama olacak; Docker/Postgres/Redis gibi bağımlılıklar yalnızca gerçek ihtiyaç doğduğunda
(çok kullanıcılı dağıtım) devreye alınacak.

## 2. Teknoloji seçimi ve gerekçesi

| Katman | Seçim | Gerekçe / reddedilen alternatif |
| --- | --- | --- |
| Dil | TypeScript (strict) | Uçtan uca tip güvenliği, tek dil, zod ile runtime doğrulama. |
| UI + API | Next.js 16 (App Router, React 19) | Sunucu bileşenleriyle hızlı, veri yoğun arayüz; aynı süreçte Route Handler'lar. Ayrı SPA+API iki deploy birimi gereksiz karmaşıklık olurdu. |
| Stil | Tailwind 4 + tasarım token'ları | Kurumsal, yoğun arayüz için hızlı; UI kütüphanesi bağımlılığı yok. |
| Veritabanı | SQLite (libsql) + Drizzle ORM | Tek örnek için sıfır altyapı, dosya tabanlı yedekleme, Windows'ta derleme gerektirmeyen hazır binary. Postgres'e geçiş için şema taşınabilir tutuldu (bkz. ADR-002). |
| Kimlik doğrulama | Kendi oturum katmanı: scrypt + opak oturum token'ı | Harici IdP gereksiz; parola/e-posta üçüncü tarafa gitmez. Auth.js gibi bir çerçeve bu ölçekte ek soyutlama ve tedarikçi yüzeyi getirirdi. |
| Alan şifreleme | AES-256-GCM + HMAC-SHA256 kör indeks | DB dosyası sızsa bile ad/e-posta/telefon okunamaz; kör indeks eşitlik aramasını şifrelemeden korur. |
| Doğrulama | Zod 4 | API sınırında tek doğruluk kaynağı; aynı şemalar form ve testlerde kullanılır. |
| Test | Vitest 5 | Hızlı, ESM dostu, Next ile çakışmıyor. |
| Kuyruk | DB tabanlı iş kuyruğu + ayrı worker process | Redis/BullMQ tek makinede gereksiz altyapı. SQLite `BEGIN IMMEDIATE` ile atomik iş alma yeterli (ADR-004). |
| Grafik | İlişkisel tablolar (`identity_relationships`) | Gerçek ihtiyaç (çok atlamalı sorgu, >10^5 kenar) doğmadan graph DB eklenmeyecek (ADR-005). |

## 3. Bileşenler

```
┌──────────────────────────────────────────────────────────────────────┐
│  Next.js (tek deploy birimi)                                         │
│                                                                      │
│  UI (RSC + client forms)          /api/* Route Handlers              │
│  ├─ Dashboard                     ├─ auth  (register/login/logout)  │
│  ├─ Identity Vault                ├─ vault (names/aliases/...)      │
│  ├─ Research Center  (Faz 2)      ├─ research (Faz 2)               │
│  ├─ Findings         (Faz 2)      ├─ findings (Faz 2)               │
│  ├─ Identity Graph   (Faz 3)      ├─ remediation (Faz 4)            │
│  └─ Reports/Account               └─ account (export/delete)        │
│                                                                      │
│  src/server (framework'ten bağımsız çekirdek)                        │
│  ├─ auth/        oturum, CSRF, rate limit, guard                    │
│  ├─ crypto/      field cipher, blind index, password, tokens        │
│  ├─ vault/       profil servisi + doğrulama + varyasyon üretimi     │
│  ├─ research/    planlayıcı, yürütücü, korelasyon  (Faz 2–3)        │
│  ├─ providers/   SearchProvider | AiProvider | BreachProvider       │
│  └─ security/    SSRF guard, untrusted content, maskeleme           │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │ SQLite (libsql)      │
                     │ data/app.db          │
                     └──────────▲──────────┘
                                │ aynı şema, aynı servis modülleri
                     ┌──────────┴──────────┐
                     │ worker (Faz 2)       │  npm run worker
                     │ job polling + retry  │
                     └──────────────────────┘
```

**Sınır kuralı:** `src/app` yalnızca HTTP/UI katmanıdır. İş kuralları `src/server/*` içinde
yaşar ve Route Handler'lardan bağımsız olarak test edilir. Worker da aynı servis modüllerini
kullanır — iş mantığı iki yerde tekrarlanmaz.

## 4. Araştırma veri akışı

```
IdentityProfile ──► QueryPlanner ──► research_jobs ──► worker
      │                  ▲                             │
      │                  │       ┌─────────────────────┘
      │                  │       ▼
      │            yeni hipotez  SearchProvider / PlatformAdapter
      │                  │       │
      │                  │       ▼
      │                  └── Finding ◄── dedupe (canonical_url hash)
      │                          │
      │                          ├──► Evidence (snippet, tarih, hash, ekran görüntüsü)
      │                          ├──► IdentityCorrelator ──► IdentityRelationship + sinyaller
      │                          └──► PrivacyAuditor    ──► RiskAssessment (açıklamalı)
      │
      └──► RemediationPlanner ──► RemovalRequest (taslak, onay bekler)
                                        │ kullanıcı onayı
                                        ▼
                                  uzman/manuel yürütme ──► VerificationCheck
                                        │
                                        └──► MonitorSchedule (yeniden ortaya çıkma)
```

Döngü sınırsızdır **değildir**: her araştırma için `max_queries`, `max_depth`, `max_cost_cents`,
`deadline` sınırları `research_scopes` içinde tanımlıdır. Limit aşımı işi `budget_exceeded`
durumuna alır, sessizce durmaz.

### 4.1 Sorgu planlama ilkeleri

1. Her sorgunun **gerekçesi** kaydedilir: hangi bulguya dayanıyor, hangi belirsizliği gideriyor.
2. Varyasyonlar (Türkçe karakter katlama, ayraç varyantları) **kanıt değil, sorgu**dur;
   `source = 'generated_variant'` olarak işaretlenir ve bulgu üretiminde tek başına kullanılamaz.
3. Aynı sorgu 24 saat içinde tekrar üretilmez (deterministik `query_hash`).
4. E-posta/telefon içeren sorgular yalnızca kullanıcı o kategoride arama izni verdiyse üretilir
   (`consent_records`).

## 5. Hesap ve kimlik eşleştirme modeli

Yalnızca ad benzerliğiyle eşleştirme yapılmaz. Her ilişki, ağırlıklı ve **açıklanabilir**
sinyallerden oluşur; puan yüzde olarak değil, sinyal listesi + toplam skor olarak sunulur.

| Sinyal | Ağırlık | Not |
| --- | --- | --- |
| Kullanıcının açık onayı | +100 | Tek başına "doğrulanmış" yapar. |
| Kullanıcının verdiği profil bağlantısı | +45 | Kullanıcı beyanı; tarih ve URL saklanır. |
| Profiller arası karşılıklı bağlantı | +35 | İki yön de doğrulanmalı. |
| Doğrulanmış e-posta kör indeksi eşleşmesi | +40 | E-posta asla düz metin karşılaştırılmaz. |
| Doğrulanmış kişisel domain eşleşmesi | +25 | |
| Birebir kullanıcı adı eşleşmesi | +30 | Nadir rumuzlarda güçlü, yaygın rumuzlarda zayıf. |
| Kullanıcı adı yaygınlık cezası | −15 … 0 | Aynı rumuz 50+ sitede varsa düşürülür. |
| İsim/şehir/ilgi alanı benzerliği | +5 … +15 | Asla tek başına yeterli değil. |
| Zaman uyumsuzluğu (hesap, kullanıcı adından önce açılmış) | −20 | |
| Tek zayıf sinyal | tavan 24 | "Belirsiz" sınıfında kalır. |

Sınıflar: `verified` (≥70 veya kullanıcı onayı), `high_probability` (50–69, ≥2 bağımsız sinyal),
`possible` (25–49), `uncertain` (<25), `unrelated` (kullanıcı reddetti).
Karar ve sinyaller `identity_relationships.signals_json` içinde **değişmez kayıt** olarak tutulur.

## 6. Risk modeli

Risk puanı AI'ya bırakılmaz. `PrivacyAuditor` yalnızca **sinyal çıkarır**; puanlama
deterministik bir tablo ile yapılır, AI yalnızca gerekçe metni yazar.

| Boyut | Örnek sinyaller | Maks. |
| --- | --- | --- |
| İfşa (exposure) | açık e-posta/telefon, kimlik belgesi, adres | 40 |
| Korelasyon | rumuz↔gerçek ad bağı, platformlar arası zincir | 25 |
| Erişilebilirlik | indekslenmiş, herkese açık, arşiv kopyası var | 15 |
| Hesap güvenliği | ihlal kaydı, zayıf kurtarma, kullanılmayan hesap | 15 |
| Kalıcılık | üçüncü taraf kopya, arşiv, yeniden yayın | 5 |

Sonuç: `low < 25 ≤ medium < 50 ≤ high < 75 ≤ critical`. Her risk kaydı 7 soruyu yanıtlar
(ne açığa çıkıyor / neden risk / kötüye kullanım senaryosu / kaynaktan kaldırılabilir mi /
arama motorundan ayrı kaldırma gerekir mi / önerilen işlem / doğrulama yöntemi).

## 7. Kaldırma akışı ve onay kapıları

```
draft ──(kullanıcı onayı: consent_records)──► approved ──► submitted ──► acknowledged
                                                             │              │
                                                             ▼              ▼
                                                          rejected      verified_removed
                                                             │              │
                                                             └──► needs_manual ◄┘
```

- Varsayılan mod **Read-Only Audit**'tir (`research_scopes.mode`).
- `approved` durumuna geçiş, aynı kullanıcının oturumu + CSRF + açık onay kaydı gerektirir.
- Otomatik gönderim yalnızca platformun resmî API'si/izin verdiği kanal varsa ve provider
  adaptörü `supportsAutomatedSubmission = true` ise çalışır. v1'de hiçbir adaptör bunu
  bildirmez: tüm talepler **taslak + manuel gönderim** olarak kalır.
- Sahiplik kanıtlanamayan hesap için hesap kapatma talebi oluşturulmaz; yalnızca sahiplik
  doğrulama yolu önerilir.

## 8. Güvenlik mimarisi (özet)

- Tüm hassas alanlar AES-256-GCM; anahtar `SC_MASTER_KEY`, sürüm etiketli zarf formatı
  (`v1:iv:tag:ciphertext`) ile anahtar rotasyonuna hazır.
- Eşitlik araması gereken alanlarda HMAC-SHA256 kör indeks (`bidx_v1:...`).
- Parolalar scrypt (N=2^15, r=8, p=1) + sabit zamanlı karşılaştırma.
- Oturum token'ı yalnızca hash'lenmiş halde DB'de; cookie `HttpOnly; SameSite=Lax; Secure(prod)`.
- CSRF: double-submit cookie + `Origin`/`Sec-Fetch-Site` kontrolü (tüm mutasyonlarda).
- CSP nonce ile; `connect-src 'self'` — tarayıcıdan üçüncü tarafa veri sızıntısı yok.
- SSRF: şema, kimlik bilgisi, port, DNS çözümlemesi ve özel IP aralığı kontrolü (DNS
  rebinding'e karşı çözümlenen IP ile bağlantı arasında doğrulama; Faz 2'de pinning).
- Dış içerik **veri**dir: `wrapUntrusted()` ile sınırlandırılır, delimiter çakışmaları temizlenir.
- Loglarda e-posta/telefon/adres maskelenir; `AuditEvent.meta` yalnızca anahtar/varlık kimliği taşır.
- Veri saklama: profil kullanıcı silene kadar; oturumlar 7 gün; denetim kaydı 1 yıl;
  araştırma ham yanıtları 90 gün (Faz 2'de uygulanacak, `docs/DATA-MODEL.md`).

## 9. Deployment ve ölçeklenme yolu

| Aşama | Topoloji | Tetikleyici |
| --- | --- | --- |
| v1 (şimdi) | Tek Node süreci + SQLite + worker (opsiyonel) | Tek kullanıcı / yerel kurulum |
| v1.5 | Tek uygulama + ayrı worker + SQLite WAL | Uzun süren araştırmalar |
| v2 | Postgres + ayrı worker + object storage (kanıt dosyaları) | Çok kullanıcı, yatay ölçek |
| v2.5 | KMS ile anahtar yönetimi, Redis kuyruk | Yüksek hacim, çok örnek |

Şema Postgres'e taşınabilir: metin kimlikler, `integer` zaman damgaları, JSON alanları `text`
olarak tutulur ve uygulama katmanında parse edilir. SQLite'a özgü tek şey `AUTOINCREMENT`
kullanmamamız ve `BEGIN IMMEDIATE` kilidi.

## 10. Gözlemlenebilirlik ve maliyet

- Her iş için `research_jobs` üzerinde durum, deneme sayısı, son hata, süre, tahmini maliyet.
- `AuditEvent` tüm güvenlik açısından anlamlı eylemleri kapsar (giriş, onay, dışa aktarma, silme).
- Sağlayıcı çağrıları tek noktadan geçer (`providers/registry`) → sayaç, zaman aşımı, bütçe.
- Log satırları yapılandırılmış JSON; hassas alanlar `masking.ts` üzerinden geçer.

## 11. Bilinen sınırlamalar (v1)

1. Hiçbir arama sağlayıcısı bağlı değil; Faz 2'de `mock` sağlayıcı **açıkça mock** etiketiyle
   çalışacak. Gerçek bulgu üretilmez.
2. Arama motoru indekslerinin tamamı taranamaz; kapsam rapora yazılır.
3. Rate limit süreç içi bellekte — çok örnekli dağıtımda Redis gerekir.
4. SQLite tek yazıcı; eşzamanlı worker sayısı 1 ile sınırlandırılmalı.
5. Otomatik kaldırma yok; tüm talepler kullanıcı onaylı taslak.
6. KVKK/GDPR değerlendirmesi bilgi amaçlıdır, hukuki görüş değildir.
