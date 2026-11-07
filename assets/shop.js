// Tuckwell Vorschau: Galerie, Größen, Mengenstufen, Warenkorb, haftender Kaufbalken.
// Keine echte Kasse: "Checkout" zeigt nur einen Hinweis, es wird nichts gesendet.
(() => {
  const $ = (s, w = document) => w.querySelector(s)
  const $$ = (s, w = document) => [...w.querySelectorAll(s)]
  const geld = (n) => '$' + n.toFixed(2)

  const PREIS = 99.99 // BLATT.md, alle Größen gleich: ein Name, ein Preis
  const STUFEN = { 1: PREIS, 2: 180.00, 3: 255.00 } // 2 Stück 10 %, 3 Stück 15 %; Rechnung tor_angebot.py, Entscheidung ANALYSE.md
  const GROESSEN = {
    a170: { name: 'Adult Regular', kurz: 'Adult R', gruppe: 'adult', mass: '67 x 16 in' },
    a180: { name: 'Adult Large', kurz: 'Adult L', gruppe: 'adult', mass: '71 x 20 in' },
    k140: { name: 'Kids Small', kurz: 'Kids S', gruppe: 'kids', mass: '55 x 14 in' },
    k150: { name: 'Kids Large', kurz: 'Kids L', gruppe: 'kids', mass: '59 x 16 in' }
  }
  const BASIS = document.body.dataset.basis || '.'
  const PRODUKT = `${BASIS}/products/tuckwell-cocoon/`

  // Lieferfenster: 3 bis 4 Tage bis Versand (vom Bett übertragen, offen) plus 7 bis 12 Werktage laut Johns Tabelle,
  // ohne Wochenenden und US-Feiertage. Auf der Seite gelb, bis der Lieferant es bestätigt.
  const FEIERTAGE = ['2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15']
  function plusWerktage (d, n) {
    const x = new Date(d)
    while (n > 0) {
      x.setDate(x.getDate() + 1)
      const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
      if (x.getDay() !== 0 && x.getDay() !== 6 && !FEIERTAGE.includes(iso)) n--
    }
    return x
  }
  const tag = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const heute = new Date()
  const von = plusWerktage(heute, 10); const bis = plusWerktage(heute, 16)
  const spanne = `${tag(von)} to ${tag(bis)}`
  const garantieBis = new Date(von); garantieBis.setDate(garantieBis.getDate() + 30)

  // Weihnachtsfrist nach New-York-Datum (Regel 6, D22, D24): nie ein abgelaufener Termin, Rechnung in ANALYSE.md
  const nyTag = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(heute)
  const leisteEl = $('[data-leiste]')
  if (nyTag >= '2026-12-01') {
    $$('[data-frist-zeile],[data-frist-satz]').forEach(e => e.remove())
    if (leisteEl) leisteEl.textContent = 'Free US shipping · 30-day money-back guarantee'
  } else if (nyTag >= '2026-11-27' && leisteEl) {
    const gelb = leisteEl.querySelector('mark')
    leisteEl.textContent = 'Last days for Christmas: order by '
    if (gelb) leisteEl.append(gelb)
    leisteEl.append(' · Free US shipping')
  }

  // Reiter Kids springt zur Größengrafik: Kinderbilder aus fremdem Material sind raus (ANALYSE.md)
  function zeigeGruppenbild (springen) {
    const kids = zustand.gruppe === 'kids'
    const s = $('.galerie__spur'); const k = $('[data-kinderbild]')
    if (springen && s && k) s.scrollTo({ left: kids ? k.offsetLeft - s.offsetLeft : 0, behavior: 'smooth' })
  }

  // Vorgewählt ist, was man sieht, und alle Kaufknöpfe legen genau das in den Korb. Stück 2 und 3 folgen dem Stück davor, bis jemand sie selbst antippt: Kids plus Menge 2 wird nie heimlich Kids plus Adult.
  const zustand = { groesse: 'a170', groesse2: 'a170', groesse3: 'a170', gruppe: 'adult', stufe: 1, eigen2: false, eigen3: false }
  let korb = []
  try { korb = JSON.parse(sessionStorage.getItem('tw_korb2') || '[]') } catch {}

  function toast (text) {
    const t = $('#toast'); if (!t) return
    t.textContent = text; t.classList.add('zeigen')
    clearTimeout(toast.uhr); toast.uhr = setTimeout(() => t.classList.remove('zeigen'), 2600)
  }

  // ---------- Schubladen (Menü, Warenkorb, Größenblatt)
  function oeffne (id) { $(id)?.classList.add('offen'); document.documentElement.style.overflow = 'hidden' }
  function schliesse (el) { el.classList.remove('offen'); document.documentElement.style.overflow = '' }
  // Größenblatt setzt nur die erste Größe: bei 2 und 3 Stück führt der Weg außerhalb des Kaufblocks zu den Wahlfeldern
  $$('[data-oeffne]').forEach(b => b.addEventListener('click', (e) => {
    e.preventDefault()
    if (b.dataset.oeffne === '#groessenblatt' && zustand.stufe > 1 && !b.closest('.wahl') && $('#wieviele')) zuDenGroessen(); else oeffne(b.dataset.oeffne)
  }))
  $$('.schublade').forEach(s => {
    s.addEventListener('click', (e) => { if (e.target.matches('.schublade__grund, [data-zu], [data-zu] *')) schliesse(s) })
  })
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.schublade.offen').forEach(schliesse) })

  // ---------- Galerie
  const spur = $('.galerie__spur')
  if (spur) {
    const bilder = $$('.galerie__bild', spur)
    const daumen = $$('.daumen button')
    const stoppeClip = () => { const c = $('[data-clip]', spur); if (!c) return; const v = $('video', c); v.pause(); v.hidden = true; $('img', c).hidden = false; $('.clip__start', c).hidden = false; plaketteFuer(Math.round(spur.scrollLeft / spur.clientWidth)) }
    $$('[data-clip]', spur).forEach(c => c.addEventListener('click', () => {
      const v = $('video', c)
      if (!v.hidden) { stoppeClip(); return }
      v.hidden = false; $('img', c).hidden = true; $('.clip__start', c).hidden = true; v.currentTime = 0; v.play()
      plaketteFuer(bilder.indexOf(c))
      v.onended = stoppeClip
    }))
    // Plakette nur auf Fotos: auf den Grafikfolien läge sie über der Überschrift, im laufenden Clip über dem Kopf
    const plakette = $('.galerie__plakette')
    const plaketteFuer = (i) => plakette?.classList.toggle('aus', !!bilder[i]?.hasAttribute('data-grafik') || (!!bilder[i]?.hasAttribute('data-clip') && !$('video', bilder[i]).hidden))
    const markiere = (i) => {
      plaketteFuer(i)
      if (!bilder[i]?.hasAttribute('data-clip')) stoppeClip()
      $$('[data-bildnr]').forEach(e => { e.textContent = i + 1 })
      daumen.forEach((d, k) => d.classList.toggle('an', k === i))
      daumen[i]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
    let uhr
    spur.addEventListener('scroll', () => {
      plaketteFuer(Math.round(spur.scrollLeft / spur.clientWidth))
      clearTimeout(uhr)
      uhr = setTimeout(() => markiere(Math.round(spur.scrollLeft / spur.clientWidth)), 60)
    }, { passive: true })
    daumen.forEach((d, i) => d.addEventListener('click', () => { spur.scrollTo({ left: i * spur.clientWidth, behavior: 'smooth' }); markiere(i) }))
    daumen[0]?.classList.add('an')
    const voll = $('#vollbild')
    if (voll) {
      const vspur = $('.vollbild__spur', voll)
      vspur.innerHTML = bilder.map(b => `<div><img src="${$('img', b).getAttribute('src')}" alt="${$('img', b).alt}" loading="lazy"></div>`).join('')
      const vzahl = $('.vollbild__zahl', voll)
      vspur.addEventListener('scroll', () => { vzahl.textContent = `${Math.round(vspur.scrollLeft / vspur.clientWidth) + 1} / ${bilder.length}` }, { passive: true })
      bilder.forEach((b, i) => b.addEventListener('click', () => {
        if (b.hasAttribute('data-clip')) return
        voll.hidden = false; document.documentElement.style.overflow = 'hidden'
        vspur.scrollLeft = i * vspur.clientWidth; vzahl.textContent = `${i + 1} / ${bilder.length}`
      }))
      $('.vollbild__zu', voll).addEventListener('click', () => { voll.hidden = true; document.documentElement.style.overflow = '' })
    }
  }

  // ---------- Clip außerhalb der Galerie (Block "See how it goes on"): eigener Startknopf, kein Standardspieler (Regel 28)
  $$('[data-clip-frei]').forEach(c => {
    const v = $('video', c); const bild = $('img', c); const start = $('.clip__start', c)
    const stopp = () => { v.pause(); v.hidden = true; bild.hidden = false; start.hidden = false }
    c.addEventListener('click', () => {
      if (!v.hidden) { stopp(); return }
      v.hidden = false; bild.hidden = true; start.hidden = true; v.currentTime = 0; v.play(); v.onended = stopp
    })
  })

  // ---------- Auswahl und Preise
  const stufenPreis = (stufe) => ({ voll: stufe * PREIS, jetzt: STUFEN[stufe] })
  // Korb rechnet immer die Staffel über alle Stücke (Regel 24): 2 = 180, 3 = 255, ab 4 volle Dreier plus Rest, also nie mehr als die Seite verspricht
  const staffel = (n) => Math.floor(n / 3) * STUFEN[3] + (n % 3 ? STUFEN[n % 3] : 0)
  const wahlStuecke = () => [zustand.groesse, zustand.groesse2, zustand.groesse3].slice(0, zustand.stufe)
  // Kurzform für Balken und Schlusszeile: gleiche Größen zusammengefasst, damit die Wahl auf 390 px ganz lesbar bleibt
  function wahlKurz () {
    if (zustand.stufe === 1) return GROESSEN[zustand.groesse].name
    const zahl = {}; wahlStuecke().forEach(k => { zahl[k] = (zahl[k] || 0) + 1 })
    return Object.entries(zahl).map(([k, n]) => (n > 1 ? `${n} x ` : '') + GROESSEN[k].kurz).join(' + ')
  }
  function zuDenGroessen () { $('#wieviele')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
  function zeichne () {
    if (!zustand.eigen2) zustand.groesse2 = zustand.groesse
    if (!zustand.eigen3) zustand.groesse3 = zustand.groesse2
    const g = GROESSEN[zustand.groesse]
    $$('[data-gruppe]').forEach(b => b.classList.toggle('an', b.dataset.gruppe === zustand.gruppe))
    $$('[data-fuer]').forEach(e => { e.hidden = e.dataset.fuer !== zustand.gruppe })
    $$('[data-groesse]').forEach(b => b.classList.toggle('an', b.dataset.groesse === zustand.groesse))
    $$('[data-stufe]').forEach(b => b.classList.toggle('an', +b.dataset.stufe === zustand.stufe))
    $$('[data-zweite]').forEach(e => { e.hidden = zustand.stufe < 2 })
    $$('[data-dritte]').forEach(e => { e.hidden = zustand.stufe < 3 })
    $$('[data-groesse3]').forEach(b => b.classList.toggle('an', b.dataset.groesse3 === zustand.groesse3))
    $$('[data-groesse2]').forEach(b => b.classList.toggle('an', b.dataset.groesse2 === zustand.groesse2))
    $$('[data-erste]').forEach(e => { e.textContent = zustand.stufe > 1 ? 'First Cocoon: who is it for?' : 'Who is it for?' })
    $$('[data-text="groesse"]').forEach(e => { e.textContent = g.name })
    $$('[data-text="mass"]').forEach(e => { e.textContent = g.mass })
    $$('[data-text="groesse2"]').forEach(e => { e.textContent = GROESSEN[zustand.groesse2].name })
    $$('[data-text="groesse3"]').forEach(e => { e.textContent = GROESSEN[zustand.groesse3].name })
    const p = stufenPreis(zustand.stufe)
    $$('[data-text="knopfpreis"]').forEach(e => { e.textContent = geld(p.jetzt) })
    $$('[data-text="rate"]').forEach(e => { e.textContent = geld(p.jetzt / 4) })
    $$('[data-text="haftwahl"]').forEach(e => { e.textContent = wahlKurz() })
    $$('.haftend').forEach(h => h.classList.toggle('haftend--mehr', zustand.stufe > 1))
    $$('button .haftend__liefer').forEach(e => { e.textContent = zustand.stufe > 1 ? 'Change sizes ›' : 'Change size ›' })
  }
  $$('[data-gruppe]').forEach(b => b.addEventListener('click', () => {
    zustand.gruppe = b.dataset.gruppe
    if (GROESSEN[zustand.groesse].gruppe !== zustand.gruppe) zustand.groesse = zustand.gruppe === 'kids' ? 'k150' : 'a170'
    zeigeGruppenbild(true)
    zeichne()
  }))
  $$('[data-groesse]').forEach(b => b.addEventListener('click', () => {
    zustand.groesse = b.dataset.groesse; zustand.gruppe = GROESSEN[zustand.groesse].gruppe; zeichne()
  }))
  $$('[data-stufe]').forEach(b => b.addEventListener('click', () => { zustand.stufe = +b.dataset.stufe; zeichne() }))
  // Angebotsknöpfe auf derselben Seite: Menge setzen und hinspringen, ohne Neuladen, gewählte Größen bleiben
  $$('[data-menge]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); zustand.stufe = +a.dataset.menge; zeichne(); zuDenGroessen() }))
  $$('[data-groesse2]').forEach(b => b.addEventListener('click', () => { zustand.groesse2 = b.dataset.groesse2; zustand.eigen2 = true; zeichne() }))
  $$('[data-groesse3]').forEach(b => b.addEventListener('click', () => { zustand.groesse3 = b.dataset.groesse3; zustand.eigen3 = true; zeichne() }))

  // ---------- Vergleich: Umschalter normale Decke, Gewichtsdecke
  $$('[data-gegen]').forEach(b => b.addEventListener('click', () => {
    const k = b.closest('.vergleich-wahl').parentElement
    $$('[data-gegen]', k).forEach(x => x.classList.toggle('an', x === b))
    $$('[data-tafel]', k).forEach(t => { t.hidden = t.dataset.tafel !== b.dataset.gegen })
  }))

  // ---------- Warenkorb
  function speichere () { try { sessionStorage.setItem('tw_korb2', JSON.stringify(korb)) } catch {} }
  function zeichneKorb () {
    const liste = $('#korb-liste'); if (!liste) return
    const zahl = korb.reduce((s, p) => s + p.menge, 0)
    const summe = staffel(zahl); const spar = zahl * PREIS - summe
    $$('.korb-zahl').forEach(z => { z.textContent = zahl; z.dataset.leer = zahl ? '0' : '1' })
    if (!korb.length) {
      liste.innerHTML = `<div class="korb__leer"><p>Your cart is empty.</p><a class="knopf" href="${PRODUKT}">Shop the Cocoon</a></div>`
      $('#korb-summe').textContent = geld(0); $('#korb-rate').textContent = geld(0); $('#korb-spar').hidden = true; return
    }
    liste.innerHTML = `<div class="korb__gut"><b>Good choice.</b> 30 days to try it, and it stays with you either way.</div>` +
      korb.map((p, i) => `<div class="korb__posten">
        <img src="${BASIS}/img/tw_01_oben.webp" alt="">
        <div><div class="korb__name">Tuckwell Cocoon</div>
        <div class="korb__var">${GROESSEN[p.groesse].name} · Gray</div>
        <div class="menge"><button data-minus="${i}" aria-label="Less">−</button><span>${p.menge}</span><button data-plus="${i}" aria-label="More">+</button></div></div>
        <div class="korb__preis">${geld(PREIS * p.menge)}</div></div>`).join('')
    liste.insertAdjacentHTML('beforeend', `<label class="korb__geschenk"><input type="checkbox" data-geschenk ${zustand.geschenk ? 'checked' : ''}> <span><b>This is a gift.</b> Enter the recipient's address as the shipping address at checkout.</span></label>`)
    $('#korb-spar').hidden = spar < 0.005; $('#korb-spar-wert').textContent = '-' + geld(spar)
    $('#korb-summe').textContent = geld(summe); $('#korb-rate').textContent = geld(summe / 4)
  }
  document.addEventListener('change', (e) => { if (e.target.matches('[data-geschenk]')) zustand.geschenk = e.target.checked })
  document.addEventListener('click', (e) => {
    const plus = e.target.closest('[data-plus]'); const minus = e.target.closest('[data-minus]')
    if (plus) { korb[+plus.dataset.plus].menge++; speichere(); zeichneKorb() }
    if (minus) { const p = korb[+minus.dataset.minus]; p.menge--; if (p.menge < 1) korb.splice(+minus.dataset.minus, 1); speichere(); zeichneKorb() }
  })
  function inDenKorb () {
    // Ein Posten je Größe, Plus und Minus zählen einzelne Stücke; der Preis kommt aus staffel()
    wahlStuecke().forEach(groesse => { const da = korb.find(k => k.groesse === groesse); if (da) da.menge++; else korb.push({ groesse, menge: 1 }) })
    speichere(); zeichneKorb(); oeffne('#korb')
  }
  $$('[data-kaufen]').forEach(b => b.addEventListener('click', inDenKorb))
  $$('[data-kasse]').forEach(b => b.addEventListener('click', () => toast('Preview only: no real checkout here.')))
  $$('[data-kontakt]').forEach(f => f.addEventListener('submit', (e) => { e.preventDefault(); toast('Preview only: the form goes live with the store.') }))

  // ---------- Haftender Kaufbalken: sichtbar, solange kein großer Knopf im Bild ist
  const haupt = $('#hauptknopf'); const haftend = $('.haftend')
  if (haupt && haftend && 'IntersectionObserver' in window) {
    const ziele = [haupt, ...$$('.schluss .knopf')].filter(Boolean); const sicht = new Map()
    const io = new IntersectionObserver((eintraege) => {
      eintraege.forEach(e => sicht.set(e.target, e.isIntersecting))
      haftend.classList.toggle('zeigen', ![...sicht.values()].some(Boolean))
    })
    ziele.forEach(z => io.observe(z))
  }
  // Kopf beim Runterwischen ausblenden, beim Hochwischen zeigen (nur Handy)
  const kopf = $('.kopf'); let zuletzt = scrollY
  addEventListener('scroll', () => {
    const y = scrollY
    if (kopf && innerWidth < 900) kopf.classList.toggle('weg', y > zuletzt && y > 220)
    zuletzt = y
  }, { passive: true })

  // ---------- Bewertungen: erst 6 zeigen, Filter nach Thema zeigt alle des Themas
  const bewListe = $('[data-kurz]'); const mehr = $('[data-mehr]')
  const bewStatus = $('[data-bew-status]')
  let bewFilter = 'alle'; let bewZahl = 6; let bewSterne = 0
  const zeigeBew = () => {
    let n = 0
    $$('.bew', bewListe).forEach(r => {
      const passt = bewSterne ? +r.dataset.sterne === bewSterne : bewFilter === 'alle' || r.dataset.thema.split(' ').includes(bewFilter)
      if (passt) n++
      r.hidden = !passt || n > bewZahl
    })
    if (mehr) { mehr.hidden = n <= bewZahl; mehr.textContent = `Show more reviews (${n - bewZahl} left)` }
    if (bewStatus) { bewStatus.hidden = !bewSterne; bewStatus.textContent = `Showing ${n} ${n === 1 ? 'review' : 'reviews'} with ${bewSterne} ${bewSterne === 1 ? 'star' : 'stars'}` }
  }
  if (bewListe) zeigeBew()
  mehr?.addEventListener('click', () => { bewZahl += 12; zeigeBew() })
  const sternZeilen = () => $$('.balken button').forEach(x => { const an = +x.dataset.sterne === bewSterne; x.classList.toggle('an', an); x.setAttribute('aria-pressed', an) })
  $$('.bew-filter button').forEach(b => b.addEventListener('click', () => {
    $$('.bew-filter button').forEach(x => x.classList.toggle('an', x === b))
    bewFilter = b.dataset.filter; bewZahl = 6; bewSterne = 0; sternZeilen(); zeigeBew()
  }))
  // Sternfilter: Zeile antippen zeigt nur diese Sterne, nochmal antippen oder ein Themenfilter hebt ihn auf
  $$('.balken button').forEach(b => b.addEventListener('click', () => {
    const s = +b.dataset.sterne; bewSterne = bewSterne === s ? 0 : s; bewFilter = 'alle'; bewZahl = 6
    sternZeilen(); $$('.bew-filter button').forEach(x => x.classList.toggle('an', !bewSterne && x.dataset.filter === 'alle')); zeigeBew()
    const y = bewListe.getBoundingClientRect().top
    if (y > innerHeight * .6) window.scrollTo({ top: scrollY + y - 150, behavior: 'smooth' })
  }))

  // Einstieg aus Anzeige oder Startseite: ?for=kids wählt die Kinderseite, &qty=2 das Doppel
  const adresse = new URLSearchParams(location.search)
  if (adresse.get('for') === 'kids') { zustand.gruppe = 'kids'; zustand.groesse = 'k150'; setTimeout(() => zeigeGruppenbild(true), 60) }
  if (['2', '3'].includes(adresse.get('qty'))) zustand.stufe = +adresse.get('qty')

  zeichne(); zeichneKorb()
  $$('[data-text="liefer"]').forEach(e => { e.textContent = spanne })
  // Datum nur zeigen, wenn es nach dem 25.12. liegt: sonst liest der Geschenkkäufer, die Garantie ende vor dem Auspacken. Die Zeile steht ohne Skript versteckt.
  const garantieIso = `${garantieBis.getFullYear()}-${String(garantieBis.getMonth() + 1).padStart(2, '0')}-${String(garantieBis.getDate()).padStart(2, '0')}`
  if (garantieIso > '2026-12-25') {
    $$('[data-text="garantiebis"]').forEach(e => { e.textContent = tag(garantieBis) })
    $$('[data-garantie-zeile]').forEach(e => { e.hidden = false })
  } else $$('[data-garantie-zeile]').forEach(e => e.remove())
})()
