// Erstellt nach einer Zusage eine Bestätigung als PDF im Stil der Website.
// jsPDF und die Schriften werden erst beim Klick geladen, damit die Seite schlank bleibt.
(function () {
  const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

  // Farben der Website
  const C = {
    paper: [242, 226, 210],
    light: [248, 238, 226],
    ink: [92, 78, 59],
    soft: [122, 106, 84],
    olive: [79, 80, 54],
    leaf: [138, 128, 88],
    line: [194, 174, 144]
  };

  const SHUTTLE = {
    hin: 'Hinfahrt: 12:00 Uhr ab Regensburg Hauptbahnhof, am Wendehammer',
    rueck: 'Rückfahrt: 0:15 Uhr nachts ab Schloss Egg',
    preis: '15 € pro Person, bitte bar bei unseren Trauzeugen bezahlen',
    selbst: 'Parkplätze gibt es direkt am Schloss.'
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (window.jspdf) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('jsPDF konnte nicht geladen werden'));
      document.head.appendChild(s);
    });
  }

  async function fetchBase64(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(url + ': ' + res.status);
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  async function makeConfirmationPdf(info) {
    const [, eb, ebi, pinyon, branch] = await Promise.all([
      loadScript(JSPDF_URL),
      fetchBase64('fonts/EBGaramond-Regular-Subset.ttf'),
      fetchBase64('fonts/EBGaramond-Italic-Subset.ttf'),
      fetchBase64('fonts/PinyonScript-Subset.ttf'),
      fetchBase64('bilder/zweig-pdf.png')
    ]);

    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });
    doc.addFileToVFS('EB.ttf', eb);
    doc.addFont('EB.ttf', 'EB', 'normal');
    doc.addFileToVFS('EBI.ttf', ebi);
    doc.addFont('EBI.ttf', 'EB', 'italic');
    doc.addFileToVFS('Pinyon.ttf', pinyon);
    doc.addFont('Pinyon.ttf', 'Pinyon', 'normal');

    const W = 210;
    const CX = W / 2;
    const BOTTOM = 258;

    // ---------- Zeichenhilfen ----------

    function page() {
      doc.setFillColor(...C.paper);
      doc.rect(0, 0, W, 297, 'F');
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.3);
      doc.rect(8, 8, W - 16, 297 - 16);
      doc.rect(10.2, 10.2, W - 20.4, 297 - 20.4);
      doc.addImage('data:image/png;base64,' + branch, 'PNG', 10.4, 10.4, 58, 58 * 212 / 444, 'zweig', 'SLOW');
    }

    // Gesperrte Großbuchstaben wie „WIR HEIRATEN“, sauber zentriert
    function caps(text, cx, y, size, color, spacing) {
      const t = text.toUpperCase();
      doc.setFont('EB', 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...color);
      const w = doc.getTextWidth(t) + spacing * (t.length - 1);
      doc.text(t, cx - w / 2, y, { charSpace: spacing });
    }

    function centered(text, cx, y, font, style, size, color) {
      doc.setFont(font, style);
      doc.setFontSize(size);
      doc.setTextColor(...color);
      doc.text(text, cx, y, { align: 'center' });
    }

    // Trennlinie mit zwei kleinen Blättern in der Mitte
    function ornament(y) {
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.25);
      doc.line(CX - 26, y, CX - 7, y);
      doc.line(CX + 7, y, CX + 26, y);
      doc.setFillColor(...C.leaf);
      doc.ellipse(CX - 3.3, y, 3, 0.85, 'F');
      doc.ellipse(CX + 3.3, y, 3, 0.85, 'F');
      doc.circle(CX, y, 0.55, 'F');
    }

    // Ein Gast: Name, Zu- oder Absage, gewählte Gerichte. Gibt die Höhe zurück.
    function person(p, cx, y, width, draw) {
      let h = 0;
      if (draw) centered(p.name, cx, y + 9, 'Pinyon', 'normal', 24, C.ink);
      h += 13;
      if (draw) caps(p.yes ? 'Zusage' : 'Absage', cx, y + h + 2.5, 8.5, C.olive, 1.1);
      h += 7.5;
      if (!p.yes) {
        if (draw) centered('Leider nicht dabei', cx, y + h + 4, 'EB', 'italic', 11.5, C.soft);
        return h + 6;
      }
      const rows = [['Vorspeise', p.starter], ['Hauptgang', p.main]];
      if (p.allergy) rows.push(['Allergien', p.allergy]);
      for (const [label, value] of rows) {
        if (draw) caps(label, cx, y + h + 4, 7.5, C.soft, 1);
        h += 5.5;
        doc.setFont('EB', 'italic');
        doc.setFontSize(12.5);
        const lines = doc.splitTextToSize(value, width);
        if (draw) {
          doc.setTextColor(...C.ink);
          lines.forEach((l, i) => doc.text(l, cx, y + h + 4 + i * 5.3, { align: 'center' }));
        }
        h += lines.length * 5.3 + 2.5;
      }
      return h;
    }

    // ---------- Kopf ----------

    page();
    caps('Wir heiraten', CX, 46, 12, C.ink, 1.6);
    ornament(51.5);
    centered('Elli & Leo', CX, 71, 'Pinyon', 'normal', 46, C.ink);
    caps('14. August 2027 auf Schloss Egg', CX, 83, 10.5, C.ink, 1.1);

    const many = info.people.length > 1;
    caps(many ? 'Eure Rückmeldung' : 'Deine Rückmeldung', CX, 99, 15, C.ink, 1.8);
    ornament(104.5);

    // ---------- Gäste, bei mehreren Personen in zwei Spalten ----------

    const cols = many ? 2 : 1;
    const colW = many ? 78 : 120;
    const centers = many ? [62, 148] : [CX];
    let y = 112;
    for (let i = 0; i < info.people.length; i += cols) {
      const row = info.people.slice(i, i + cols);
      // Bleibt in der letzten Reihe eine Person übrig, steht sie in der Mitte
      const xs = row.length < cols ? [CX] : centers;
      const rowH = Math.max(...row.map((p, k) => person(p, xs[k], 0, colW, false)));
      if (y + rowH > BOTTOM) {
        doc.addPage();
        page();
        y = 34;
      }
      row.forEach((p, k) => person(p, xs[k], y, colW, true));
      y += rowH + 7;
    }

    // ---------- Shuttle ----------

    if (info.shuttle) {
      const choice = info.shuttle;
      const own = choice === 'Nein';
      const label = own ? (info.comingCount > 1 ? 'Wir reisen selbst an' : 'Ich reise selbst an') : choice;
      const details = own ? [SHUTTLE.selbst] : [
        ...(choice !== 'Nur Rückfahrt' ? [SHUTTLE.hin] : []),
        ...(choice !== 'Nur Hinfahrt' ? [SHUTTLE.rueck] : []),
        SHUTTLE.preis
      ];
      const boxH = 22 + details.length * 5.2;
      if (y + boxH > BOTTOM) {
        doc.addPage();
        page();
        y = 34;
      }
      y += 2;
      doc.setFillColor(...C.light);
      doc.setDrawColor(...C.line);
      doc.setLineWidth(0.3);
      doc.rect(30, y, W - 60, boxH, 'FD');
      doc.rect(31.8, y + 1.8, W - 63.6, boxH - 3.6);
      caps('Shuttle-Bus', CX, y + 8.5, 9, C.soft, 1.3);
      centered(label, CX, y + 15.5, 'EB', 'italic', 13.5, C.ink);
      details.forEach((d, i) => centered(d, CX, y + 22 + i * 5.2, 'EB', 'normal', 10.5, C.soft));
      y += boxH + 6;
    }

    // ---------- Fuß ----------

    ornament(266);
    centered('Eintreffen der Gäste 13:30 Uhr, Trauung um 14:00 Uhr im Schlossgarten', CX, 272.5, 'EB', 'normal', 10.5, C.ink);
    centered('Schloss Egg, Egg 1, 94505 Bernried', CX, 277.5, 'EB', 'normal', 10.5, C.ink);
    const sent = info.sentAt.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
    centered('Gesendet am ' + sent + ' über leonardthesandner.github.io/hochzeit', CX, 283, 'EB', 'italic', 8.5, C.soft);

    doc.save('Rueckmeldung-Hochzeit-Elli-und-Leo.pdf');
  }

  window.makeConfirmationPdf = makeConfirmationPdf;
})();
