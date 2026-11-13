// Download em lote: gera o PDF de cada OS selecionada e entrega tudo num ZIP, com subpastas por setor.
// O navegador não cria PDF sozinho (só abre a janela de imprimir), então cada documento é montado numa página invisível,
// fotografado (html2canvas) e colocado em páginas A4 (jsPDF). O ZIP é montado aqui mesmo (sem compressão, PDFs já são compactos).

const selOS = new Set();
const A4W = 794, A4H = 1123; // A4 em pixels CSS (96 dpi)

function osSel(id, on) { on ? selOS.add(id) : selOS.delete(id); osLoteUI(); }
function osSelAll(on) {
  document.querySelectorAll('#view input[data-os]').forEach(c => { c.checked = on; on ? selOS.add(c.dataset.os) : selOS.delete(c.dataset.os); });
  osLoteUI();
}
function osLoteUI() {
  const b = document.getElementById('loteBtn'); if (!b) return;
  const n = [...selOS].filter(id => db.os.some(o => o.id === id)).length;
  b.disabled = !n; b.textContent = n ? `Baixar ${n} selecionada${n > 1 ? 's' : ''} (ZIP)` : 'Baixar selecionadas (ZIP)';
  const all = document.getElementById('osAll'), cs = [...document.querySelectorAll('#view input[data-os]')];
  if (all) all.checked = cs.length > 0 && cs.every(c => c.checked);
}

const _scripts = {};
const carregar = src => _scripts[src] || (_scripts[src] = new Promise((ok, err) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => err(new Error('Não carreguei ' + src)); document.head.appendChild(s); }));

// ---------- HTML do documento -> PDF ----------
const esperaImgs = d => Promise.all([...d.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; })));
const cvs = (el, esc) => html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });

async function htmlParaPdf(html) {
  await carregar('vendor/html2canvas.min.js'); await carregar('vendor/jspdf.umd.min.js');
  const fr = document.createElement('iframe');
  fr.style.cssText = `position:fixed;left:-10000px;top:0;width:${A4W}px;height:${A4H}px;border:0;visibility:hidden`;
  // vale o visual de impressão: o CSS de impressão (printcss.js) é aplicado como se fosse tela; imagens locais vão embutidas (file:// bloqueia a leitura)
  html = html.replace(/src="(assets\/[^"]+)"/g, (m, p) => ASSET_DATA[p] ? `src="${ASSET_DATA[p]}"` : m);
  fr.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><base href="${location.href}"><link rel="stylesheet" href="style.css"><style>${PRINT_CSS.replace(/@media\s+print/g, '@media all')}
    html,body{margin:0!important;padding:0!important;background:#fff!important}#laudo{width:${A4W}px}
    #laudo table.shell{height:auto!important;width:${A4W - 106}px;margin:0 auto}</style></head><body><div id="laudo">${html}</div></body></html>`;
  document.body.appendChild(fr);
  try {
    await new Promise(r => { fr.onload = r; });
    const lk = fr.contentDocument.querySelector('link'); if (lk && !lk.sheet) await new Promise(r => { lk.onload = lk.onerror = r; setTimeout(r, 5000); });
    const d = fr.contentDocument; await esperaImgs(d); if (d.fonts && d.fonts.ready) await d.fonts.ready;
    const { jsPDF } = window.jspdf, pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const MM = 210 / A4W; let primeira = true;
    const nova = () => { if (!primeira) pdf.addPage(); primeira = false; };
    const jpg = c => c.toDataURL('image/jpeg', 0.92);
    for (const el of d.querySelectorAll('.cover,.pg,.anxpg,table.shell')) {
      if (!el.matches('table.shell')) { // página inteira (capa, certificado, anexos)
        const c = await cvs(el); nova();
        pdf.addImage(jpg(c), 'JPEG', 0, 0, 210, Math.min(297, c.height / c.width * 210));
        continue;
      }
      // texto corrido: cabeçalho e rodapé repetidos em todas as páginas, miolo fatiado em linhas inteiras
      const cab = el.querySelector('thead td'), rod = el.querySelector('tfoot td'), mio = el.querySelector('tbody td');
      const [cc, cr, cm] = [await cvs(cab), await cvs(rod), await cvs(mio)];
      const MT = 30, MB = 30, GAP = 8, hC = cab.offsetHeight, hR = rod.offsetHeight, disp = A4H - MT - MB - hC - hR - 2 * GAP;
      const topo = mio.getBoundingClientRect().top, H = mio.offsetHeight;
      const rel = e => e.getBoundingClientRect().bottom - topo;
      const cortes = [...mio.querySelectorAll('tr,.box,.kv,p,h2,h3,h4,.sec,.fig,.nc,.chips')].filter(e => !e.parentElement.closest('.box,.kv,.nc,.fig')).map(rel).filter(y => y > 0).sort((a, b) => a - b);
      const forcados = [...mio.querySelectorAll('.pb')].map(e => e.getBoundingClientRect().top - topo).filter(y => y > 4 && y < H - 4).sort((a, b) => a - b);
      const limites = [0, ...forcados, H], fatias = [];
      for (let k = 0; k < limites.length - 1; k++) {
        let s = limites[k]; const fim = limites[k + 1];
        while (fim - s > disp) { const c = [...cortes].reverse().find(y => y > s + disp * 0.4 && y <= s + disp); const e = c || s + disp; fatias.push([s, e]); s = e; }
        if (fim - s > 4) fatias.push([s, fim]);
      }
      const esc = cm.width / mio.offsetWidth;
      for (const [s, e] of fatias) {
        nova();
        const t = document.createElement('canvas'); t.width = cm.width; t.height = Math.max(1, Math.round((e - s) * esc));
        const x = t.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, t.width, t.height); x.drawImage(cm, 0, Math.round(s * esc), cm.width, t.height, 0, 0, t.width, t.height);
        const lm = (A4W - cab.offsetWidth) / 2 * MM;
        pdf.addImage(jpg(cc), 'JPEG', lm, MT * MM, cab.offsetWidth * MM, hC * MM);
        pdf.addImage(jpg(t), 'JPEG', lm, (MT + hC + GAP) * MM, mio.offsetWidth * MM, (e - s) * MM);
        pdf.addImage(jpg(cr), 'JPEG', lm, (A4H - MB - hR) * MM, rod.offsetWidth * MM, hR * MM);
      }
    }
    if (primeira) throw new Error('documento vazio');
    return pdf.output('arraybuffer');
  } finally { fr.remove(); }
}

// ---------- ZIP (sem compressão) ----------
const _crcT = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = _crcT[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
function montarZip(arqs) { // arqs: [{nome, dados: Uint8Array}]
  const enc = new TextEncoder(), agora = new Date();
  const dt = ((agora.getHours() << 11) | (agora.getMinutes() << 5) | (agora.getSeconds() >> 1)) & 0xFFFF;
  const dd = (((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate()) & 0xFFFF;
  const partes = [], central = []; let pos = 0;
  for (const a of arqs) {
    const nome = enc.encode(a.nome), crc = crc32(a.dados), n = a.dados.length;
    const lh = new DataView(new ArrayBuffer(30));
    [[0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2], [10, dt, 2], [12, dd, 2], [14, crc, 4], [18, n, 4], [22, n, 4], [26, nome.length, 2], [28, 0, 2]]
      .forEach(([o, v, s]) => s === 4 ? lh.setUint32(o, v, true) : lh.setUint16(o, v, true));
    partes.push(new Uint8Array(lh.buffer), nome, a.dados);
    const ch = new DataView(new ArrayBuffer(46));
    [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2], [12, dt, 2], [14, dd, 2], [16, crc, 4], [20, n, 4], [24, n, 4], [28, nome.length, 2], [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, pos, 4]]
      .forEach(([o, v, s]) => s === 4 ? ch.setUint32(o, v, true) : ch.setUint16(o, v, true));
    central.push(new Uint8Array(ch.buffer), nome);
    pos += 30 + nome.length + n;
  }
  const tamC = central.reduce((s, x) => s + x.length, 0), fim = new DataView(new ArrayBuffer(22));
  [[0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, arqs.length, 2], [10, arqs.length, 2], [12, tamC, 4], [16, pos, 4], [20, 0, 2]].forEach(([o, v, s]) => s === 4 ? fim.setUint32(o, v, true) : fim.setUint16(o, v, true));
  return new Blob([...partes, ...central, new Uint8Array(fim.buffer)], { type: 'application/zip' });
}

// ---------- fluxo do botão ----------
const nomeArq = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '').slice(0, 90);
function lotePainel(txt) {
  let p = document.getElementById('lotePainel');
  if (!txt) { if (p) p.remove(); return; }
  if (!p) { p = document.createElement('div'); p.id = 'lotePainel'; p.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999'; document.body.appendChild(p); }
  p.innerHTML = `<div style="background:var(--card,#fff);color:var(--ink,#000);padding:22px 26px;border-radius:14px;max-width:90vw;text-align:center"><b>Gerando os PDFs...</b><p style="margin:8px 0 0">${esc(txt)}</p><p class="note" style="margin:8px 0 0">Não feche esta página.</p></div>`;
}
async function baixarLote() {
  const os = [...selOS].map(id => db.os.find(o => o.id === id)).filter(Boolean);
  if (!os.length) return;
  const clientes = new Set(os.map(o => (equipById(o.equipId) || {}).clienteId || ''));
  const arqs = [], usados = new Set(), falhas = [];
  try {
    for (let i = 0; i < os.length; i++) {
      const o = os[i], e = equipById(o.equipId) || {};
      lotePainel(`${i + 1} de ${os.length}: ${o.numero}`);
      try {
        let pdf;
        await new Promise((ok, no) => {
          window.__loteCap = async () => { try { pdf = await htmlParaPdf(document.getElementById('laudo').innerHTML); ok(); } catch (x) { no(x); } };
          try { printLaudo(o.id); } catch (x) { no(x); }
        });
        const pasta = [clientes.size > 1 ? nomeArq(clienteNome(e)) || 'Sem cliente' : '', nomeArq(e.setor) || 'Sem setor'].filter(Boolean).join('/');
        const base = nomeArq([e.tag, e.nome, o.tipo].filter(Boolean).join(' - ')) || nomeArq(o.numero);
        let nome = `${pasta}/${base}.pdf`, n = 2;
        while (usados.has(nome.toLowerCase())) nome = `${pasta}/${base} (${n++}).pdf`;
        usados.add(nome.toLowerCase()); arqs.push({ nome, dados: new Uint8Array(pdf) });
      } catch (x) { console.error(o.numero, x); falhas.push(o.numero); }
    }
  } finally { window.__loteCap = null; lotePainel(''); }
  if (!arqs.length) { alert('Não consegui gerar nenhum PDF.'); return; }
  const blob = montarZip(arqs), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `Documentos das OS - ${today()}.zip`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  if (falhas.length) alert(`Gerei ${arqs.length} PDF(s). Não consegui gerar: ${falhas.join(', ')}.`);
}
