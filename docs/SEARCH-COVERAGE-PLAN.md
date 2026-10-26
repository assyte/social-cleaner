# Geniş Kapsamlı Arama Planı

> Durum: 24 Ekim 2026 · Sürüm 2A.1
>
> İlke: **Eşleşme ≠ sahiplik.** Hiçbir platform “hesap yok” diye kesin
> konuşmaz; giriş duvarı, 403/429 ve CAPTCHA bir yokluk kanıtı değildir.

## 1. Sorunun kökü

İlk geniş tarama denemesinde kullanıcı `hanifeninsokagi` rumuzunu girdi ve
yalnızca 1 sonuç gördü. Bunun üç nedeni vardı:

1. **Varsayılan seçim yanlıştı.** Ücretsiz planın 8 koltuğu GitHub, YouTube,
   Steam, CraftRise, Vimeo, SoundCloud, Behance ve Dribbble’a gidiyordu.
   Instagram, TikTok, Facebook, Reddit, Telegram ve Epic Games hiç
   seçilmiyordu.
2. **Bu platformların çoğu doğrudan kontrol edilemiyordu.** Instagram, TikTok,
   Facebook, Reddit, Telegram ve Epic Games katalogda “yalnızca bahis” olarak
   duruyordu. Sağlayıcı anahtarı da (`SC_SEARCH_PROVIDER=mock`) bağlı değildi.
3. **Steam yanlış pozitif üretti.** Hata sayfası Türkçe
   (`Steam Topluluğu :: Hata`) gelirken kod İngilizce
   (`Steam Community :: Error`) işaretini arıyordu. Bu yüzden olmayan profil
   “bulundu” sayıldı.

## 2. Yeni mimari: dört katman

| Katman | Ne yapar | Örnek |
|---|---|---|
| **A. Doğrudan profil** | Herkese açık sayfa/API’yi oturumsuz, çerezsiz kontrol eder | Instagram, TikTok, YouTube, Steam, GitHub |
| **B. Resmî açık API** | Public JSON/XML yanıtını doğrular | GitLab, Lichess, Steam XML, Chess.com |
| **C. Arama sağlayıcısı** | Giriş duvarı olan platformlarda yalnızca **tam profil URL’si** eşleşirse “bahis” üretir | Reddit, Epic Games, LinkedIn |
| **D. Manuel doğrulama** | Sağlayıcı yoksa gerçek profil bağlantısını gösterir; sonuç üretmez | Reddit, Epic Games, Netflix |

Her seçili platform için sonuçlardan bağımsız bir **kapsam kaydı** üretilir:

- `found` — pozitif bulgu (doğrulandı / muhtemel / bahis)
- `not_found` — doğrudan kontrol temiz; “yok” değil, “bu rumuzla bulunamadı”
- `blocked` — giriş duvarı, 403/429 veya CAPTCHA; kanıt değil
- `unsupported` — otomatik doğrulama yok; manuel bağlantı
- `error` — ağ/sağlayıcı hatası

Bu kayıt `search_runs.outcomes_json` içinde saklanır ve geçmiş taramalarda da
görünür. Kullanıcı artık “tarama yapılmadı” ile “tarandı, sonuç yok” arasındaki
farkı görür.

## 3. Platform kapsamı

### 3.1 Doğrudan kontrol edilen ana ağlar

| Platform | Yöntem | Kanıt | Sınır |
|---|---|---|---|
| Instagram | Mobil public profil HTML | `og:title` / `&#064;rumuz` | Giriş duvarı → `blocked` |
| TikTok | Mobil public profil HTML | `webapp.user-detail.userInfo` | Bot sayfası → `blocked` |
| Facebook | Mobil public önizleme | HTTP 200 + `og:title` | Giriş yönlendirmesi → `blocked`; “muhtemel” |
| Telegram | `t.me/rumuz` HTML | `tgme_page_title` | Gizli/boş hesaplar görünmez |
| X | `x.com/rumuz` durum kodu | 200 / 404 | 200 oturum kabuğu; düşük güven |
| YouTube | `youtube.com/@rumuz` | 200 / 404 | Kanal kapatma sayfası |
| Steam | `?xml=1` | `<steamID64>` / `<error>` | Vanity URL şart |
| GitHub, GitLab, Codeberg, … | Durum/API | HTTP + alan eşleşmesi | Toplam 56 doğrudan adaptör |

### 3.2 Sağlayıcı / manuel kapsam

- **Reddit:** JSON API datacenter IP’lerinde 403/CTA veriyor. Doğrudan
  “yok” denemez. Sağlayıcı varsa `site:reddit.com/user/rumuz` tam URL eşleşmesi;
  yoksa manuel bağlantı.
- **Epic Games:** Cloudflare 403; herkese açık API anahtarı yok. Sağlayıcı /
  manuel.
- **LinkedIn, Threads, Netflix, Discord, Trendyol, Sahibinden:** herkese açık
  profil yüzeyi yok veya giriş duvarı var. Yalnızca bahis / manuel.
- **Katalog:** 115 platform, 15 kategori. Her kaydın gerçek alan adı, yerel
  logosu ve sınır açıklaması vardır.

## 4. Varsayılan seçim ve kullanıcı akışı

1. **Önerilen** → öncelik sırası: Instagram, TikTok, Facebook, YouTube,
   Telegram, Steam, X, GitHub. Ücretsiz planda 8, Pro’da 40.
2. **Sosyal medya** → Instagram, TikTok, Facebook, Reddit, Telegram, YouTube,
   Steam, Epic Games (kullanıcı isteğine göre).
3. Seçim panelinde her platformun modu görünür: `doğrudan`, `arama`, `manuel`.
4. Tarama sonrası:
   - pozitif kartlar (gerçek URL + kanıt + güven),
   - **Platform kapsamı** listesi (her seçili platform için durum),
   - “engellendi” ve “manuel” sayıları,
   - “eşleşme ≠ sahiplik” uyarısı.
5. Ücretsiz planda yalnızca ilk 5 pozitif sonuç gönderilir; kapsam kayıtları
   tam olarak görünür.

## 5. Uygulama aşamaları

### Faz 2A.1 — tamamlandı (bu sürüm)

- [x] Steam XML kontrolü; yerelleştirilmiş hata sayfası yanlış pozitifi kaldırıldı.
- [x] Instagram, TikTok, Facebook, Telegram, X doğrudan adaptörleri.
- [x] Her platform için `found / not_found / blocked / unsupported / error`
      kapsam kaydı ve `outcomes_json` migrasyonu.
- [x] Platform seçicide mod etiketleri; 115 platformun tamamı seçilebilir.
- [x] Önerilen sıralama sosyal ağlara kaydırıldı.
- [x] Sağlayıcı varsa giriş duvarlı platformlar için tam profil URL eşleşmesi.
- [x] Sağlayıcı yoksa manuel bağlantı; sahte sonuç yok.

### Faz 2B — sağlayıcı ve dayanıklılık

- [ ] Brave/Tavily anahtarını production ortamına ekle; kotayı izle.
- [ ] Sağlayıcı sorgularını platform başına 1’den fazla sonuçla doğrula.
- [ ] 56 doğrudan adaptörü gerçek hesaplarla haftalık duman testine bağla.
- [ ] Platform başına son başarı/engel zamanını sakla; kullanıcıya “son kontrol”
      göster.
- [ ] 403/429 için kısa devre + cooldown; aynı platformu 24 saat içinde tekrar
      zorlamama.
- [ ] Ortak hata mesajlarını Türkçeleştir; sağlayıcı hatalarını kullanıcıya
      “sağlayıcı kotalı” olarak açıkla.

### Faz 2C — kuyruk, önbellek, ölçek

- [ ] Arama işlerini `search_jobs` kuyruğuna al; 35 saniyelik istek sınırını
      kaldır.
- [ ] Aynı rumuz + platform için 10 dakikalık sonuç önbelleği.
- [ ] IP/hesap başına platform bazlı hız sınırı.
- [ ] Sağlayıcı maliyet sayacı ve Pro kota koruması.
- [ ] Sonuç saklama süresi (Free 7 / Pro 90 gün) için zamanlanmış temizlik.

### Faz 2D — kurumsal sayfalar

- [ ] Findings: kanıt, kaynak, güven, durum, sahiplik beyanı.
- [ ] Identity Graph: rumuz–platform–iletişim düğümleri; yalnızca doğrulanmış
      kenarlar.
- [ ] Remediation: platform bazlı kaldırma taslakları; onay olmadan gönderim yok.
- [ ] Reports: PDF/CSV dışa aktarma, denetim izi, saklama politikası.

## 6. Kabul kriterleri

1. Gerçek bir rumuz tarandığında seçilen **her** platform için bir kapsam satırı
   görünür.
2. `hanifeninsokagi` gibi bir rumuz Steam’de yanlış pozitif üretmez.
3. Instagram/TikTok/Facebook/Telegram/X için gerçek hesap testinde `found`,
   olmayan rumuzda `not_found` veya `blocked` döner.
4. Reddit/Epic sağlayıcı yokken `unsupported` + manuel URL döner; “yok”
   denmez.
5. API yanıtı `outcomes` alanını içerir; eski taramalar da geriye dönük uyumlu
   açılır.
6. Ücretsiz plan 8, Pro 40 platform sınırını sunucuda uygular.
7. `npm run typecheck`, `npm test`, `npm run build` temiz geçer.
8. 1440 px ve 390 px’te yatay taşma yok.

## 7. Riskler ve sınırlar

- **Platform ToS:** Public sayfa okumak hesap açmak değildir; yine de her
  platformun kullanım şartları hukuk incelemesinden geçmelidir.
- **Bot koruması:** 403/429/CAPTCHA aşılmaz, çözülmez, üçüncü taraf proxy
  kullanılmaz. Engel `blocked` olarak raporlanır.
- **Yanlış pozitif:** Durum kodu tabanlı kontroller (X, Facebook) “muhtemel”
  olarak işaretlenir; sahiplik iddiası üretmez.
- **Sağlayıcı maliyeti:** Ücretsiz planda sağlayıcı sorguları sınırlıdır;
  anahtar yoksa manuel moda düşer.
- **Kapsam iddiası:** “Tüm internet” taranmaz. 115 platformluk katalog ve
  seçilen platformlar taranır.
