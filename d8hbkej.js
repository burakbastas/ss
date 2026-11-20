import { deg } from './ewdv3t5.js';

export const CATS = {
  sovt: {
    label: 'Yarı kapalı ses yolu (SOVT)', short: 'SOVT',
    note: 'Pipet, su, dudak ve dil titreşimi, mırıldanma. Ağzın önündeki daralma ses tellerinin daha az çarpışarak titreşmesine yardım eder. Sıra: önce orta direnç (normal pipet), sonra yüksek (ince pipet ya da suda pipet), sonra düşük (dudak, dil, mırıldanma), en sonda açık sesliye aktarım.',
  },
  'sovt-tm': {
    label: 'SOVT ile süsleme (Türk müziği)', short: 'Süsleme',
    note: 'Çarpma, mordan, dönüş ve uzun hava cümlesi önce yarı kapalı ses yoluyla hafifçe, sonra aynı figür açık sesliyle. Eşlik piyanoda dem (karar ve beşlisi). Diziler piyano yaklaşımıdır; koma içeren makamlar ayrı bölümde gelecek.',
  },
  legato: { label: 'Legato ve ses eşitliği', short: 'Legato' },
  arpej: { label: 'Arpej', short: 'Arpej' },
  cevik: { label: 'Çeviklik', short: 'Çeviklik' },
  messa: { label: 'Dinamik (messa di voce)', short: 'Dinamik' },
  gecis: { label: 'Pasaj geçişi (passaggio)', short: 'Pasaj' },
  aralik: { label: 'Aralık', short: 'Aralık' },
  vfe: { label: 'Ses fonksiyon egzersizleri', short: 'VFE' },
  sogu: { label: 'Soğuma', short: 'Soğuma' },
  serbest: { label: 'Repertuvar', short: 'Repertuvar' },
};

export const TECH_CATS = ['legato', 'arpej', 'cevik', 'gecis'];

export const RES = { orta: 'orta direnç', yuksek: 'yüksek direnç', dusuk: 'düşük direnç', aktarim: 'sesliye aktarım' };

const NIHAVENT = 'Nihavent dizisi (piyano yaklaşımı)';
const KURDI = 'Kürdi dizisi (piyano yaklaşımı)';

const twice = (half, a, b) => {
  const syl = half.map(() => null);
  syl[0] = a;
  const syl2 = [...syl];
  syl2[0] = b;
  return { notes: [...half, ...half], syl: [...syl, ...syl2] };
};

const carpma = twice([2, 0, 3, 2, 5, 3, 7, 5, 7], 'pipet', 'a');
const mordan = twice([0, 2, 0, 3, 5, 3, 7, 8, 7, 5, 3, 2, 0], 'brrr', 'a');
const donus = twice([2, 0, -2, 0, 5, 3, 2, 3, 8, 7, 5, 7, 7], 'su', 'a');
const uzunHava = twice([5, 7, 5, 3, 5, 3, 1, 0], 'brrr', 'a');
const pipetSesli = (() => {
  const half = deg('1 2 3 4 5 4 3 2 1');
  return twice(half, 'pipet', 'a');
})();

export const EXERCISES = [
  // SOVT
  {
    id: 'pipet-siren', cat: 'sovt', type: 'glide', res: 'orta', title: 'Pipetle siren',
    vowel: 'pipet', gear: 'normal içecek pipeti',
    how: 'Pipeti dudaklarının arasına al, burnu kapatmana gerek yok. Sesi hiç kesmeden aşağıdan yukarı, sonra geri kaydır. Zorlanmadan çıkabildiğin yere kadar.',
    focus: 'Pipetin ucundan çıkan hava akışının hiç kesilmediğini düşün.',
    glide: { from: ['lo', 3], to: ['hi', -4], sec: 3.5, shape: 'updown', reps: 3 },
  },
  {
    id: 'pipet-5', cat: 'sovt', type: 'pattern', res: 'orta', title: 'Pipetle beşli',
    vowel: 'pipet', gear: 'normal içecek pipeti', acc: 'pad',
    notes: deg('1 2 3 4 5 4 3 2 1'), beats: 0.5, lastBeats: 1.5, bpm: 76,
    zone: { lo: 0, hi: 3 }, dir: 'updown',
    how: 'Yanaklar şişmesin; basınç dudaklarda ve pipette kalsın. Notalar arası bağlı.',
    focus: 'Sesin pipetin ucundan ince ve düzgün bir ip gibi çıktığını düşün.',
  },
  {
    id: 'pipet-arpej', cat: 'sovt', type: 'pattern', res: 'orta', title: 'Pipetle oktav arpeji',
    vowel: 'pipet', gear: 'normal içecek pipeti', acc: 'broken',
    notes: deg('1 3 5 8 5 3 1'), beats: 1, lastBeats: 2, bpm: 80,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Notalar arasında hafifçe kaydır. Tepe notada pipetteki hava akışını artırma, aynı bırak.',
    focus: 'Sesin pipetten çıkıp bir kemer çizerek karşıya indiğini düşün.',
  },
  {
    id: 'su-siren', cat: 'sovt', type: 'glide', res: 'yuksek', title: 'Suda pipetle siren',
    vowel: 'pipet suda', gear: 'pipet ve su bardağı; pipetin ucu 2–3 cm suyun içinde',
    how: 'Pipetin ucunu suya 2–3 cm daldır, kabarcıklar düzenli ve küçük olsun. Daha derin daldırma direnci ve tellerin temasını artırır; derin başlama.',
    focus: 'Kabarcıkların eşit aralıklı, sakin bir dizi halinde çıktığını izle.',
    glide: { from: ['lo', 3], to: ['hi', -6], sec: 4, shape: 'updown', reps: 3 },
  },
  {
    id: 'su-uclu', cat: 'sovt', type: 'pattern', res: 'yuksek', title: 'Suda pipetle üçlü',
    vowel: 'pipet suda', gear: 'pipet ve su bardağı (2–3 cm)', acc: 'pad',
    notes: deg('1 2 3 2 1'), beats: 1, lastBeats: 2, bpm: 66,
    zone: { lo: 2, hi: 6 }, dir: 'up',
    how: 'Kabarcıklar her notada aynı ritimde kalsın. Kabarcık kesiliyorsa hava akışı düşmüştür.',
    focus: 'Suyun yüzeyindeki kıpırtının hiç durmadığını düşün.',
  },
  {
    id: 'dudak-5', cat: 'sovt', type: 'pattern', res: 'dusuk', title: 'Dudak titreşimiyle beşli',
    vowel: 'brrr', acc: 'pad',
    notes: deg('1 2 3 4 5 4 3 2 1'), beats: 0.5, lastBeats: 1.5, bpm: 84,
    zone: { lo: 0, hi: 3 }, dir: 'updown',
    how: 'Dudaklar gevşek, titreşim hiç durmasın. Gerekirse işaret parmaklarınla yanaklarını hafifçe destekle. Gırtlak yukarı kalkıyorsa daha yumuşak söyle.',
    focus: 'Titreşimin önündeki havada küçük bir motor gibi düzenli döndüğünü düşün.',
  },
  {
    id: 'dudak-arpej', cat: 'sovt', type: 'pattern', res: 'dusuk', title: 'Dudak titreşimiyle arpej',
    vowel: 'brrr', acc: 'broken',
    notes: deg('1 3 5 8 5 3 1'), beats: 0.5, lastBeats: 1.5, bpm: 76,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Atlamalarda titreşim kopmasın. Tepe notaya itmeden, kaydırarak ulaş.',
    focus: 'Titreşimin bir yay gibi yukarı çıkıp aşağı indiğini düşün.',
  },
  {
    id: 'dil-5', cat: 'sovt', type: 'pattern', res: 'dusuk', title: 'Dil titreşimiyle beşli',
    vowel: 'rrr', acc: 'pad',
    notes: deg('1 2 3 4 5 4 3 2 1'), beats: 0.5, lastBeats: 1.5, bpm: 80,
    zone: { lo: 0, hi: 3 }, dir: 'updown',
    how: 'Dil ucu üst diş etlerinde titresin, çene serbest. Titreşim duruyorsa hava akışını biraz artır, sesi değil.',
    focus: 'Dilin ucundaki titreşimin hep aynı hızda kaldığını dinle.',
  },
  {
    id: 'mirildan-5', cat: 'sovt', type: 'pattern', res: 'dusuk', title: 'Mırıldanarak inen beşli',
    vowel: 'mmm', acc: 'pad',
    notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 76,
    zone: { lo: 0, hi: 4 }, dir: 'updown',
    how: 'Dudaklar kapalı, dişler ayrık. Sesi burun ve dudak çevresinde hissedecek kadar yumuşak başla.',
    focus: 'Sesin dudaklarının hemen önünde, havada asılı durduğunu düşün.',
  },
  {
    id: 'ng-arpej', cat: 'sovt', type: 'pattern', res: 'dusuk', title: '“ng” ile arpej',
    vowel: 'ng', acc: 'broken',
    notes: deg('1 3 5 3 1'), beats: 1, lastBeats: 2, bpm: 76,
    zone: { lo: 0, hi: 2 }, dir: 'updown',
    how: '“Sing” kelimesinin sonundaki gibi dilin arkası yumuşak damakta. Burun deliklerinden hava aksın.',
    focus: 'Sesin burnun önünde ince bir uğultu olarak kaldığını düşün.',
  },
  {
    id: 'v-kayma', cat: 'sovt', type: 'pattern', res: 'dusuk', title: '“v” ile beşliye kayma',
    vowel: 'vvv', acc: 'pad',
    notes: deg('1 5 1'), beats: [1, 2, 2], bpm: 72,
    zone: { lo: 0, hi: 2 }, dir: 'updown',
    how: 'Alt dudak üst dişlere hafifçe değsin; sesli “v” ile notalar arasında kaydır.',
    focus: 'Dudaktaki gıdıklanmanın kaymanın her yerinde aynı kaldığını hisset.',
  },
  {
    id: 'pipet-sesli', cat: 'sovt', type: 'pattern', res: 'aktarim', title: 'Pipetten sesliye aktarım',
    vowel: 'önce pipet, sonra a', gear: 'normal içecek pipeti', acc: 'pad',
    notes: pipetSesli.notes, syl: pipetSesli.syl, beats: [...Array(8).fill(0.5), 1, ...Array(8).fill(0.5), 1.5], bpm: 76,
    zone: { lo: 0, hi: 3 }, dir: 'updown',
    how: 'Kalıbı önce pipetle söyle; pipeti çek, aynı kalıbı “a” ile pipetteki hafifliği koruyarak tekrarla.',
    focus: '“a”da da sesin pipetteki kadar kolay ve ileride aktığını düşün.',
  },
  {
    id: 'el-kapama', cat: 'sovt', type: 'pattern', res: 'aktarim', title: 'Elle kapat, aç',
    vowel: 'a', acc: 'pad',
    notes: deg('1 1 1 1'), syl: ['el kapalı', 'aç', 'el kapalı', 'aç'], beats: 2, lastBeats: 2, bpm: 72,
    zone: { lo: 2, hi: 4 }, dir: 'up',
    how: 'Avucunu ağzının önüne kapatarak “a” söyle, sonra elini çek. Ses açılırken tını ve kolaylık değişmesin.',
    focus: 'El açıldığında sesin odaya aynı rahatlıkla taştığını düşün.',
  },
  {
    id: 'pipet-messa', cat: 'sovt', type: 'pattern', res: 'orta', title: 'Pipetle messa di voce',
    vowel: 'pipet', gear: 'normal içecek pipeti', acc: 'pad', dyn: 'mdv',
    notes: deg('1'), beats: 8, lastBeats: 8, bpm: 60,
    zone: { lo: 4, hi: 4 }, step: 2, dir: 'up',
    how: 'Tek sesi 8 vuruş tut: yumuşak başla, ortaya kadar aç, yumuşağa dön. Pipet sesi büyürken bile tellerin çarpmasını yumuşak tutar.',
    focus: 'Pipetten çıkan havanın yavaşça kabarıp söndüğünü düşün.',
  },

  // SOVT ile süsleme (Türk müziği)
  {
    id: 'carpma', cat: 'sovt-tm', type: 'pattern', res: 'orta', title: 'Çarpma',
    vowel: 'önce pipet, sonra a', gear: 'normal içecek pipeti', scale: NIHAVENT, acc: 'dem', mode: 'minor',
    notes: carpma.notes, syl: carpma.syl,
    beats: [0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 2, 0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 0.25, 0.75, 2], bpm: 66,
    zone: { lo: 0, hi: 2 }, dir: 'up',
    how: 'Her ana sesin önüne üstten kısa bir çarpma gelir. Önce pipetle: çarpma gırtlaktan vurulmadan, yalnızca perdenin hızlı değişmesiyle. Sonra aynı figürü “a” ile.',
    focus: 'Çarpmanın ana sese bir tüy gibi değip geçtiğini düşün.',
  },
  {
    id: 'mordan', cat: 'sovt-tm', type: 'pattern', res: 'dusuk', title: 'Mordan',
    vowel: 'önce brrr, sonra a', scale: NIHAVENT, acc: 'dem', mode: 'minor',
    notes: mordan.notes, syl: mordan.syl,
    beats: [...[0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1.5], ...[0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 1.5]], bpm: 60,
    zone: { lo: 0, hi: 2 }, dir: 'up',
    how: 'Ana ses, üst komşu, ana ses. Dudak titreşimi süslemeyi gırtlakta sıkıştırmadan yapmayı öğretir; “a”da aynı hafifliği ara.',
    focus: 'Süslemenin önündeki havada küçük bir kıvrım olduğunu düşün.',
  },
  {
    id: 'donus', cat: 'sovt-tm', type: 'pattern', res: 'yuksek', title: 'Dönüş (gruppetto)',
    vowel: 'önce suda pipet, sonra a', gear: 'pipet ve su bardağı (2–3 cm)', scale: NIHAVENT, acc: 'dem', mode: 'minor',
    notes: donus.notes, syl: donus.syl,
    beats: [...Array(12).fill(0.25), 2, ...Array(12).fill(0.25), 2], bpm: 60,
    zone: { lo: 2, hi: 2 }, dir: 'up',
    how: 'Üst komşu, ana ses, alt komşu, ana ses. Suda pipetle kabarcıklar dönüş boyunca kesilmesin; sonra “a” ile aynı akış.',
    focus: 'Dönüşün suyun içinde küçük bir girdap gibi döndüğünü düşün.',
  },
  {
    id: 'uzun-hava', cat: 'sovt-tm', type: 'pattern', res: 'dusuk', title: 'Uzun hava cümlesi',
    vowel: 'önce brrr, sonra a', scale: KURDI, acc: 'dem', mode: 'minor',
    notes: uzunHava.notes, syl: uzunHava.syl,
    beats: [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 3, 1, 0.5, 0.5, 1, 0.5, 0.5, 1, 3], bpm: 56,
    zone: { lo: 0, hi: 2 }, dir: 'up',
    how: 'Dördüncü dereceden karara inen bir cümle. Önce dudak titreşimiyle cümlenin tamamını tek nefeste, sonra “a” ile; inişte sesi bırakma.',
    focus: 'Cümlenin uzaktaki birine söylenen tek bir düşünce olduğunu düşün.',
  },

  // Legato
  {
    id: 'legato-5', cat: 'legato', type: 'pattern', title: 'Legato beşli',
    vowel: 'a', acc: 'pad', notes: deg('1 2 3 4 5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 76,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Notaları birbirine bağla, aralarda ses düşmesin ve vurgu olmasın.',
    focus: 'Sesinin odanın karşı duvarına tek ve kesintisiz bir çizgi halinde ulaştığını düşün.',
  },
  {
    id: 'sesli-esitligi', cat: 'legato', type: 'pattern', title: 'Sesli harf eşitliği',
    vowel: 'i e a o u', acc: 'pad', notes: deg('1 1 1 1 1'), syl: ['i', 'e', 'a', 'o', 'u'], beats: 1, lastBeats: 2, bpm: 66,
    zone: { lo: 2, hi: 3 }, dir: 'up',
    how: 'Aynı perdede beş sesliyi bağlayarak söyle. Sesli değişirken tını ve güç değişmesin.',
    focus: 'Beş seslinin de odada aynı noktaya çarptığını düşün.',
  },

  // Arpej
  {
    id: 'arpej-1358', cat: 'arpej', type: 'pattern', title: 'Oktav arpeji',
    vowel: 'a', acc: 'broken', notes: deg('1 3 5 8 5 3 1'), beats: 1, lastBeats: 2, bpm: 88,
    zone: { lo: 0, hi: 0 }, dir: 'updown',
    how: 'Yukarı çıkarken hazırlığı alttan yap; tepedeki notaya zıplamadan, aynı çizgiyle ulaş.',
    focus: 'Sesinin bir kemer çizerek karşıdaki bir noktaya düştüğünü düşün.',
  },
  {
    id: 'arpej-stakato', cat: 'arpej', type: 'pattern', title: 'Stakato arpej',
    vowel: 'ha', acc: 'pulse', notes: deg('1 3 5 8 5 3 1'), beats: 1, lastBeats: 1, bpm: 96, staccato: true,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Her notayı kısa ve temiz başlat; “h” sert olmasın, karın bölgesi küçük ve esnek tepki versin.',
    focus: 'Her notanın ileride bir hedefe atılan hafif bir top olduğunu düşün.',
  },

  // Çeviklik
  {
    id: 'rossini-9', cat: 'cevik', type: 'pattern', title: 'Dokuzlu dizi',
    vowel: 'a', acc: 'pulse', notes: deg('1 2 3 4 5 6 7 8 9 8 7 6 5 4 3 2 1'), beats: 0.5, lastBeats: 2, bpm: 72,
    zone: { lo: 0, hi: 0 }, dir: 'updown',
    how: 'Önce yavaş ve temiz; hız ancak her nota yerine oturunca artar. Tempoyu egzersiz ekranından değiştirebilirsin.',
    focus: 'Notaları bir ipe dizilmiş, eşit aralıklı inciler gibi düşün.',
  },
  {
    id: 'ucluler', cat: 'cevik', type: 'pattern', title: 'Üçlülerle dizi',
    vowel: 'a', acc: 'pulse', notes: deg('1 3 2 4 3 5 4 2 1'), beats: 0.5, lastBeats: 2, bpm: 80,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Atlamalarda perdeyi aşağıdan kaydırma; her nota doğrudan yerine konsun.',
    focus: 'Notaların piyanodaki akor vuruşlarına tam oturduğunu dinle.',
  },

  // Dinamik
  {
    id: 'messa-di-voce', cat: 'messa', type: 'pattern', title: 'Messa di voce',
    vowel: 'a', acc: 'pad', notes: deg('1'), beats: 8, lastBeats: 8, bpm: 60, dyn: 'mdv',
    zone: { lo: 4, hi: 4 }, step: 2, dir: 'up',
    how: 'Sesi yumuşak başlat, ortaya kadar aç, yumuşağa dön. Perde kıpırdamasın; alttaki üçgen güç eğrisini gösterir.',
    focus: 'Sesinin yavaşça yaklaşıp uzaklaşan bir ışık olduğunu düşün.',
  },

  // Pasaj geçişi
  {
    id: 'inen-5', cat: 'gecis', type: 'pattern', title: 'Yukarıdan inen beşli',
    vowel: 'u, sonra o', acc: 'pad', notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 80,
    zone: { lo: 2, hi: 0 }, dir: 'down',
    how: 'Üstten hafif başla ve inerken üst rezonansı bırakma. Pasaj bölgesinde sesliyi daraltmak serbest.',
    focus: 'İnerken sesin parlaklığını önündeki sabit bir noktada tut.',
  },
  {
    id: 'oktav-inis', cat: 'gecis', type: 'pattern', title: 'Oktav sıçrayıp diziyle inmek',
    vowel: 'u → o → a', acc: 'pad', notes: deg('1 8 7 6 5 4 3 2 1'), beats: [1, 2, 1, 1, 1, 1, 1, 1, 2], bpm: 80,
    zone: { lo: 0, hi: 0 }, dir: 'up',
    how: 'Oktava hazırlıkla, aşağıdan kaydırmadan çık; inerken ses kademesi değişirken bile çizgi aynı kalsın.',
    focus: 'Tepedeki notayı uzaktaki bir pencereye bırakıyormuş gibi düşün.',
  },
  {
    id: 'pasaj-13531', cat: 'gecis', type: 'pattern', title: 'Pasaj bölgesinde arpej',
    vowel: 'o', acc: 'broken', notes: deg('1 3 5 3 1'), beats: 1, lastBeats: 2, bpm: 80,
    zone: { lo: 0, hi: 0, topFrom: 9 }, dir: 'updown',
    how: 'Yalnızca pasaj çevresinde çalışır. Tepe notada sesliyi hafifçe yuvarlat, gırtlağı yukarı itme. Zorlanırsan önce aynı kalıbı pipetle yap.',
    focus: 'Tepe notanın bir kemerin en üst noktası gibi yuvarlak geçtiğini düşün.',
  },

  // Aralık
  {
    id: 'aralik', cat: 'aralik', type: 'interval', title: 'Aralık söyleme',
    vowel: 'a ya da la', intervals: [2, 3, 4, 5, 7, 8, 9, 12], trials: 12,
    how: 'Piyano bir ses çalar; verilen aralık kadar yukarı ya da aşağıdaki sesi söyle. Ardından piyano doğru sesi çalar; tutup tutmadığını işaretle.',
    focus: 'Hedef sesi söylemeden önce kafanda duy, sonra doğrudan o noktaya ulaş.',
  },

  // VFE
  {
    id: 'vfe-1', cat: 'vfe', type: 'sustain', title: 'VFE 1: uzun i',
    vowel: 'i', male: [53], female: [65], reps: 2,
    how: 'Verilen notada “i” sesini olabildiğince uzun ve yumuşak tut, sesi havalı yapmadan. Başlarken ve bitirince düğmeye bas. Stemple günde iki kez önerir.',
    focus: 'Önündeki bir mum alevini titretmeden sesi uzatıyormuş gibi düşün.',
  },
  {
    id: 'vfe-2', cat: 'vfe', type: 'glide', title: 'VFE 2: aşağıdan yukarı kayma',
    vowel: 'o (dudaklar neredeyse kapalı)',
    glide: { from: ['lo', 0], to: ['hi', 0], sec: 5, shape: 'up', reps: 2 },
    how: 'En pesten en tize yavaşça kay. Kırılma olursa durma, devam et.',
    focus: 'Sesin bir asansör gibi kesintisiz yükseldiğini düşün.',
  },
  {
    id: 'vfe-3', cat: 'vfe', type: 'glide', title: 'VFE 3: yukarıdan aşağı kayma',
    vowel: 'o (dudaklar neredeyse kapalı)',
    glide: { from: ['hi', 0], to: ['lo', 0], sec: 5, shape: 'down', reps: 2 },
    how: 'En tizden en pese yavaşça in, ses hiç kesilmesin.',
    focus: 'Sesin bir tüyün süzülerek inmesi gibi aktığını düşün.',
  },
  {
    id: 'vfe-4', cat: 'vfe', type: 'sustain', title: 'VFE 4: beş notada uzun o',
    vowel: 'o (dudaklar yuvarlak, neredeyse kapalı)', male: [48, 50, 52, 53, 55], female: [60, 62, 64, 65, 67], reps: 1,
    how: 'Her notayı olabildiğince uzun ve yumuşak tut. Süreler kaydedilir; haftalar içinde artış beklenir.',
    focus: 'Sesi ince bir iplik gibi, hiç kalınlaştırmadan uzattığını düşün.',
  },

  // Soğuma
  {
    id: 'sogu-siren', cat: 'sogu', type: 'glide', res: 'dusuk', title: 'Dudak titreşimiyle inen siren',
    vowel: 'brrr',
    glide: { from: ['lo', 12], to: ['lo', 0], sec: 3, shape: 'down', reps: 3 },
    how: 'Ortadan aşağı rahatça kay, hiç zorlama. Soğumada yarı kapalı egzersizler düşük güçte yapılır.',
    focus: 'Sesin yokuş aşağı yavaşça yuvarlanan bir top olduğunu düşün.',
  },
  {
    id: 'sogu-su', cat: 'sogu', type: 'glide', res: 'yuksek', title: 'Suda pipetle sakin iniş',
    vowel: 'pipet suda', gear: 'pipet ve su bardağı (2 cm)',
    glide: { from: ['lo', 9], to: ['lo', 0], sec: 3.5, shape: 'down', reps: 3 },
    how: 'Az daldır (yaklaşık 2 cm), çok yumuşak ve kısa. Amaç dinlenmek; kabarcıklar küçük kalsın.',
    focus: 'Kabarcıkların yavaşlayıp sakinleştiğini izle.',
  },
  {
    id: 'sogu-mirildan', cat: 'sogu', type: 'pattern', res: 'dusuk', title: 'Yumuşak mırıldanma',
    vowel: 'mmm', acc: 'pad', notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 72,
    zone: { lo: 0, hi: 9 }, dir: 'down',
    how: 'Çok yumuşak, konuşma sesine yakın bir güçte.',
    focus: 'Sesin dudaklarının önünde sakin bir uğultu olarak kaldığını düşün.',
  },

  // Repertuvar
  {
    id: 'repertuvar', cat: 'serbest', type: 'free', title: 'Repertuvar',
    vowel: '', minutes: 8,
    how: 'Çalıştığın eseri söyle. Başlangıç sesini ve akorları alttaki piyanodan alabilirsin. Zorlandığın pasajı önce pipetle, sonra sözle dene.',
    focus: 'Sözün anlamını ve dinleyiciye ne anlatmak istediğini düşün.',
  },
];

export const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
