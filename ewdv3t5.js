const SOLFEGE = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
const LETTER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

let names = SOLFEGE;
let a4 = 440;

export function configureMusic({ noteNames, a4: ref } = {}) {
  if (noteNames) names = noteNames === 'letter' ? LETTER : SOLFEGE;
  if (ref) a4 = ref;
}

export const midiToFreq = (m) => a4 * 2 ** ((m - 69) / 12);
export const freqToMidi = (f) => 69 + 12 * Math.log2(f / a4);

export function pitchClass(m) {
  return names[((Math.round(m) % 12) + 12) % 12];
}

export function noteName(m, withOctave = true) {
  const r = Math.round(m);
  const pc = names[((r % 12) + 12) % 12];
  return withOctave ? pc + (Math.floor(r / 12) - 1) : pc;
}

export function isNatural(m) {
  return [0, 2, 4, 5, 7, 9, 11].includes(((Math.round(m) % 12) + 12) % 12);
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11];

/** '1 2 3 4 5 4 3 2 1' -> semitone offsets in major; supports 8, 9, 10..., and '-5' (below root). */
export function deg(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const n = parseInt(tok, 10);
    if (n > 0) {
      const i = n - 1;
      return MAJOR[i % 7] + 12 * Math.floor(i / 7);
    }
    const i = -n - 1; // -5 means the 5th degree an octave below
    return MAJOR[i % 7] - 12 * (Math.floor(i / 7) + 1);
  });
}

export const INTERVALS = [
  { st: 1, name: 'küçük 2\'li' },
  { st: 2, name: 'büyük 2\'li' },
  { st: 3, name: 'küçük 3\'lü' },
  { st: 4, name: 'büyük 3\'lü' },
  { st: 5, name: 'tam 4\'lü' },
  { st: 6, name: 'artık 4\'lü' },
  { st: 7, name: 'tam 5\'li' },
  { st: 8, name: 'küçük 6\'lı' },
  { st: 9, name: 'büyük 6\'lı' },
  { st: 10, name: 'küçük 7\'li' },
  { st: 11, name: 'büyük 7\'li' },
  { st: 12, name: 'oktav' },
];

/** Signed cents between a sung midi value and a target, folding detector octave slips. */
export function centsOff(sung, target) {
  let d = (sung - target) * 100;
  if (Math.abs(d) > 900) d -= 1200 * Math.round(d / 1200);
  return d;
}

export function median(arr) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export const VOICES = {
  tenor: { label: 'Tenor', lo: 48, hi: 69, male: true },
  bariton: { label: 'Bariton', lo: 45, hi: 65, male: true },
  bas: { label: 'Bas', lo: 41, hi: 62, male: true },
  kontralto: { label: 'Kontralto', lo: 55, hi: 74, male: false },
  mezzo: { label: 'Mezzosoprano', lo: 57, hi: 77, male: false },
  soprano: { label: 'Soprano', lo: 60, hi: 81, male: false },
};
