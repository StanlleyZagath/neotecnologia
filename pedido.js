// Pedido mensal do cliente: importa o PDF "Relatório de Conformidade de Planos" e gera as OS do mês.
// Cada pedido (cliente + mês) fica registrado em db.pedidos; as OS geradas guardam o pedidoId.

const MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const capit = s => s.charAt(0).toUpperCase() + s.slice(1);
const FREQ_DIAS = { anual: 365, semestral: 180, quadrimestral: 120, trimestral: 90, bimestral: 60, mensal: 30 };
const tipoOS = t => /preventiv/i.test(t) ? 'Preventiva' : /calibra/i.test(t) ? 'Calibração' : /qualifica|seguran[cç]a\s+el[eé]tric/i.test(t) ? 'Qualificação térmica' : /corretiv/i.test(t) ? 'Corretiva' : '';
const isoBR = s => { const m = (s || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
const mesRot = ym => ym ? `${capit(MESES[+ym.slice(5, 7) - 1])}/${ym.slice(0, 4)}` : '';

// ---------- leitura do PDF ----------
// Layout do relatório: títulos (AT / setor) em fonte maior, descrição do equipamento ("... tag: X ns: Y") e, logo abaixo,
// uma tabela de planos (Plano | Frequência | Última | Vencimento | Tipo | Estado | Conformidade).
async function lerPedidoPdf(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let data = '', unidade = '', setor = '', atual = null, estado = '', colx = null;
  const eqs = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const its = tc.items.filter(i => i.str.trim()).map(i => ({ x: i.transform[4], y: i.transform[5], h: i.height, s: i.str.trim() })).sort((a, b) => b.y - a.y);
    const ls = [];
    for (const it of its) { const l = ls[ls.length - 1]; if (l && Math.abs(l.y - it.y) <= 2) l.it.push(it); else ls.push({ y: it.y, it: [it] }); }
    for (const l of ls) {
      l.it.sort((a, b) => a.x - b.x);
      const txt = l.it.map(i => i.s).join(' '), h = l.it[0].h;
      const md = txt.match(/^Data:\s*(\d{2}\/\d{2}\/\d{4})/);
      if (md) { data = isoBR(md[1]); continue; }
      if (/Plano/.test(l.it[0].s) && /Frequ/.test(txt)) { colx = l.it.map(i => i.x); estado = 'cab'; continue; }
      if (h >= 18 || /^Relat[óo]rio de Conformidade/i.test(txt)) continue;
      if (h >= 14) { // título: "AT ..." = unidade; os demais = setor
        if (/^AT\s/i.test(txt)) { unidade = txt; setor = ''; } else setor = txt;
        estado = ''; continue;
      }
      if (h >= 12) { // descrição do equipamento (pode quebrar em várias linhas)
        if (estado !== 'desc') { atual = { desc: '', unidade, setor, planos: [] }; eqs.push(atual); estado = 'desc'; }
        atual.desc += ' ' + txt; continue;
      }
      if (!colx || !atual) continue;
      // linha de plano: distribui os textos nas colunas pelo x do cabeçalho
      const col = Array(colx.length).fill('');
      l.it.forEach(i => { let c = 0; colx.forEach((cx, k) => { if (i.x >= cx - 3) c = k; }); col[c] = (col[c] + ' ' + i.s).trim(); });
      if (isoBR(col[2]) || isoBR(col[3])) { // linha de plano de verdade tem datas; o resto é continuação (ex.: meses na quebra de página)
        atual.planos.push({ plano: col[0], freq: col[1], ultima: isoBR(col[2]), venc: isoBR(col[3]), tipo: col[4], estado: col[5], conf: col[6] });
        estado = 'row';
      } else if (atual.planos.length) { // continuação da linha anterior: meses do plano e/ou tipo quebrado (ex.: "Teste de / Segurança / Elétrica")
        const u = atual.planos[atual.planos.length - 1];
        const mm = col[0].split(/[\s/,;-]+/).filter(w => /^(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)$/i.test(w)); // ignora restos de glifos na quebra de página
        if (mm.length) u.plano += ' ' + mm.join(' ');
        if (/^(teste|de|seguran[cç]a|el[eé]trica|\s)+$/i.test(col[4])) u.tipo = (u.tipo + ' ' + col[4]).trim();
      }
    }
  }
  const itens = [];
  for (const e of eqs) {
    const d = e.desc.replace(/\s+/g, ' ').trim();
    const mt = d.match(/\btag:\s*([^\s]+)/i);
    if (!mt) continue;
    const mn = d.match(/\bns:\s*(.*?)(?=\s+p:|\s+tag:|$)/i);
    let nome = d.replace(/\s*\btag:.*$/i, '').trim();
    const dup = nome.match(/^(.+?)\s+\1$/); if (dup) nome = dup[1];
    const eq = { tag: mt[1].trim(), nome, serie: mn ? mn[1].trim() : '', unidade: e.unidade, setor: e.setor };
    for (const pl of e.planos) {
      const meses = [...new Set([...pl.plano.toUpperCase().matchAll(/\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\b/g)].map(m => MES3.indexOf(m[1])))];
      if (itens.some(x => x.eq.tag === eq.tag && x.pl.tipo === pl.tipo && x.pl.plano === pl.plano && x.pl.venc === pl.venc)) continue; // linhas repetidas
      itens.push({ eq, pl: { ...pl, meses } });
    }
  }
  return { data, itens };
}

// ---------- tela de importação ----------
let pedTmp = null;
function importarPedido(cid) {
  pedTmp = null;
  const hoje = new Date();
  openForm('Importar pedido do cliente (PDF)', `
    ${sel('ped_cli', 'Cliente do pedido', [['', '- selecione -'], ...db.clientes.map(c => [c.id, c.nome])], cid || '', 'required')}
    <label>PDF do pedido (Relatório de Conformidade de Planos)<input type="file" id="pedArq" accept="application/pdf" onchange="pedLer(this)"></label>
    <div class="two">${sel('ped_mes', 'Mês do pedido', MESES.map((m, i) => [String(i + 1).padStart(2, '0'), capit(m)]), String(hoje.getMonth() + 1).padStart(2, '0'), 'onchange="pedRender()"')}${fld('ped_ano', 'Ano', hoje.getFullYear(), 'number', 'min=2000 max=2100 onchange="pedRender()"')}</div>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="pedSoMes" checked style="width:auto" onchange="pedRender()"> Mostrar só os planos que vencem no mês escolhido</label>
    <p class="note" id="pedSt">Escolha o cliente e o PDF. O mês é sugerido pela data do relatório; confira antes de salvar.</p>
    <div id="pedPrev"></div>`, d => pedSalvar(d));
  const dlg = $('#dlg'); dlg.style.width = 'min(1040px, 96vw)'; // tabela larga: abre maior só nesta tela
  dlg.addEventListener('close', () => { dlg.style.width = ''; }, { once: true });
}
async function pedLer(inp) {
  const f = inp.files[0], st = $('#pedSt'); if (!f) return;
  st.textContent = 'Lendo o PDF...';
  try {
    pedTmp = await lerPedidoPdf(f); pedTmp.arq = f.name;
    if (!pedTmp.itens.length) { st.textContent = 'Não encontrei equipamentos neste PDF. Confira se é o "Relatório de Conformidade de Planos".'; $('#pedPrev').innerHTML = ''; return; }
    if (pedTmp.data) { form.elements.ped_mes.value = pedTmp.data.slice(5, 7); form.elements.ped_ano.value = pedTmp.data.slice(0, 4); }
    pedRender();
  } catch (e) { console.error(e); st.textContent = 'Não consegui ler este PDF.'; }
}
const pedNoMes = (it, m) => !it.pl.meses.length || it.pl.meses.includes(m);
function pedRender() {
  if (!pedTmp) return;
  const m = +form.elements.ped_mes.value - 1, so = $('#pedSoMes').checked;
  const linhas = pedTmp.itens.map((it, i) => ({ it, i, no: pedNoMes(it, m) })).filter(x => !so || x.no);
  const tot = new Set(pedTmp.itens.map(x => x.eq.tag)).size;
  $('#pedSt').innerHTML = `<b>${pedTmp.arq}</b>: ${tot} equipamentos e ${pedTmp.itens.length} planos no PDF. Mostrando ${linhas.length}${so ? ' do mês ' + capit(MESES[m]) : ''}. Desmarque o que não for fazer.
    <button type="button" class="sm ghost" onclick="pedMarcar(true)">Marcar todos</button> <button type="button" class="sm ghost" onclick="pedMarcar(false)">Desmarcar</button>`;
  $('#pedPrev').innerHTML = `<div class="wrap" style="max-height:46vh;overflow:auto"><table><tr><th></th><th>Tag</th><th>Equipamento</th><th>Local</th><th>Tipo</th><th>Vence</th><th>Situação</th></tr>
  ${linhas.map(({ it, i, no }) => { const ex = eqPorTag(it.eq.tag, form.elements.ped_cli.value), t = tipoOS(it.pl.tipo);
    return `<tr><td><input type="checkbox" name="pi_${i}" ${no && t ? 'checked' : ''} ${t ? '' : 'disabled'} style="width:auto"></td><td>${esc(it.eq.tag)}</td>
     <td>${esc(it.eq.nome)}<br><span class="l">${it.eq.serie ? 'Série ' + esc(it.eq.serie) : ''}${ex ? '' : ' · <b>equipamento novo</b>'}</span></td>
     <td>${esc(it.eq.unidade)}<br><span class="l">${esc(it.eq.setor)}</span></td><td>${esc(t || it.pl.tipo + ' (não reconhecido)')}</td><td>${fmtD(it.pl.venc)}</td>
     <td><span class="tag ${/atras|n[ãa]o/i.test(it.pl.estado + it.pl.conf) ? 'bad' : 'ok'}">${esc(it.pl.estado)}</span></td></tr>`; }).join('')}</table></div>`;
}
function pedMarcar(v) { document.querySelectorAll('#pedPrev input[type=checkbox]:not(:disabled)').forEach(c => { c.checked = v; }); }

// ---------- gerar as OS ----------
function pedSalvar(d) {
  if (!pedTmp) { alert('Escolha o PDF do pedido.'); return false; }
  const cid = d.ped_cli, ym = `${d.ped_ano}-${d.ped_mes}`;
  const sel_ = Object.keys(d).filter(k => /^pi_\d+$/.test(k)).map(k => pedTmp.itens[+k.slice(3)]);
  if (!sel_.length) { alert('Marque pelo menos um plano para gerar as OS.'); return false; }
  let ped = (db.pedidos = db.pedidos || []).find(p => p.clienteId === cid && p.mes === ym);
  if (!ped) { ped = { id: uid(), clienteId: cid, mes: ym, arquivo: pedTmp.arq, criado: today() }; db.pedidos.push(ped); } else ped.arquivo = pedTmp.arq;
  const cli = db.clientes.find(c => c.id === cid) || {};
  let novasOS = 0, novosEq = 0, ja = 0;
  for (const it of sel_) {
    const t = tipoOS(it.pl.tipo); if (!t) continue;
    let eq = eqPorTag(it.eq.tag, cid);
    if (!eq) {
      eq = { id: uid(), tag: it.eq.tag, nome: it.eq.nome, serie: it.eq.serie, setor: it.eq.setor, unidade: it.eq.unidade, clienteId: cid, crit: 'Média', status: 'Operacional' }; db.equip.push(eq); novosEq++;
    } else {
      if (!eq.clienteId) eq.clienteId = cid;
      if (!eq.serie && it.eq.serie) eq.serie = it.eq.serie;
      if (!eq.unidade && it.eq.unidade) eq.unidade = it.eq.unidade;
      if (!eq.setor && it.eq.setor) eq.setor = it.eq.setor;
    }
    // plano do cliente -> periodicidade e última execução do equipamento (só preenche o que faltar ou estiver mais antigo)
    const K = { Preventiva: 'Prev', Calibração: 'Cal', 'Qualificação térmica': 'Qual' }[t];
    if (K) {
      const dias = FREQ_DIAS[(it.pl.freq || '').toLowerCase()];
      if (dias && !eq['per' + K]) eq['per' + K] = dias;
      if (it.pl.ultima && (!eq['ult' + K] || it.pl.ultima > eq['ult' + K])) eq['ult' + K] = it.pl.ultima;
    }
    // já gerada? (mesmo pedido, equipamento, tipo e plano/vencimento); duas corretivas diferentes do mesmo equipamento não se confundem
    if (db.os.some(o => o.pedidoId === ped.id && o.equipId === eq.id && o.tipo === t && (o.vencimento || '') === (it.pl.venc || '') && (o.planoRef || '') === (it.pl.plano || ''))) { ja++; continue; }
    db.seq++;
    db.os.push({ id: uid(), numero: 'OS-' + String(db.seq).padStart(4, '0'), equipId: eq.id, tipo: t, prioridade: 'Normal', status: 'Aberta', abertura: nowLocal(), fechamento: '', tecnico: '', custo: '', solucao: '',
      descricao: `Pedido ${mesRot(ym)}${cli.nome ? ' - ' + cli.nome : ''}: ${t}${it.pl.venc ? ' (vence em ' + fmtD(it.pl.venc) + ')' : ''}${it.eq.unidade ? ' - ' + it.eq.unidade : ''}${it.eq.setor ? ' / ' + it.eq.setor : ''}`,
      chk: null, qual: null, leituras: [], padraoIds: [], cals: [], padraoId: '', fecha: null, encerr: null, pedidoId: ped.id, vencimento: it.pl.venc, planoRef: it.pl.plano });
    if (t === 'Corretiva') eq.status = 'Em manutenção';
    novasOS++;
  }
  save();
  alert(`Pedido ${mesRot(ym)}: ${novasOS} OS geradas${novosEq ? ', ' + novosEq + ' equipamento(s) novo(s) cadastrado(s)' : ''}${ja ? ', ' + ja + ' já existiam e foram mantidas' : ''}.`);
}

// ---------- pedidos recebidos (aparece no menu Clientes) ----------
const pedRotulo = id => { const p = (db.pedidos || []).find(x => x.id === id); return p ? `${(db.clientes.find(c => c.id === p.clienteId) || {}).nome || 'Cliente'} · ${mesRot(p.mes)}` : ''; };
function pedidosHtml() {
  const ps = (db.pedidos || []).slice().sort((a, b) => b.mes.localeCompare(a.mes));
  if (!ps.length) return '';
  return `<h3 style="margin:26px 0 10px">Pedidos recebidos</h3><div class="wrap"><table><tr><th>Cliente</th><th>Mês</th><th>OS geradas</th><th>Concluídas</th><th>Arquivo</th><th></th></tr>
  ${ps.map(p => { const os = db.os.filter(o => o.pedidoId === p.id), ok = os.filter(o => o.status === 'Concluída').length;
    return `<tr><td>${esc((db.clientes.find(c => c.id === p.clienteId) || {}).nome)}</td><td>${mesRot(p.mes)}</td><td>${os.length}</td><td><span class="tag ${os.length && ok === os.length ? 'ok' : 'warn'}">${ok} de ${os.length}</span></td><td class="l">${esc(p.arquivo)}</td>
     <td><button class="sm ghost" onclick="F.os={pedido:'${p.id}'};tab='os';render()">Ver OS</button> <button class="sm danger" onclick="delPedido('${p.id}')">Excluir</button></td></tr>`; }).join('')}</table></div>`;
}
function delPedido(id) {
  const abertas = db.os.filter(o => o.pedidoId === id && o.status === 'Aberta');
  if (!confirm(`Excluir este pedido? As ${abertas.length} OS ainda "Aberta" dele serão excluídas; as demais ficam no sistema sem o vínculo.`)) return;
  db.os = db.os.filter(o => !(o.pedidoId === id && o.status === 'Aberta'));
  db.os.forEach(o => { if (o.pedidoId === id) delete o.pedidoId; });
  db.pedidos = (db.pedidos || []).filter(p => p.id !== id); save();
}

// ---------- OS de corretiva enviada pelo cliente (PDF "Ordem de Serviço Nº ...") ----------
// Lê: nº e data da OS do cliente, solicitante (setor), contratante, equipamento (tipo, modelo, identificação=tag, série, fabricante),
// tipo de serviço, problema reclamado e observações.
async function lerCorretivaPdf(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const its = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    tc.items.filter(i => i.str.trim()).forEach(i => its.push({ p, x: i.transform[4], y: i.transform[5], h: i.height, s: i.str.trim() }));
  }
  const ls = []; // linhas (página, y), da esquerda para a direita
  its.sort((a, b) => a.p - b.p || b.y - a.y).forEach(it => { const l = ls[ls.length - 1]; if (l && l.p === it.p && Math.abs(l.y - it.y) <= 2) l.it.push(it); else ls.push({ p: it.p, y: it.y, it: [it] }); });
  ls.forEach(l => l.it.sort((a, b) => a.x - b.x));
  const txt = l => l.it.map(i => i.s).join(' ');
  const all = ls.map(txt).join('\n');
  const num = (all.match(/Ordem de Servi[çc]o\s*N[º°o]*\s*(\d+)/i) || [])[1] || '';
  const dm = all.match(/Data de Abertura:\s*(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}:\d{2}))?/i);
  const r = { osCliente: num, abertura: dm ? `${dm[3]}-${dm[2]}-${dm[1]}T${dm[4] || '08:00'}` : '', setor: '', contratante: '', tipo: '', modelo: '', tag: '', serie: '', fabricante: '', servico: '', problema: '', obs: '' };
  let sec = 0, sub = '';
  const tipoL = [];
  for (const l of ls) {
    const t = txt(l), h = l.it[0].h, ms = t.match(/^([1-4])\s*-\s/);
    if (ms && h >= 14) { sec = +ms[1]; sub = ''; continue; }
    if (/^P[áa]gina \d+ de \d+/i.test(t) || /^Assinatura do Cliente/i.test(t)) continue;
    const esq = l.it.filter(i => i.x < 300), dir = l.it.filter(i => i.x >= 300);
    if (sec === 1) {
      const m = t.match(/^Nome:\s*(.*)/i); if (m) r.setor = m[1].trim();
      const c = t.match(/^Contratante:\s*(.*)/i); if (c) r.contratante = c[1].trim();
    } else if (sec === 2) {
      const lab = esq.filter(i => i.x < 150).map(i => i.s).join('').replace(/\s+/g, '');
      const v = esq.filter(i => i.x >= 150).map(i => i.s).join(' ').trim();
      if (/^Tipo:/i.test(lab)) { sub = 'tipo'; tipoL.push(v); }
      else if (/^Modelo:/i.test(lab)) { sub = 'modelo'; r.modelo = v; }
      else if (/^Identifica/i.test(lab)) { sub = 'ident'; r.tag = v; }
      else if (sub === 'tipo' && v) tipoL.push(v);
      else if (sub === 'ident' && v) r.tag += ' ' + v;
      const rl = dir.map(i => i.s).join(' ');
      let m; if ((m = rl.match(/N[úu]mero S[ée]rie:\s*(.*)/i))) r.serie = m[1].trim(); else if ((m = rl.match(/Fabricante:\s*(.*)/i))) r.fabricante = m[1].trim();
    } else if (sec === 3) {
      if (/^Tipo de Servi[çc]o:/i.test(t)) { sub = 'servico'; continue; }
      if (/^Problema Reclamado:/i.test(t)) { sub = 'problema'; continue; }
      if (sub) r[sub] = (r[sub] + ' ' + t).trim();
    } else if (sec === 4) r.obs = (r.obs + ' ' + t.replace(/^[•·-]\s*/, '')).trim();
  }
  r.tipo = tipoL.filter(Boolean).join(' ');
  r.tag = r.tag.replace(/\s+/g, ' ').trim();
  return r;
}

let corTmp = [];
function importarCorretiva(cid) {
  corTmp = [];
  openForm('Importar OS de corretiva do cliente (PDF)', `
    ${sel('cor_cli', 'Cliente', [['', '- selecione -'], ...db.clientes.map(c => [c.id, c.nome])], cid || '', 'required')}
    <label>PDF(s) da OS do cliente (pode escolher vários)<input type="file" id="corArq" accept="application/pdf" multiple onchange="corLer(this)"></label>
    <p class="note" id="corSt">Escolha o cliente e os PDFs. Cada PDF vira uma OS de corretiva.</p>
    <div id="corPrev"></div>`, d => corSalvar(d));
}
async function corLer(inp) {
  const st = $('#corSt'); corTmp = [];
  st.textContent = 'Lendo...';
  for (const f of inp.files) { try { const r = await lerCorretivaPdf(f); r.arq = f.name; corTmp.push(r); } catch (e) { console.error(e); } }
  const ok = corTmp.filter(r => r.osCliente || r.tag);
  corTmp = ok;
  if (!ok.length) { st.textContent = 'Não consegui reconhecer a OS neste(s) PDF(s).'; $('#corPrev').innerHTML = ''; return; }
  // sugere o cliente pelo "Contratante" quando ainda não escolhido
  const sc = form.elements.cor_cli;
  if (!sc.value) { const nome = norm(ok[0].contratante); const c = db.clientes.find(c => nome && (norm(c.nome).includes(nome) || nome.includes(norm(c.nome)))); if (c) sc.value = c.id; }
  st.textContent = `${ok.length} OS reconhecida(s). Confira antes de salvar.`;
  $('#corPrev').innerHTML = `<div class="wrap"><table><tr><th></th><th>OS cliente</th><th>Tag</th><th>Equipamento</th><th>Setor</th><th>Problema</th></tr>
  ${ok.map((r, i) => { const ex = eqPorTag(r.tag, form.elements.cor_cli.value); return `<tr><td><input type="checkbox" name="co_${i}" checked style="width:auto"></td><td>${esc(r.osCliente)}</td><td>${esc(r.tag)}</td>
    <td>${esc(r.tipo)}<br><span class="l">${esc(r.fabricante)} ${esc(r.modelo)}${ex ? '' : ' · <b>equipamento novo</b>'}</span></td><td>${esc(r.setor)}</td><td>${esc(r.problema)}</td></tr>`; }).join('')}</table></div>`;
}
function corSalvar(d) {
  const sel_ = Object.keys(d).filter(k => /^co_\d+$/.test(k)).map(k => corTmp[+k.slice(3)]).filter(Boolean);
  if (!sel_.length) { alert('Escolha o PDF da OS.'); return false; }
  const cid = d.cor_cli; let novas = 0, novosEq = 0, ja = 0;
  for (const r of sel_) {
    if (r.osCliente && db.os.some(o => o.osCliente === r.osCliente && o.clienteOsId === cid)) { ja++; continue; }
    let eq = r.tag && eqPorTag(r.tag, cid);
    if (!eq) { eq = { id: uid(), tag: r.tag, nome: r.tipo, fabricante: r.fabricante, modelo: r.modelo, serie: r.serie, setor: r.setor, unidade: '', clienteId: cid, crit: 'Média', status: 'Operacional' }; db.equip.push(eq); novosEq++; }
    else { if (!eq.clienteId) eq.clienteId = cid; if (!eq.serie && r.serie) eq.serie = r.serie; if (!eq.setor && r.setor) eq.setor = r.setor; if (!eq.fabricante && r.fabricante) eq.fabricante = r.fabricante; if (!eq.modelo && r.modelo) eq.modelo = r.modelo; }
    db.seq++;
    db.os.push({ id: uid(), numero: 'OS-' + String(db.seq).padStart(4, '0'), equipId: eq.id, tipo: 'Corretiva', prioridade: 'Normal', status: 'Aberta', abertura: r.abertura || nowLocal(), fechamento: '', tecnico: '', custo: '', solucao: '',
      descricao: `OS do cliente nº ${r.osCliente}${r.setor ? ' (' + r.setor + ')' : ''} - Problema reclamado: ${r.problema}${r.obs ? '. Obs.: ' + r.obs : ''}`,
      chk: null, qual: null, leituras: [], padraoIds: [], cals: [], padraoId: '', fecha: null, encerr: null, osCliente: r.osCliente, clienteOsId: cid });
    eq.status = 'Em manutenção'; novas++;
  }
  save();
  alert(`${novas} OS de corretiva geradas${novosEq ? ', ' + novosEq + ' equipamento(s) novo(s) cadastrado(s)' : ''}${ja ? ', ' + ja + ' já existiam e foram mantidas' : ''}.`);
}
