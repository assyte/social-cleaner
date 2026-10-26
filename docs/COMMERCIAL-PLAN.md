# Social Cleaner — Ticari Plan ve Ücretsiz/Pro Özellik Matrisi

> **Historical document / tarihsel belge.** The prices, currency labels, and commercial
> claims below are obsolete. Social Cleaner is free and open source under the MIT License;
> paid hosting/support is arranged manually via GitHub. The current source of truth is the
> root `README.md` and `docs/LAUNCH-READINESS.md`.
>
> Amaç: Ürünü satılabilir, yasal olarak savunulabilir ve teknik olarak uygulanabilir
> bir SaaS olarak konumlandırmak. Tüm limitler sunucuda uygulanır; istemci tarafında
> gizleme güvenlik sayılmaz.

## 1. Konumlandırma

**Social Cleaner**, bireylerin ve küçük ekiplerin kendi dijital ayak izlerini
envanterlemesine, herkese açık profilleri kanıtlı şekilde bulmasına ve KVKK/GDPR
uyumlu kaldırma/izleme adımlarına hazırlanmasına yardımcı olan bir **gizlilik
denetim platformu**dur.

Temel vaat:
- **Kanıtlı bulgu:** gerçek URL, platform logosu, HTTP durumu, işaret ve güven skoru.
- **Yokluk iddiası yok:** engellenen platform “hesap yok” sayılmaz.
- **Sahiplik ≠ eşleşme:** aynı rumuzlu profil başka bir kişiye ait olabilir.
- **KVKK/GDPR uyumlu:** veri minimizasyonu, şifreleme, saklama süresi, silme hakkı.

## 2. Hedef kitle

1. **Bireysel kullanıcılar:** sosyal medya, forum, oyun ve geliştirici hesaplarını
   envanterlemek isteyen kişiler.
2. **Gizlilik bilinçli kullanıcılar:** eski hesapları bulup kapatmak isteyenler.
3. **Küçük ekipler / ajanslar:** müşteri veya çalışan adı için açık kaynak tarama.
4. **Hukuk/uyum ekipleri:** kanıtlı rapor ve denetim izi gerektiren kurumlar.

## 3. Ücretsiz vs Pro matrisi

| Özellik | Ücretsiz | Pro |
|---|---|---|
| Kullanıcı adı taraması | ✅ | ✅ |
| Ad soyad taraması | — | ✅ |
| Katalog kapsamı | 115 platform | 115 platform |
| Seçilebilir platformlar | 8 çekirdek | tüm katalog |
| Doğrudan doğrulanabilir platform | 56 | 56 |
| Platform sayısı / tarama | 8 | 40 |
| Günlük tarama | 3 | 100 |
| Görünen sonuç | ilk 5 | tümü (80) |
| Geçmiş | 7 gün / 10 tarama | 90 gün / 200 tarama |
| Platform kapsamı (bulundu/bulunamadı/engellendi/manuel) | ✅ | ✅ |
| Manuel profil bağlantısı | ✅ | ✅ |
| Sonuç dışa aktarma (JSON/CSV) | — | ✅ |
| İzleme ve yeniden tarama | — | ✅ |
| Kaldırma taslakları | — | ✅ |
| Görsel benzerlik taraması | — | ✅ (Faz V) |
| Gelişmiş raporlar | — | ✅ |
| Öncelikli destek | — | ✅ |
| Fiyat | Free | Contact — manual only (no checkout) |

Ücretsiz çekirdek set: Instagram, X, GitHub, TikTok, YouTube, Reddit, Facebook ve Telegram. Diğer kategoriler arayüzde kilitli görünür; API de kilitli platform kimliklerini reddeder.

## 4. Ücretsiz sürümün amacı

Ücretsiz sürüm **değer kanıtı** üretir:
- Gerçek bir rumuz taraması yapar.
- 8 platformda doğrudan kontrol.
- 5 sonuç + platform kapsamı gösterir.
- Engellenen/manuel platformları dürüstçe işaretler.
- “Daha fazlası Pro’da” çağrısı ile dönüşüm sağlar.

Ücretsiz sürüm **reklam göstermez** ve veri satmaz.

## 5. Pro sürümün değeri

Pro sürüm **tam envanter ve aksiyon** sağlar:
- 40 platformda tarama.
- Ad soyad araması.
- Tüm bulguları görüntüleme.
- JSON/CSV dışa aktarma.
- Geçmiş ve izleme.
- Kaldırma taslakları.
- Görsel benzerlik taraması (planlanan).
- Kurumsal raporlama (planlanan).

## 6. Fiyatlandırma ve ödeme

- Türkiye: **iyzico** (hosted checkout, 3D Secure).
- Uluslararası: **Stripe**.
- Kart verisi uygulamaya girmez.
- Webhook ile `users.plan` + `plan_renews_at` güncellenir.
- 14 gün koşulsuz iade.
- 7 gün Pro deneme (kart istemeden, tek seferlik).

### Ödeme entegrasyonu (Faz 2B)
- [ ] iyzico sandbox/production anahtarları
- [ ] Stripe test/live anahtarları
- [ ] Webhook imza doğrulama
- [ ] Abonelik durumu yönetimi
- [ ] İade ve iptal akışı
- [ ] Fatura metadata

## 7. Teknik uygulama durumu

### Çalışan
- Kimlik doğrulama, CSRF, rate limit, CSP
- Identity Vault, şifreli depolama
- 56 platformda kullanıcı adı taraması
- Platform kapsamı (found/not_found/blocked/unsupported/error)
- Plan limitleri ve günlük kota
- Sağlayıcı yokken 503 (sahte sonuç yok)
- Görsel tarama iskeleti (rıza + mock analiz)

### Planlanan
- Brave/Tavily gerçek anahtarla uçtan uca test
- Kuyruk/worker, önbellek, saklama süpürücüsü
- Ödeme entegrasyonu
- AI ajanları ve korelasyon
- Kaldırma merkezi
- İzleme ve raporlama
- Görsel benzerlik AI eşleştirme

## 8. Satış ve pazarlama mesajları

### Kısa vaat
“Kendi dijital ayak izini kanıtlı şekilde bul, neyin herkese açık olduğunu gör,
gereksiz hesapları temizlemeye hazırlan.”

### Güven mesajları
- “Eşleşme ≠ sahiplik”
- “Engellenen platform ‘hesap yok’ sayılmaz”
- “Sahte sonuç üretmeyiz”
- “KVKK/GDPR uyumlu”
- “Veri satmıyoruz, reklam göstermiyoruz”

### Dönüşüm stratejisi
- Ücretsiz tarama sonucunda “5 sonuçtan fazlası Pro’da” çağrısı.
- Platform kapsamı ücretsizde tam görünür; pozitif sonuçlar kırpılır.
- Pro deneme (7 gün, kart istemeden).
- Yıllık plana 2 ay hediye.

## 9. Maliyet ve kâr yapısı

### Değişken maliyetler
- Web arama sağlayıcısı (Brave/Tavily): sorgu başına maliyet.
- AI görsel analiz: görüntü başına maliyet.
- Veritabanı ve depolama: kullanıcı başına düşük.
- E-posta/SMS: düşük.

### Sabit maliyetler
- Sunucu ve CDN.
- Domain ve SSL.
- Ödeme komisyonu (%2–4).
- Hukuk ve uyum danışmanlığı.

### Kâr marjı hedefi
- Pro aylık: %70+ marj (sağlayıcı maliyeti kontrol altında).
- Yıllık: %75+ marj (ödeme komisyonu düşük).

## 10. Riskler ve azaltma

| Risk | Azaltma |
|---|---|
| Platform ToS ihlali | Yalnızca herkese açık sayfalar; giriş duvarı aşılmaz |
| Yanlış pozitif | Durum kodu tabanlı kontroller “muhtemel” işaretlenir |
| Biyometrik veri riski | Açık rıza, şifreleme, geçici saklama, silme hakkı |
| Maliyet aşımı | Kota, önbellek, cooldown, bütçe limiti |
| Kullanıcı beklentisi | “Tüm internet” iddiası yok; kapsam açıkça belirtilir |

## 11. Go-to-market

### Lansman (Faz 2C)
1. Beta: 100 kullanıcı, ücretsiz Pro denemesi.
2. Geri bildirim toplama ve hata düzeltme.
3. Fiyatlandırma ve ödeme entegrasyonu.
4. Lansman kampanyası (sosyal medya, gizlilik toplulukları).

### Büyüme (Faz 3–4)
1. İçerik pazarlaması (gizlilik rehberleri).
2. Ortaklıklar (gizlilik araçları, VPN sağlayıcıları).
3. Kurumsal plan (ajans, avukat, aile).
4. API erişimi (geliştiriciler için).

## 12. Başarı metrikleri

- Ücretsiz → Pro dönüşüm oranı: %3–5
- Pro churn: <%5/ay
- Günlük aktif kullanıcı (DAU): büyüme
- Tarama başına maliyet: <0,01 ₺
- Müşteri memnuniyeti (NPS): >40

## 13. Sonraki adımlar

1. Ödeme entegrasyonu (iyzico + Stripe).
2. Sağlayıcı anahtarlarını production’a ekle.
3. Kuyruk/worker ve önbellek.
4. Kaldırma merkezi ve izleme.
5. Görsel tarama AI entegrasyonu.
6. Kurumsal sayfalar (Findings, Graph, Remediation, Reports).

> Bu plan, mevcut teknik altyapı ve yasal sınırlarla uyumludur. Tüm özellikler
> “çalışıyor / planlanan” olarak açıkça işaretlenmiştir.