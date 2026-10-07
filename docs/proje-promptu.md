# Okey 101 — Online Çok Oyunculu Oyun Projesi (Detaylı Prompt)

> **Revizyon notu:** Bu sürüm, "ekteki kurallar" metnindeki maddelerle birleştirilmiştir. Onaylanan değişiklikler: 5 çift açma, sahte okey = okeyin değerini taşıyan sıradan taş, atıktan taş alma kısıtı, okey atarak bitiş bonusu, işleme/okey değişimi, deste bitişi ve +101 ceza listesi. Kodda (`okey101.html`) henüz uygulanmamış kısımlar **[Henüz uygulanmadı]** ile işaretlidir.

## Genel Tanım
Arkadaşlarla (4 kişi) tarayıcı üzerinden online oynanabilen bir Okey 101 oyunu. Tek dosyalık HTML/CSS/JS artifact olarak çalışır, Claude'un paylaşılan depolama (window.storage, shared) altyapısını kullanarak oyuncular arasında oda bazlı senkronizasyon sağlar. Sunucu/backend yok.

## Oyuncu ve Genel Ayarlar
- **Oyuncu sayısı:** Sabit 4 kişi (oda 4/4 dolmadan oyun başlamaz). Bireysel oynanır; **eşli (2'ye 2) oyun seçeneği** de planlanır **[Henüz uygulanmadı]**.
- **Taş görseli:** Gerçekçi görünümlü taşlar (fildişi renkli, kabartma efektli, kalın renkli rakam + alt nokta; kırmızı, siyah, mavi, sarı).
- **Hamle süresi:** Oda kurulurken seçilebilir (15 / 30 / 60 / 90 saniye veya süresiz). Süre dolarsa oyuncunun yerine otomatik olarak yerden taş çekilir, bir taş atılır ve sıra geçer.
- **Oda sistemi:** Kurucu oda kodu üretir, diğerleri kodla katılır. Oda 4 kişi dolunca kurucu oyunu başlatır.

## Standart Okey 101 Mekaniği
- **Taş seti: 106 taş** = 4 renk (kırmızı, siyah, mavi, sarı) × 1–13 × 2 kopya (104) + 2 sahte okey. (Not: Kaynak metindeki "88 taş" ifadesi hatalıdır; doğru sayı 104 + 2 = 106.)
- **Gösterge ve okey:** Gösterge taşı çekilir; **okey = göstergenin aynı rengi, bir üst sayı** (13 → 1 döngüsü). Gerçek okey **oyundaki tek jokerdir**; istenen her taşın yerine kullanılabilir.
- **Sahte okey:** Joker değildir. Oyun başında gerçek okeyin temsil ettiği taşın (renk + sayı) değerini taşıyan sıradan bir taş olarak davranır. Örn. gösterge Mavi 5 ise okey Mavi 6'dır; sahte okey de Mavi 6 sayılır ve yalnızca Mavi 6 yerine geçer.
- **Dağıtım:** Başlayan oyuncuya 22, diğer 3 oyuncuya 21'er taş. Gösterge ayrılır, kalan 20 taş kapalı çekme destesidir. Başlayan oyuncu taş çekmeden doğrudan bir taş atarak başlar.
- **Sıra (saat yönünün tersine):** Çekme → (isteğe bağlı) açma / işleme → atma. Taş, soldaki oyuncunun attığı taştan veya desteden çekilir; atılan taş sağdaki oyuncuya gider.
- **Atıktan taş alma kısıtı:** Soldaki oyuncunun attığı taş **yalnızca o taşla elini hemen açabiliyorsan** (101 veya çift barajı) alınabilir. Aksi halde desteden çekilmelidir. Alınırsa atıktan alma bonusu/cezası uygulanır (aşağıdaki tablo). Açmış oyuncular kısıtsız alabilir. Alıp açmayan oyuncuya +101. **[Uygulandı]**
- **Geçerli per kuralları:**
  - **Grup (aynı sayı):** Farklı renklerden en az 3 (en çok 4) taş. Aynı renk ve sayı bir grupta iki kez kullanılamaz.
  - **Seri (aynı renk):** Ardışık sayılarla en az 3 taş. Okey, eksik taşın yerine kullanılabilir.
  - **Çift açma:** Aynı renk ve sayıda iki özdeş taş = 1 çift. **En az 5 çift (10 taş)** gerekir. Okey eksik eşi tamamlayabilir. (`OPEN_MIN_PAIRS = 5`)
- **Açma şartı (101 barajı):** Serilerin/grupların üzerindeki sayıların toplamı en az 101 olmalı (örn. 33 + 38 + 21 + 6 = 98 → açılamaz). Ya da 5+ çift. Açtıktan sonra elde atılacak en az 1 taş kalmalıdır.
- **Açtıktan sonra (işleme):**
  - Kendi perlerine taş ekleyebilir.
  - Elini açmış diğer oyuncuların perlerine uygun taş ekleyebilir.
  - **Okey değişimi:** Masadaki bir perde okey, temsil ettiği gerçek taşın yerinde duruyorsa ve o taş elindeyse, gerçek taşı perin içine koyup okeyi eline alabilir. Perinden okey alınan oyuncuya **+101 ceza** yazılır.
  - Çift ile açanlar işleme yapamaz; elde en az 1 taş kalmalıdır. Arayüz: ıstakadan taşı seç, masadaki per'e tıkla. **[Uygulandı]**

## Oyunun Bitişi
- **Normal bitiş:** Oyuncu tüm taşlarını perlere açar ve elindeki son taşı atarak eli sıfırlar.
- **Okey atarak bitiş:** Son kalan taş okey ise ve oyuncu onu atarak biterse ekstra bonus (−100) kazanır. Okey, bitiş taşı olarak atıldığında "okeyi yere atmak" cezası uygulanmaz.
- **Çift ile bitiş:** Tüm çiftleri açıp son taşı atan oyuncu biter; çift bitiş çarpanları (×2 / ×4) geçerlidir.
- **Elimi Kapat:** Açmadan tüm eli tek seferde geçerli gruplara/çiftlere ayırıp kapatma yolu (mevcut uygulamada var).
- **Deste bitişi:** Çekilecek taş kalmayınca el biter. Kimse bitirmediyse herkesin elinde kalan taşlar ceza olarak yazılır. **[Uygulandı]**

## Ek/Özel Puanlama Kuralları (standart 101 üzerine eklenen)
Puanlama mantığı: **düşük toplam skor iyidir.** Bonuslar negatif (skoru düşürür), cezalar pozitif (skoru artırır); **el bitiminde toplu olarak** yazılır. 1 bonus = −100.

| Kural | Etki | Kime uygulanır |
|---|---|---|
| Eli bitirme (kapatma) bonusu | −100 | Eli kapatan oyuncu |
| Okey atarak bitirme bonusu | −100 | Son taşı (okey) atarak bitiren oyuncu. Yalnızca son atılan taş okeyse tetiklenir; perde içinde okey olması tek başına bonus vermez |
| 50 üstü açılış bonusu | −100 | Kazanan (tanım netleşmeli, aşağıya bakın) |
| 60 üstü açılış bonusu | −200 (50 bonusunun yerine geçer) | Kazanan (tanım netleşmeli) |
| 7 çift açılış bonusu | −100 | Çift ile açan/kapatan oyuncu (7–8 çift) |
| 9+ çift açılış bonusu | −200 (7 çift bonusunun yerine geçer) | Çift ile açan/kapatan oyuncu |
| Atıktan taş alma bonusu | −(alınan taşın sayısı) | Taşı atıktan alan oyuncu |
| Atılan taşın alınması cezası | +(alınan taşın sayısı) | Taşı atan (rakibi tarafından alınan) oyuncu |
| Çift açılışta 2 kat çarpan | Alma bonusu/cezası ×2 | Soldan alıp çift açan oyuncunun kendi atıktan alma hareketleri |
| 4 kat zincirleme | ×4 | Soldan alıp çift açan birinden, sağındaki de alıp çift açarsa. Otomatik hesaplanmıyor; manuel düzeltme aracıyla uygulanır |
| Elde kalan taş cezası | Kalan taşların toplamı (+); okey 2 kat sayılır | Kapatamayan oyuncular |
| Perdesinden okey alınması cezası | +101 | Okeyi perdesinden alınan oyuncu (okey değişimi sırasında) **[Uygulandı]** |

### +101 Ceza Durumları
Aşağıdaki hataları yapan oyuncuya +101 ceza puanı yazılır:
1. **Yanlış açma:** Elini 101 puan veya 5 çift olmadan açmaya çalışmak. Uygulamada açma doğrulanıp reddedildiği için otomatik tetiklenmez; anlaşmazlıkta manuel düzeltme aracı kullanılır.
2. **İşlenebilir taş atma:** Masadaki seri/set perine eklenebilecek taşı atmak (açmamış oyuncu dahil). **[Uygulandı]**
3. **Okey'i yere atmak:** Okeyi, bitiş taşı olmadan boşa atmak. **[Uygulandı]**
4. **Çekilen taşı yanlış kullanma:** Atıktan alınan taşla elini açamamak veya işleyememek. Taşı alma anında açabilme kontrolü yapılır; yine de açmadan taş atılırsa ceza yazılır. **[Uygulandı]**

## Bilinen Sınırlamalar / Açık Konular
1. **50 üstü / 60 üstü bonus anlamı belirsiz:** Açma eşiği 101 olduğundan, açan her oyuncuda bu bonuslar otomatik tetiklenir (testte kazanan −300 aldı). Kuralın asıl anlamı (ör. 101 üzerine kaç puan fazla açıldığı) netleşmeli.
2. **4 kat zincirleme ceza** otomatik hesaplanamıyor (çapraz-el mantığı gerekir); el sonu ekranındaki **"Manuel Puan Düzeltmesi"** aracı kullanılır.
3. **Geçersiz açılış cezası** otomatik tetiklenmiyor, çünkü uygulama geçersiz açma/kapamaya zaten izin vermiyor.
4. **Gizlilik sınırı:** Senkronizasyon paylaşılan (shared) depolama ile yapıldığından, teknik bilgisi olan biri tarayıcı konsolundan diğer elleri görebilir. Güvenilir arkadaş grubu için tasarlandı.
5. **Bitiş koşulu:** Hedef skor yok; "Oyunu Bitir" butonu manuel çalışır.
6. **Kod–kural uyumu:** `okey101.html` bu sürümdeki kurallara göre güncellendi. Kalan eksikler: zar/eşli oyun yok, botlar per açmaz ve atıktan taş almaz, "yanlış açma" cezası otomatik değil (hatalı açma reddedilir), işleme yalnızca tıklayarak yapılır.

## Teknik Uygulama Notları
- Tek dosya HTML (CSS + vanilla JS gömülü), derleme gerektirmez.
- Oda durumu `window.storage` üzerinde `shared: true` ile `room-<KOD>` anahtarında JSON olarak tutulur; istemciler ~1,5 sn'de bir okuyarak arayüzü günceller (polling).
- Çalışması için dosyanın **Claude artifact ortamında** çalışması ve arkadaşlarla oynamak için **Publish (Yayınla)** linkinin paylaşılması gerekir; indirilen dosya `file://` ile açılırsa "Oda oluşturulamadı" hatası verir.
- Temel mantık (deste, dağıtım, per/çift doğrulama) Node.js altında test edildi; arayüz Playwright ile denendi.

## Güncelleme: Masa Görünümü ve Per Açma
- **Masa düzeni:** Ahşap çerçeveli turkuaz keçe masa. Dört kenarda dört ıstaka: altta kendi (açık) ıstakan; üst, sol, sağda rakiplerin kapalı taşlı ıstakaları. Sıra saat yönünün tersine (alt → sağ → üst → sol).
- **Orta alan:** Her oyuncunun açtığı perler kendi şeridinde görünür. Gösterge, okey ve "Yerden Çek" destesi üstte; her oyuncunun atık yığını kendi köşesinde (soldaki oyuncunun yığını, taşı alabileceğin yığındır ve altın çerçeveyle vurgulanır).
- **Per açma:** Sırası gelen ve taş çekmiş oyuncu "Per Aç" ile perlerini açar. Şart: toplam ≥ 101 (`OPEN_MIN`) ya da yeterli çift (`OPEN_MIN_PAIRS` = 5). Açtıktan sonra elde en az 1 taş kalmalı; son taşı atan eli bitirir.
- **Test masası:** Ana ekrandaki "Test Masasını Aç" ile 3 bota karşı tek başına denenebilir. Botlar yalnızca yerden çeker ve rastgele taş atar; per açmaz, atıktan taş almaz.

## Güncelleme: Istaka ve Sürükle-Bırak
- **Istaka:** 30 slotluk geniş ıstaka (masaüstünde 2 raf × 15, telefonda 3 raf × 10). Slot düzeni yalnızca o cihazda tutulur.
- **Taş dizme:** Sürükleyerek istenen slota bırakılır; boş slota taşınır, dolu slota bırakılırsa yer değişir. "Sırala" renk ve sayıya göre dizer. Yeni çekilen taş ilk boş slota düşer.
- **Taş atma:** Taşı masanın ortasına sürükleyip bırakmak atar; hızlı çift tıklama da atar; "Seçili Taşı At" düğmesi de var.
- **Girdi:** Fare ve dokunmatik aynı kodla (pointer events). Sürükleme sırasında periyodik yenileme durur.
- **Rakamlar:** Taş üzerindeki sayılar kalın ve büyük (Arial Black, 900).
- **Otomatik per tanıma:** Istakada yan yana (aynı rafta, aralarında boş slot olmadan) duran taşlar seri/set kuralına uyuyorsa altın çizgiyle birleştirilir ve üzerinde toplamı görünür (örn. Sarı 10-11-12 = 33). Taş çıkarılırsa per bozulur, taş eklenirse toplam güncellenir. Istakanın altında dizili perlerin toplamı gösterilir. "Per Aç" penceresi bu perlerle hazır açılır.
- **Per indirme:** Açtıktan sonra "Per Aç" düğmesi "Per İndir" olur. Istakada dizili yeni perler hazır gelir, onaylayınca masadaki şeride eklenir (101 barajı aranmaz). Elde en az 1 taş kalmalı; kalan son taşı atınca el biter.
