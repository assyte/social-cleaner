# Social Cleaner — Ürün, Arama ve Gelir Modeli Planı

> **Historical document / tarihsel belge.** Prices, plan names, test counts, and feature
> claims below may be obsolete. Social Cleaner is free and open source under the MIT
> License; paid hosting/support is arranged manually via GitHub. The current source of truth
> is the root `README.md` and `docs/LAUNCH-READINESS.md`.

Son güncelleme: 24.10.2026 · Durum: **Faz 2A + 2A.1 tamamlandı; Faz 2B (sağlayıcı/kuyruk) sıradaki**

Bu belge, ürünün ne olduğunu, neyi **hukuka uygun biçimde** bulabileceğini, ücretsiz/ücretli
sürüm ayrımını ve arama motorunun nasıl çalışacağını tanımlar. Pazarlama metni değildir;
mühendislik ve uyum sözleşmesidir.

---

## 1. Ürün tanımı

**Social Cleaner**, kişinin kendi dijital ayak izini keşfetmesini, doğrulamasını ve zamanla
azaltmasını sağlayan bir gizlilik platformudur.

Temel vaat: *"Herkese açık kaynaklarda, senin verdiğin bilgilerle, kanıtı gösterilebilir
şekilde ne bulunabildiğini gör."*

Verilmeyen vaatler:
- İnternetin tamamının tarandığı,
- Her hesabın bulunacağı,
- Bulunan hesabın kesin olarak kullanıcıya ait olduğu,
- Silme işleminin garanti olduğu.

## 2. Kullanıcı akışı

1. Kayıt → sahiplik beyanı (`Bu profilin bana ait olduğunu beyan ediyorum`).
2. Identity Vault: ad soyad, kullanıcı adları, e-posta, telefon, bağlantılar.
3. Arama türünü seç: **kullanıcı adı / ad soyad** (e-posta/telefon sonraki sürümde).
4. Platformları seç (veya "önerilen" setini kullan).
5. Tarama çalışır; her sonuç **platform logosu + profil bağlantısı + güven + kanıt** ile gelir.
6. Kullanıcı sonucu "benim" / "benim değil" olarak işaretler (Faz 2B).
7. Bulunan hesaplar için kaldırma/gizlilik adımları (Faz 4) ve izleme (Faz 5).

## 3. Arama türleri ve gerçeklik seviyeleri

| Tür | Nasıl bulunur | Bugünkü durum | Doğruluk |
| --- | --- | --- | --- |
| Kullanıcı adı | Platformun **herkese açık profil URL'si** doğrudan kontrol edilir | ✅ Çalışıyor (56 platform; 115 platformluk katalog) | Yüksek: HTTP durumu + sayfa işareti; engel ayrı raporlanır |
| Ad soyad | Web arama sağlayıcısı (Brave/Tavily) + kamuya açık sayfa eşleştirme | ⏳ Sağlayıcı anahtarı bekliyor | Orta: sayfa, hesap değil |
| E-posta | Aynı sağlayıcı; yalnızca sayfada **açıkça geçen** e-posta | ⏳ Sağlayıcı anahtarı bekliyor | Orta/düşük: bahsedilme ≠ hesap |
| Telefon | Aynı sağlayıcı; yalnızca kamuya açık sayfalarda geçen numara | ⏳ Sağlayıcı anahtarı bekliyor | Düşük: yanlış eşleşme riski yüksek |

**Sonuç durumları (her kartta görünür):**

- `doğrulandı` — genel profil URL'si 200 döndü ve platforma özgü olumlu işaret bulundu (güven 85–95).
- `muhtemel` — 200 döndü ancak yalnızca durum kodu/önizleme var (ör. Facebook); sahiplik iddiası değildir (güven 60–75).
- `bahis` — arama sağlayıcısı tam profil URL'si buldu; sayfa bir hesap olduğunu kanıtlamaz (güven 40–65).
- `bulunamadı` — 404 veya platformun açık "kullanıcı yok" işareti.
- `engellendi` — 403/429/CAPTCHA/giriş duvarı; **kanıt sayılmaz**, kullanıcıya "platform bot erişimini engelledi" denir.
- `manuel` — otomatik doğrulama yok; gerçek profil bağlantısı el ile açılır.

> **Eşleşme ≠ sahiplik.** Aynı kullanıcı adına sahip bir profil, başka bir kişiye ait olabilir.
> Kullanıcı aksini işaretlemedikçe hiçbir sonuç "senin hesabın" olarak etiketlenmez.

## 4. Hukuki çerçeve ve etik sınırlar

- Yalnızca **herkese açık** sayfalar ve resmî API'ler kullanılır.
- Giriş gerektiren, CAPTCHA arkasındaki veya `robots.txt` ile yasaklanmış içerik taranmaz.
- Çalıntı veri, breach dumps, parola, token, özel mesaj **asla** kullanılmaz/satılmaz.
- Kişi yalnızca **kendi** kimliği için arama yapabilir; sahiplik beyanı zorunludur.
- Başkasını hedefleme, ısrarlı izleme (stalking) ve "kişi bulma" özelliği yoktur.
- Telefon/e-posta sonuçları yalnızca kamuya açık sayfa bahsi olarak gösterilir; tersine
  numara sorgulama (reverse lookup) veritabanı entegrasyonu yapılmaz.
- KVKK/GDPR: veri minimizasyonu, amaç sınırlaması, 90 gün saklama, silme/ihracı hakkı.
- Platform markaları ve logoları yalnızca **kimliklendirme** amacıyla kullanılır; hak sahipleri
  ilgili markaların sahibidir. Logo, destek/ortaklık iması olarak kullanılamaz.

## 5. Ücretsiz ve ücretli sürüm

Fiyatlar **öneri**dir; ödeme sağlayıcısı ve vergi yapılandırması kesinleşince güncellenir.

| Özellik | Ücretsiz | Pro |
| --- | --- | --- |
| Kullanıcı adı taraması | ✅ | ✅ |
| Ad soyad taraması | — | ✅ |
| Katalog kapsamı | 115 platform | 115 platform |
| Doğrudan doğrulanabilir platform | 56 | 56 |
| Platform sayısı / tarama | 8 | 40 |
| Günlük tarama | 3 | 100 |
| Görünen sonuç | ilk 5 | tümü (80) |
| Geçmiş | 7 gün / 10 tarama | 90 gün / 200 tarama |
| Sonuç dışa aktarma (JSON/CSV) | — | ✅ |
| İzleme ve yeniden tarama | — | ✅ (Faz 5) |
| Kaldırma taslakları | — | ✅ (Faz 4) |
| Fiyat | Free | Contact — manual only (no checkout) |

Kurumsal (ajans, avukat, aile planı) Faz 6'da ayrı fiyatlanır; paylaşılan hazne ve denetim
raporu gerektirir.

### Gelir modeli kuralları

- Ücretsiz sürüm **reklam göstermez** ve veri satmaz. Gelir yalnızca abonelikten gelir.
- Ücretsiz sürümde sonuçların bir kısmı **sunucudan hiç gönderilmez** (CSS ile gizleme yeterli
  değildir); "daha fazlası Pro'da" çağrısı gösterilir.
- Ödeme: Türkiye için **iyzico**, uluslararası için **Stripe** (hosted checkout, 3D Secure).
  Kart verisi hiçbir zaman uygulamaya girmez.
- Abonelik durumu webhook ile `users.plan` + `plan_renews_at` alanlarına yazılır; iptal dönem
  sonunda etkin olur. Faturalar sağlayıcıda tutulur.
- 14 gün koşulsuz iade; deneme sürümü 7 gün Pro (kart istemeden, tek seferlik).

## 6. Arama motoru mimarisi

```
İstemci (arama sihirbazı)
   │  POST /api/search {fieldType, query, platforms[]}
   ▼
Yetki kapısı: oturum + CSRF + sahiplik beyanı + plan limiti + günlük kota
   ▼
Planlayıcı: fieldType → strateji
   ├── username → PlatformChecker
   │     ├── doğrudan herkese açık URL/API (56 platform)
   │     ├── sağlayıcı varsa tam profil URL eşleşmesi (bahis)
   │     └── sağlayıcı yoksa manuel profil bağlantısı (sonuç üretmez)
   └── email/name/phone → WebSearchProvider (Brave/Tavily) + alan adı eşleme
   ▼
Doğrulayıcı: HTTP durumu + platform işareti + sayfa başlığı → güven skoru
   ▼
Kapsam: her seçili platform için found / not_found / blocked / unsupported / error
   ▼
Kayıt: search_runs (+ outcomes_json) + search_results (sorgu şifreli, kanıt ayrı)
   ▼
Görünüm: plana göre kırpılmış sonuç + platform kapsamı + yükseltme çağrısı
```

### 6.1 Platform kataloğu

Her platform kaydı şunları taşır:

```ts
{
  id: "github", name: "GitHub", domain: "github.com",
  icon: "/brand/platforms/github.svg", category: "dev",
  check: { kind: "status", profileUrl: "https://github.com/{u}", notFound: [404] }
}
```

Kontrol yöntemleri:
- `status` — 200 = var, 404 = yok, 403/429 = engellendi.
- `marker` — 200 + olumlu işaret = var; 200 + "kullanıcı yok" işareti = yok; aksi = belirsiz.
- `json` — resmî API yanıtı (ör. GitLab `/api/v4/users?username=`).

Desteklenen doğrudan kontroller (56): GitHub, GitLab, Codeberg, Hacker News, Dev.to, npm,
SoundCloud, YouTube, Steam, Lichess, Chess.com, CraftRise, Vimeo, Behance, Dribbble, Flickr,
Last.fm, Mixcloud, Goodreads, MyAnimeList, Hugging Face, Kaggle, Bitbucket, Docker Hub,
HackerRank, Codewars, Exercism, VK, Minds, Substack, Blogger, DeviantArt, Patreon, Kick,
Rumble, Dailymotion, **Instagram, TikTok, Facebook, Telegram, X** ve daha fazlası. Tam liste:
`src/server/search/platforms.ts`.

Doğrudan kontrol edilemeyen 59 katalog kaydı (logo + sınır açıklaması; otomatik doğrulama yok):
Reddit, Twitch, Pinterest, Spotify, Discord, Snapchat, Netflix, Medium, PyPI, Roblox,
LinkedIn, Quora, Threads, Bluesky, Mastodon, ArtStation, CodePen, Product Hunt, Letterboxd,
Duolingo, Khan Academy, Odysee, Truth Social ve benzerleri. Bunlarda 403/429/CAPTCHA,
giriş duvarı veya soft-404 nedeniyle "hesap yok" sonucu üretilmez; sağlayıcı varsa yalnızca
tam profil URL'si "bahis" olarak işaretlenir, yoksa manuel bağlantı gösterilir.

### 6.2 Platform nezaketi ve dayanıklılık

- Eşzamanlılık en fazla 10; istek başına 6 sn zaman aşımı; toplam tarama 35 sn'de kesilir.
- Özel User-Agent: `SocialCleanerAudit/0.1 (+<app-url>)`.
- Yönlendirmeler takip edilmez; 3xx = belirsiz (login/consent duvarı olabilir).
- Sonuçlar 24 saat önbelleklenir (aynı kullanıcı adı + platform) — platforma yükü azaltır (Faz 2B).
- 403/429 alan platform 24 saat "engellendi" olarak işaretlenir; tekrar denenmez (Faz 2B).
- Sayfa içeriği **saklanmaz**; yalnızca başlık, HTTP durumu ve işaret adı kanıt olarak tutulur.

### 6.3 Web arama sağlayıcısı (ad/e-posta/telefon)

- `SC_SEARCH_PROVIDER=brave` + `SC_SEARCH_API_KEY` ile etkinleşir.
- Sorgu planı: `"<değer>"` + isteğe bağlı platform `site:` filtreleri; her sorgu gerekçesiyle
  kaydedilir.
- Dönen sayfa URL'si bilinen platform alan adıyla eşleşirse logo ve platform adı gösterilir.
- Sayfa "hesap" olarak değil, **bahsedilme** olarak sınıflanır (`verification: mention`).
- Sağlayıcı yoksa API `503 PROVIDER_NOT_CONFIGURED` döner; sahte sonuç üretilmez.

## 7. Veri modeli (Faz 2A)

```sql
users.plan TEXT NOT NULL DEFAULT 'free'
users.plan_renews_at INTEGER

search_runs(
  id, user_id, field_type, query_enc, query_masked, status,
  platform_ids_json, checked_count, found_count, hidden_count,
  error_code, created_at, finished_at
)

search_results(
  id, run_id, platform_id, platform_name, profile_url, handle,
  confidence, verification, evidence_json, created_at
)
```

- `query_enc`: AES-256-GCM (AAD `search_runs.query`); e-posta/telefon/ad için zorunlu.
- Kullanıcı adı kamuya açık kimlik olduğu için `query_masked` alanında okunabilir tutulur.
- `evidence_json`: `{ httpStatus, marker, title, checkedAt }` — sayfa gövdesi yok.
- `search_results.run_id` → cascade; kullanıcı silinince tüm aramalar silinir.
- Saklama: ücretsiz 7 gün, Pro 90 gün; süpürme işi günlük çalışır (Faz 2B).

## 8. API

| Uç nokta | Açıklama |
| --- | --- |
| `GET /api/search/platforms` | Katalog + plan limitleri + sağlayıcı durumu |
| `POST /api/search` | Tarama başlatır (senkron, Faz 2A) |
| `GET /api/search` | Son taramalar (plan geçmiş limiti) |
| `GET /api/search/[id]` | Tarama + görünür sonuçlar |
| `DELETE /api/search/[id]` | Taramayı ve sonuçlarını siler |
| `GET /api/billing` | Plan, limitler, kullanım |

Hata kodları: `OWNERSHIP_NOT_DECLARED` (403), `PLAN_REQUIRED` (403),
`PROVIDER_NOT_CONFIGURED` (503), `QUOTA_EXCEEDED` (429), `INVALID_HANDLE` (400).

## 9. Arayüz

- **Açık tema**, beyaz kartlar, slate metin, teal vurgu; yoğun ama ferah kurumsal düzen.
- Sonuç kartı: platform logosu, platform adı, kullanıcı adı, güven çubuğu, doğrulama rozeti,
  "Profili aç" bağlantısı, kanıt satırı (`HTTP 200 · public_profile`).
- Logolar **yerel SVG** olarak servis edilir (`/brand/platforms/*.svg`); dış görsel isteği yok.
- Logosu olmayan platform için marka renkli monogram.
- Ücretsiz limitte gizlenen sonuç sayısı gösterilir; kartlar DOM'a basılmaz.
- Boş/engelli/hata durumları ayrı ayrı açıklanır; "sonuç yok" ile "kontrol edilemedi" karışmaz.

## 10. Marka ve maskot

- Ad: **Social Cleaner** (her yerde aynı yazım).
- Maskot: **Temiz** — teal renkli, yuvarlak hatlı, elinde büyüteç ve parıltı taşıyan dostane
  bir dijital temizlik yardımcısı. Yüzü güven verir; agresif "hacker" estetiği yok.
- Logo: maskot + "Social Cleaner" kelime markası; ikon sürümü favicon ve uygulama simgesi.
- Renkler: teal `#0f766e`, açık zemin `#f6f8fb`, metin `#0f172a`, vurgu amber `#d97706`.
- Kullanım: maskot asla gerçek bir kişi fotoğrafının yerine, güvenlik garantisi rozeti olarak
  veya platform logolarıyla birleşik biçimde kullanılmaz.
- Tüm platform logoları ilgili hak sahiplerinin tescilli markalarıdır; yalnızca tanımlama
  amacıyla gösterilir (`public/brand/platforms/NOTICE.md`).

## 11. Yol haritası

### Faz 2A — Ürünleştirme ve kullanıcı adı taraması (bu sürüm)
- [x] Açık tema + maskot logo + favicon.
- [x] Platform kataloğu ve yerel logo seti.
- [x] Ücretsiz/Pro plan tanımları, `users.plan`, limit motoru.
- [x] Kullanıcı adı için gerçek, doğrulanmış tarama; sonuç kaydı ve geçmiş.
- [x] Fiyatlandırma sayfası (ödeme entegrasyonu olmadan, açıkça işaretli).
- [x] Sahiplik beyanı zorunluluğu, günlük kota, plana göre kırpma.
- [ ] Ödeme entegrasyonu (iyzico/Stripe) — Faz 2C.

**Kabul:** GitHub/CraftRise dahil en az 10 platformda gerçek profil URL'si döner; 404/engel
ayrımı doğru; ücretsiz kullanıcı 5'ten fazla sonuç alamaz; başka kullanıcının taraması 404;
sağlayıcı yokken ad/e-posta/telefon 503 döner, sahte sonuç yok.

### Faz 2B — Ad/e-posta/telefon ve korelasyon
Brave/Tavily adaptörü, alan adı→platform eşlemesi, bahsedilme kanıtı, 24 saat önbellek,
DB tabanlı kuyruk + worker, saklama süpürücüsü.

### Faz 2C — Ticaret
iyzico/Stripe hosted checkout, webhook, abonelik durumu, fatura, iade, deneme süresi.

### Faz 3+ — AI ajanları, kaldırma, izleme, rapor
Mevcut `docs/ROADMAP.md` ile aynı; her ajan çıktısı gerekçe + kaynak taşır.

## 12. Ölçütler

- Aktif kullanıcı başına haftalık tarama ≥ 2.
- Ücretsiz → Pro dönüşüm %3–6 (ilk 90 gün).
- Doğrulanmış sonuçlarda yanlış pozitif < %2 (elle örnekleme).
- "Engellendi" oranı < %15; yükselirse platform bazlı devre dışı bırakma.
- p95 tarama süresi < 12 sn (8 platform), < 35 sn (40 platform); hata oranı < %1.
- Ücretsiz kullanıcıda sonuç sızıntısı: 0 (API testi).

## 13. Riskler ve açık sorular

| Risk | Etki | Önlem |
| --- | --- | --- |
| Platformların bot engeli | Sonuç eksik görünür | "Engellendi" durumu, resmî API önceliği, nazik hız |
| Yanlış pozitif / yanlış sahiplik | Kullanıcı güveni | "Eşleşme ≠ sahiplik", kullanıcı onayı, güven skoru |
| Marka/logolar | Hukuki itiraz | Yerel, tanımlama amaçlı, NOTICE, kaldırma talebine açık |
| Telefon aramasının mahremiyeti | KVKK riski | Yalnızca açık sayfa bahsi; ters sorgu yok; Pro'da uyarı |
| Arama API maliyeti | Birim ekonomi | Kota, önbellek, plan limiti, sağlayıcı maliyet ölçümü |
| Ödeme/vergi | Gelir gecikmesi | Manual payment policy, invoices, and tax review before accepting paid work |
| Kaynak kodda sır sızıntısı | Kritik | Anahtarlar yalnızca env; loglarda maskeleme |

Açık sorular: Manual paid-support scope, invoice/tax handling, and response expectations?
Ücretsiz planda kaç sonuç "yeterli" hissettirir? Aile/kurumsal plan gerekli mi? Telefon
araması Türkiye'de hukuken nasıl konumlanmalı (avukat görüşü alınmalı)?
