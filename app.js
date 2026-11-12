// Engenharia Clínica - dados em localStorage (nenhum servidor necessário)
const KEY = 'engclin.v1';
let db;
let tab = 'dashboard';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const DAY = 864e5;
const nowLocal = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const today = () => nowLocal().slice(0, 10);
const fmtD = d => !d ? '-' : /^\d{4}-\d{2}-\d{2}$/.test(d) ? d.split('-').reverse().join('/') : new Date(d).toLocaleDateString('pt-BR');
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY).toISOString().slice(0, 10);
const brl = n => (+n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const EMPRESA_PADRAO = {
  razao: 'NEO TECNOLOGIA AMPLA', cnpj: '20.038.586/0001-90', ie: '15.445.597-0', rua: '7 de Setembro, nº 33', bairro: 'Tapanã',
  cidade: 'Belém', uf: 'PA', cep: '66830-320', fone: '(91) 84841691 / 980499656 ou 982110237', email: 'neotecnologiaampla@hotmail.com',
  respTec: 'Diego Coimbra de Oliveira', respTecCargo: 'Adm. Engº Mecatrônico - Diretor de Conformidade Clínica',
  engResp: 'Marcos César Silva de Souza', engCrea: 'CREA-RJ Nº 201096176-5',
  tecColetor: 'Daniel Oliveira', tecCft: 'CFT-PA Nº 24486051220',
  procedimento: 'PROCEDIMENTO PARA SERVIÇOS INTERNOS E EXTERNOS EM GERAL. A CALIBRAÇÃO FOI REALIZADA ATRAVÉS DO METODO DE COMPARAÇÃO DIRETA COM O PADRÃO.',
  obsIncerteza: 'A Incerteza expandida de medição relatada é declarada como incerteza padrão de medição multiplicada pelo fator de abrangência K, de tal forma que a probabilidade de abrangência corresponde a aproximadamente 95%',
  normas: 'ABNT NBR12550, NBR-ISO IEC 17025, DKD-R 5-7, ISO GUM 2008, ABNT-NBR 16328:2014',
};
const CHECKLIST_EXEMPLO = {
  id: 'chk-exemplo', nome: 'Balança Pediátrica',
  itens: ['Ajustes na plataforma de pesagem', 'Verificar fonte de alimentação', 'Nivelamento do equipamento', 'Avaliação da célula de carga',
    'Verificação da integridade do visor', 'Ajustes de calibração se necessário', 'Verificação da régua métrica', 'Limpeza externa do equipamento'],
  instrumentos: ['Multímetro', 'Peso padrão', 'Alicate amperímetro'],
};
const CATALOGO_PADRAO = [
  ['Monitor multiparâmetro', 'Monitorização de sinais vitais', 180, 365, 0],
  ['Ventilador pulmonar', 'Suporte ventilatório', 90, 365, 0],
  ['Bomba de infusão', 'Infusão controlada de medicamentos', 180, 365, 0],
  ['Desfibrilador', 'Reversão de arritmias cardíacas', 90, 365, 0],
  ['Cardioversor', 'Cardioversão elétrica', 90, 365, 0],
  ['Eletrocardiógrafo', 'Registro de ECG', 180, 365, 0],
  ['Oxímetro de pulso', 'Medição de SpO2', 180, 365, 0],
  ['Esfigmomanômetro', 'Medição de pressão arterial', 180, 365, 0],
  ['Termômetro clínico', 'Medição de temperatura corporal', 0, 365, 0],
  ['Balança pediátrica', 'Pesagem de lactentes', 180, 365, 0],
  ['Balança adulto', 'Pesagem de pacientes', 180, 365, 0],
  ['Incubadora neonatal', 'Suporte térmico ao recém-nascido', 90, 365, 0],
  ['Berço aquecido', 'Aquecimento do recém-nascido', 90, 365, 0],
  ['Fototerapia', 'Tratamento de icterícia neonatal', 180, 365, 0],
  ['Aspirador cirúrgico', 'Aspiração de secreções', 180, 0, 0],
  ['Bisturi elétrico', 'Corte e coagulação eletrocirúrgica', 180, 365, 0],
  ['Foco cirúrgico', 'Iluminação do campo operatório', 180, 0, 0],
  ['Mesa cirúrgica', 'Posicionamento do paciente', 180, 0, 0],
  ['Cama hospitalar elétrica', 'Acomodação do paciente', 180, 0, 0],
  ['Ultrassom diagnóstico', 'Diagnóstico por imagem', 180, 365, 0],
  ['Raio-X móvel', 'Diagnóstico por imagem', 180, 365, 0],
  ['Autoclave', 'Esterilização a vapor', 120, 365, 365],
  ['Estufa de esterilização e secagem', 'Esterilização por calor seco', 120, 365, 365],
  ['Refrigerador de vacinas', 'Armazenamento de imunobiológicos (2 a 8 °C)', 90, 365, 365],
  ['Refrigerador de bolsas de sangue', 'Armazenamento de hemocomponentes', 90, 365, 365],
  ['Freezer de plasma', 'Armazenamento de plasma congelado', 90, 365, 365],
  ['Banho-maria', 'Aquecimento controlado de amostras', 180, 365, 0],
  ['Centrífuga', 'Separação de amostras', 180, 365, 0],
  ['Capela de fluxo laminar', 'Ambiente de trabalho estéril', 180, 365, 0],
  ['Termohigrômetro', 'Medição de temperatura e umidade', 0, 365, 0],
].map((c, i) => ({ id: 'cat-' + (i + 1), nome: c[0], funcao: c[1], perPrev: c[2] || '', perCal: c[3] || '', perQual: c[4] || '' }));
const tecsPadrao = () => [{ id: 'tec-1', nome: EMPRESA_PADRAO.tecColetor, registro: EMPRESA_PADRAO.tecCft }];
const migraPad = p => { if (p.cert) { p.certs = [p.cert]; delete p.cert; } return p; };
function load() {
  const base = { equip: [], os: [], padroes: [], clientes: [], seq: 0 };
  let d = {};
  try { d = JSON.parse(localStorage.getItem(KEY)) || {}; } catch { d = {}; }
  const r = { ...base, ...d };
  r.empresa = { ...EMPRESA_PADRAO, ...(d.empresa || {}) };
  if (!d.checklists) r.checklists = [CHECKLIST_EXEMPLO];
  r.padroes = r.padroes.map(migraPad);
  if (!d.tecnicos) r.tecnicos = tecsPadrao();
  r.equip = r.equip.map(e => { if (e.patrimonio !== undefined) { e.tag = e.tag || e.patrimonio; delete e.patrimonio; } return e; });
  if (!d.catalogo) r.catalogo = CATALOGO_PADRAO.map(c => ({ ...c }));
  return r;
}
db = load();
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { alert('Não foi possível salvar no navegador.'); } render(); }
const equipById = id => db.equip.find(e => e.id === id);
const equipName = id => { const e = equipById(id); return e ? `${e.tag} - ${e.nome}` : '(removido)'; };

// ---------- regras ----------
const KIND = {
  prev: { label: 'Preventiva', tipo: 'Preventiva', per: 'perPrev', ult: 'ultPrev', desc: 'Manutenção preventiva programada' },
  cal: { label: 'Calibração', tipo: 'Calibração', per: 'perCal', ult: 'ultCal', desc: 'Calibração programada' },
  qual: { label: 'Qualificação térmica', tipo: 'Qualificação térmica', per: 'perQual', ult: 'ultQual', desc: 'Qualificação térmica programada' },
};
function nextDue(e, kind) {
  const per = +e[KIND[kind].per];
  const last = e[KIND[kind].ult] || e.aquisicao;
  if (!per) return null;
  if (!last) return today();
  return addDays(last, per);
}
function dueStatus(date) {
  if (!date) return ['-', ''];
  const d = Math.floor((new Date(date) - new Date(today())) / DAY);
  if (d < 0) return [`Vencida há ${-d} d`, 'bad'];
  if (d <= 30) return [`Vence em ${d} d`, 'warn'];
  return [`Em dia (${d} d)`, 'ok'];
}
function hours(o) { return o.fechamento ? (new Date(o.fechamento) - new Date(o.abertura)) / 36e5 : null; }

function indicators(periodDays = 365) {
  const since = Date.now() - periodDays * DAY;
  const inP = db.os.filter(o => new Date(o.abertura).getTime() >= since);
  const corr = inP.filter(o => o.tipo === 'Corretiva');
  const done = corr.filter(o => o.fechamento);
  const mttr = done.length ? done.reduce((s, o) => s + hours(o), 0) / done.length : null;
  const opH = db.equip.length * periodDays * 24;
  const mtbf = corr.length ? opH / corr.length : null;
  const disp = mtbf != null && mttr != null ? mtbf / (mtbf + mttr) * 100 : null;
  const prev = inP.filter(o => o.tipo === 'Preventiva');
  const prevOk = prev.filter(o => o.status === 'Concluída').length;
  const custo = inP.reduce((s, o) => s + (+o.custo || 0), 0);
  const calOverdue = db.equip.filter(e => e.perCal && nextDue(e, 'cal') < today()).length;
  const calReq = db.equip.filter(e => e.perCal).length;
  return {
    mttr, mtbf, disp, custo, nCorr: corr.length, nPrev: prev.length,
    cumprPrev: prev.length ? prevOk / prev.length * 100 : null,
    razao: prev.length ? corr.length / prev.length : null,
    calOk: calReq ? (calReq - calOverdue) / calReq * 100 : null,
  };
}
const f1 = (n, s = '') => n == null ? '-' : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + s;

// ---------- telas ----------
function render() {
  document.querySelectorAll('#nav button, #bnav button[data-tab], #more .mgrid button').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); b.setAttribute('aria-current', b.dataset.tab === tab ? 'page' : 'false'); });
  const prim = [...document.querySelectorAll('#bnav button[data-tab]')].some(b => b.dataset.tab === tab);
  $('#moreBtn').classList.toggle('active', !prim);
  closeMore();
  $('#view').innerHTML = ({ dashboard: vDash, equip: vEquip, os: vOS, pad: vPad, prev: vPrev, ind: vInd, cli: vCli, chk: vChk, cat: vCat, tec: vTec })[tab]();
  renderAlerts();
}

// ---------- padrões de calibração ----------
const TIPOS_PAD = ['Termômetro', 'Balança / massa', 'Tacômetro', 'Manômetro', 'Multímetro'];
const tiposPad = (extra) => { const m = new Map(); [...TIPOS_PAD, ...db.padroes.map(p => p.tipo), extra].filter(Boolean).forEach(t => { if (!m.has(norm(t))) m.set(norm(t), t); }); return [...m.values()]; };
const padById = id => db.padroes.find(p => p.id === id);
// padrões usados na OS (calibração aceita até 3); OS antigas têm só padraoId
const padsDe = o => o && o.cals && o.cals.length ? o.cals.map(c => c.padraoId).filter(Boolean) : o && o.padraoIds && o.padraoIds.length ? o.padraoIds : o && o.padraoId ? [o.padraoId] : [];
// situação do padrão: avisa com 30 dias ou menos; vencido não pode ser usado
function padStatus(p) {
  if (!p.validade) return ['Sem validade', 'bad', -1];
  const d = Math.floor((new Date(p.validade) - new Date(today())) / DAY);
  if (d < 0) return [`VENCIDO há ${-d} d`, 'bad', d];
  if (d <= 30) return [`Vence em ${d} d`, 'warn', d];
  return [`Válido (${d} d)`, 'ok', d];
}
function renderAlerts() {
  const bad = db.padroes.map(p => ({ p, s: padStatus(p) })).filter(x => x.s[1] !== 'ok');
  const venc = bad.some(x => x.s[1] === 'bad');
  $('#alerts').innerHTML = bad.length
    ? `<div class="alert ${venc ? 'bad' : ''}">⚠ Padrões de calibração: ${bad.map(({ p, s }) => `<b>${esc(p.tipo)} ${esc(p.nome)}</b> (S/N ${esc(p.serie)}) - ${s[0]}`).join(' · ')}<button class="sm" onclick="tab='pad';render()">Ver padrões</button></div>`
    : '';
}
// ---------- anexos (IndexedDB) ----------
const MAX_ANEXO = 15 * 1024 * 1024;
const idb = () => new Promise((ok, err) => { const r = indexedDB.open('neo-arquivos', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => ok(r.result); r.onerror = () => err(r.error); });
const idbDo = (modo, fn) => idb().then(d => new Promise((ok, err) => { const t = d.transaction('f', modo), s = t.objectStore('f'), q = fn(s); t.oncomplete = () => ok(q && q.result); t.onerror = () => err(t.error); }));
const putFile = (id, blob) => idbDo('readwrite', s => s.put(blob, id));
const getFile = id => idbDo('readonly', s => s.get(id));
const delFile = id => idbDo('readwrite', s => s.delete(id)).catch(() => {});
const fmtKB = n => n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
const MAX_ARQ = 3;
const arqsDe = p => (p && p.certs) || [];
async function verCert(id, fid) {
  const p = padById(id), c = p && arqsDe(p).find(x => x.fid === fid); if (!c) return;
  const b = await getFile(c.fid).catch(() => null);
  if (!b) { alert('Arquivo não encontrado neste navegador. Anexe o PDF novamente (Editar padrão).'); return; }
  window.open(URL.createObjectURL(b), '_blank');
}
const ehPdf = f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
const blobB64 = b => new Promise(ok => { const r = new FileReader(); r.onload = () => ok(r.result.split(',')[1]); r.readAsDataURL(b); });
const b64Blob = (s, tipo) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new Blob([u], { type: tipo }); };

function vPad() {
  const q = fv('pad', 'q').toLowerCase();
  const list = db.padroes.filter(p => (!q || [p.tipo, p.nome, p.codigo, p.serie, p.selo, p.certNum, p.laboratorio].join(' ').toLowerCase().includes(q))
    && (!fv('pad', 'tipo') || p.tipo === fv('pad', 'tipo')) && (!fv('pad', 'sit') || padStatus(p)[1] === fv('pad', 'sit')))
    .sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));
  const item = (rot, val, cls = '') => `<div class="${cls}"><dt>${rot}</dt><dd>${val ? esc(val) : '<span class="l">-</span>'}</dd></div>`;
  return `<div class="bar"><h2>Padrões de calibração</h2><button onclick="editPad()">Novo padrão</button></div>
  ${fbar('pad', ftxt('pad', 'q', 'Nome, série, selo, certificado...') + fsel('pad', 'tipo', 'Tipo', tiposPad()) + fsel('pad', 'sit', 'Situação', [['bad', 'Vencido'], ['warn', 'Vence em até 30 d'], ['ok', 'Válido']]), list.length, db.padroes.length)}
  <div class="pcards">
  ${list.map(p => { const [t, c] = padStatus(p); const arqs = arqsDe(p); return `<article class="pcard ${c}">
    <div class="pc-top"><div><div class="pc-type">${esc(p.tipo)}</div><div class="pc-name">${esc(p.nome)}</div>
      <div class="pc-sub">${[p.codigo, [p.fabricante, p.modelo].filter(Boolean).join(' '), p.serie ? 'S/N ' + p.serie : ''].filter(Boolean).map(esc).join(' · ')}</div></div>
      <span class="tag ${c}">${t}</span></div>
    <dl class="pc-grid">
      ${item('Faixa', [p.faixa, p.unidade].filter(Boolean).join(' '))}${item('Incerteza', p.incerteza)}${item('Selo Inmetro', p.selo)}${item('Certificado', p.certNum)}
      ${item('Laboratório (RBC)', p.laboratorio, 'span2')}${item('Calibrado em', p.dataCal ? fmtD(p.dataCal) : '')}${item('Válido até', p.validade ? fmtD(p.validade) : '')}
    </dl>
    <div class="pc-files">${arqs.length ? arqs.map(a => `<button class="sm ghost" onclick="verCert('${p.id}','${a.fid}')" title="${esc(a.nome)}">📎 ${esc(a.nome)}</button>`).join('') : '<span class="l">Nenhum PDF anexado</span>'}</div>
    <div class="pc-act"><button class="sm ghost" onclick="editPad('${p.id}')">Editar</button><button class="sm danger" onclick="delPad('${p.id}')">Excluir</button></div>
  </article>`; }).join('')}
  </div>${list.length ? '' : '<div class="empty">' + (db.padroes.length ? 'Nenhum padrão com esses filtros.' : 'Nenhum padrão cadastrado.') + '</div>'}
  <p class="note">Você é avisado no topo de todas as telas quando faltam 30 dias ou menos para vencer. Padrão vencido não pode ser selecionado em novas calibrações.</p>`;
}
function editPad(id) {
  const p = padById(id) || { tipo: 'Termômetro' };
  const arqs = arqsDe(p);
  openForm(id ? 'Editar padrão' : 'Novo padrão', `
    <fieldset class="fsec"><legend>Identificação</legend>
      <div class="two">${sel('tipo', 'Tipo de padrão', [...tiposPad(p.tipo), ['__novo', '+ Outro tipo (digitar)']], p.tipo, 'onchange="padTipo(this)"')}${fld('nome', 'Descrição (ex.: Termômetro)', p.nome, 'text', 'required')}</div>
      <label id="tnovo" style="display:none">Nome do novo tipo de padrão<b class="req"> *</b><input name="tipoNovo" placeholder="ex.: Paquímetro, Higrômetro, Cronômetro"></label>
      <div class="three">${fld('codigo', 'Código (ex.: Neo - 01)', p.codigo)}${fld('fabricante', 'Fabricante', p.fabricante)}${fld('modelo', 'Modelo', p.modelo)}</div>
      <div class="two">${fld('serie', 'Nº de série', p.serie, 'text', 'required')}${fld('selo', 'Selo Inmetro (nº)', p.selo)}</div>
    </fieldset>
    <fieldset class="fsec"><legend>Faixa e incerteza</legend>
      <div class="three">${fld('faixa', 'Faixa de medição', p.faixa)}${fld('unidade', 'Unidade', p.unidade)}${fld('incerteza', 'Incerteza (texto)', p.incerteza)}</div>
      <div class="two">${fld('incU', 'U do certificado (número, mesma unidade)', p.incU, 'number', 'step=any min=0')}${fld('incK', 'k do certificado', p.incK || 2, 'number', 'step=any min=1')}</div>
    </fieldset>
    <fieldset class="fsec"><legend>Certificado e validade</legend>
      <div class="two">${fld('certNum', 'Nº do certificado de calibração', p.certNum, 'text', 'required')}${fld('laboratorio', 'Laboratório (RBC)', p.laboratorio)}</div>
      <div class="two">${fld('dataCal', 'Data da calibração', p.dataCal, 'date')}${fld('validade', 'Válido até', p.validade, 'date', 'required')}</div>
    </fieldset>
    <fieldset class="fsec"><legend>Documentos do padrão (PDF, até ${MAX_ARQ})</legend>
      ${arqs.map(a => `<div class="anx"><span>📎 <b>${esc(a.nome)}</b> <span class="l">(${fmtKB(a.tamanho)})</span></span>
        <span><button type="button" class="sm ghost" onclick="verCert('${p.id}','${a.fid}')">Abrir</button>
        <label class="anx-rm"><input type="checkbox" name="rem_${a.fid}"> Remover</label></span></div>`).join('')}
      <label>${arqs.length ? 'Adicionar mais PDFs' : 'Anexar PDFs (certificado e outros documentos)'}<input type="file" name="certArquivos" accept="application/pdf,.pdf" multiple></label>
      <p class="note" style="margin:0">Cada padrão aceita até ${MAX_ARQ} PDFs de 15 MB cada. Os arquivos ficam guardados neste navegador.</p>
    </fieldset>`,
    (d, frm) => {
      if (d.tipo === '__novo') { d.tipo = (d.tipoNovo || '').trim(); if (!d.tipo) { alert('Informe o nome do novo tipo de padrão.'); return false; } d.tipo = tiposPad().find(t => norm(t) === norm(d.tipo)) || d.tipo; }
      delete d.tipoNovo;
      const novos = [...frm.elements.certArquivos.files].filter(f => f.size);
      const remover = [...frm.querySelectorAll('input[name^="rem_"]:checked')].map(i => i.name.slice(4));
      Object.keys(d).forEach(k => { if (k === 'certArquivos' || k.startsWith('rem_')) delete d[k]; });
      const ficam = arqs.filter(a => !remover.includes(a.fid));
      if (ficam.length + novos.length > MAX_ARQ) { alert(`Cada padrão aceita até ${MAX_ARQ} PDFs. Hoje há ${ficam.length} e você está adicionando ${novos.length}.`); return false; }
      const ruim = novos.find(f => !ehPdf(f)); if (ruim) { alert(`"${ruim.name}" não é um PDF.`); return false; }
      const grande = novos.find(f => f.size > MAX_ANEXO); if (grande) { alert(`"${grande.name}" tem ${fmtKB(grande.size)}. O limite é 15 MB por arquivo.`); return false; }
      let alvo; if (id) alvo = Object.assign(p, d); else { alvo = { id: uid(), ...d }; db.padroes.push(alvo); }
      remover.forEach(delFile);
      const add = novos.map(f => ({ fid: uid(), nome: f.name, tamanho: f.size }));
      alvo.certs = ficam.concat(add);
      if (!alvo.certs.length) delete alvo.certs;
      add.forEach((a, i) => putFile(a.fid, novos[i]).catch(() => { alvo.certs = (alvo.certs || []).filter(x => x.fid !== a.fid); save(); alert(`Não foi possível guardar "${a.nome}" neste navegador.`); }));
      save();
    });
}
function padTipo(s) { const on = s.value === '__novo', l = $('#tnovo'), i = form.elements.tipoNovo; l.style.display = on ? '' : 'none'; i.required = on; if (on) i.focus(); }
function delPad(id) { if (confirm('Excluir este padrão?')) { const p = padById(id); if (p) arqsDe(p).forEach(c => delFile(c.fid)); db.padroes = db.padroes.filter(p => p.id !== id); save(); } }

function vDash() {
  const i = indicators();
  const abertas = db.os.filter(o => o.status !== 'Concluída').length;
  const manut = db.equip.filter(e => e.status === 'Em manutenção').length;
  const venc = db.equip.filter(e => e.perPrev && nextDue(e, 'prev') < today()).length;
  const calV = db.equip.filter(e => e.perCal && nextDue(e, 'cal') < today()).length;
  const qualV = db.equip.filter(e => e.perQual && nextDue(e, 'qual') < today()).length;
  const padV = db.padroes.filter(p => padStatus(p)[1] === 'bad').length;
  const padA = db.padroes.filter(p => padStatus(p)[1] === 'warn').length;
  const att = (n, l, tabName, cls) => `<button class="${n ? cls : ''}" onclick="tab='${tabName}';render()"><div class="n">${n}</div><div class="l">${l}${n ? '' : ' · em dia'}</div></button>`;
  const recent = db.os.slice().sort((a, b) => b.abertura.localeCompare(a.abertura)).slice(0, 6);
  return `<div class="attn" role="group" aria-label="Pendências">
    ${att(padV, 'Padrões vencidos (não usar)', 'pad', 'bad')}
    ${att(padA, 'Padrões vencendo em 30 dias', 'pad', 'warn')}
    ${att(venc, 'Preventivas vencidas', 'prev', 'bad')}
    ${att(calV, 'Calibrações vencidas', 'prev', 'bad')}
    ${att(qualV, 'Qualificações térmicas vencidas', 'prev', 'bad')}
  </div>
  <p class="stats"><span><b>${db.equip.length}</b>equipamentos</span><span><b>${abertas}</b>OS abertas</span><span><b>${manut}</b>em manutenção</span><span><b>${f1(i.disp, '%')}</b>disponibilidade (12 meses)</span></p>
  <div class="bar"><h2>Últimas ordens de serviço</h2></div>
  ${osTable(recent, false)}
  ${db.equip.length ? '' : '<p class="note">Comece cadastrando equipamentos ou use "Dados de exemplo" no topo.</p>'}`;
}

// ---------- filtros ----------
const F = {};
const uniq = arr => [...new Set(arr.filter(Boolean))].sort();
const fv = (v, k) => (F[v] && F[v][k]) || '';
function setF(v, k, val, id) {
  (F[v] = F[v] || {})[k] = val; render();
  const el = id && document.getElementById(id);
  if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
}
const ftxt = (v, k, ph) => `<label class="f f-q"><span>Buscar</span><input id="f_${v}_${k}" type="search" placeholder="${ph}" value="${esc(fv(v, k))}" oninput="setF('${v}','${k}',this.value,this.id)"></label>`;
const fsel = (v, k, lab, opts) => `<label class="f"><span>${lab}</span><select onchange="setF('${v}','${k}',this.value)"><option value="">Todos</option>${opts.map(o => { const [val, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === fv(v, k) ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const fdate = (v, k, lab) => `<label class="f"><span>${lab}</span><input type="date" value="${esc(fv(v, k))}" onchange="setF('${v}','${k}',this.value)"></label>`;
const fbar = (v, controls, n, total) => `<div class="filters" role="search">${controls}<div class="f f-end"><button class="ghost sm" onclick="F['${v}']={};render()" ${Object.values(F[v] || {}).some(Boolean) ? '' : 'disabled'}>Limpar filtros</button></div></div><p class="note fcount">${n === total ? total + ' registro' + (total === 1 ? '' : 's') : n + ' de ' + total + ' registros'}</p>`;
const eqDe = o => db.equip.find(e => e.id === o.equipId) || {};
const cliOpts = () => db.clientes.map(c => [c.id, c.nome]);

function vEquip() {
  const q = fv('equip', 'q').toLowerCase();
  const list = db.equip.filter(e => (!q || [clienteNome(e), e.tag, e.nome, e.fabricante, e.modelo, e.serie, e.setor].join(' ').toLowerCase().includes(q))
    && (!fv('equip', 'cli') || e.clienteId === fv('equip', 'cli')) && (!fv('equip', 'status') || e.status === fv('equip', 'status'))
    && (!fv('equip', 'crit') || e.crit === fv('equip', 'crit')) && (!fv('equip', 'setor') || e.setor === fv('equip', 'setor')));
  return `<div class="bar"><h2>Inventário de equipamentos</h2><button onclick="editEquip()">Novo equipamento</button></div>
  ${fbar('equip', ftxt('equip', 'q', 'Patrimônio / tag, nome, série...') + fsel('equip', 'cli', 'Cliente', cliOpts()) + fsel('equip', 'status', 'Status', uniq(db.equip.map(e => e.status))) + fsel('equip', 'crit', 'Criticidade', uniq(db.equip.map(e => e.crit))) + fsel('equip', 'setor', 'Setor', uniq(db.equip.map(e => e.setor))), list.length, db.equip.length)}
  <div class="wrap"><table><tr><th>Patrimônio / tag</th><th>Equipamento</th><th>Fabricante / modelo</th><th>Setor</th><th>Crit.</th><th>Serviços</th><th>Status</th><th></th></tr>
  ${list.map(e => `<tr><td>${esc(e.tag)}</td><td>${esc(e.nome)}<br><span class="l">${clienteNome(e) ? esc(clienteNome(e)) + ' · ' : ''}S/N ${esc(e.serie)}</span></td><td>${esc(e.fabricante)} ${esc(e.modelo)}</td><td>${esc(e.setor)}</td>
   <td><span class="tag ${e.crit === 'Alta' ? 'bad' : e.crit === 'Média' ? 'warn' : 'ok'}">${esc(e.crit)}</span></td>
   <td>${[['perPrev', 'Preventiva'], ['perCal', 'Calibração'], ['perQual', 'Qualif. térmica']].filter(([k]) => e[k]).map(([k, t]) => `<span class="tag svc-tag">${t} · ${perTxt(e[k])}</span>`).join(' ') || '<span class="l">nenhum</span>'}</td>
   <td><span class="tag ${e.status === 'Operacional' ? 'ok' : e.status === 'Em manutenção' ? 'warn' : 'bad'}">${esc(e.status)}</span></td>
   <td><button class="sm ghost" onclick="editEquip('${e.id}')">Editar</button> <button class="sm danger" onclick="delEquip('${e.id}')">Excluir</button></td></tr>`).join('')}
  </table></div>${list.length ? '' : '<div class="empty">Nenhum equipamento.</div>'}`;
}

function vTec() {
  const q = fv('tec', 'q').toLowerCase();
  const list = db.tecnicos.filter(t => !q || [t.nome, t.registro].join(' ').toLowerCase().includes(q)).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  const feitas = n => db.os.filter(o => norm(o.tecnico) === norm(n)).length;
  return `<div class="bar"><h2>Técnicos</h2><button onclick="editTec()">Novo técnico</button></div>
  ${fbar('tec', ftxt('tec', 'q', 'Nome ou registro...'), list.length, db.tecnicos.length)}
  <div class="wrap"><table><tr><th>Nome</th><th>Registro profissional (CFT / CREA)</th><th>Assinatura</th><th>OS realizadas</th><th></th></tr>
  ${list.map(t => `<tr><td>${esc(t.nome)}</td><td>${esc(t.registro)}</td><td>${t.assinatura ? '<img src="' + t.assinatura + '" alt="" style="height:28px">' : '-'}</td><td>${feitas(t.nome)}</td>
   <td><button class="sm ghost" onclick="editTec('${t.id}')">Editar</button> <button class="sm danger" onclick="delTec('${t.id}')">Excluir</button></td></tr>`).join('')}
  </table></div>${list.length ? '' : '<div class="empty">' + (db.tecnicos.length ? 'Nenhum técnico com esse filtro.' : 'Nenhum técnico cadastrado.') + '</div>'}
  <p class="note">Os técnicos cadastrados aparecem numa lista no campo "Técnico responsável" da ordem de serviço. O nome (e o registro, se informado) sai nos laudos.</p>`;
}
function editTec(id) {
  tmpImgs = {};
  const t = db.tecnicos.find(x => x.id === id) || {};
  openForm(id ? 'Editar técnico' : 'Novo técnico', `
    ${fld('nome', 'Nome do técnico', t.nome, 'text', 'required')}
    ${fld('registro', 'Registro profissional (ex.: CFT-PA Nº 123456)', t.registro)}
    ${imgField('assinatura', 'Assinatura digital (imagem; sai no final do certificado)', t.assinatura)}
    ${t.assinatura ? '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="rmAss" style="width:auto"> Remover a assinatura atual</label>' : ''}`,
    d => {
      const rm = d.rmAss; delete d.rmAss;
      d.assinatura = rm ? '' : (tmpImgs.assinatura || t.assinatura || '');
      if (db.tecnicos.some(x => x.id !== id && norm(x.nome) === norm(d.nome))) { alert('Já existe um técnico com esse nome.'); return false; }
      if (id) { const antigo = t.nome; Object.assign(t, d); if (antigo !== t.nome) db.os.forEach(o => { if (norm(o.tecnico) === norm(antigo)) o.tecnico = t.nome; }); }
      else db.tecnicos.push({ id: uid(), ...d });
      save();
    });
}
function delTec(id) { if (confirm('Excluir este técnico da lista? As OS já registradas continuam com o nome dele.')) { db.tecnicos = db.tecnicos.filter(t => t.id !== id); save(); } }

function vCat() {
  const q = fv('cat', 'q').toLowerCase();
  const list = db.catalogo.filter(c => !q || [c.nome, c.funcao].join(' ').toLowerCase().includes(q)).sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
  return `<div class="bar"><h2>Catálogo de tipos de equipamento</h2><button onclick="editCat()">Novo tipo</button></div>
  ${fbar('cat', ftxt('cat', 'q', 'Nome ou função...'), list.length, db.catalogo.length)}
  <div class="wrap"><table><tr><th>Tipo de equipamento</th><th>Função</th><th>Preventiva</th><th>Calibração</th><th>Qualif. térmica</th><th></th></tr>
  ${list.map(c => `<tr><td>${esc(c.nome)}</td><td>${esc(c.funcao)}</td><td>${esc(perTxt(c.perPrev))}</td><td>${esc(perTxt(c.perCal))}</td><td>${esc(perTxt(c.perQual))}</td>
   <td><button class="sm ghost" onclick="editCat('${c.id}')">Editar</button> <button class="sm danger" onclick="delCat('${c.id}')">Excluir</button></td></tr>`).join('')}
  </table></div>${list.length ? '' : '<div class="empty">Nenhum tipo encontrado.</div>'}
  <p class="note">Estes tipos aparecem na lista ao cadastrar um equipamento, que já preenche função e periodicidades sugeridas (você pode alterar).</p>`;
}
function editCat(id) {
  const c = db.catalogo.find(x => x.id === id) || {};
  openForm(id ? 'Editar tipo' : 'Novo tipo de equipamento', `
    ${fld('nome', 'Tipo de equipamento', c.nome, 'text', 'required')}
    ${fld('funcao', 'Função', c.funcao)}
    <fieldset class="svcs"><legend>Periodicidade sugerida</legend>
      <div class="two">${catPerField('perPrev', 'Preventiva', c.perPrev)}${catPerField('perCal', 'Calibração', c.perCal)}</div>
      ${catPerField('perQual', 'Qualificação térmica', c.perQual)}
    </fieldset>`,
    d => {
      if (db.catalogo.some(x => x.id !== id && norm(x.nome) === norm(d.nome))) { alert('Este tipo já existe no catálogo.'); return false; }
      if (id) Object.assign(c, d); else db.catalogo.push({ id: uid(), ...d }); save();
    });
  CAT_PER.forEach(catPerInit);
}
const CAT_PER = ['perPrev', 'perCal', 'perQual'];
function catPerField(n, titulo, v) {
  return `<div><label>${titulo}<select id="cs_${n}" onchange="catPerSel('${n}')"><option value="">Não se aplica</option>${PERIODOS.map(([t, d]) => `<option value="${d}">${t} (${d} dias)</option>`).join('')}<option value="custom">Personalizado (informar dias)</option></select></label>
    <label id="cc_${n}" class="pcus">Intervalo em dias<b class="req"> *</b><input name="${n}" type="number" min="1" value="${esc(v)}"></label></div>`;
}
function catPerInit(n) {
  const i = form.elements[n], s = $('#cs_' + n), v = String(i.value || '');
  s.value = !v ? '' : PERIODOS.some(p => String(p[1]) === v) ? v : 'custom';
  $('#cc_' + n).style.display = s.value === 'custom' ? '' : 'none'; i.required = s.value === 'custom';
}
function catPerSel(n) {
  const i = form.elements[n], s = $('#cs_' + n), custom = s.value === 'custom';
  if (!custom) i.value = s.value; else if (PERIODOS.some(p => String(p[1]) === i.value)) i.value = '';
  $('#cc_' + n).style.display = custom ? '' : 'none'; i.required = custom; if (custom) i.focus();
}
function delCat(id) { if (confirm('Excluir este tipo do catálogo? Equipamentos já cadastrados não são alterados.')) { db.catalogo = db.catalogo.filter(c => c.id !== id); save(); } }

function osTable(list, actions = true) {
  if (!list.length) return '<div class="empty">Nenhuma ordem de serviço.</div>';
  return `<div class="wrap"><table><tr><th>Nº</th><th>Equipamento</th><th>Tipo</th><th>Prioridade</th><th>Abertura</th><th>Status</th><th>Custo</th>${actions ? '<th></th>' : ''}</tr>
  ${list.map(o => `<tr><td>${esc(o.numero)}</td><td>${esc(equipName(o.equipId))}<br><span class="l">${esc(o.descricao)}</span></td><td>${esc(o.tipo)}</td>
   <td><span class="tag ${o.prioridade === 'Urgente' ? 'bad' : o.prioridade === 'Alta' ? 'warn' : ''}">${esc(o.prioridade)}</span></td>
   <td>${fmtD(o.abertura)}</td><td><span class="tag ${o.status === 'Concluída' ? 'ok' : 'warn'}">${esc(o.status)}</span></td><td>${brl(o.custo)}</td>
   ${actions ? `<td><button class="sm ghost" onclick="editOS('${o.id}')">Abrir</button> <button class="sm ghost" onclick="printLaudo('${o.id}')">${docLabel(o)}</button><button class="sm danger" onclick="delOS('${o.id}')">Excluir</button></td>` : ''}</tr>`).join('')}
  </table></div>`;
}

function vOS() {
  const q = fv('os', 'q').toLowerCase();
  const list = db.os.filter(o => {
    const e = eqDe(o);
    return (!q || [o.numero, e.tag, e.nome, o.descricao, o.tecnico, clienteNome(e)].join(' ').toLowerCase().includes(q))
      && (!fv('os', 'status') || o.status === fv('os', 'status')) && (!fv('os', 'tipo') || o.tipo === fv('os', 'tipo'))
      && (!fv('os', 'prio') || o.prioridade === fv('os', 'prio')) && (!fv('os', 'cli') || e.clienteId === fv('os', 'cli'))
      && (!fv('os', 'de') || o.abertura >= fv('os', 'de')) && (!fv('os', 'ate') || o.abertura <= fv('os', 'ate'));
  }).sort((a, b) => b.abertura.localeCompare(a.abertura));
  return `<div class="bar"><h2>Ordens de serviço</h2><button onclick="editOS()" ${db.equip.length ? '' : 'disabled title="Cadastre um equipamento antes"'}>Nova OS</button></div>
  ${fbar('os', ftxt('os', 'q', 'Nº, equipamento, técnico...') + fsel('os', 'status', 'Status', ['Aberta', 'Em andamento', 'Concluída']) + fsel('os', 'tipo', 'Tipo', ['Corretiva', 'Preventiva', 'Calibração', 'Qualificação térmica']) + fsel('os', 'prio', 'Prioridade', uniq(db.os.map(o => o.prioridade))) + fsel('os', 'cli', 'Cliente', cliOpts()) + fdate('os', 'de', 'Aberta de') + fdate('os', 'ate', 'até'), list.length, db.os.length)}
  ${osTable(list)}`;
}

function vPrev() {
  const rows = [];
  db.equip.forEach(e => ['prev', 'cal', 'qual'].forEach(k => {
    const d = nextDue(e, k); if (d) rows.push({ e, k, d });
  }));
  rows.sort((a, b) => a.d.localeCompare(b.d));
  const q = fv('prev', 'q').toLowerCase();
  const all = rows.length;
  const rws = rows.filter(({ e, k, d }) => (!q || [e.tag, e.nome, clienteNome(e)].join(' ').toLowerCase().includes(q))
    && (!fv('prev', 'tipo') || k === fv('prev', 'tipo')) && (!fv('prev', 'sit') || dueStatus(d)[1] === fv('prev', 'sit'))
    && (!fv('prev', 'cli') || e.clienteId === fv('prev', 'cli')));
  return `<div class="bar"><h2>Programação: preventivas, calibrações e qualificações térmicas</h2></div>
  ${fbar('prev', ftxt('prev', 'q', 'Tag, equipamento, cliente...') + fsel('prev', 'tipo', 'Tipo', [['prev', 'Preventiva'], ['cal', 'Calibração'], ['qual', 'Qualificação térmica']]) + fsel('prev', 'sit', 'Situação', [['bad', 'Vencidas'], ['warn', 'A vencer'], ['ok', 'Em dia']]) + fsel('prev', 'cli', 'Cliente', cliOpts()), rws.length, all)}
  <div class="wrap"><table><tr><th>Equipamento</th><th>Tipo</th><th>Última</th><th>Próxima</th><th>Situação</th><th></th></tr>
  ${rws.map(({ e, k, d }) => { const [t, c] = dueStatus(d);
    return `<tr><td>${esc(e.tag)} - ${esc(e.nome)}</td><td>${KIND[k].label}</td>
    <td>${fmtD(e[KIND[k].ult])}</td><td>${fmtD(d)}</td><td><span class="tag ${c}">${t}</span></td>
    <td><button class="sm ghost" onclick="genOS('${e.id}','${k}')">Gerar OS</button></td></tr>`; }).join('')}
  </table></div>${rws.length ? '' : '<div class="empty">' + (all ? 'Nenhum item com esses filtros.' : 'Defina periodicidades no cadastro dos equipamentos.') + '</div>'}
  <p class="note">Ao concluir uma OS preventiva ou de calibração, a data da última execução é atualizada automaticamente.</p>`;
}

function vInd() {
  const p = +(window._per || 365);
  const i = indicators(p);
  const card = (n, l, m) => `<div class="card"><div class="n">${n}</div><div class="l">${l}</div><div class="l">${m}</div></div>`;
  return `<div class="bar"><h2>Indicadores</h2><select style="max-width:180px" onchange="window._per=this.value;render()">
   ${[[30, 'Últimos 30 dias'], [90, 'Últimos 90 dias'], [365, 'Últimos 12 meses']].map(([v, l]) => `<option value="${v}" ${v === p ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="grid">
   ${card(f1(i.cumprPrev, '%'), 'Cumprimento de preventivas', 'meta ≥ 90%')}
   ${card(f1(i.calOk, '%'), 'Calibrações em dia', 'meta 100%')}
   ${card(f1(i.mttr, ' h'), 'MTTR (tempo médio de reparo)', `${i.nCorr} corretivas no período`)}
   ${card(f1(i.mtbf, ' h'), 'MTBF (tempo médio entre falhas)', 'estimado: parque × horas / nº falhas')}
   ${card(f1(i.disp, '%'), 'Disponibilidade', 'meta ≥ 95%')}
   ${card(f1(i.razao), 'Razão corretiva / preventiva', 'quanto menor, melhor')}
   ${card(brl(i.custo), 'Custo de manutenção', 'soma dos custos das OS')}
  </div>
  <p class="note">O MTBF assume operação contínua (24 h) de todos os equipamentos cadastrados, o que é uma aproximação. Ajuste conforme o regime de uso real.</p>`;
}

// ---------- formulários ----------
const dlg = $('#dlg'), form = $('#form');
const reqMark = extra => /\brequired\b/.test(extra) ? '<b class="req" title="Obrigatório"> *</b>' : '';
const fld = (name, label, v = '', type = 'text', extra = '') => `<label>${label}${reqMark(extra)}<input name="${name}" type="${type}" value="${esc(v)}" ${extra}></label>`;
const sel = (name, label, opts, v, extra = '') => `<label>${label}${reqMark(extra)}<select name="${name}" ${extra}>${opts.map(o => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(txt)}</option>`; }).join('')}</select></label>`;
function openForm(title, html, onSave) {
  form.innerHTML = `<h3 style="margin-top:0">${title}</h3>${html}<div class="actions"><button type="button" class="ghost" onclick="dlg.close()">Cancelar</button><button type="submit">Salvar</button></div>`;
  if (/\brequired\b/.test(html)) form.querySelector('.actions').insertAdjacentHTML('beforebegin', '<p class="note"><b class="req">*</b> campo obrigatório</p>');
  form.onsubmit = ev => { ev.preventDefault(); if (onSave(Object.fromEntries(new FormData(form)), form) === false) return; dlg.close(); };
  dlg.showModal();
}

function editEquip(id) {
  const e = equipById(id) || { crit: 'Média', status: 'Operacional' };
  e.clienteId = e.clienteId || (db.clientes.find(c => c.nome === e.cliente) || {}).id || '';
  openForm(id ? 'Editar equipamento' : 'Novo equipamento', `
    ${fld('tag', 'Patrimônio / tag', e.tag, 'text', `required oninput="dupCheck(this,'tag','${id || ''}','Patrimônio / tag')"`)}
    ${sel('nome', 'Tipo de equipamento (lista do Catálogo)', [['', '- selecione -'], ...uniq([...db.catalogo.map(c => c.nome), e.nome])], e.nome || '', 'required onchange="catPick(this)"')}
    <p class="note" style="margin-top:-4px">Não encontrou o tipo? Cadastre na aba <b>Catálogo</b>. O patrimônio / tag não pode se repetir.</p>
    <fieldset class="svcs"><legend>Serviços deste equipamento</legend>
      <p class="note" style="margin-top:0">Marque o que será feito neste equipamento. Cada item marcado entra na Programação.</p>
      ${svcBox('prev', 'Preventiva', 'Manutenção preventiva e checklist', e)}
      ${svcBox('cal', 'Calibração', 'Calibração com padrões e certificado', e)}
      ${svcBox('qual', 'Qualificação térmica', 'Mapeamento e laudo de qualificação', e)}
    </fieldset>
    ${sel('clienteId', 'Cliente (cadastre na aba Clientes)', [['', '- selecione -'], ...db.clientes.map(c => [c.id, c.nome])], e.clienteId)}
    <div class="two">${fld('fabricante', 'Fabricante', e.fabricante)}${fld('modelo', 'Modelo', e.modelo)}</div>
    <div class="two">${fld('funcao', 'Função do equipamento', e.funcao)}${sel('checklistId', 'Modelo de checklist (preventiva)', [['', '- nenhum -'], ...db.checklists.map(c => [c.id, c.nome])], e.checklistId)}</div>
    <div class="two">${fld('serie', 'Nº de série', e.serie)}${fld('setor', 'Setor', e.setor)}</div>
    <div class="two">${sel('crit', 'Criticidade', ['Alta', 'Média', 'Baixa'], e.crit)}${sel('status', 'Status', ['Operacional', 'Em manutenção', 'Inativo'], e.status)}</div>
    <div class="two">${fld('aquisicao', 'Data de aquisição', e.aquisicao, 'date')}${fld('garantia', 'Fim da garantia', e.garantia, 'date')}</div>
`,
    d => {
      for (const k of SVCS) { if (!d['svc_' + k]) { d['per' + SVC_N[k]] = ''; } delete d['svc_' + k]; }
      for (const [k, rot] of [['tag', 'Patrimônio / tag']]) { const o = dupDe(k, d[k], id); if (o) { alert(rot + ' já cadastrado no equipamento ' + (o.tag || o.nome) + '.'); return false; } }
      if (id) Object.assign(e, d); else db.equip.push({ id: uid(), ...d }); save();
    });
  SVCS.forEach(k => { perInit(k); svcSync(k); });
}
const SVCS = ['prev', 'cal', 'qual'], SVC_N = { prev: 'Prev', cal: 'Cal', qual: 'Qual' };
function svcBox(k, titulo, desc, e) {
  const N = SVC_N[k], on = !!e['per' + N];
  return `<div class="svc ${on ? 'on' : ''}" id="svc_${k}"><label class="svc-h"><input type="checkbox" name="svc_${k}" ${on ? 'checked' : ''} onchange="svcSync('${k}')"><span><b>${titulo}</b><small>${desc}</small></span></label>
    <div class="two svc-b"><div><label>Periodicidade<b class="req"> *</b><select id="psel_${k}" onchange="perSel('${k}')"><option value="">- selecione -</option>${PERIODOS.map(([n, d]) => `<option value="${d}">${n} (${d} dias)</option>`).join('')}<option value="custom">Personalizado (informar dias)</option></select></label>
      <label id="pcus_${k}" class="pcus">Intervalo em dias<b class="req"> *</b><input name="per${N}" type="number" min="1" value="${esc(e['per' + N])}"></label></div>
    ${fld('ult' + N, 'Última realização', e['ult' + N], 'date')}</div></div>`;
}
const PERIODOS = [['Mensal', 30], ['Bimestral', 60], ['Trimestral', 90], ['Quadrimestral', 120], ['Semestral', 180], ['Anual', 365], ['Bienal', 730]];
const perTxt = d => { const p = PERIODOS.find(x => x[1] === +d); return p ? p[0] : (d ? d + ' dias' : ''); };
function perInit(k) {
  const per = form.elements['per' + SVC_N[k]], s = $('#psel_' + k), v = String(per.value || '');
  s.value = !v ? '' : PERIODOS.some(p => String(p[1]) === v) ? v : 'custom';
  $('#pcus_' + k).style.display = s.value === 'custom' ? '' : 'none';
}
function perSel(k) {
  const per = form.elements['per' + SVC_N[k]], s = $('#psel_' + k), custom = s.value === 'custom';
  if (!custom) per.value = s.value; else if (PERIODOS.some(p => String(p[1]) === per.value)) per.value = '';
  $('#pcus_' + k).style.display = custom ? '' : 'none'; per.required = custom && !per.disabled;
  if (custom) per.focus();
}
function svcSync(k) {
  const box = form.elements['svc_' + k], N = SVC_N[k], on = box.checked, s = $('#psel_' + k);
  $('#svc_' + k).classList.toggle('on', on);
  const per = form.elements['per' + N], ult = form.elements['ult' + N];
  per.disabled = ult.disabled = s.disabled = !on; s.required = on; per.required = on && s.value === 'custom';
}
const norm = s => String(s || '').trim().toLowerCase();
function dupDe(campo, valor, selfId) { const v = norm(valor); return v ? db.equip.find(x => x.id !== selfId && norm(x[campo]) === v) : null; }
function dupCheck(inp, campo, selfId, rot) { const o = dupDe(campo, inp.value, selfId); inp.setCustomValidity(o ? `${rot} já cadastrado no equipamento ${o.tag || o.nome}.` : ''); }
function catPick(s) {
  const c = db.catalogo.find(x => x.nome === s.value); if (!c) return;
  const set = (n, v) => { const i = form.elements[n]; if (i && !i.value && v) i.value = v; };
  set('funcao', c.funcao);
  SVCS.forEach(k => { const N = SVC_N[k], box = form.elements['svc_' + k]; if (c['per' + N] && !box.checked && !form.elements['per' + N].value) { box.checked = true; form.elements['per' + N].value = c['per' + N]; perInit(k); svcSync(k); } });
}
function delEquip(id) {
  if (!confirm('Excluir este equipamento e suas ordens de serviço?')) return;
  db.equip = db.equip.filter(e => e.id !== id); db.os = db.os.filter(o => o.equipId !== id); save();
}

function osCli(cid, sel) {
  const s = document.querySelector('#form [name=equipId]'); if (!s) return;
  const cur = sel || s.value;
  const lista = db.equip.filter(e => e.clienteId === cid);
  s.innerHTML = '<option value="">' + (cid ? (lista.length ? '- selecione o equipamento -' : '- este cliente não tem equipamentos -') : '- escolha o cliente primeiro -') + '</option>' + lista.map(e => `<option value="${e.id}" ${e.id === cur ? 'selected' : ''}>${esc(e.tag)} - ${esc(e.nome)}</option>`).join('');
}
function editOS(id, preset = {}) {
  const o = db.os.find(x => x.id === id) || { tipo: 'Corretiva', prioridade: 'Normal', status: 'Aberta', abertura: nowLocal(), ...preset };
  openForm(id ? `OS ${esc(o.numero)}` : 'Nova ordem de serviço', `
    ${sel('clienteOS', 'Cliente', [['', '- selecione o cliente -'], ...db.clientes.map(c => [c.id, c.nome])], (equipById(o.equipId) || {}).clienteId || '', 'required onchange="osCli(this.value)"')}
    ${o.origemNum ? `<p class="note">Corretiva aberta pela preventiva <b>${esc(o.origemNum)}</b>.</p>` : ''}
    <label>Equipamento <b class="req"> *</b><select name="equipId" required></select></label>
    <div class="two">${sel('tipo', 'Tipo', ['Corretiva', 'Preventiva', 'Calibração', 'Qualificação térmica'], o.tipo)}${sel('prioridade', 'Prioridade', ['Normal', 'Alta', 'Urgente'], o.prioridade)}</div>
    <label>Descrição do problema / serviço<textarea name="descricao" rows="2" required>${esc(o.descricao)}</textarea></label>
    <div class="two">${fld('abertura', 'Abertura', o.abertura, 'datetime-local', 'required')}<label>Fechamento <b class="req" id="fecReq" hidden> *</b><small id="fecHint" class="l"></small><input name="fechamento" type="datetime-local" value="${esc(o.fechamento)}"></label></div>
    <div class="two">${sel('status', 'Status', ['Aberta', 'Em andamento', 'Concluída'], o.status, 'onchange="osSync(true)"')}${sel('tecnico', 'Técnico responsável', [['', '- selecione -'], ...uniq([...db.tecnicos.map(t => t.nome), o.tecnico])], o.tecnico || '', 'required')}</div>
    <label>Causa / solução aplicada (nos certificados: observações / notas técnicas)<textarea name="solucao" rows="2">${esc(o.solucao)}</textarea></label>
    <div class="two">${fld('custo', 'Custo (R$)', o.custo, 'number', 'min=0 step=0.01')}</div>
    ${chkBlock(o)}${calibBlock(o)}${qualBlock(o)}${corrBlock(o)}${encBlock(o)}`,
    d => {
      delete d.clienteOS;
      if (d.status !== 'Concluída') d.fechamento = '';
      else if (!d.fechamento) { alert('Informe a data de fechamento para concluir a OS.'); return false; }
      if (d.fechamento && new Date(d.fechamento) < new Date(d.abertura)) { alert('O fechamento não pode ser anterior à abertura.'); return false; }
      if (!parseOSExtras(d, id ? o : null)) return false;
      let os = o;
      if (id) Object.assign(o, d); else { db.seq++; os = { id: uid(), numero: 'OS-' + String(db.seq).padStart(4, '0'), ...d }; db.os.push(os); }
      const novas = abrirCorretivas(os);
      const eq = equipById(d.equipId);
      if (eq) {
        if (d.status === 'Concluída') {
          const day = d.fechamento.slice(0, 10);
          if (d.tipo === 'Preventiva') eq.ultPrev = day;
          if (d.tipo === 'Calibração') eq.ultCal = day;
          if (d.tipo === 'Qualificação térmica') eq.ultQual = day;
        }
        const aberta = db.os.some(x => x.equipId === eq.id && x.tipo === 'Corretiva' && x.status !== 'Concluída');
        if (eq.status !== 'Inativo') eq.status = aberta ? 'Em manutenção' : 'Operacional';
      }
      save();
      if (novas.length) alert(`Item não conforme: ${novas.length > 1 ? 'foram abertas as OS corretivas' : 'foi aberta a OS corretiva'} ${novas.join(', ')}, vinculada${novas.length > 1 ? 's' : ''} à preventiva ${os.numero}.`);
    });
  osCli(document.querySelector('#form [name=clienteOS]').value, o.equipId);
  osSync(false);
  form.elements.abertura.addEventListener('input', () => osSync(false));
}
// cada item NC da preventiva gera uma OS corretiva vinculada (uma só por item; ao editar, só atualiza o texto)
function abrirCorretivas(p) {
  const novas = [];
  if (p.tipo !== 'Preventiva' || !p.chk) return novas;
  p.chk.itens.forEach(it => {
    if (it.r !== 'NC') return;
    const txt = `Aberta devido à preventiva ${p.numero}, que identificou o problema. Item não conforme: ${it.t}. Problema encontrado: ${it.j}`;
    const ex = it.osId && db.os.find(x => x.id === it.osId);
    if (ex) { if (ex.status !== 'Concluída') ex.descricao = txt; return; }
    db.seq++;
    const n = { id: uid(), numero: 'OS-' + String(db.seq).padStart(4, '0'), tipo: 'Corretiva', prioridade: 'Normal', status: 'Aberta', abertura: nowLocal(), fechamento: '', equipId: p.equipId, descricao: txt, tecnico: p.tecnico, solucao: '', custo: '', chk: null, qual: null, leituras: [], padraoIds: [], cals: [], padraoId: '', origemId: p.id, origemNum: p.numero };
    db.os.push(n); it.osId = n.id; novas.push(n.numero);
  });
  return novas;
}
function osSync(fromChange) {
  const st = form.elements.status.value, fec = form.elements.fechamento, on = st === 'Concluída';
  fec.disabled = !on; fec.required = on; fec.min = form.elements.abertura.value || '';
  $('#fecReq').hidden = !on;  $('#fecHint').textContent = on ? '' : ' (liberado quando o status for Concluída)';
  if (!on) fec.value = '';
  else if (fromChange && !fec.value) { const n = nowLocal(), ab = form.elements.abertura.value; fec.value = ab && n < ab ? ab : n; }
}
function delOS(id) { if (confirm('Excluir esta OS?')) { db.os = db.os.filter(o => o.id !== id); save(); } }
function genOS(equipId, k) {
  tab = 'os'; render();
  editOS(null, { equipId, tipo: KIND[k].tipo, descricao: KIND[k].desc });
}

// ---------- menu (barra lateral no computador; barra inferior + "Mais" no celular) ----------
const ICON = {
  dashboard: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  ind: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  os: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5',
  prev: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 10h18M8 3v4M16 3v4',
  chk: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9',
  equip: 'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 21h8M12 17v4',
  cli: 'M3 21V8l7-4v17M10 21h11V11l-6-3M7 10v.01M7 14v.01M14 14v.01M14 18v.01',
  tec: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  pad: 'M12 3v4M7 7h10l1 14H6zM9 12h6',
  cat: 'M4 5h16M4 12h16M4 19h16'
};
const svgI = k => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICON[k]}"/></svg>`;
const MENU = [
  { g: 'Visão geral', it: [['dashboard', 'Painel'], ['ind', 'Indicadores']] },
  { g: 'Serviços', it: [['os', 'Ordens de serviço'], ['prev', 'Programação'], ['pad', 'Padrões'], ['chk', 'Checklists']] },
  { g: 'Cadastros', it: [['equip', 'Equipamentos'], ['cli', 'Clientes'], ['tec', 'Técnicos'], ['cat', 'Catálogo']] }
];
const MENU_FIXO = ['dashboard', 'equip', 'os', 'prev']; // atalhos da barra inferior no celular; o resto vai para "Mais"
const rotuloCurto = { equip: 'Equipam.', prev: 'Agenda', os: 'OS' };
(function montarMenu() {
  $('#nav').innerHTML = MENU.map(m => `<div class="ng">${m.g}</div>` + m.it.map(([k, l]) => `<button data-tab="${k}">${svgI(k)}<span>${l}</span></button>`).join('')).join('');
  const todos = MENU.flatMap(m => m.it);
  $('#more .mgrid').innerHTML = todos.filter(([k]) => !MENU_FIXO.includes(k)).map(([k, l]) => `<button data-tab="${k}">${svgI(k)}${l}</button>`).join('');
  $('#bnav').innerHTML = MENU_FIXO.map(k => `<button data-tab="${k}">${svgI(k)}<span>${rotuloCurto[k] || todos.find(t => t[0] === k)[1]}</span></button>`).join('')
    + '<button id="moreBtn" aria-expanded="false" aria-controls="more"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>Mais</span></button>';
})();

// ---------- topo ----------
$('#nav').onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) { tab = b.dataset.tab; render(); scrollTo(0, 0); } };
// menu do celular (barra inferior + painel "Mais")
function closeMore() { $('#more').hidden = true; $('#moreBg').hidden = true; $('#moreBtn').setAttribute('aria-expanded', 'false'); }
$('#moreBtn').onclick = () => { const abrir = $('#more').hidden; closeMore(); if (abrir) { $('#more').hidden = false; $('#moreBg').hidden = false; $('#moreBtn').setAttribute('aria-expanded', 'true'); } };
$('#moreBg').onclick = closeMore;
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMore(); });
$('#bnav').addEventListener('click', e => { const b = e.target.closest('button[data-tab]'); if (b) { tab = b.dataset.tab; render(); scrollTo(0, 0); } });
$('#more').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.tab) { tab = b.dataset.tab; render(); scrollTo(0, 0); }
  else if (b.dataset.proxy) { closeMore(); document.getElementById(b.dataset.proxy).click(); }
});
$('#exportBtn').onclick = async () => {
  const arquivos = {};
  for (const p of db.padroes) for (const c of arqsDe(p)) { const b = await getFile(c.fid).catch(() => null); if (b) arquivos[c.fid] = await blobB64(b); }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...db, _arquivos: arquivos }, null, 2)], { type: 'application/json' }));
  a.download = `engclin-${today()}.json`; a.click();
};
$('#importBtn').onclick = () => $('#importFile').click();
$('#importFile').onchange = async ev => {
  try {
    const d = JSON.parse(await ev.target.files[0].text());
    if (!Array.isArray(d.equip) || !Array.isArray(d.os)) throw 0;
    if (!confirm('Substituir todos os dados atuais pelo arquivo?')) return;
    const arqs = d._arquivos || {}; delete d._arquivos; d.padroes = (d.padroes || []).map(migraPad);
    for (const [fid, b64] of Object.entries(arqs)) await putFile(fid, b64Blob(b64, 'application/pdf'));
    db = { seq: 0, padroes: [], clientes: [], checklists: [CHECKLIST_EXEMPLO], catalogo: CATALOGO_PADRAO.map(c => ({ ...c })), tecnicos: tecsPadrao(), ...d, empresa: { ...EMPRESA_PADRAO, ...(d.empresa || {}) } }; save();
  } catch { alert('Arquivo inválido.'); }
  ev.target.value = '';
};
$('#demoBtn').onclick = () => {
  if (db.equip.length && !confirm('Isto substitui os dados atuais. Continuar?')) return;
  const e = (tag, nome, fab, mod, setor, crit, perPrev, perCal, off) => ({
    id: uid(), tag, nome, fabricante: fab, modelo: mod, serie: 'SN' + Math.floor(Math.random() * 90000 + 10000), setor, crit,
    status: 'Operacional', clienteId: 'cli-demo', checklistId: tag === 'EQ-003' ? 'chk-exemplo' : '', aquisicao: addDays(today(), -900), perPrev, ultPrev: addDays(today(), -off), perCal, ultCal: addDays(today(), -off)
  });
  const pad = (tipo, nome, fab, mod, faixa, un, inc, validadeDias) => ({
    id: uid(), tipo, nome, fabricante: fab, modelo: mod, serie: 'P' + Math.floor(Math.random() * 9000 + 1000), codigo: 'Neo - ' + Math.floor(Math.random() * 90 + 10), selo: 'INM-' + Math.floor(Math.random() * 90000 + 10000),
    faixa, unidade: un, incerteza: inc, incU: +(inc.match(/[\d,.]+/) || ['0'])[0].replace(',', '.'), incK: 2, certNum: 'CAL-' + Math.floor(Math.random() * 9000 + 1000), laboratorio: 'Laboratório exemplo (RBC)',
    dataCal: addDays(today(), validadeDias - 365), validade: addDays(today(), validadeDias)
  });
  db = { seq: 0, os: [], empresa: db.empresa, checklists: db.checklists, catalogo: db.catalogo, tecnicos: db.tecnicos,
    clientes: [{ id: 'cli-demo', nome: 'Cliente Exemplo', doc: '00.000.000/0001-00', endereco: 'Rua Exemplo, 100', cidade: 'Belém', uf: 'PA', cep: '66000-000', contato: '(91) 90000-0000' }],
    padroes: [
    pad('Termômetro', 'Termômetro padrão digital', 'Fluke', '1524', '-50 a 300', '°C', 'U = 0,05 °C', 200),
    pad('Balança / massa', 'Massa padrão 1 kg (E2)', 'Kern', 'E2-1kg', '1', 'kg', 'U = 0,5 mg', 20),
    pad('Tacômetro', 'Tacômetro óptico', 'Minipa', 'MDT-2238', '5 a 99999', 'rpm', 'U = 1 rpm', -5),
  ], equip: [
    e('EQ-001', 'Monitor multiparâmetro', 'Philips', 'MX450', 'UTI', 'Alta', 180, 365, 200),
    e('EQ-002', 'Ventilador pulmonar', 'Dräger', 'Evita V300', 'UTI', 'Alta', 90, 180, 60),
    e('EQ-003', 'Balança pediátrica', 'Toledo', '2124PP', 'Enfermaria', 'Média', 180, 365, 100),
    e('EQ-004', 'Desfibrilador', 'Instramed', 'Cardiomax', 'Pronto-socorro', 'Alta', 90, 365, 120),
    e('EQ-005', 'Autoclave', 'Baumer', 'AB-75', 'CME', 'Alta', 120, 365, 30),
    e('EQ-006', 'Termômetro digital', 'Incoterm', 'TD-20', 'Laboratório', 'Média', 180, 365, 30),
  ] };
  const mk = (i, tipo, dAgo, h, custo, desc, extra = {}) => {
    db.seq++; const ab = new Date(Date.now() - dAgo * DAY - new Date().getTimezoneOffset() * 6e4);
    const o = { id: uid(), numero: 'OS-' + String(db.seq).padStart(4, '0'), equipId: db.equip[i].id, tipo, prioridade: 'Normal', descricao: desc,
      abertura: ab.toISOString().slice(0, 16), fechamento: new Date(ab.getTime() + h * 36e5).toISOString().slice(0, 16), status: 'Concluída', custo, tecnico: (db.tecnicos[0] || {}).nome || '', solucao: 'Serviço executado', ...extra };
    db.os.push(o); return o;
  };
  // 1) Corretiva
  mk(1, 'Corretiva', 40, 6, 450, 'Alarme de pressão intermitente', { solucao: 'Substituído o sensor de pressão e realizado teste funcional.' });
  // 2) Preventiva (checklist do equipamento)
  const chk = db.checklists.find(x => x.id === 'chk-exemplo') || db.checklists[0];
  mk(2, 'Preventiva', 20, 3, 120, 'Preventiva semestral', chk ? { chk: { modeloId: chk.id, nome: chk.nome, itens: chk.itens.map((t, i) => ({ t, r: i === 5 ? 'NC' : 'C' })), instrumentos: chk.instrumentos.slice() } } : {});
  // 3) Calibração (termômetro, padrão de temperatura)
  const base = { padraoId: db.padroes[0].id, kfat: 2, resolucao: '0,1' };
  const leit = [[0, [0.1, 0.1, 0.2]], [25, [25.1, 25.2, 25.2]], [50, [49.9, 50.0, 49.9]]].map(([p, ev]) => { const auto = uCalc(ev, base); return { p, ev, e: mean(ev), uManual: false, u: auto.U, auto }; });
  mk(5, 'Calibração', 10, 1, 180, 'Calibração anual', { ...base, grandeza: 'Temperatura', unidade: '°C', ema: 0.5, lacre: 'L-2041', faixaCol: '0 a 50 °C',
    tempAmb: 23.4, tempInc: 0.5, umidAmb: 55, umidInc: 3, localCal: 'Realizada no cliente', leituras: leit, solucao: 'Instrumento aprovado.' });
  // 4) Qualificação térmica (autoclave, 3 sensores, ~1 h de dados)
  const t0 = new Date(Date.now() - 5 * DAY - new Date().getTimezoneOffset() * 6e4), ts = n => new Date(t0.getTime() + n * 12e4).toISOString().slice(0, 19).replace('T', ' ');
  let raw = 'Tempo	A01	A02	A03';
  for (let n = 0; n < 30; n++) { const v = n < 4 ? 100 + n * 6 : 123 + Math.sin(n) * 0.6; raw += '\n' + ts(n) + '\t' + [0, 0.3, -0.4].map(d => (v + d).toFixed(1).replace('.', ',')).join('\t'); }
  mk(4, 'Qualificação térmica', 5, 2, 600, 'Qualificação térmica de performance', { padraoId: db.padroes[0].id, qual: {
    sens: [{ cod: 'A01', modelo: 'Logger TL-1', serie: '1001', pos: 'Centro' }, { cod: 'A02', modelo: 'Logger TL-1', serie: '1002', pos: 'Canto superior' }, { cod: 'A03', modelo: 'Logger TL-1', serie: '1003', pos: 'Canto inferior' }],
    raw, foto: '', esquema: '', tipo: 'Qualificação Térmica de Performance', min: '121', max: '127', un: '°C', carga: 'Com carga', dur: '1 hora', int: '2 minutos', ciclos: '1 ciclo',
    quente: 'A01', parada: '', porta: '', ctrl: 'A01', tamb: '24', pi: '', pf: '', ei: '', ef: '' } });
  save();
};
render();

(function () {
  const btn = document.getElementById('themeBtn');
  const SOL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const LUA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>';
  const label = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    btn.innerHTML = dark ? SOL : LUA; // mostra o símbolo do modo para o qual vai mudar
    btn.title = btn.ariaLabel = dark ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  };
  label();
  btn.onclick = () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('neo.theme', t); } catch (e) {}
    label();
  };
})();
