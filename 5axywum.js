import { h, clear, icon, segmented, fmtEst, fmtDuration, fmtAgo } from './nyxk7bs.js';
import { EXERCISES, CATS, TRADS, byId, inTrad, tmOnly, resolveEx } from './d8hbkej.js';
import { stepFor, stepForMix, historyIndex, variantsOfDay, variantHistory, pickVariant } from './rdjz6js.js';
import { runSingle } from './amcnm9m.js';
import { exMeta, metaText } from './uhyk5uj.js';
import { settings, saveSettings, db } from './f36qmgd.js';
import { ensureAudio } from './qpy3wmh.js';
import { SET_VARIANTS, scaleFor } from './392vqcv.js';
import { noteName } from './ewdv3t5.js';
import { RES_ORDER } from './rbixnvg.js';

// SOVT rows are grouped by resistance, in the order they are best practised
// (Hijleh and Pinto 2021): medium, high, low, then carry-over to an open vowel.
const RES_HEAD = {
  orta: ['Orta direnç: pipet', 'Isınmaya buradan başla.'],
  yuksek: ['Yüksek direnç: suda pipet', 'En güçlü geri basınç; ucu sığ (2–3 cm) tut, yumuşak söyle.'],
  dusuk: ['Düşük direnç: titreşim, mırıldanma', 'Açık sese daha yakın; hava akışı ve gevşeklik.'],
  aktarim: ['Açık sesliye aktarım', 'Pipetteki kolaylığı açık sesliye taşır.'],
};
const RECENT = 4;

export async function renderLibrary(main) {
  let results = [];
  const load = async () => {
    try { results = await db.all('results'); } catch { results = []; }
  };
  await load();
  let hist = historyIndex(results);

  let trad = settings.libTrad === 'tm' ? 'tm' : 'bati';
  const catPref = { ...(settings.libCat || {}) };
  // The pickers start from your last choice; before you have chosen, from the çeşni and
  // makam you have gone longest without.
  const ofDay = variantsOfDay(results);
  let cesni = SET_VARIANTS.d5.includes(settings.tmCesni) ? settings.tmCesni : ofDay.cesni;
  let makam = SET_VARIANTS.dizi.includes(settings.tmMakam) ? settings.tmMakam : ofDay.makam;
  let mixed = !!settings.tmMix;
  const expanded = new Set();

  const chips = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Kategori' });
  const picks = h('div', { class: 'tm-pick' });
  const body = h('div', { class: 'lib-body' });

  const listFor = (cat) => EXERCISES.filter((e) => !e.retired && e.cat === cat && inTrad(e, trad) && (trad === 'tm' || !tmOnly(e)));
  const catsHere = () => Object.keys(CATS).filter((c) => (CATS[c].trad === 'ortak' || CATS[c].trad === trad) && listFor(c).length);

  /** Turkish-music variant of a row: the picked çeşni or makam (null in the Western section). */
  const variantOf = (ex) => {
    if (trad !== 'tm' || !ex.tm) return null;
    const set = ex.tm.set;
    return set === 'dizi' ? makam : set === 'd4' || set === 'd5' ? cesni : SET_VARIANTS[set][0];
  };

  const refresh = async () => {
    await load();
    hist = historyIndex(results);
    if (trad === 'tm') drawHint();
    drawBody();
  };

  function row(ex, variant, { recentAt = null } = {}) {
    const isTm = variant != null;
    const canMix = !recentAt && isTm && ex.type === 'pattern' && SET_VARIANTS[ex.tm.set].length > 1;
    const build = () => (canMix && mixed ? stepForMix(ex, settings, null, variant) : stepFor(ex, settings, null, variant));
    const st = build();
    const rex = resolveEx(ex, variant);
    const hx = hist[ex.id];
    const key = recentAt ? `son|${ex.id}|${variant || ''}` : `kat|${ex.id}`;
    const vname = !isTm || rex.set === 'tek' ? null
      : recentAt ? rex.sc.label
        : st.mixed ? `${rex.sc.short}, karışık` : rex.sc.short;
    const meta = [vname, `≈ ${fmtEst(st.estSec)}`, fmtAgo(recentAt || hx?.last)].filter(Boolean).join(' · ');

    const detail = h('div', { class: 'lx-detail', hidden: !expanded.has(key) });
    const fill = () => {
      const roots = st.queue ? [...new Set(st.queue.map((q) => q.root))] : null;
      const facts = [
        roots?.length ? `${rex.isTm ? 'Karar' : 'Tonlar'} ${noteName(Math.min(...roots))}–${noteName(Math.max(...roots))}, ${roots.length} ton` : null,
        ...exMeta(rex),
      ].filter(Boolean);
      clear(detail,
        rex.vowel ? h('p', { class: 'muted small' }, `Ses: ${rex.vowel}`) : null,
        facts.length ? h('p', { class: 'muted small' }, metaText(facts)) : null,
        hx?.count ? h('p', { class: 'muted small' }, `${hx.count} kez çalışıldı, toplam ${fmtDuration(hx.sec)}.`) : null,
        st.mixed ? h('p', { class: 'muted small' }, `Karışık, ${st.mixed.label}: ${st.mixed.names}. ${st.mixed.chunk} tonda bir sıradakine geçer; hepsi ${st.mixed.rounds} kez gelir, ${st.queue.length} ton.`) : null,
        h('p', null, rex.how),
        rex.focus ? h('p', { class: 'focus-note' }, rex.focus) : null);
    };
    if (expanded.has(key)) fill();
    const toggle = h('button', {
      class: 'lx-open', type: 'button', 'aria-expanded': String(expanded.has(key)),
      onclick: () => {
        const show = detail.hidden;
        detail.hidden = !show;
        toggle.setAttribute('aria-expanded', String(show));
        if (show) { expanded.add(key); fill(); } else expanded.delete(key);
      },
    }, h('span', { class: 'lx-title' }, rex.title), h('span', { class: 'lx-meta' }, meta));
    const play = h('button', {
      class: 'play', type: 'button', 'aria-label': `${rex.title} başlat`,
      onclick: () => { ensureAudio(); runSingle(build(), { onFinish: refresh }); },
    }, icon('play', 20));
    return h('li', { class: 'lx' }, h('div', { class: 'lx-row' }, toggle, play), detail);
  }

  function recentGroup() {
    const seen = new Set();
    const items = [];
    for (const r of [...results].sort((a, b) => (b.at || 0) - (a.at || 0))) {
      const ex = byId[r.exId];
      if (!ex || ex.retired || r.kind === 'rating') continue;
      const tmRow = !!(r.tm && ex.tm);
      const fits = trad === 'tm'
        ? tmRow || (!r.tm && !ex.tm && inTrad(ex, 'tm'))
        : !r.tm && inTrad(ex, 'bati') && !tmOnly(ex);
      if (!fits) continue;
      const k = `${ex.id}|${tmRow ? r.tm : ''}`;
      if (seen.has(k)) continue;
      seen.add(k);
      items.push(row(ex, tmRow ? r.tm : null, { recentAt: r.at }));
      if (items.length >= RECENT) break;
    }
    if (!items.length) return null;
    return h('section', { class: 'lib-group' },
      h('div', { class: 'lib-ghead' }, h('h2', null, 'Son çalıştıkların')),
      h('ul', { class: 'lib-list' }, items));
  }

  function group(cat) {
    const c = CATS[cat];
    const list = listFor(cat);
    const note = (trad === 'tm' && c.noteTm) || c.note;
    const noteEl = note ? h('p', { class: 'lib-note', hidden: true }, note) : null;
    const info = note ? h('button', {
      class: 'icon-btn info', type: 'button', 'aria-label': `${c.label} hakkında`, 'aria-expanded': 'false',
      onclick: (e) => {
        noteEl.hidden = !noteEl.hidden;
        e.currentTarget.setAttribute('aria-expanded', String(!noteEl.hidden));
      },
    }, icon('info', 18)) : null;
    let lists;
    if (cat === 'sovt') {
      const by = RES_ORDER.map((rs) => [RES_HEAD[rs], list.filter((e) => e.res === rs)]);
      by.push([['Diğer', ''], list.filter((e) => !RES_ORDER.includes(e.res))]);
      lists = by.filter(([, l]) => l.length).map(([[head, sub], l]) => [
        h('h3', { class: 'lib-sub' }, head, sub ? h('span', null, sub) : null),
        h('ul', { class: 'lib-list' }, l.map((e) => row(e, variantOf(e))))]);
    } else {
      lists = h('ul', { class: 'lib-list' }, list.map((e) => row(e, variantOf(e))));
    }
    return h('section', { class: 'lib-group', id: `kat-${cat}` },
      h('div', { class: 'lib-ghead' }, h('h2', null, c.label), h('span', { class: 'lib-count' }, String(list.length)), info),
      c.goal ? h('p', { class: 'lib-goal' }, c.goal) : null,
      c.gains?.length ? h('p', { class: 'lib-gains' }, h('b', null, 'Geliştirir: '), c.gains.join(' · ')) : null,
      noteEl,
      lists);
  }

  function drawChips(cats, cur) {
    clear(chips, [['all', 'Tümü'], ...cats.map((c) => [c, CATS[c].short])].map(([v, text]) => h('button', {
      class: 'chip', type: 'button', role: 'radio', 'aria-checked': String(v === cur),
      onclick: () => {
        catPref[trad] = v;
        saveSettings({ libCat: { ...catPref } });
        drawBody();
        if (body.getBoundingClientRect().top < 0) body.scrollIntoView({ block: 'start' });
      },
    }, text)));
  }

  // Turkish-music pickers. The selects are built once so they keep focus while you
  // move through them; only the suggestion line is redrawn.
  const hint = h('p', { class: 'pick-hint' });
  const pickSel = {};
  const setVariant = (pool, v) => {
    if (pool === 'cesni') { cesni = v; saveSettings({ tmCesni: v }); } else { makam = v; saveSettings({ tmMakam: v }); }
    if (pickSel[pool].value !== v) pickSel[pool].value = v;
    drawHint();
    drawBody();
  };
  const select = (label, set, pool, value) => {
    const s = h('select', { class: 'select', 'aria-label': label },
      SET_VARIANTS[set].map((id) => h('option', { value: id, selected: id === value }, scaleFor(set, id).short)));
    s.addEventListener('change', () => setVariant(pool, s.value));
    pickSel[pool] = s;
    return h('label', { class: 'pick' }, h('span', null, label), s);
  };
  clear(picks,
    select('Çeşni', 'd5', 'cesni', cesni),
    select('Makam', 'dizi', 'makam', makam),
    h('button', {
      class: 'btn ghost toggle', type: 'button', 'aria-pressed': String(mixed),
      title: 'Kalıp egzersizlerinde seçili çeşni ya da makamdan başlayıp benzerleriyle dönüşümlü çalış',
      onclick: (e) => { mixed = !mixed; saveSettings({ tmMix: mixed }); e.currentTarget.setAttribute('aria-pressed', String(mixed)); drawBody(); },
    }, 'Karışık'),
    hint);

  /** The çeşni and makam you have gone longest without, as one-tap suggestions. */
  function drawHint() {
    const vh = variantHistory(results);
    const sugg = (pool, set, cur) => {
      const id = pickVariant(pool, vh, () => 0);
      if (id === cur) return null;
      return h('button', { class: 'linkish', type: 'button', onclick: () => setVariant(pool, id) },
        `${scaleFor(set, id).short} (${fmtAgo(vh[pool][id]).replace('hiç çalışılmadı', 'hiç')})`);
    };
    const sc = sugg('cesni', 'd5', cesni);
    const sm = sugg('makam', 'dizi', makam);
    hint.hidden = !sc && !sm;
    clear(hint, 'En uzun süredir çalışmadıkların: ', sc, sc && sm ? ', ' : null, sm);
  }

  function drawPicks() {
    picks.hidden = trad !== 'tm';
    if (!picks.hidden) drawHint();
  }

  function drawBody() {
    const cats = catsHere();
    const cur = catPref[trad] === 'all' || cats.includes(catPref[trad]) ? catPref[trad] : 'all';
    drawChips(cats, cur);
    clear(body, cur === 'all' ? [recentGroup(), cats.map(group)] : group(cur));
  }

  clear(main,
    h('section', { class: 'lib-head' },
      h('h1', null, 'Egzersizler'),
      segmented(Object.entries(TRADS), trad, (v) => { trad = v; saveSettings({ libTrad: v }); drawPicks(); drawBody(); }, 'Bölüm')),
    h('div', { class: 'lib-bar' }, chips),
    picks,
    body);
  drawPicks();
  drawBody();
}
