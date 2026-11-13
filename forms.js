// Formulários extras: empresa, clientes, checklists e blocos da OS (preventiva, calibração, qualificação térmica)

// ---------- utilidades ----------
let tmpImgs = {};
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* sem espaço: ignora */ } };
const clienteDe = e => db.clientes.find(c => c.id === e.clienteId) || (e.cliente ? { nome: e.cliente } : {});
const clienteNome = e => clienteDe(e).nome || '';
const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const parseNums = txt => txt.split(/[;\s]+/).filter(Boolean).map(s => +s.replace(',', '.'));
const fmtNum = (v, d = 3) => v == null || isNaN(v) ? '-' : (+v).toLocaleString('pt-BR', { maximumFractionDigits: d });
const fmtMY = d => d ? d.slice(5, 7) + '/' + d.slice(0, 4) : '-';

// reduz a imagem antes de guardar (o navegador limita o espaço salvo)
function loadImg(inp, key, max = 900) {
  const f = inp.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
      tmpImgs[key] = c.toDataURL('image/jpeg', 0.82);
      const pv = document.getElementById('pv_' + key); if (pv) { pv.src = tmpImgs[key]; pv.style.display = 'block'; }
    };
    im.src = r.result;
  };
  r.readAsDataURL(f);
}
const imgField = (key, label, cur) => `<label>${label}<input type="file" accept="image/*" onchange="loadImg(this,'${key}')"><img id="pv_${key}" src="${cur || ''}" style="max-height:70px;margin-top:6px;display:${cur ? 'block' : 'none'}"></label>`;
const rmChk = (name, cur) => cur ? `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${name}" style="width:auto"> Remover a assinatura atual</label>` : '';
const box = (id, legend, show, inner) => `<fieldset id="${id}" style="display:${show ? 'block' : 'none'};border:1px solid var(--line);border-radius:8px;margin:10px 0"><legend>${legend}</legend>${inner}</fieldset>`;

// ---------- empresa ----------
function editEmpresa() {
  const e = db.empresa; tmpImgs = {};
  openForm('Dados da empresa (saem nos documentos)', `
    <div class="two">${fld('razao', 'Razão social', e.razao)}${fld('cnpj', 'CNPJ', e.cnpj)}</div>
    <div class="two">${fld('ie', 'Inscrição estadual', e.ie)}${fld('fone', 'Telefones', e.fone)}</div>
    <div class="two">${fld('rua', 'Endereço', e.rua)}${fld('bairro', 'Bairro', e.bairro)}</div>
    <div class="two">${fld('cidade', 'Cidade', e.cidade)}${fld('uf', 'UF', e.uf)}</div>
    <div class="two">${fld('cep', 'CEP', e.cep)}${fld('email', 'E-mail', e.email)}</div>
    <div class="two">${fld('respTec', 'Responsável técnico', e.respTec)}${fld('respTecCargo', 'Cargo do responsável', e.respTecCargo)}</div>
    <div class="two">${fld('engResp', 'Engenheiro responsável', e.engResp)}${fld('engCrea', 'CREA do engenheiro', e.engCrea)}</div>
    <label>Texto do procedimento (calibração)<textarea name="procedimento" rows="3">${esc(e.procedimento)}</textarea></label>
    <label>Observação sobre incerteza (calibração)<textarea name="obsIncerteza" rows="3">${esc(e.obsIncerteza)}</textarea></label>
    <label>Normas citadas (qualificação térmica)<textarea name="normas" rows="2">${esc(e.normas)}</textarea></label>
    ${imgField('assResp', 'Assinatura do responsável técnico (imagem)', e.assResp)}${rmChk('rmAssResp', e.assResp)}
    ${imgField('assEng', 'Assinatura do engenheiro responsável (imagem)', e.assEng)}${rmChk('rmAssEng', e.assEng)}
    <p class="note">Técnicos e seus registros (CFT/CREA) ficam no menu Técnicos.</p>`,
    d => {
      const rmR = d.rmAssResp, rmE = d.rmAssEng; delete d.rmAssResp; delete d.rmAssEng;
      db.empresa = { ...db.empresa, ...d, ...tmpImgs };
      if (rmR) db.empresa.assResp = ''; if (rmE) db.empresa.assEng = '';
      save();
    });
}

// ---------- clientes ----------
function vCli() {
  const q = fv('cli', 'q').toLowerCase();
  const lista = db.clientes.filter(c => !q || [c.nome, c.doc, c.endereco, c.cidade, c.contato].join(' ').toLowerCase().includes(q));
  return `<div class="bar"><h2>Clientes</h2><span><button class="ghost" onclick="importarPedido()">Importar pedido (PDF)</button> <button class="ghost" onclick="importarCorretiva()">Importar OS corretiva (PDF)</button> <button onclick="editCli()">Novo cliente</button></span></div>
  ${fbar('cli', ftxt('cli', 'q', 'Nome, CNPJ, cidade, contato...'), lista.length, db.clientes.length)}
  <div class="wrap"><table><tr><th>Nome</th><th>CNPJ / CPF</th><th>Endereço</th><th>Contato</th><th></th></tr>
  ${lista.map(c => `<tr><td>${esc(c.nome)}</td><td>${esc(c.doc)}</td><td>${esc(c.endereco)}<br><span class="l">${esc(c.cidade)} ${esc(c.uf)} ${esc(c.cep)}</span></td><td>${esc(c.contato)}</td>
   <td><button class="sm ghost" onclick="importarPedido('${c.id}')">Importar pedido</button> <button class="sm ghost" onclick="importarCorretiva('${c.id}')">Importar corretiva</button> <button class="sm ghost" onclick="editCli('${c.id}')">Editar</button> <button class="sm danger" onclick="delCli('${c.id}')">Excluir</button></td></tr>`).join('')}
  </table></div>${lista.length ? '' : '<div class="empty">' + (db.clientes.length ? 'Nenhum cliente com esse filtro.' : 'Nenhum cliente cadastrado.') + '</div>'}${pedidosHtml()}`;
}
function editCli(id) {
  const c = db.clientes.find(x => x.id === id) || {};
  openForm(id ? 'Editar cliente' : 'Novo cliente', `
    ${fld('nome', 'Nome / razão social', c.nome, 'text', 'required')}
    <div class="two">${fld('doc', 'CNPJ / CPF', c.doc)}${fld('contato', 'Telefone / e-mail', c.contato)}</div>
    ${fld('endereco', 'Endereço', c.endereco)}
    <div class="two">${fld('cidade', 'Cidade', c.cidade)}${fld('uf', 'UF', c.uf)}</div>
    ${fld('cep', 'CEP', c.cep)}`,
    d => { if (id) Object.assign(c, d); else db.clientes.push({ id: uid(), ...d }); save(); });
}
function delCli(id) { if (confirm('Excluir este cliente? Os equipamentos dele ficam sem cliente.')) { db.clientes = db.clientes.filter(c => c.id !== id); save(); } }

// ---------- modelos de checklist ----------
function vChk() {
  return `<div class="bar"><h2>Modelos de checklist (preventiva)</h2><button onclick="editChk()">Novo modelo</button></div>
  <div class="wrap"><table><tr><th>Modelo</th><th>Itens</th><th>Instrumentos</th><th></th></tr>
  ${db.checklists.map(c => `<tr><td>${esc(c.nome)}</td><td>${c.itens.length} itens</td><td>${esc(c.instrumentos.join(', '))}</td>
   <td><button class="sm ghost" onclick="editChk('${c.id}')">Editar</button> <button class="sm danger" onclick="delChk('${c.id}')">Excluir</button></td></tr>`).join('')}
  </table></div>${db.checklists.length ? '' : '<div class="empty">Nenhum modelo.</div>'}
  <p class="note">Cada equipamento pode ter um modelo padrão. Na OS preventiva você marca C (conforme) ou NC (não conforme) item a item e imprime o checklist.</p>`;
}
function editChk(id) {
  const c = db.checklists.find(x => x.id === id) || { itens: [], instrumentos: [] };
  openForm(id ? 'Editar modelo' : 'Novo modelo', `
    ${fld('nome', 'Nome (ex.: Balança Pediátrica)', c.nome, 'text', 'required')}
    <label>Itens do checklist (um por linha)<textarea name="itens" rows="8">${esc(c.itens.join('\n'))}</textarea></label>
    <label>Instrumentos utilizados (um por linha)<textarea name="instrumentos" rows="3">${esc(c.instrumentos.join('\n'))}</textarea></label>`,
    d => {
      const lines = t => t.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const v = { nome: d.nome, itens: lines(d.itens), instrumentos: lines(d.instrumentos) };
      if (id) Object.assign(c, v); else db.checklists.push({ id: uid(), ...v });
      save();
    });
}
function delChk(id) { if (confirm('Excluir este modelo?')) { db.checklists = db.checklists.filter(c => c.id !== id); save(); } }

// ---------- encerramento da corretiva ----------
const simNao = (name, label, v) => `<div class="sn"><span>${label}</span><label><input type="radio" name="${name}" value="Sim" ${v === 'Sim' ? 'checked' : ''} style="width:auto"> Sim</label><label><input type="radio" name="${name}" value="Não" ${v === 'Não' ? 'checked' : ''} style="width:auto"> Não</label></div>`;
function corrBlock(o) {
  const c = o.fecha || {};
  const lista = tipo => `<datalist id="dl_${tipo}">${db.os.filter(x => x.tipo === tipo).map(x => `<option value="${esc(x.numero)}">`).join('')}</datalist>`;
  return box('corr', 'Encerramento da corretiva', o.tipo === 'Corretiva', `
    ${simNao('fc_apto', 'Equipamento apto para uso?', c.apto)}
    ${simNao('fc_cal', 'Necessita de calibração?', c.cal)}
    <div id="fc_calBox" style="display:${c.cal === 'Sim' ? 'block' : 'none'}">${fld('fc_calOS', 'Número da OS de calibração', c.calOS, 'text', 'list="dl_Calibração" placeholder="ex.: OS-0012"')}${lista('Calibração')}</div>
    ${simNao('fc_qual', 'Necessita de qualificação térmica?', c.qual)}
    <div id="fc_qualBox" style="display:${c.qual === 'Sim' ? 'block' : 'none'}">${fld('fc_qualOS', 'Número da OS de qualificação térmica', c.qualOS, 'text', 'list="dl_Qualificação térmica" placeholder="ex.: OS-0013"')}${lista('Qualificação térmica')}</div>
    ${simNao('fc_val', 'Necessita ter validação no processo?', c.val)}`);
}
function parseCorr(d, c) {
  const f = { apto: c.fc_apto || '', cal: c.fc_cal || '', calOS: c.fc_cal === 'Sim' ? (c.fc_calOS || '').trim() : '', qual: c.fc_qual || '', qualOS: c.fc_qual === 'Sim' ? (c.fc_qualOS || '').trim() : '', val: c.fc_val || '' };
  if (d.status === 'Concluída') {
    const falta = [['apto', 'Equipamento apto para uso'], ['cal', 'Necessita de calibração'], ['qual', 'Necessita de qualificação térmica'], ['val', 'Necessita ter validação no processo']].find(([k]) => !f[k]);
    if (falta) { alert('Para concluir a corretiva, responda no encerramento: ' + falta[1] + '? (Sim ou Não).'); return false; }
  }
  d.fecha = f;
  return true;
}

// ---------- encerramento da calibração e da qualificação térmica ----------
function encBlock(o) {
  const c = o.encerr || {};
  return box('enc', 'Encerramento', o.tipo === 'Calibração' || o.tipo === 'Qualificação térmica', `
    ${simNao('fa_aprov', 'Equipamento aprovado?', c.aprov)}
    <label id="fa_jAbox" style="display:none">Justificativa: por que o equipamento não foi aprovado<textarea name="fa_jA" rows="2">${esc(c.jAprov)}</textarea></label>
    ${simNao('fa_corr', 'Necessita de corretiva?', c.corr)}
    <label id="fa_jCbox" style="display:none">Justificativa: por que precisa de corretiva (abre uma OS de corretiva para o equipamento)<textarea name="fa_jC" rows="2">${esc(c.jCorr)}</textarea></label>`);
}
// mostra a justificativa quando aprovado = Não ou corretiva = Sim; só exige com o bloco visível
function encSync() {
  const fm = document.getElementById('form'); if (!fm || !fm.elements.fa_aprov) return;
  const t = fm.elements.tipo && fm.elements.tipo.value, ativo = t === 'Calibração' || t === 'Qualificação térmica';
  const radio = n => (fm.querySelector('input[name="' + n + '"]:checked') || {}).value;
  [['fa_jA', radio('fa_aprov') === 'Não'], ['fa_jC', radio('fa_corr') === 'Sim']].forEach(([n, v]) => {
    document.getElementById(n + 'box').style.display = v ? '' : 'none';
    fm.elements[n].required = v && ativo;
  });
}
function parseEnc(d, c, prev) {
  const f = { aprov: c.fa_aprov || '', corr: c.fa_corr || '', jAprov: c.fa_aprov === 'Não' ? (c.fa_jA || '').trim() : '', jCorr: c.fa_corr === 'Sim' ? (c.fa_jC || '').trim() : '', corrOsId: (prev && prev.encerr && prev.encerr.corrOsId) || '' };
  if (f.aprov === 'Não' && !f.jAprov) { alert('Justifique por que o equipamento não foi aprovado.'); return false; }
  if (f.corr === 'Sim' && !f.jCorr) { alert('Justifique por que o equipamento precisa de corretiva.'); return false; }
  if (d.status === 'Concluída') {
    const falta = [['aprov', 'Equipamento aprovado'], ['corr', 'Necessita de corretiva']].find(([k]) => !f[k]);
    if (falta) { alert('Para concluir, responda no encerramento: ' + falta[1] + '? (Sim ou Não).'); return false; }
  }
  d.encerr = f;
  return true;
}

// ---------- eventos do formulário da OS ----------
document.addEventListener('change', ev => {
  const n = ev.target.name, v = ev.target.value;
  if (n === 'tipo' && $('#calib')) {
    $('#calib').style.display = v === 'Calibração' ? 'block' : 'none';
    $('#qual').style.display = v === 'Qualificação térmica' ? 'block' : 'none';
    $('#chk').style.display = v === 'Preventiva' ? 'block' : 'none';
    if ($('#corr')) $('#corr').style.display = v === 'Corretiva' ? 'block' : 'none';
    if ($('#enc')) $('#enc').style.display = v === 'Calibração' || v === 'Qualificação térmica' ? 'block' : 'none';
  }
  if (n === 'fa_aprov' || n === 'fa_corr') encSync();
  if (n === 'fc_cal' || n === 'fc_qual') $('#' + n + 'Box').style.display = v === 'Sim' ? 'block' : 'none';
  if (n === 'chkModelo') $('#chkBody').innerHTML = chkBody(v, {});
  if (/^ci_\d+$/.test(n || '')) { // NC: pede a justificativa do problema
    const j = ev.target.closest('tr').querySelector('.cj');
    if (j) { j.style.display = v === 'NC' ? 'block' : 'none'; j.required = v === 'NC'; if (v === 'NC') j.focus(); }
  }
  // o modelo de checklist acompanha o equipamento escolhido (sem modelo cadastrado no equipamento = sem checklist)
  if ((n === 'equipId' || n === 'clienteOS') && $('#chk')) {
    const e = n === 'equipId' ? equipById(v) : null, m = (e && e.checklistId) || '';
    form.chkModelo.value = m; $('#chkBody').innerHTML = chkBody(m, {});
  }
});

// ---------- checklist da preventiva ----------
function chkBlock(o) {
  const eq = equipById(o.equipId) || {};
  const c = o.chk || {};
  const modeloId = c.modeloId || eq.checklistId || '';
  return box('chk', 'Checklist da preventiva', o.tipo === 'Preventiva', `
    ${sel('chkModelo', 'Modelo de checklist', [['', '- sem checklist -'], ...db.checklists.map(x => [x.id, x.nome])], modeloId)}
    <div id="chkBody">${chkBody(modeloId, c)}</div>`);
}
function chkBody(modeloId, c) {
  const m = db.checklists.find(x => x.id === modeloId);
  if (!m) return '<p class="note">Este equipamento não tem modelo de checklist. Escolha um modelo acima ou defina um padrão no cadastro do equipamento (cadastre os modelos na aba Checklists).</p>';
  const saved = c && c.modeloId === modeloId ? c : null;
  const rad = (i, val, r) => `<label style="display:inline;margin-right:8px"><input type="radio" name="ci_${i}" value="${val}" ${r === val ? 'checked' : ''} style="width:auto"> ${val}</label>`;
  return `<table>${m.itens.map((t, i) => {
    const it = saved && saved.itens[i] && saved.itens[i].t === t ? saved.itens[i] : {}, r = it.r || 'C';
    return `<tr><td>${esc(t)}<input name="cj_${i}" class="cj" placeholder="Justifique o problema encontrado (abre uma OS corretiva)" value="${esc(it.j || '')}" style="margin-top:6px;display:${r === 'NC' ? 'block' : 'none'}" ${r === 'NC' ? 'required' : ''}></td><td style="white-space:nowrap;vertical-align:top">${rad(i, 'C', r)}${rad(i, 'NC', r)}</td></tr>`;
  }).join('')}</table>
  <p class="note">Instrumentos utilizados:</p>
  ${m.instrumentos.map((t, j) => `<label style="display:inline-block;margin-right:12px"><input type="checkbox" name="ins_${j}" ${saved ? (saved.instrumentos.includes(t) ? 'checked' : '') : 'checked'} style="width:auto"> ${esc(t)}</label>`).join('')}`;
}
function parseChk(d, c, prev) {
  const m = db.checklists.find(x => x.id === c.chkModelo);
  const antes = prev && prev.chk && prev.chk.modeloId === c.chkModelo ? prev.chk.itens : [];
  if (d.status === 'Concluída' && !m) { alert('Selecione o modelo de checklist para concluir a preventiva.'); return false; }
  if (m) for (let i = 0; i < m.itens.length; i++) if ((c['ci_' + i] || 'C') === 'NC' && !(c['cj_' + i] || '').trim()) { alert(`Justifique o problema encontrado no item não conforme: ${m.itens[i]}`); return false; }
  d.chk = m ? { modeloId: m.id, nome: m.nome, itens: m.itens.map((t, i) => { const r = c['ci_' + i] || 'C', a = antes.find(x => x.t === t) || {}; return { t, r, j: r === 'NC' ? (c['cj_' + i] || '').trim() : '', osId: a.osId || '' }; }), instrumentos: m.instrumentos.filter((t, j) => c['ins_' + j] !== undefined) } : null;
  return true;
}

// ---------- calibração ----------
const GRANDEZA = { 'Termômetro': 'Temperatura', 'Balança / massa': 'Massa', 'Tacômetro': 'Rotação', 'Manômetro': 'Pressão', 'Multímetro': 'Grandeza elétrica' };
const num = v => +String(v ?? '').replace(',', '.') || 0;
const sd = a => a.length < 2 ? 0 : Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1));
// incerteza (GUM): repetitividade + padrão + resolução + outras, combinadas em soma quadrática
function uCalc(ev, d) {
  const k = num(d.kfat) || 2;
  const uA = ev.length > 1 ? sd(ev) / Math.sqrt(ev.length) : 0;
  const pad = padById(d.padraoId) || {}; // cada grandeza usa o seu próprio padrão
  const upad = num(pad.incU) / (num(pad.incK) || 2);
  const ures = num(d.resolucao) / Math.sqrt(12);
  const uout = num(d.uOutros);
  const uc = Math.sqrt(uA ** 2 + upad ** 2 + ures ** 2 + uout ** 2);
  return { uA, upad, ures, uout, uc, k, U: k * uc };
}
// g = nº do grupo (padrão/grandeza), i = nº do ponto
const readRow = (g, i, r) => `<tr><td>${i + 1}</td>
  <td><input name="c${g}_rp_${i}" type="number" step="any" value="${esc(r.p)}"></td>
  <td><input name="c${g}_re_${i}" inputmode="decimal" placeholder="ex.: 6,9" value="${esc((r.ev || (r.e != null ? [r.e] : [])).join('; ').replace(/\./g, ','))}"></td>
  <td><input name="c${g}_ru_${i}" type="number" step="any" placeholder="automático" value="${esc((r.uManual ?? (r.u != null)) ? r.u : '')}"></td>
  <td><button type="button" class="sm danger" onclick="delReading(this,${g})" aria-label="Remover ponto">Remover</button></td></tr>`;
// remove o ponto e renumera os demais (nomes c{g}_rp_/re_/ru_ precisam ser sequenciais)
function delReading(btn, g) {
  btn.closest('tr').remove();
  [...$('#rd_' + g + ' tbody').rows].forEach((r, i) => { r.cells[0].textContent = i + 1; r.querySelectorAll('input').forEach(inp => { inp.name = inp.name.replace(/\d+$/, i); }); });
}
function addReading(g) { const tb = $('#rd_' + g + ' tbody'); tb.insertAdjacentHTML('beforeend', readRow(g, tb.rows.length, {})); }
// grupos de calibração: um por padrão/grandeza (até 3). OS antigas guardam um grupo só, nos campos da própria OS.
const calsDe = o => o && o.cals && o.cals.length ? o.cals : [{ padraoId: o && o.padraoId, grandeza: o && o.grandeza, unidade: o && o.unidade, resolucao: o && o.resolucao, faixaCol: o && o.faixaCol, ema: o && o.ema, uOutros: o && o.uOutros, leituras: (o && o.leituras) || [] }];
function padOptions(selId) {
  const hoje = today();
  return db.padroes.filter(p => (p.validade || '') >= hoje || p.id === selId)
    .map(p => `<option value="${p.id}" ${p.id === selId ? 'selected' : ''}>${esc(p.tipo)} - ${esc(p.nome)} ${esc(p.codigo)} (S/N ${esc(p.serie)}) · ${padStatus(p)[0]}</option>`).join('');
}
function calibBlock(o) {
  const gs = calsDe(o), n = Math.max(1, gs.length);
  const grupo = i => {
    const g = gs[i] || {}, rows = g.leituras && g.leituras.length ? g.leituras : [{}, {}, {}];
    const pd = padById(g.padraoId) || {};
    return `<fieldset id="cg_${i}" class="fsec" style="display:${i < n ? '' : 'none'}"><legend>Padrão ${i + 1} e grandeza ${i + 1}</legend>
   <label>Padrão utilizado<select name="c${i}_padrao" onchange="padPick(${i},this)"><option value="">- selecione -</option>${padOptions(g.padraoId)}</select></label>
   <div class="two">${fld(`c${i}_grandeza`, 'Grandeza', g.grandeza, 'text', `placeholder="${esc(GRANDEZA[pd.tipo] || '')}"`)}${fld(`c${i}_unidade`, 'Unidade das leituras', g.unidade || pd.unidade || (i ? '' : '°C'))}</div>
   <div class="two">${fld(`c${i}_resolucao`, 'Resolução do instrumento', g.resolucao)}${fld(`c${i}_faixaCol`, 'Faixa coletada (ex.: 2 à 8 °C)', g.faixaCol)}</div>
   <div class="two">${fld(`c${i}_ema`, 'Erro máximo admissível (±)', g.ema, 'number', 'step=any min=0')}${fld(`c${i}_uOutros`, 'Outras contribuições de incerteza (opcional)', g.uOutros, 'number', 'step=any min=0')}</div>
   <p class="note emaRec" id="emaRec_${i}" style="display:none;margin:-4px 0 8px"></p>
   <table id="rd_${i}"><thead><tr><th>#</th><th>Valor nominal (padrão)</th><th>Leitura do equipamento</th><th>U (vazio = automático)</th><th></th></tr></thead><tbody>${rows.map((r, j) => readRow(i, j, r)).join('')}</tbody></table>
   <p><button type="button" class="sm ghost" onclick="addReading(${i})">Adicionar ponto</button></p></fieldset>`;
  };
  return box('calib', 'Calibração', o.tipo === 'Calibração', `
   <div class="two">${sel('nPad', 'Quantidade de padrões / grandezas', ['1', '2', '3'], String(n), 'onchange="nPadSel(this.value)"')}${fld('kfat', 'Fator de abrangência (k)', o.kfat || 2, 'number', 'step=any min=1')}</div>
   <p class="note" id="calRef" style="display:none"></p>
   ${db.padroes.some(p => (p.validade || '') < today()) ? '<p class="note">Padrões vencidos não aparecem na lista.</p>' : ''}
   <p class="note">Cada padrão corresponde a uma grandeza, com as suas próprias leituras e resultado no certificado.</p>
   <div class="two">${fld('lacre', 'Lacre do equipamento', o.lacre)}${sel('localCal', 'Local da calibração', ['Realizada no cliente', 'Realizada no laboratório'], o.localCal)}</div>
   <div class="two">${fld('tempAmb', 'Temperatura do local (°C)', o.tempAmb, 'number', 'step=any')}${fld('tempInc', '± incerteza (°C)', o.tempInc, 'number', 'step=any')}</div>
   <div class="two">${fld('umidAmb', 'Umidade relativa (%)', o.umidAmb, 'number', 'step=any')}${fld('umidInc', '± incerteza (%)', o.umidInc, 'number', 'step=any')}</div>
   ${[0, 1, 2].map(grupo).join('')}
   <p class="note">Com uma única leitura por ponto, a repetitividade (uA) é zero. U automático = k · √(uA² + u padrão² + u resolução² + outras²), com u padrão = U do certificado ÷ k do certificado e u resolução = resolução/√12. Aceitação: |média − nominal| + U ≤ erro máximo admissível.</p>`);
}
// recomendações vindas do cadastro do equipamento escolhido (desvio admissível e faixa de trabalho)
// desvio e faixa do equipamento; se ele não tiver (cadastrado antes), usa o do catálogo pelo nome do tipo (nome igual ou começando com o nome do catálogo)
function refEquip(e) {
  if (e.desvio || e.faixaTrab) return { desvio: e.desvio, faixaTrab: e.faixaTrab };
  const n = norm(e.nome); let c = null;
  for (const x of db.catalogo || []) { const cn = norm(x.nome); if (cn && (n === cn || n.startsWith(cn + ' ')) && (!c || cn.length > norm(c.nome).length)) c = x; }
  return c ? { desvio: c.desvio, faixaTrab: c.faixa } : {};
}
function calRefSync() {
  const fm = document.getElementById('form'); if (!fm || !fm.elements.equipId || !document.getElementById('calRef')) return;
  const eq = equipById(fm.elements.equipId.value) || {}, e = refEquip(eq);
  document.querySelectorAll('.emaRec').forEach(p => { p.style.display = e.desvio ? '' : 'none'; p.innerHTML = e.desvio ? `Recomendado (cadastro do equipamento): desvio admissível <b>± ${esc(e.desvio)}</b>. Digite o valor acima.` : ''; });
  const r = document.getElementById('calRef'); r.style.display = e.faixaTrab ? '' : 'none'; r.innerHTML = e.faixaTrab ? `Faixa de trabalho cadastrada no equipamento: <b>${esc(e.faixaTrab)}</b>.` : '';
}
function nPadSel(n) { [0, 1, 2].forEach(i => { $('#cg_' + i).style.display = i < +n ? '' : 'none'; }); if (typeof osSync === 'function') osSync(false); }
// ao escolher o padrão, sugere a unidade dele se o campo ainda estiver vazio
function padPick(i, s) {
  const p = padById(s.value) || {}, un = form.elements['c' + i + '_unidade'], gr = form.elements['c' + i + '_grandeza'];
  if (un && !un.value && p.unidade) un.value = p.unidade;
  if (gr) { gr.placeholder = GRANDEZA[p.tipo] || ''; if (!gr.value && GRANDEZA[p.tipo]) gr.value = GRANDEZA[p.tipo]; } // sugere a grandeza pelo tipo do padrão
}
function padOk(d) {
  for (const p of padsDe(d).map(padById)) {
    if (p && (p.validade || '') < (d.fechamento || today()).slice(0, 10)) {
      alert(`O padrão "${p.nome}" estava vencido (${fmtD(p.validade)}). Não é possível usá-lo neste serviço.`); return false;
    }
  }
  return true;
}
function parseCalib(d, c) {
  const np = Math.min(3, Math.max(1, +c.nPad || 1)), gs = [], ids = [];
  for (let i = 0; i < np; i++) {
    const g = { padraoId: c[`c${i}_padrao`] || '', grandeza: c[`c${i}_grandeza`] || '', unidade: c[`c${i}_unidade`] || '', resolucao: c[`c${i}_resolucao`] || '', faixaCol: c[`c${i}_faixaCol`] || '', ema: c[`c${i}_ema`] ?? '', uOutros: c[`c${i}_uOutros`] ?? '', leituras: [] };
    const rot = np > 1 ? ` (padrão ${i + 1})` : '';
    if (g.padraoId && ids.includes(g.padraoId)) { alert('O mesmo padrão foi escolhido mais de uma vez.'); return false; }
    if (g.padraoId) ids.push(g.padraoId);
    const n = Object.keys(c).filter(k => k.startsWith(`c${i}_rp_`)).length;
    for (let j = 0; j < n; j++) {
      const p = c[`c${i}_rp_${j}`], txt = (c[`c${i}_re_${j}`] || '').trim(), u = c[`c${i}_ru_${j}`];
      if (p === '' || !txt) continue;
      const ev = parseNums(txt);
      if (ev.some(isNaN)) { alert(`Leitura inválida no ponto ${j + 1}${rot}. Informe só o número (vírgula ou ponto como decimal).`); return false; }
      const auto = uCalc(ev, { ...g, kfat: d.kfat });
      const manual = u !== '' && u != null;
      g.leituras.push({ p: +p, ev, e: mean(ev), uManual: manual, u: manual ? +u : auto.U, auto });
    }
    if (d.status === 'Concluída') {
      const pd = padById(g.padraoId);
      if (!g.padraoId) { alert(`Selecione o padrão utilizado na calibração${rot}.`); return false; }
      if (!g.grandeza.trim()) { alert(`Informe a grandeza${rot}.`); return false; }
      if (!(num(g.resolucao) > 0)) { alert(`Informe a resolução do instrumento${rot}.`); return false; }
      if (String(g.ema).trim() === '') { alert(`Informe o erro máximo admissível${rot}.`); return false; }
      if (!g.leituras.length) { alert(`Informe ao menos um ponto com leituras${rot}.`); return false; }
      if (g.leituras.some(r => !r.uManual) && (!pd || !(+pd.incU > 0) || !(num(g.resolucao) > 0))) {
        alert(`Para calcular a incerteza automaticamente${rot}, o padrão precisa ter U do certificado cadastrado e é preciso informar a resolução do instrumento. Ou digite U manualmente em cada ponto.`); return false;
      }
    }
    gs.push(g);
  }
  d.cals = gs; d.padraoIds = ids;
  // o 1º grupo também fica nos campos antigos da OS (compatibilidade com o resto do programa)
  Object.assign(d, { padraoId: gs[0].padraoId, grandeza: gs[0].grandeza, unidade: gs[0].unidade, resolucao: gs[0].resolucao, faixaCol: gs[0].faixaCol, ema: gs[0].ema, uOutros: gs[0].uOutros, leituras: gs[0].leituras });
  return padOk(d);
}

// ---------- qualificação térmica ----------
const sensRow = (i, s) => `<tr><td><input name="q_c_${i}" placeholder="A01" value="${esc(s.cod)}"></td><td><input name="q_m_${i}" value="${esc(s.modelo)}"></td>
  <td><input name="q_n_${i}" value="${esc(s.serie)}"></td><td><input name="q_p_${i}" placeholder="posição" value="${esc(s.pos)}"></td>
  <td><button type="button" class="sm ghost" title="Remover sensor" onclick="delSens(this)">Remover</button></td></tr>`;
// remove a linha do sensor (e a coluna de leituras dele, se houver) e renumera os campos
function delSens(btn) {
  const tr = btn.closest('tr'), cod = tr.querySelector('[name^=q_c_]').value.trim();
  const ta = $('[name=q_dados]'), ser = parseSerie(ta.value), j = cod && !ser.erro ? ser.cods.indexOf(cod) : -1;
  if (j >= 0 && !confirm(`Remover o sensor ${cod} e as leituras dele?`)) return;
  if (j >= 0) {
    const cods = ser.cods.filter((_, k) => k !== j);
    const rows = ser.rows.map(r => ({ t: r.t, v: r.v.filter((_, k) => k !== j) })).filter(r => r.v.some(x => x != null));
    ta.value = cods.length ? ['Tempo\t' + cods.join('\t'), ...rows.map(r => r.t + '\t' + r.v.map(x => x == null ? '' : String(x).replace('.', ',')).join('\t'))].join('\n') : '';
  }
  tr.remove();
  [...$('#qsens tbody').rows].forEach((r, i) => r.querySelectorAll('input').forEach(inp => { inp.name = inp.name.replace(/\d+$/, i); }));
}
function addSens() { const tb = $('#qsens tbody'); tb.insertAdjacentHTML('beforeend', sensRow(tb.rows.length, {})); }
function qualBlock(o) {
  tmpImgs = {};
  const q = o.qual || {};
  const sens = q.sens && q.sens.length ? q.sens : [{}, {}, {}];
  return box('qual', 'Qualificação térmica', o.tipo === 'Qualificação térmica', `
   <label>Padrão / termômetro de referência<select name="padraoQ"><option value="">- selecione -</option>${padOptions(o.padraoId)}</select></label>
   ${fld('q_tipo', 'Tipo de ensaio', q.tipo || 'Qualificação Térmica de Performance')}
   <div class="two">${fld('q_min', 'Limite inferior da faixa de trabalho', q.min, 'number', 'step=any')}${fld('q_max', 'Limite superior da faixa de trabalho', q.max, 'number', 'step=any')}</div>
   <div class="two">${fld('q_un', 'Unidade', q.un || '°C')}${sel('q_carga', 'Condição', [['', '- selecione -'], 'Com carga', 'Sem carga'].map(x => Array.isArray(x) ? x : [x, x]), q.carga)}</div>
   <div class="two">${fld('q_dur', 'Tempo de estudo / de ciclo (ex.: 12 horas)', q.dur)}${fld('q_ciclos', 'Quantidade de ciclos', q.ciclos || '1 ciclo')}</div>
   <div class="two">${fld('q_parada', 'Teste de parada (tempo)', q.parada)}${fld('q_porta', 'Teste de abertura de porta', q.porta)}</div>
   <div class="two">${fld('q_ctrl', 'Sensor em paralelo ao controlador (ex.: A01)', q.ctrl)}<span></span></div>
   <div class="two">${fld('q_tamb', 'Temperatura ambiente (°C)', q.tamb, 'number', 'step=any')}${fld('q_pi', 'Abertura de porta: início', q.pi, 'datetime-local', 'step=1')}</div>
   <div class="two">${fld('q_pf', 'Abertura de porta: fim da recuperação', q.pf, 'datetime-local', 'step=1')}<span></span></div>
   <div class="two">${fld('q_ei', 'Avaliar a partir de (vazio = início)', q.ei, 'datetime-local', 'step=1')}${fld('q_ef', 'Avaliar até (vazio = fim)', q.ef, 'datetime-local', 'step=1')}</div>
   <div class="two">${fld('q_tol', 'Tolerância fora da faixa (minutos seguidos)', q.tol != null ? q.tol : (o.qual ? '' : 6), 'number', 'step=any min=0')}<span></span></div>
   <p class="note">Tolerância: o sensor pode ficar acima ou abaixo da faixa por até esse tempo, contínuo, e ainda assim ser aprovado; passou disso, reprova. Vazio ou 0 = qualquer leitura fora da faixa reprova. O resultado considera só o período de avaliação e ignora o intervalo da abertura de porta. Tudo continua no gráfico e na tabela.</p>
   ${imgField('foto', 'Foto do equipamento sob ensaio', q.foto)}${imgField('esquema', 'Figura da distribuição dos sensores', q.esquema)}
   <table id="qsens"><thead><tr><th>Código</th><th>Modelo</th><th>Nº de série</th><th>Posição</th><th></th></tr></thead><tbody>${sens.map((s, i) => sensRow(i, s)).join('')}</tbody></table>
   <p><button type="button" class="sm ghost" onclick="addSens()">Adicionar sensor</button></p>
   <p><button type="button" onclick="this.nextElementSibling.click()">Importar PDF(s) do data logger</button><input type="file" accept="application/pdf" multiple hidden onchange="importarLoggers(this)"> <span id="loggerSt" class="note"></span></p>
   <p class="note">Cada PDF é um sensor: o código, o modelo e o nº de série entram na tabela acima e as leituras vão para o campo abaixo. Pode importar um por vez ou todos juntos.</p>
   <label>Dados do data logger (cole aqui a tabela exportada: 1ª linha com os códigos, 1ª coluna com data e hora)<textarea name="q_dados" rows="6" style="font-family:monospace;font-size:12px" placeholder="Tempo&#9;A01&#9;A02&#10;2025-07-27 12:25:03&#9;4,4&#9;2,5">${esc(q.raw)}</textarea></label>`);
}
// ---------- importação dos PDFs exportados pelo data logger (um PDF = um sensor) ----------
async function lerPdfLogger(file) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  let txt = '';
  for (let p = 1; p <= doc.numPages; p++) txt += (await (await doc.getPage(p)).getTextContent()).items.map(i => i.str).join(' ') + '\n';
  const pts = [];
  for (const m of txt.matchAll(/(?<![\d\/])(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(-?\d+(?:[.,]\d+)?)(?![\d\/:.,])/g))
    pts.push({ t: `20${m[1]}-${m[2]}-${m[3]} ${m[4]}`, v: +m[5].replace(',', '.') });
  const serie = (txt.match(/\b[A-Z]{3}\d{9}-\d{7}\b/) || txt.match(/\b[A-Z]{3}\d{9}\b/) || [''])[0];
  const modelo = (txt.match(/Tlog\s*\w+/i) || [''])[0];
  return { nome: file.name, serie, modelo, pts };
}
async function importarLoggers(inp) {
  const files = [...inp.files]; // o 1º PDF é a referência de data e hora
  const st = $('#loggerSt');
  if (!files.length) return;
  st.textContent = 'Lendo ' + files.length + ' PDF(s)...';
  try {
    const cols = new Map(); // código -> Map(t -> v)
    const old = parseSerie($('[name=q_dados]').value);
    if (!old.erro) old.cods.forEach((c, j) => cols.set(c, new Map(old.rows.filter(r => r.v[j] != null).map(r => [r.t, r.v[j]]))));
    const msg = []; let anchors = null, tol = 0;
    for (const f of files) {
      const lg = await lerPdfLogger(f);
      if (!lg.pts.length) { msg.push(f.name + ': nenhum dado de temperatura reconhecido'); continue; }
      const tb = $('#qsens tbody');
      const val = (r, n) => tb.rows[r].querySelector('[name^=' + n + ']');
      let r = [...tb.rows].findIndex((_, i) => lg.serie && val(i, 'q_n_').value.trim() === lg.serie);
      if (r < 0) r = [...tb.rows].findIndex((_, i) => !val(i, 'q_n_').value.trim() && !(cols.has(val(i, 'q_c_').value.trim())));
      if (r < 0) { addSens(); r = tb.rows.length - 1; }
      if (!val(r, 'q_c_').value.trim()) val(r, 'q_c_').value = 'A' + String(r + 1).padStart(2, '0');
      if (!val(r, 'q_n_').value.trim()) val(r, 'q_n_').value = lg.serie;
      if (!val(r, 'q_m_').value.trim()) val(r, 'q_m_').value = lg.modelo;
      const cod = val(r, 'q_c_').value.trim();
      // loggers diferentes registram em instantes ligeiramente diferentes (ex.: 18:20:48 e 18:21:14):
      // alinha cada leitura ao horário mais próximo da base já existente, para ficarem na mesma linha
      if (!anchors) {
        const ex = [...new Set([...cols.values()].flatMap(m => [...m.keys()]))].sort();
        anchors = (ex.length ? ex : lg.pts.map(p => p.t)).map(t => ({ t, ms: Date.parse(t.replace(' ', 'T')) }));
        const d = anchors.slice(1).map((a, i) => a.ms - anchors[i].ms).filter(x => x > 0).sort((a, b) => a - b);
        tol = (d.length ? d[d.length >> 1] : 60000) / 2;
      }
      const col = new Map(); let fora = 0;
      for (const p of lg.pts) {
        const m = Date.parse(p.t.replace(' ', 'T'));
        let lo = 0, hi = anchors.length - 1; // anchors ordenado: busca o mais próximo
        while (lo < hi) { const mid = (lo + hi) >> 1; if (anchors[mid].ms < m) lo = mid + 1; else hi = mid; }
        const c = [anchors[lo], anchors[lo - 1]].filter(Boolean).sort((a, b) => Math.abs(a.ms - m) - Math.abs(b.ms - m))[0];
        if (c && Math.abs(c.ms - m) <= tol) col.set(c.t, p.v); else fora++; // fora da sequência do 1º PDF: descartada
      }
      if (fora) msg.push(`${val(r, 'q_c_').value.trim()}: ${fora} leitura(s) fora da sequência do 1º PDF foram ignoradas`);
      cols.set(cod, col);
      msg.push(`${cod} ← ${f.name} (${lg.pts.length} leituras)`);
    }
    const cods = [...cols.keys()].sort();
    const ts = [...new Set([...cols.values()].flatMap(m => [...m.keys()]))].sort();
    $('[name=q_dados]').value = ['Tempo\t' + cods.join('\t'), ...ts.map(t => t + '\t' + cods.map(c => cols.get(c).has(t) ? String(cols.get(c).get(t)).replace('.', ',') : '').join('\t'))].join('\n');
    st.textContent = msg.join(' · ');
  } catch (e) { st.textContent = 'Erro ao ler o PDF: ' + e.message; }
  inp.value = '';
}
function normT(s) {
  s = (s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${m[4].padStart(2, '0')}:${m[5]}:${m[6] || '00'}`;
  return null;
}
// lê a tabela colada: devolve { cods, rows:[{t, v:[...]}] } ou { erro }
function parseSerie(raw) {
  const lines = (raw || '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { cods: [], rows: [] };
  const delim = lines.some(l => l.includes('\t')) ? '\t' : lines.some(l => l.includes(';')) ? ';' : null;
  let header = null; const rows = [];
  for (const l of lines) {
    const cells = delim ? l.split(delim).map(x => x.trim()) : l.trim().split(/\s+/);
    let t, vals;
    if (delim) { t = normT(cells[0]); vals = cells.slice(1); }
    else { t = normT(cells[0] + ' ' + cells[1]); vals = cells.slice(2); }
    if (!t) { if (!header && !rows.length) header = delim ? cells.slice(1) : cells.slice(1); continue; }
    rows.push({ t, v: vals.map(x => { if (x === '' || x == null) return null; const n = +x.replace(',', '.'); return isNaN(n) ? null : n; }) });
  }
  if (!rows.length) return { erro: 'Nenhuma linha com data e hora reconhecida (use AAAA-MM-DD hh:mm:ss ou DD/MM/AAAA hh:mm:ss).' };
  const ncol = Math.max(...rows.map(r => r.v.length));
  const names = Array.from({ length: ncol }, (_, i) => (header && header[i] ? header[i] : header ? '' : 'S' + String(i + 1).padStart(2, '0')));
  const keep = names.map((n, i) => n ? i : -1).filter(i => i >= 0);
  return { cods: keep.map(i => names[i]), rows: rows.map(r => ({ t: r.t, v: keep.map(i => r.v[i] ?? null) })) };
}
function parseQual(d, c, prev) {
  const n = Object.keys(c).filter(k => k.startsWith('q_c_')).length, sens = [];
  for (let i = 0; i < n; i++) {
    const s = { cod: (c['q_c_' + i] || '').trim(), modelo: c['q_m_' + i], serie: c['q_n_' + i], pos: c['q_p_' + i] };
    if (s.cod || s.modelo || s.serie) sens.push(s);
  }
  const ser = parseSerie(c.q_dados);
  if (ser.erro) { alert(ser.erro); return false; }
  d.padraoId = c.padraoQ || '';
  const old = (prev && prev.qual) || {};
  d.qual = { sens, raw: c.q_dados || '', foto: tmpImgs.foto || old.foto || '', esquema: tmpImgs.esquema || old.esquema || '' };
  for (const k of Object.keys(c)) if (/^q_(?!c_|m_|n_|p_|dados)/.test(k)) d.qual[k.slice(2)] = c[k];
  if (d.status === 'Concluída') {
    if (!d.padraoId) { alert('Selecione o padrão utilizado na qualificação.'); return false; }
    if (!ser.rows.length) { alert('Importe os dados do data logger (PDFs ou tabela colada).'); return false; }
    if (d.qual.min === '' || d.qual.max === '') { alert('Informe os limites da faixa de trabalho.'); return false; }
    const eq = equipById(d.equipId), falta = [['carga', 'a condição (com carga ou sem carga)'], ['dur', 'o tempo de estudo'], ['porta', 'o teste de abertura de porta'], ['ctrl', 'o sensor em paralelo ao controlador'], ...(ehFreezer(eq) ? [['parada', 'o teste de parada (obrigatório para freezer)']] : [])].find(([k]) => !String(d.qual[k] || '').trim());
    if (falta) { alert('Para concluir a qualificação, informe ' + falta[1] + '.'); return false; }
    if (+d.qual.min > +d.qual.max) { alert('O limite inferior não pode ser maior que o superior.'); return false; }
  }
  return padOk(d);
}

// ---------- ponto de entrada usado pelo editOS ----------
function parseOSExtras(d, prev) {
  const take = re => { const o = {}; for (const k of Object.keys(d)) if (re.test(k)) { o[k] = d[k]; delete d[k]; } return o; };
  const chk = take(/^(ci_|cj_|ins_)\d+$|^chkModelo$/);
  const q = take(/^q_|^padraoQ$/);
  const cal = take(/^c[012]_|^nPad$/);
  const fc = take(/^fc_/);
  const fa = take(/^fa_/);
  d.chk = null; d.qual = null; d.leituras = []; d.padraoIds = []; d.cals = []; d.fecha = null; d.encerr = null;
  if ((d.tipo === 'Calibração' || d.tipo === 'Qualificação térmica') && !parseEnc(d, fa, prev)) return false;
  if (d.tipo === 'Preventiva') { d.padraoId = ''; return parseChk(d, chk, prev); }
  if (d.tipo === 'Qualificação térmica') return parseQual(d, q, prev);
  if (d.tipo === 'Calibração') return parseCalib(d, cal);
  d.padraoId = '';
  if (d.tipo === 'Corretiva') return parseCorr(d, fc);
  return true;
}
