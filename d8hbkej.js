import { deg } from './ewdv3t5.js';

export const CATS = {
  isinma: { label: 'Isınma', short: 'Isınma' },
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

export const EXERCISES = [
  // Isınma
  {
    id: 'pipet-siren', cat: 'isinma', type: 'glide', title: 'Pipetle siren',
    vowel: 'pipet ya da dudak titreşimi',
    how: 'Pipeti dudaklarının arasına al ve sesi hiç kesmeden aşağıdan yukarı, sonra geri kaydır. Zorlanmadan çıkabildiğin yere kadar.',
    focus: 'Pipetin ucundan çıkan hava akışının hiç kesilmediğini düşün.',
    glide: { from: ['lo', 3], to: ['hi', -4], sec: 3.5, shape: 'updown', reps: 3 },
  },
  {
    id: 'dudak-5', cat: 'isinma', type: 'pattern', title: 'Dudak titreşimiyle beşli',
    vowel: 'brrr', notes: deg('1 2 3 4 5 4 3 2 1'), beats: 0.5, lastBeats: 1.5, bpm: 84,
    zone: { lo: 0, hi: 3 }, dir: 'updown',
    how: 'Dudakları gevşek bırak, titreşim hiç durmasın. Gerekirse işaret parmaklarınla yanaklarını hafifçe destekle.',
    focus: 'Titreşimin önündeki havada küçük bir motor gibi düzenli döndüğünü düşün.',
  },
  {
    id: 'mirildan-5', cat: 'isinma', type: 'pattern', title: 'Mırıldanarak inen beşli',
    vowel: 'mmm', notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 76,
    zone: { lo: 0, hi: 4 }, dir: 'updown',
    how: 'Dudaklar kapalı, dişler ayrık. Sesi burun ve dudak çevresinde hissedecek kadar yumuşak başla.',
    focus: 'Sesin dudaklarının hemen önünde, havada asılı durduğunu düşün.',
  },

  // Legato
  {
    id: 'legato-5', cat: 'legato', type: 'pattern', title: 'Legato beşli',
    vowel: 'a', notes: deg('1 2 3 4 5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 76,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Notaları birbirine bağla, aralarda ses düşmesin ve vurgu olmasın.',
    focus: 'Sesinin odanın karşı duvarına tek ve kesintisiz bir çizgi halinde ulaştığını düşün.',
  },
  {
    id: 'sesli-esitligi', cat: 'legato', type: 'pattern', title: 'Sesli harf eşitliği',
    vowel: 'i e a o u', notes: deg('1 1 1 1 1'), syl: ['i', 'e', 'a', 'o', 'u'], beats: 1, lastBeats: 2, bpm: 66,
    zone: { lo: 2, hi: 3 }, dir: 'up',
    how: 'Aynı perdede beş sesliyi bağlayarak söyle. Sesli değişirken tını ve güç değişmesin.',
    focus: 'Beş seslinin de odada aynı noktaya çarptığını düşün.',
  },

  // Arpej
  {
    id: 'arpej-1358', cat: 'arpej', type: 'pattern', title: 'Oktav arpeji',
    vowel: 'a', notes: deg('1 3 5 8 5 3 1'), beats: 1, lastBeats: 2, bpm: 88,
    zone: { lo: 0, hi: 0 }, dir: 'updown',
    how: 'Yukarı çıkarken hazırlığı alttan yap; tepedeki notaya zıplamadan, aynı çizgiyle ulaş.',
    focus: 'Sesinin bir kemer çizerek karşıdaki bir noktaya düştüğünü düşün.',
  },
  {
    id: 'arpej-stakato', cat: 'arpej', type: 'pattern', title: 'Stakato arpej',
    vowel: 'ha', notes: deg('1 3 5 8 5 3 1'), beats: 1, lastBeats: 1, bpm: 96, staccato: true,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Her notayı kısa ve temiz başlat; “h” sert olmasın, diyafram küçük ve esnek tepki versin.',
    focus: 'Her notanın ileride bir hedefe atılan hafif bir top olduğunu düşün.',
  },

  // Çeviklik
  {
    id: 'rossini-9', cat: 'cevik', type: 'pattern', title: 'Dokuzlu dizi',
    vowel: 'a', notes: deg('1 2 3 4 5 6 7 8 9 8 7 6 5 4 3 2 1'), beats: 0.5, lastBeats: 2, bpm: 72, clicks: true,
    zone: { lo: 0, hi: 0 }, dir: 'updown',
    how: 'Önce yavaş ve temiz; hız ancak her nota yerine oturunca artar. Tempoyu ayarlardan değiştirebilirsin.',
    focus: 'Notaları bir ipe dizilmiş, eşit aralıklı inciler gibi düşün.',
  },
  {
    id: 'ucluler', cat: 'cevik', type: 'pattern', title: 'Üçlülerle dizi',
    vowel: 'a', notes: deg('1 3 2 4 3 5 4 2 1'), beats: 0.5, lastBeats: 2, bpm: 80, clicks: true,
    zone: { lo: 0, hi: 1 }, dir: 'updown',
    how: 'Atlamalarda perdeyi aşağıdan kaydırma; her nota doğrudan yerine konsun.',
    focus: 'Ritmin önündeki metronom vuruşlarına tam oturduğunu dinle.',
  },

  // Dinamik
  {
    id: 'messa-di-voce', cat: 'messa', type: 'pattern', title: 'Messa di voce',
    vowel: 'a', notes: deg('1'), beats: 8, lastBeats: 8, bpm: 60, dyn: 'mdv',
    zone: { lo: 4, hi: 4 }, step: 2, dir: 'up',
    how: 'Sesi piyano başlat, ortaya kadar aç, piyanoya geri dön. Perde kıpırdamasın; alttaki çizgi ses gücünü gösterir.',
    focus: 'Sesinin yavaşça yaklaşıp uzaklaşan bir ışık olduğunu düşün.',
  },

  // Pasaj geçişi
  {
    id: 'inen-5', cat: 'gecis', type: 'pattern', title: 'Yukarıdan inen beşli',
    vowel: 'u, sonra o', notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 80,
    zone: { lo: 2, hi: 0 }, dir: 'down',
    how: 'Üstten hafif başla ve inerken üst rezonansı bırakma. Pasaj bölgesinde sesliyi daraltmak serbest.',
    focus: 'İnerken sesin parlaklığını önündeki sabit bir noktada tut.',
  },
  {
    id: 'oktav-inis', cat: 'gecis', type: 'pattern', title: 'Oktav sıçrayıp diziyle inmek',
    vowel: 'u → o → a', notes: deg('1 8 7 6 5 4 3 2 1'), beats: [1, 2, 1, 1, 1, 1, 1, 1, 2], bpm: 80,
    zone: { lo: 0, hi: 0 }, dir: 'up',
    how: 'Oktava hazırlıkla, aşağıdan kaydırmadan çık; inerken ses kademesi değişirken bile çizgi aynı kalsın.',
    focus: 'Tepedeki notayı uzaktaki bir pencereye bırakıyormuş gibi düşün.',
  },
  {
    id: 'pasaj-13531', cat: 'gecis', type: 'pattern', title: 'Pasaj bölgesinde arpej',
    vowel: 'o', notes: deg('1 3 5 3 1'), beats: 1, lastBeats: 2, bpm: 80,
    zone: { lo: 0, hi: 0, topFrom: 9 }, dir: 'updown',
    how: 'Yalnızca pasaj çevresinde çalışır. Tepe notada sesliyi hafifçe yuvarlat, gırtlağı yukarı itme.',
    focus: 'Tepe notanın bir kemerin en üst noktası gibi yuvarlak geçtiğini düşün.',
  },

  // Aralık
  {
    id: 'aralik', cat: 'aralik', type: 'interval', title: 'Aralık söyleme',
    vowel: 'a ya da la',
    intervals: [2, 3, 4, 5, 7, 8, 9, 12], trials: 12,
    how: 'Piyano bir ses çalar; verilen aralık kadar yukarı ya da aşağıdaki sesi söyle.',
    focus: 'Hedef sesi söylemeden önce kafanda duy, sonra doğrudan o noktaya ulaş.',
  },

  // VFE
  {
    id: 'vfe-1', cat: 'vfe', type: 'sustain', title: 'VFE 1: uzun i',
    vowel: 'i', male: [53], female: [65], reps: 2,
    how: 'Verilen notada “i” sesini olabildiğince uzun ve yumuşak tut, sesi havalı yapmadan. Stemple günde iki kez önerir.',
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
    id: 'sogu-siren', cat: 'sogu', type: 'glide', title: 'Dudak titreşimiyle inen siren',
    vowel: 'brrr',
    glide: { from: ['lo', 12], to: ['lo', 0], sec: 3, shape: 'down', reps: 3 },
    how: 'Ortadan aşağı rahatça kay, hiç zorlama.',
    focus: 'Sesin yokuş aşağı yavaşça yuvarlanan bir top olduğunu düşün.',
  },
  {
    id: 'sogu-mirildan', cat: 'sogu', type: 'pattern', title: 'Yumuşak mırıldanma',
    vowel: 'mmm', notes: deg('5 4 3 2 1'), beats: 1, lastBeats: 2, bpm: 72,
    zone: { lo: 0, hi: 9 }, dir: 'down',
    how: 'Çok yumuşak, konuşma sesine yakın bir güçte.',
    focus: 'Sesin dudaklarının önünde sakin bir uğultu olarak kaldığını düşün.',
  },

  // Repertuvar
  {
    id: 'repertuvar', cat: 'serbest', type: 'free', title: 'Repertuvar',
    vowel: '', minutes: 8,
    how: 'Çalıştığın eseri söyle. Zorlandığın pasajı kaydet, dinle, sonra yeniden dene.',
    focus: 'Sözün anlamını ve dinleyiciye ne anlatmak istediğini düşün.',
  },
];

export const byId = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
