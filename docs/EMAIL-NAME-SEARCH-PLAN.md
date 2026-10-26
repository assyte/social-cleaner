# E-posta, Ad Soyad ve Telefon Araması — Kapsamlı Plan

> Durum: 24 Ekim 2026 · Planlama<br>
> İlke: **Bahsedilme ≠ hesap.** Web arama sonucu, kişinin o platformda hesabı
> olduğunu kanıtlamaz; yalnızca kamuya açık bir sayfada geçen bilgiyi gösterir.

## 1. Amaç

Kullanıcı adı taraması “herkese açık profil URL’si var mı?” sorusunu yanıtlar.
E-posta/ad/telefon araması ise **“bu bilgi kamuya açık bir sayfada geçiyor mu?”**
sorusunu yanıtlar. Bu iki vaat birbirine karıştırılmamalıdır.

## 2. Mevcut durum

- `SC_SEARCH_PROVIDER=mock` → ad/e-posta/telefon araması **503 PROVIDER_NOT_CONFIGURED**.
- Brave/Tavily adaptörü hazır; anahtar yokken sahte sonuç üretilmez.
- Pro plan zorunlu; ücretsiz planda `PLAN_REQUIRED`.
- Sonuçlar platform alan adıyla eşleştirilir; güven skoru 40–65.

## 3. Sağlayıcı stratejisi

| Sağlayıcı | Avantaj | Risk | Öneri |
|---|---|---|---|
| Brave Search | Hızlı, bağımsız, gizlilik odaklı | Kota/maliyet | Birincil |
| Tavily | AI-optimized, temiz sonuçlar | Maliyet | Yedek |
| DuckDuckGo (scraping) | Ücretsiz | ToS ihlali, kırılgan | Kullanma |
| Google/Bing (resmî) | Kapsam geniş | Pahalı, kota | Kurumsal |

**Öneri:** Brave birincil, Tavily yedek; ikisi de yapılandırılmamışsa 503.

## 4. Sorgu stratejisi

### 4.1 E-posta
- Sorgu: `"ornek@site.com"`
- Hedef: sayfada e-posta açıkça geçen kamuya açık sayfalar.
- Eşleştirme: alan adı + sayfa başlığı + snippet.
- Güven: 45–60 (bahsedilme).

### 4.2 Ad soyad
- Sorgu: `"Tülay Çelik"`
- Hedef: kişi adıyla eşleşen kamuya açık profil/sayfa.
- Eşleştirme: alan adı + başlık + snippet.
- Güven: 40–55 (yanlış eşleşme riski yüksek).

### 4.3 Telefon
- Sorgu: `"+905551234567" OR "05551234567"`
- Hedef: kamuya açık sayfalarda geçen numara.
- Güven: 35–50 (en düşük; yanlış eşleşme riski yüksek).

## 5. Eşleştirme ve doğrulama

### 5.1 Alan adı eşleştirme
- Sonuç URL’si seçili platform alan adıyla eşleşmeli.
- Eşleşmeyen sonuçlar “genel bahis” olarak ayrı gösterilir (isteğe bağlı).

### 5.2 Snippet doğrulama
- E-posta: snippet’te e-posta açıkça geçmeli.
- Ad: snippet’te ad geçmeli.
- Telefon: snippet’te numara geçmeli.

### 5.3 Güven skoru
- Alan adı eşleşmesi + snippet eşleşmesi → 55–65.
- Yalnızca alan adı eşleşmesi → 40–50.
- Snippet eşleşmesi yok → sonuç üretilmez.

## 6. Kullanıcı akışı

1. Kullanıcı arama türünü seçer (ad/e-posta/telefon).
2. Platform seçimi (isteğe bağlı; boşsa tüm katalog).
3. Tarama çalışır; her sonuç:
   - platform logosu
   - profil/sayfa URL’si
   - güven skoru
   - kanıt (başlık, snippet, zaman)
   - “bahsedilme ≠ hesap” uyarısı
4. Kullanıcı sonucu “benim / benim değil” olarak işaretler.
5. Bulgular Identity Vault’a eklenebilir.

## 7. UI/UX gereksinimleri

- Sağlayıcı yokken: 503 + “sağlayıcı yapılandırılmadı” mesajı.
- Ücretsiz planda: `PLAN_REQUIRED` + yükseltme çağrısı.
- Sonuçlarda “bahsedilme” etiketi (verified değil).
- Snippet ve başlık gösterimi (max 300 karakter).
- “Bu bir hesap kanıtı değildir” uyarısı.

## 8. Güvenlik ve gizlilik

- Sorgu değeri şifrelenir; e-posta/telefon maskelenir.
- Sonuçlar yalnızca kamuya açık sayfalar.
- Çerez, token, parola asla kullanılmaz.
- SSRF koruması URL’ler için geçerlidir.
- Rate limit: 10 arama/dakika, 120 mutasyon/dakika.
- Kota: günlük plan kotası.

## 9. Uygulama aşamaları

### Faz E1 — Sağlayıcı entegrasyonu
- [ ] Brave/Tavily anahtarlarını production’a ekle.
- [ ] Sağlayıcı durumu UI’da göster.
- [ ] Kota ve maliyet sayacı.

### Faz E2 — Eşleştirme ve doğrulama
- [ ] Alan adı eşleştirme testleri.
- [ ] Snippet doğrulama.
- [ ] Güven skoru kalibrasyonu.
- [ ] Yanlış eşleşme testleri.

### Faz E3 — UI ve UX
- [ ] Sonuç kartlarında snippet gösterimi.
- [ ] “Bahsedilme” etiketi.
- [ ] Yükseltme çağrısı.
- [ ] Sağlayıcı yapılandırma rehberi.

### Faz E4 — OSINT genişletme (opsiyonel)
- [ ] Gravatar e-posta kontrolü (herkese açık).
- [ ] GitHub commit e-posta araması.
- [ ] WHOIS (kamuya açık alan adı bilgisi).
- [ ] Sosyal medya platformlarının resmî API’leri (OAuth ile).

## 10. Riskler

- **Yanlış eşleşme:** Ad soyad araması yanlış kişileri gösterebilir.
- **Gizlilik:** E-posta/telefon araması hassas veri içerir.
- **Maliyet:** Sağlayıcı sorguları pahalı olabilir.
- **Hukuki risk:** Kamuya açık veri kullanımı ToS’a tabidir.

## 11. Kabul kriterleri

1. Sağlayıcı yokken 503 döner; sahte sonuç yok.
2. Ücretsiz planda `PLAN_REQUIRED` döner.
3. Sonuçlar alan adı + snippet ile eşleşir.
4. Güven skoru 35–65 aralığında.
5. “Bahsedilme ≠ hesap” uyarısı görünür.
6. `npm run typecheck`, `npm test`, `npm run build` temiz geçer.