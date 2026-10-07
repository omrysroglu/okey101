# Okey 101

4 kişilik, tarayıcıda online oynanan Okey 101. Ev kurallarıyla özel puanlama, hamle süresi, ıstaka sürükle-bırak, otomatik per tanıma, işleme ve okey değişimi var. Kuralların tamamı: [docs/proje-promptu.md](docs/proje-promptu.md).

## Klasör yapısı
```
src/index.html      kabuk (CSS ve JS buraya birleştirilir)
src/styles.css      tüm stiller
src/js/01-rules.js      saf oyun mantığı: deste, okey, per/çift doğrulama, işleme, açabilme hesabı
src/js/02-storage.js    oda kaydı (window.storage, shared)
src/js/03-state.js      uygulama durumu (S)
src/js/04-solo-bots.js  test masası ve botlar
src/js/05-room.js       oda kurma/katılma, oyunu başlatma
src/js/06-gameplay.js   çek, at, süre dolması
src/js/07-scoring.js    açma, kapama, puanlama, işleme, sonraki el
src/js/08-hand-rack.js  sıralama, ıstaka, sürükle-bırak, otomatik per tanıma
src/js/09-render.js     ekranlar ve masa çizimi
src/js/10-main.js       küçük işleyiciler, açılış
scripts/build.js    src/ -> dist/okey101.html
tests/              kural testleri ve tarayıcı testi
docs/               proje promptu
dist/okey101.html   yayınlanacak tek dosya
```
JS dosyaları modül değil; numara sırasıyla tek betikte birleşir (aynı global kapsam). Yeni dosya eklerken sıra numarasına dikkat et.

## Kullanım
```
npm run build        # dist/okey101.html üretir
npm test             # kural testleri (Node, bağımlılık yok)
npm install && npm run test:e2e   # tarayıcı testi (Playwright)
```

## Yayınlama ve oynama
Çok oyunculu senkronizasyon Claude'un `window.storage` altyapısını kullanır; yalnızca Claude artifact olarak yayınlanınca çalışır. `dist/okey101.html` dosyasını Claude'a yükleyip **Publish** et, çıkan linki arkadaşlarınla paylaş. Dosyayı yerelde `file://` ile açarsan oda kurulamaz; ama "Test Masasını Aç" (3 bota karşı) çalışır.

## Bilinen eksikler
- 50 üstü / 60 üstü açılış bonusunun anlamı netleşmedi.
- Zar ve eşli oyun yok; botlar per açmaz ve atıktan taş almaz.
- 4 kat zincirleme ceza ve yanlış açma cezası manuel düzeltme aracıyla uygulanır.

## Vercel'de yayınlama (online oda için Upstash Redis)
1. Vercel projesinde **Storage → Marketplace → Upstash (Redis)** ile bir veritabanı oluştur ve projeye bağla. Ortam değişkenleri (`KV_REST_API_URL`, `KV_REST_API_TOKEN`) otomatik eklenir.
2. Yeniden deploy et. `vercel.json` derlemeyi (`npm run build`) ve çıktı klasörünü (`dist`) ayarlar; `api/room.js` oda verisini Redis'e yazar/okur (24 saat sonra silinir).
3. Oyun Claude artifact olarak açılırsa `window.storage`, Vercel'de açılırsa `/api/room` kullanılır (`src/js/02-storage.js`).
