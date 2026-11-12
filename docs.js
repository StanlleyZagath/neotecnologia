// Documentos impressos: certificado de calibração, relatório de qualificação térmica, checklist de preventiva e laudo.
// Os layouts seguem os modelos da pasta "modelo".

// logotipo principal da Neo Tecnologia: usado em todos os documentos (cabeçalho, capa e rodapé de cada página)
const LOGO = 'assets/logo-neo.jpg';
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesAno = d => `${MESES[+d.slice(5, 7) - 1]} / ${d.slice(0, 4)}`;
const docLabel = o => o.tipo === 'Calibração' ? 'Certificado' : o.tipo === 'Qualificação térmica' ? 'Relatório' : o.tipo === 'Preventiva' ? 'Checklist' : 'Laudo';
const docDia = o => (o.fechamento || o.abertura).slice(0, 10);

const tecDe = o => o.tecnico || (db.tecnicos[0] || {}).nome || '';
const tecRegistro = n => { const t = db.tecnicos.find(x => norm(x.nome) === norm(n)); return t ? t.registro : ''; };
function ensureCert(o, kind) {
  if (o.certNum) return o.certNum;
  const day = docDia(o).replace(/-/g, '');
  const pre = kind === 'cal' ? day.slice(2) : day; // calibração: AAMMDD+nn, qualificação: AAAAMMDD+nn
  const used = db.os.filter(x => x.certNum && x.certNum.startsWith(pre) && x.certNum.length === pre.length + 2).map(x => +x.certNum.slice(pre.length));
  o.certNum = pre + String((used.length ? Math.max(...used) : 0) + 1).padStart(2, '0');
  persist();
  return o.certNum;
}

// cabeçalho com logotipo e rodapé com os dados da empresa em todas as páginas
function docShell(inner, cls = '', pre = '') {
  const e = db.empresa;
  const ph = `<div class="ph"><img src="${LOGO}" alt="${esc(e.razao)}"></div>`;
  const pf = `<div class="pf"><b>${esc(e.razao)} CNPJ: ${esc(e.cnpj)} IE: ${esc(e.ie)} RUA: ${esc(e.rua)} ${esc(e.cidade)}-${esc(e.uf)} BAIRRO: ${esc(e.bairro)} CEP: ${esc(e.cep)} TELEFONE: ${esc(e.fone)}<br>e-mail: ${esc(e.email)}</b><div class="pfl"><img src="${LOGO}" alt=""></div></div>`;
  // cabeçalho e rodapé repetidos em cada página via thead/tfoot (posicionamento fixo falha na impressão)
  $('#laudo').innerHTML = `<div class="doc ${cls}">${pre}<table class="shell"><thead><tr><td>${ph}</td></tr></thead><tfoot><tr><td>${pf}</td></tr></tfoot><tbody><tr><td>${inner}</td></tr></tbody></table></div>`;
  doPrint();
}
const enderecoEmp = () => { const e = db.empresa; return `Rua ${e.rua}, ${e.bairro} – CEP ${e.cep} – ${e.cidade} – ${e.uf}`; };
const tecAssinatura = n => { const t = db.tecnicos.find(x => norm(x.nome) === norm(n)); return t && t.assinatura ? `<img class="sig-img" src="${t.assinatura}" alt="">` : ''; };
const sigImgs = () => [db.empresa.assResp, db.empresa.assEng].filter(Boolean).map(s => `<img class="sig-img" src="${s}" alt="">`).join('');
const comInc = (v, inc, un) => v === '' || v == null ? '' : `${fmtNum(v, 1)}${un}${inc !== '' && inc != null ? ` (± ${fmtNum(inc, 1)} ${un})` : ''}`;

let docOS = null;
// imprime o documento já montado em #laudo; se a OS usa um padrão com PDFs anexados, as páginas desses PDFs entram depois do relatório (uma única impressão)
async function doPrint() {
  try { await Promise.race([anexarPadrao(docOS), new Promise((_, rej) => setTimeout(() => rej(new Error('tempo esgotado')), 30000))]); } catch (e) { console.warn('anexos do padrão não incluídos', e); }
  window.print();
}
async function anexarPadrao(o) {
  const box = document.getElementById('laudo');
  box.querySelectorAll('.anxdoc').forEach(x => x.remove());
  const arqs = padsDe(o).flatMap(id => arqsDe(padById(id)));
  if (!arqs.length || !window.pdfjsLib) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  const wrap = document.createElement('div'); wrap.className = 'anxdoc';
  for (const a of arqs) {
    const blob = await getFile(a.fid).catch(() => null); if (!blob) continue;
    const pdf = await pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    for (let n = 1; n <= pdf.numPages; n++) {
      const pg = await pdf.getPage(n), vp = pg.getViewport({ scale: 2 });
      const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
      const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      await pg.render({ canvasContext: ctx, viewport: vp }).promise;
      const d = document.createElement('div'); d.className = 'anxpg';
      const im = document.createElement('img'); im.alt = ''; im.src = cv.toDataURL('image/jpeg', 0.9);
      d.appendChild(im); wrap.appendChild(d);
    }
  }
  if (wrap.children.length) { box.appendChild(wrap); await Promise.all([...wrap.querySelectorAll('img')].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))); }
}
function printLaudo(id) {
  const o = db.os.find(x => x.id === id); if (!o) return;
  docOS = o;
  const e = equipById(o.equipId) || {};
  if (o.tipo === 'Calibração' && calsDe(o).some(g => g.leituras && g.leituras.length)) return printCert(o, e);
  if (o.tipo === 'Qualificação térmica' && o.qual) { const s = parseSerie(o.qual.raw); if (s.rows && s.rows.length) return printQual(o, e, s); }
  if (o.tipo === 'Preventiva' && o.chk) return printChecklist(o, e);
  return printGenerico(o, e);
}

// ---------- laudo genérico (corretiva e demais) ----------
// aprovação e necessidade de corretiva (calibração e qualificação térmica)
const encLinha = o => o.encerr && (o.encerr.aprov || o.encerr.corr) ? `<p style="font-size:11pt;margin:0 0 8pt"><b>Equipamento aprovado:</b> ${esc(o.encerr.aprov) || '-'} &nbsp;&nbsp;&nbsp; <b>Necessita de corretiva:</b> ${esc(o.encerr.corr) || '-'}</p>` : '';
// perguntas de encerramento da corretiva
function fechaHtml(o) {
  const c = o.fecha; if (!c) return '';
  const yn = (v, os) => v ? `<b class="yn ${v === 'Sim' ? 'y' : 'n'}">${v}${v === 'Sim' && os ? ' – OS ' + esc(os) : ''}</b>` : '<b class="yn">-</b>';
  return `<h4 class="sec">Encerramento da corretiva</h4><div class="qas">
   <div class="qa"><span>Equipamento apto para uso?</span>${yn(c.apto)}</div>
   <div class="qa"><span>Necessita de calibração?</span>${yn(c.cal, c.calOS)}</div>
   <div class="qa"><span>Necessita de qualificação térmica?</span>${yn(c.qual, c.qualOS)}</div>
   <div class="qa"><span>Necessita ter validação no processo?</span>${yn(c.val)}</div></div>`;
}
function printGenerico(o, e) {
  const dt = v => v ? new Date(v).toLocaleString('pt-BR') : '-';
  const h = hours(o), emp = db.empresa, cli = clienteDe(e);
  const kv = (k, v) => `<div class="kv"><small>${k}</small><b>${esc(v) || '-'}</b></div>`;
  const stc = o.status === 'Concluída' ? 'ok' : o.status === 'Em andamento' ? 'wa' : 'ab';
  docShell(`<div class="mod">
  <div class="mtop"><div><div class="tt">Laudo técnico de serviço</div><div class="sb">Emitido em ${fmtD(today())}</div></div>
   <div class="osb"><small>OS nº</small><b>${esc(o.numero)}</b></div></div>
  <div class="chips"><span class="chip">${esc(o.tipo)}</span><span class="chip ${stc}">${esc(o.status)}</span><span class="chip">Prioridade ${esc(o.prioridade)}</span></div>
  ${o.origemNum ? `<p class="orig">Corretiva aberta devido à preventiva <b>${esc(o.origemNum)}</b>, que identificou o problema.</p>` : ''}
  <h4 class="sec">Cliente e equipamento</h4>
  <div class="kvg">${kv('Cliente', clienteNome(e))}${kv('Setor', e.setor)}${kv('Equipamento', e.nome)}${kv('Patrimônio / tag', e.tag)}${kv('Fabricante / modelo', `${e.fabricante || ''} ${e.modelo || ''}`.trim())}${kv('Nº de série', e.serie)}</div>
  <h4 class="sec">Serviço</h4>
  <div class="box"><small>Descrição do problema / serviço</small><div class="tx">${esc(o.descricao) || '-'}</div></div>
  <div class="box"><small>Causa / solução aplicada</small><div class="tx">${esc(o.solucao) || '-'}</div></div>
  <h4 class="sec">Tempos e custo</h4>
  <div class="kvg k4">${kv('Abertura', dt(o.abertura))}${kv('Fechamento', dt(o.fechamento))}${kv('Tempo de reparo', h == null ? '-' : f1(h, ' h'))}${kv('Custo', brl(o.custo))}</div>
  ${fechaHtml(o)}
  <div class="sigs2"><div><div class="im">${tecAssinatura(tecDe(o))}</div><div class="ln">Técnico responsável<br><b>${esc(tecDe(o))}</b>${tecRegistro(tecDe(o)) ? '<br>' + esc(tecRegistro(tecDe(o))) : ''}</div></div>
   <div><div class="im"></div><div class="ln">Ciente - Cliente<br><b>${esc(cli.nome || clienteNome(e))}</b></div></div></div>
  </div>`);
}

// ---------- relatório de calibração (modelo: Calibração termômetro) ----------
function printCert(o, e) {
  const emp = db.empresa, cli = clienteDe(e), k = +o.kfat || 2;
  const dia = docDia(o);
  const num = `${o.numero}-${dia.replace(/-/g, '')}`; // nº da OS + AAAAMMDD (igual à qualificação)
  if (o.certNum !== num) { o.certNum = num; persist(); }
  const prox = fmtMY(addDays(dia, +e.perCal || 365));
  // um bloco de resultados por padrão/grandeza
  const gs = calsDe(o).filter(g => g.leituras && g.leituras.length);
  const bloco = g => {
    const p = padById(g.padraoId) || {}, u = g.unidade || '', grand = g.grandeza || GRANDEZA[p.tipo] || 'Grandeza';
    const ema = g.ema === '' || g.ema == null ? null : +g.ema;
    const pts = g.leituras.map(r => { const corr = Math.abs(r.e - r.p); return { ...r, corr, ok: ema == null ? null : corr + (r.u || 0) <= ema }; });
    const res = ema == null ? 'Sem critério de aceitação definido' : pts.every(x => x.ok) ? 'Aprovado' : 'Reprovado';
    return `<h4 class="c">${esc(grand)}</h4>
  <p>${esc(grand)} Coletada<br>${g.resolucao ? 'Resolução: ' + esc(g.resolucao) + ' ' + esc(u) + '<br>' : ''}${g.faixaCol ? 'Faixa coletada: ' + esc(g.faixaCol) : ''}</p>
  <table class="res"><tr><th>Valor Nominal<br>(${esc(u)})</th><th>Valor Médio<br>Leituras (${esc(u)})</th><th>Correção<br>(${esc(u)})</th><th>Fator<br>Abrangência<br>(K)</th><th>Incerteza<br>Expandida<br>(${esc(u)})</th></tr>
   ${pts.map(r => `<tr><td>${fmtNum(r.p)}</td><td>${fmtNum(r.e)}</td><td>${fmtNum(r.corr)}</td><td>${fmtNum(k)}</td><td>${r.u == null ? '-' : fmtNum(r.u)}</td></tr>`).join('')}</table>
  <h4>Aceitação</h4><p>Erro Máximo: ${ema == null ? '-' : fmtNum(ema) + ' ' + esc(u)}<br>Correção + Incerteza Expandida ≤ Erro Máximo<br>Resultado: <b>${res}</b></p>`;
  };
  const tec = tecDe(o);
  const amb = [o.tempAmb !== '' && o.tempAmb != null ? `Temperatura do laboratório: ${comInc(o.tempAmb, o.tempInc, 'ºC')}` : '',
    o.umidAmb !== '' && o.umidAmb != null ? `Umidade Relativa do Ar: ${fmtNum(o.umidAmb, 0)}%ur${o.umidInc !== '' && o.umidInc != null ? ` (± ${fmtNum(o.umidInc, 0)}%)` : ''}` : ''].filter(Boolean).join(' &nbsp; ');
  const logo = LOGO;
  const rod = `${esc(emp.razao)} CNPJ: ${esc(emp.cnpj)} IE: ${esc(emp.ie)} RUA: ${esc(emp.rua)} ${esc(emp.cidade)}-${esc(emp.uf)}<br>BAIRRO: ${esc(emp.bairro)} CEP: ${esc(emp.cep)} TELEFONE: ${esc(emp.fone)}<br>e-mail: ${esc(emp.email)}`;
  const pg = body => `<section class="pg"><img class="wm" src="assets/marca-dagua.jpg" alt=""><img class="logo" src="${logo}" alt=""><div class="body">${body}</div><div class="rod">${rod}</div><img class="flogo" src="${LOGO}" alt=""></section>`;
  const ender = [cli.endereco, cli.cidade && cli.uf ? `${cli.cidade} – ${cli.uf}` : cli.cidade].filter(Boolean).join(', ');
  const p1 = `<h3 class="t">RELATÓRIO DE CALIBRAÇÃO Nº${esc(num)}</h3>
  <p>C. SOLICITANTE: ${esc(cli.nome)}<br>ENDEREÇO: ${esc(ender)}${e.setor ? ' – <b>' + esc(e.setor) + '</b>' : ''}</p>
  <p>CONTRATANTE: ${esc(emp.razao)}<br>ENDEREÇO: ${esc(enderecoEmp())}</p>
  <p>Data da Calibração: ${fmtD(dia)}</p>
  <h4>DADOS DO INSTRUMENTO</h4>
  <p>Descrição: ${esc(e.nome)}<br>Fabricante: ${esc(e.fabricante)}<br>Modelo: ${esc(e.modelo)}<br>Lacre: ${esc(o.lacre)}<br>${e.serie ? 'Nº de série: ' + esc(e.serie) : 'Sem nº de série.'}<br>Patrimônio: ${esc(e.tag)}</p>
  <p class="g14">Data da próxima calibração: ${prox}<br>Validade do certificado <b>Nº${esc(num)}</b> - ${prox}</p>
  <h4>CONDIÇÕES AMBIENTAIS</h4><p class="amb">${amb}<br>Calibração ${esc((o.localCal || 'Realizada no cliente'))}</p>
  <h4>PROCEDIMENTO UTILIZADO</h4><p>${esc(emp.procedimento)}</p>
  <h4>PADRÃO UTILIZADO</h4>
  <table class="pad"><tr><th style="width:86pt">Descrição</th><th style="width:64pt">Código</th><th style="width:106pt">Nº Certificado</th><th style="width:99pt">Data Calibração</th><th style="width:78pt">Validade</th></tr>
   ${[...new Set(padsDe(o))].map(padById).filter(Boolean).map(x => `<tr><td>${esc(x.nome)}</td><td>${esc(x.codigo)}</td><td>${esc(x.certNum)}</td><td>${fmtD(x.dataCal)}</td><td>${fmtD(x.validade)}</td></tr>`).join('')}</table>
  <h4>Observação</h4><p>${esc(emp.obsIncerteza)}</p>
  <p style="font-size:10pt;line-height:1.25;margin-top:4pt">Fator de abrangência utilizado: K = ${fmtNum(k)}. Níveis de confiança do fator de abrangência: K = 1 → 68%; K = 2 → 95%; K = 3 → 99,7%.</p>`;
  const fim = `<h4>NOTAS DEPARTAMENTO TÉCNICO</h4><p>${esc(o.solucao) || '&nbsp;'}</p>
  <table class="sg"><tr><td colspan="2">Responsável Técnico – ${esc(emp.respTec)}</td></tr>
   <tr><td>Eng. Resp. ${esc(emp.engResp)}</td><td>${esc(emp.engCrea)}</td></tr>
   <tr><td colspan="2">Técnico Coletor de dados: ${esc(tec)}${tecRegistro(tec) ? ' – ' + esc(tecRegistro(tec)) : ''}</td></tr></table>
  ${encLinha(o)}
  <div class="cs"><div><div class="im">${sigImgs()}${tecAssinatura(tec)}</div><div class="ln">Responsável Técnico<br><b>${esc(emp.respTec)}</b></div></div>
   <div><div class="im"></div><div class="ln">Cliente - Ciente<br><b>${esc(cli.nome)}</b></div></div></div>`;
  // até 2 grandezas por folha; a 3ª vai para uma folha de continuação, que leva também as notas e assinaturas
  const tit = c => `<h3 class="t c">RESULTADOS DA CALIBRAÇÃO${c ? ' (continuação)' : ''}</h3>`;
  // 1 grandeza: tudo na folha 2. 2 grandezas: as duas na folha 2 e notas/assinaturas na folha 3. 3: a terceira vai com as notas.
  const paginas = gs.length > 2
    ? [pg(tit(0) + gs.slice(0, 2).map(bloco).join('')), pg(tit(1) + gs.slice(2).map(bloco).join('') + fim)]
    : gs.length === 2
      ? [pg(tit(0) + gs.map(bloco).join('')), pg(tit(1) + fim)]
      : [pg(tit(0) + gs.map(bloco).join('') + fim)];
  $('#laudo').innerHTML = `<div class="certdoc">${pg(p1)}${paginas.join('')}</div>`;
  const imgs = [...document.querySelectorAll('#laudo img')];
  Promise.all(imgs.map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => doPrint());
}

// ---------- checklist de preventiva (modelo: Checklist Balança Pediátrica) ----------
function printChecklist(o, e) {
  const emp = db.empresa, cli = clienteDe(e), c = o.chk;
  const dia = docDia(o), prox = addDays(dia, +e.perPrev || 180);
  const ops = r => `<span class="ops"><i class="op ${r === 'C' ? 'ok' : ''}">C</i><i class="op ${r === 'NC' ? 'nc' : ''}">NC</i></span>`;
  const kv = (k, v) => `<div class="kv"><small>${k}</small><b>${esc(v) || '-'}</b></div>`;
  const itens = c.itens.map(a => `<div class="it ${a.r === 'NC' ? 'bad' : ''}"><span class="tx">${esc(a.t)}</span>${ops(a.r)}</div>`).join('');
  const ins = c.instrumentos.length ? c.instrumentos : ['-'];
  const ncs = c.itens.filter(i => i.r === 'NC').map(i => { const k = i.osId && db.os.find(x => x.id === i.osId); return `<div class="nc"><b>NC – ${esc(i.t)}:</b> ${esc(i.j || '')}${k ? ' <em>(OS corretiva ' + esc(k.numero) + ')</em>' : ''}</div>`; }).join('');
  const equipTitulo = `${e.nome || c.nome}${e.fabricante ? ' – marca ' + e.fabricante : ''}`;
  docShell(`<div class="mod">
  <div class="mtop"><div><div class="tt">Checklist – Manutenção Preventiva</div><div class="sb">${esc(c.nome)}</div></div>
   <div class="osb"><small>OS nº</small><b>${esc(o.numero)}</b><span>Página 1 / 1</span></div></div>
  <div class="kvg k3">${kv('Cliente', clienteNome(e))}${kv('Setor', e.setor)}${kv('Técnico', tecDe(o))}${kv('Cidade', cli.cidade)}${kv('Estado', cli.uf)}${kv('Revisão em', mesAno(dia))}</div>
  <div class="prox">Próxima revisão em <b>${mesAno(prox)}</b></div>
  <h4 class="sec">${esc(equipTitulo)}</h4>
  <div class="kvg">${kv('Modelo', e.modelo)}${kv('Nº de série / patrimônio', `${e.serie || '-'} / ${e.tag || '-'}`)}</div>
  <div class="leg"><span class="op ok">C</span> Conforme <span class="op nc">NC</span> Não conforme</div>
  <div class="itens">${itens}</div>
  <h4 class="sec">Instrumentos utilizados</h4>
  <div class="chips">${ins.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
  <h4 class="sec">Observações</h4>
  <div class="box obs"><div class="tx">${esc(o.solucao)}</div>${ncs}</div>
  <div class="sigs2"><div><div class="im">${tecAssinatura(tecDe(o))}</div><div class="ln">Técnico responsável<br><b>${esc(tecDe(o))}</b></div></div>
   <div><div class="im"></div><div class="ln">Ciente - Cliente<br><b>${esc(cli.nome || clienteNome(e))}</b></div></div></div>
  </div>`);
}

// ---------- qualificação térmica (modelo: BOLSAS 0014) ----------
const TXT_INTRO = [
  'A Validação de Processo consiste na documentação de evidências que garantem um alto nível de segurança na produção de um determinado produto, assegurando que ele atenda às especificações e padrões de qualidade preestabelecidos. Esse processo envolve a verificação sistemática e registrada das etapas produtivas, bem como a aplicação de um controle de qualidade rigoroso. O objetivo é garantir que os produtos finais sejam fabricados de maneira confiável e reproduzível, dentro dos parâmetros operacionais definidos, resultando na qualidade esperada.',
  'Os principais propósitos da Validação incluem assegurar a qualidade do produto final, manter a uniformidade das operações de produção e garantir a reprodutibilidade dos processos. Além disso, ela demonstra a robustez operacional, estabelece um sistema de garantia de qualidade dentro da organização e assegura que a equipe envolvida na produção esteja devidamente treinada e qualificada. Para isso, todas as etapas devem ser documentadas e embasadas em informações coletadas e testes adequados, garantindo que o processo esteja apto a cumprir sua função com eficiência.',
  'A validação de processos, equipamentos, sistemas ou metodologias é essencial para garantir sua conformidade e confiabilidade. Isso é feito por meio da padronização documental, abrangendo todas as etapas produtivas e de controle de qualidade, desde o ambiente de produção até a seleção de insumos e matérias-primas.',
  'A qualificação, por sua vez, é um procedimento documentado que segue um plano de testes pré-definidos, estabelecendo critérios rigorosos de aceitação. Esse processo garante que componentes, equipamentos e instalações estejam devidamente preparados e adequados ao seu propósito de uso. Dentro desse contexto, a qualificação térmica desempenha um papel essencial na validação de equipamentos que dependem de controle de temperatura para seu funcionamento adequado, como autoclaves, estufas, câmaras frias e refrigeradores. Esse processo envolve a medição, monitoramento e análise das variações térmicas para assegurar que os equipamentos operem dentro dos limites exigidos, garantindo a integridade dos produtos e a segurança dos processos.',
];
const TXT_DEF = 'A Qualificação Térmica é um processo sistemático e documentado que visa testar e comprovar que um equipamento que opera com controle de temperatura (como freezers, refrigeradores, câmaras frias, etc.) é capaz de manter as condições térmicas dentro dos limites estabelecidos para o seu uso pretendido.';
const TXT_OBJ = [
  'Comprovar, mediante verificações e ensaios de desempenho documentados – executados com instrumentos calibrados e rastreáveis – que o equipamento está operando em conformidade com os padrões estabelecidos, garantindo:',
  'Confiabilidade operacional futura: Funcionamento dentro dos limites operacionais aprovados;',
  'Desempenho validado: Atendimento aos parâmetros pré-estabelecidos sob condições reais de trabalho.',
  'Dessa maneira, este relatório de qualificação térmica apresenta condições técnicas e operacionais validadas para atender aos requisitos críticos do processo de conservação e armazenamento de produtos hospitalares.',
];

const PAL = ['#1f77b4', '#d62728', '#f2b600', '#2ca02c', '#ff7f0e', '#17becf', '#6f9be6', '#e8756a', '#b59b00', '#6cc18a', '#ff9f4a', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

// intervalo entre leituras (mediana) e sensor mais quente, calculados dos dados do data logger
function qualDerivados(q, ser) {
  if (!ser || !ser.rows || !ser.rows.length) return { int: '', quente: '', frio: '' };
  const ts = ser.rows.map(r => Date.parse(r.t.replace(' ', 'T'))).filter(x => !isNaN(x));
  const d = ts.slice(1).map((t, i) => (t - ts[i]) / 1000).filter(x => x > 0).sort((a, b) => a - b);
  let int = '';
  if (d.length) {
    const s = Math.round(d[Math.floor(d.length / 2)]);
    const un = (n, a, b) => n + ' ' + (n === 1 ? a : b);
    int = s % 3600 === 0 ? un(s / 3600, 'hora', 'horas') : s % 60 === 0 ? un(s / 60, 'minuto', 'minutos') : un(s, 'segundo', 'segundos');
  }
  const st = qualStats(q, ser);
  const un = q.un || '°C';
  return { int, quente: st.hot ? st.hot.cod : '', frio: st.cold ? st.cold.cod : '', quenteTxt: st.hot ? `${st.hot.cod} (${fmtNum(st.hot.mx, 1)} ${un})` : '', frioTxt: st.cold ? `${st.cold.cod} (${fmtNum(st.cold.mn, 1)} ${un})` : '' };
}
function qualStats(q, ser) {
  const f = (s, sec) => s ? s.replace('T', ' ') + (s.length === 16 ? ':' + sec : '') : null;
  const ei = f(q.ei, '00'), ef = f(q.ef, '59'), pi = f(q.pi, '00'), pf = f(q.pf, '59');
  const lo = q.min === '' || q.min == null ? null : +q.min, hi = q.max === '' || q.max == null ? null : +q.max;
  const inEval = t => (!ei || t >= ei) && (!ef || t <= ef) && !(pi && pf && t >= pi && t <= pf);
  // tolerância: tempo máximo (min) que o sensor pode ficar fora da faixa, de forma contínua, sem reprovar
  const tol = +q.tol > 0 ? +q.tol : 0;
  const ms = r => Date.parse(r.t.replace(' ', 'T'));
  const dts = ser.rows.slice(1).map((r, i) => (ms(r) - ms(ser.rows[i])) / 1000).filter(x => x > 0).sort((a, b) => a - b);
  const intSeg = dts.length ? dts[Math.floor(dts.length / 2)] : 60; // intervalo entre leituras (s)
  const sens = ser.cods.map((cod, j) => {
    const rows = ser.rows.filter(r => inEval(r.t) && r.v[j] != null);
    const vals = rows.map(r => r.v[j]);
    if (!vals.length) return { cod, n: 0, ok: null };
    const mn = Math.min(...vals), mx = Math.max(...vals);
    // maior período contínuo fora da faixa: cada leitura vale um intervalo; a corrida quebra se houver lacuna (ex.: abertura de porta)
    let maxExc = 0, run = null, prevOut = false, prevT = null;
    rows.forEach(r => {
      const v = r.v[j], t = ms(r), out = (lo != null && v < lo) || (hi != null && v > hi);
      if (out) {
        run = prevOut && t - prevT <= 1.5 * intSeg * 1000 ? { ini: run.ini, fim: t } : { ini: t, fim: t };
        maxExc = Math.max(maxExc, (run.fim - run.ini) / 60000 + intSeg / 60);
      }
      prevOut = out; prevT = t;
    });
    const dentro = (lo == null || mn >= lo) && (hi == null || mx <= hi);
    return { cod, n: vals.length, mn, mx, med: mean(vals), maxExc, ok: dentro || (tol > 0 && maxExc <= tol + 1e-6) };
  });
  const used = sens.filter(s => s.n);
  let unif = 0;
  ser.rows.filter(r => inEval(r.t)).forEach(r => { const v = r.v.filter(x => x != null); if (v.length > 1) unif = Math.max(unif, Math.max(...v) - Math.min(...v)); });
  const res = !used.length ? 'Sem dados no período de avaliação' : lo == null && hi == null ? 'Sem critério de aceitação definido' : used.every(s => s.ok) ? 'APROVADO' : 'REPROVADO';
  return {
    sens, lo, hi, tol, res, unif, ei, ef, pi, pf,
    gmin: used.length ? Math.min(...used.map(s => s.mn)) : null, gmax: used.length ? Math.max(...used.map(s => s.mx)) : null,
    gmed: used.length ? mean(used.map(s => s.med)) : null, estab: used.length ? Math.max(...used.map(s => s.mx - s.mn)) : null,
    // ponto mais quente = sensor com a MAIOR máxima; ponto mais frio = sensor com a MENOR mínima (no período avaliado)
    hot: used.length ? used.reduce((a, b) => b.mx > a.mx ? b : a) : null, cold: used.length ? used.reduce((a, b) => b.mn < a.mn ? b : a) : null,
  };
}

function chartSVG(ser, st, q, un) {
  const W = 760, H = 330, L = 42, R = 12, T = 44, B = 40;
  const ms = ser.rows.map(r => Date.parse(r.t.replace(' ', 'T')));
  const t0 = ms[0], t1 = ms[ms.length - 1];
  let vmin = Infinity, vmax = -Infinity;
  ser.rows.forEach(r => r.v.forEach(x => { if (x != null) { vmin = Math.min(vmin, x); vmax = Math.max(vmax, x); } }));
  if (st.lo != null) vmin = Math.min(vmin, st.lo);
  if (st.hi != null) vmax = Math.max(vmax, st.hi);
  vmin = Math.floor(vmin - 0.5); vmax = Math.ceil(vmax + 0.5);
  const X = m => L + (m - t0) / Math.max(1, t1 - t0) * (W - L - R);
  const Y = v => T + (vmax - v) / (vmax - vmin) * (H - T - B);
  const step = (vmax - vmin) > 12 ? 2 : 1;
  let g = '';
  for (let v = Math.ceil(vmin / step) * step; v <= vmax; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ddd"/><text x="${L - 5}" y="${Y(v) + 3}" font-size="9" text-anchor="end">${v}</text>`;
  for (let i = 0; i <= 5; i++) {
    const m = t0 + (t1 - t0) * i / 5, d = new Date(m), pad = n => String(n).padStart(2, '0');
    g += `<line x1="${X(m)}" x2="${X(m)}" y1="${T}" y2="${H - B}" stroke="#eee"/><text x="${X(m)}" y="${H - B + 14}" font-size="8" text-anchor="middle">${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}</text>`;
  }
  const lines = ser.cods.map((c, j) => {
    let d = '', pen = false;
    ser.rows.forEach((r, i) => { const v = r.v[j]; if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(ms[i]).toFixed(1)},${Y(v).toFixed(1)}`; pen = true; });
    return `<path d="${d}" fill="none" stroke="${PAL[j % PAL.length]}" stroke-width="1.1"/>`;
  }).join('');
  const lim = (st.hi != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(st.hi)}" y2="${Y(st.hi)}" stroke="#0a2a6b" stroke-width="1.6"/>` : '') +
    (st.lo != null ? `<line x1="${L}" x2="${W - R}" y1="${Y(st.lo)}" y2="${Y(st.lo)}" stroke="#d00" stroke-width="1.6"/>` : '');
  let porta = '';
  if (q.pi) { const m = Date.parse(q.pi); if (m >= t0 && m <= t1) porta = `<line x1="${X(m)}" x2="${X(m)}" y1="${T}" y2="${H - B}" stroke="#0a2a6b" stroke-dasharray="4 3"/><text x="${X(m) + 4}" y="${T + 10}" font-size="9" font-weight="bold" fill="#0a2a6b">Abertura de porta</text>`; }
  [[st.ei, 'Início da avaliação'], [st.ef, 'Fim da avaliação']].forEach(([s, txt], k) => {
    const m = s ? Date.parse(s.replace(' ', 'T')) : NaN;
    if (m >= t0 && m <= t1) {
      // rótulos "para fora" (início à esquerda da linha, fim à direita) para nunca se sobreporem;
      // sem espaço na borda, inverte o lado e usa outra altura
      const x = X(m), W0 = 82; let left = k === 0;
      if (left && x - L < W0) left = false; else if (!left && W - R - x < W0) left = true;
      const y = T + 22 + (left === (k === 0) ? 0 : 12 * (k + 1));
      porta += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="#1a7f37" stroke-width="1.4" stroke-dasharray="5 3"/><text x="${x + (left ? -4 : 4)}" y="${y}" font-size="9" font-weight="bold" fill="#1a7f37" text-anchor="${left ? 'end' : 'start'}">${txt}</text>`;
    }
  });
  const leg = ser.cods.map((c, j) => `<g transform="translate(${L + (j % 12) * 58},${10 + Math.floor(j / 12) * 12})"><line x2="14" y1="3" y2="3" stroke="${PAL[j % PAL.length]}" stroke-width="2"/><text x="17" y="6" font-size="9">${esc(c)}</text></g>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Arial">${g}${lim}${lines}${porta}${leg}<text x="${L - 30}" y="${T - 8}" font-size="9">${esc(un)}</text></svg>`;
}

// ilustração de laboratório usada como fundo da capa da qualificação (vetorial, imprime sem depender de imagem externa)
const LAB_SVG = `<svg class="cv-bg" viewBox="0 0 210 297" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
 <defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a5b"/><stop offset=".55" stop-color="#0f4a73"/><stop offset="1" stop-color="#14776f"/></linearGradient>
 <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity=".08"/></linearGradient>
 <linearGradient id="lg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fd1c4" stop-opacity=".75"/><stop offset="1" stop-color="#2aa59d" stop-opacity=".9"/></linearGradient></defs>
 <rect width="210" height="297" fill="url(#lg1)"/>
 <g stroke="#fff" stroke-opacity=".06" stroke-width=".3">${Array.from({ length: 22 }, (_, i) => `<line x1="${i * 10}" y1="0" x2="${i * 10}" y2="297"/>`).join('')}${Array.from({ length: 30 }, (_, i) => `<line x1="0" y1="${i * 10}" x2="210" y2="${i * 10}"/>`).join('')}</g>
 <rect x="0" y="228" width="210" height="69" fill="#06182f" fill-opacity=".55"/><line x1="0" y1="228" x2="210" y2="228" stroke="#3fd1c4" stroke-opacity=".5" stroke-width=".6"/>
 <g transform="translate(18 130)" opacity=".9"><path d="M20 0h14v36l26 52a8 8 0 0 1-7 12H1a8 8 0 0 1-7-12l26-52z" transform="translate(4 0)" fill="url(#lg2)" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><path d="M-1 76h64l9 18a8 8 0 0 1-7 12H-1a8 8 0 0 1-7-12z" transform="translate(4 -6)" fill="url(#lg3)"/></g>
 <g transform="translate(86 120)" opacity=".9"><rect x="0" y="0" width="34" height="108" rx="3" fill="url(#lg2)" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><rect x="1" y="50" width="32" height="57" rx="2" fill="url(#lg3)"/><g stroke="#fff" stroke-opacity=".7" stroke-width=".6">${[14, 26, 38].map(y => `<line x1="0" y1="${y}" x2="9" y2="${y}"/>`).join('')}</g></g>
 <g transform="translate(138 90)" opacity=".92"><rect x="10" y="0" width="7" height="130" rx="3.5" fill="url(#lg2)" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/><circle cx="13.5" cy="136" r="9" fill="#ff5a4d" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/><rect x="12" y="40" width="3" height="94" fill="#ff5a4d"/><g stroke="#fff" stroke-opacity=".8" stroke-width=".6">${Array.from({ length: 12 }, (_, i) => `<line x1="17" y1="${12 + i * 9}" x2="${i % 2 ? 22 : 25}" y2="${12 + i * 9}"/>`).join('')}</g></g>
 <g transform="translate(170 150)" opacity=".85"><path d="M0 0h26v8h-3v58a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6V8h-3z" fill="url(#lg2)" stroke="#fff" stroke-opacity=".6" stroke-width=".8"/><path d="M3 38h20v28a6 6 0 0 1-6 6h-8a6 6 0 0 1-6-6z" fill="url(#lg3)"/></g>
 <rect width="210" height="297" fill="#06182f" fill-opacity=".28"/>
</svg>`;
function printQual(o, e, ser) {
  let q = o.qual; const emp = db.empresa, p = padById(o.padraoId) || {}, cli = clienteDe(e), un = q.un || '°C';
  const dia = docDia(o);
  const num = `${o.numero}-${dia.replace(/-/g, '')}`; // nº da OS + AAAAMMDD
  if (o.certNum !== num) { o.certNum = num; persist(); }
  const st = qualStats(q, ser);
  const fx = st.lo != null && st.hi != null ? `${fmtNum(st.lo, 1)}${un} a ${fmtNum(st.hi, 1)}${un}` : '-';
  const sensInfo = c => (q.sens || []).find(s => s.cod.toLowerCase() === c.toLowerCase()) || { cod: c };
  const f = (k, v) => `<p><b>${k}:</b> ${esc(v) || ''}</p>`;
  const H = (n, t) => `<h1 class="qh">${n}. ${t}</h1>`;
  const cell = (v, c) => v == null ? '<td></td>' : `<td class="${st.hi != null && v > st.hi ? 'hi' : st.lo != null && v < st.lo ? 'lo' : ''}">${fmtNum(v, 1)}</td>`;
  const der = qualDerivados(q, ser);
  q = { ...q, int: der.int || q.int };
  q = { ...q, quente: der.quente || q.quente, frio: der.frio || q.frio }; // sempre recalculado pelos dados e pelo período avaliado
  const tipoEnsaio = q.tipo || 'Qualificação Térmica de Performance';
  const capa = `<div class="qt">
  <section class="cover">
   ${LAB_SVG}
   <div class="cv-in">
    <div class="cv-top"><img src="${LOGO}" class="clogo" alt=""><span>CERTIFICADO Nº ${esc(num)}</span></div>
    <div class="cv-mid"><div class="cv-kick">Relatório técnico</div><h1 class="ct">QUALIFICAÇÃO<br>TÉRMICA</h1><div class="cbar"></div><div class="cv-tipo">${esc(tipoEnsaio)}</div></div>
    <div class="cv-info">
     <div><small>Equipamento</small><b>${esc(e.nome)}</b><span>${esc([e.fabricante, e.modelo].filter(Boolean).join(' ') || '')}${e.tag ? ' · Patrimônio ' + esc(e.tag) : ''}</span></div>
     <div><small>Cliente</small><b>${esc(cli.nome)}</b><span>${esc(e.setor || '')}</span></div>
     <div><small>Data de execução</small><b>${fmtD(dia)}</b><span>Validade: ${fmtMY(addDays(dia, +e.perQual || 365))}</span></div>
    </div>
    <div class="cv-foot"><b>${esc(emp.razao)}</b> · CNPJ ${esc(emp.cnpj)}<br>${esc(emp.fone)} · ${esc(emp.email)}<br>Elaborado por ${esc(emp.respTec)}</div>
   </div>
  </section>
  </div>`;
  docShell(`<div class="qt">

  ${H(1, 'DADOS DO CLIENTE')}
  <div class="cols">${f('Contratante', cli.nome)}${f('Endereço', cli.endereco)}${f('CNPJ/CPF', cli.doc)}${f('CEP', cli.cep)}${f('Nome', cli.nome)}${f('Telefone / E-mail', cli.contato)}</div>
  ${H(2, 'DETALHES DO EQUIPAMENTO')}
  ${q.foto ? `<div class="fig"><img src="${q.foto}" alt=""><br><i>Figura 1 - Equipamento Sob Ensaio</i></div>` : ''}
  <div class="cols">${f('Equipamento', e.nome)}${f('Fabricante', e.fabricante)}${f('Marca', e.fabricante)}${f('Modelo', e.modelo)}${f('Número de Série', e.serie)}${f('Patrimônio', e.tag)}${f('Local do equipamento', e.setor)}${f('Temperatura amb', q.tamb ? fmtNum(q.tamb, 1) + ' °C' : '')}${f('Função', e.funcao)}</div>
  <div class="pb"></div>
  ${H(3, 'INFORMAÇÕES SOBRE O CHAMADO')}
  <div class="cols">${f('Certificado', num)}${f('Data de Execução', fmtD(dia))}${f('Data de Validade', fmtMY(addDays(dia, +e.perQual || 365)))}${f('Tipo de Ensaio', tipoEnsaio)}
   ${f('Faixa de Trabalho', fx)}${f('Tempo de Estudo', q.dur)}${f('Ponto mais quente', der.quenteTxt || q.quente)}${f('Ponto mais frio', der.frioTxt || q.frio)}${f('Teste de parada tempo', q.parada)}
   ${f('Teste de abertura de porta', q.porta)}<p><b>${q.carga === 'Sem carga' ? 'Com carga ( ) &nbsp; sem carga ( X )' : 'Com carga ( X ) &nbsp; sem carga ( )'}</b></p>
   ${f('Padrão utilizado: Nº', p.certNum)}${f('Observações', o.solucao)}</div>
  ${H(4, 'INTRODUÇÃO')}${TXT_INTRO.map(t => `<p class="tx">${t}</p>`).join('')}
  <div class="pb"></div>
  ${H(5, 'DEFINIÇÕES')}<p class="tx">${TXT_DEF}</p>
  ${H(6, 'OBJETIVO')}${TXT_OBJ.map(t => `<p class="tx">${t}</p>`).join('')}
  ${H(7, 'DESCRIÇÃO DOS EQUIPAMENTOS DE MEDIÇÃO UTILIZADOS')}
  <table class="b"><tr><th>Equipamento</th><th>Código de Identificação</th><th>Modelo</th><th>Número de Série</th><th>Unidade de Medida</th></tr>
   ${ser.cods.map(c => { const s = sensInfo(c); return `<tr><td>Data Logger</td><td>${esc(c)}</td><td>${esc(s.modelo)}</td><td>${esc(s.serie)}</td><td>${esc(un)}</td></tr>`; }).join('')}</table>
  <div class="pb"></div>
  ${H(8, 'PROCEDIMENTO, METODOLOGIA E CRITÉRIO DE ACEITAÇÃO')}
  <h4 class="qs">• Procedimento - ${esc(tipoEnsaio.replace(/^Qualificação Térmica de /i, 'Qualificação de '))}</h4>
  <p class="tx">Quantidade de Ciclos: ${esc(q.ciclos)} &nbsp;&nbsp;&nbsp; Tempo de Ciclo: ${esc(q.dur)}<br>Parâmetro programado: ${fx}</p>
  <h4 class="qs">• Metodologia</h4>
  <p class="tx">Foram distribuídos uniformemente sensores calibrados no interior da câmara ${q.carga === 'Sem carga' ? 'sem carga' : 'com a carga padrão de utilização'}.</p>
  <p class="tx">Os sensores foram posicionados o mais próximo possível das cargas.</p>
  ${q.int ? `<p class="tx">As temperaturas foram registradas em intervalos fixos de ${esc(q.int)}.</p>` : ''}
  <p class="tx">Os ensaios foram realizados de acordo com a literatura técnica aplicada e normas técnicas, e foram utilizados os seguintes documentos: ${esc(emp.normas)}.</p>
  <h4 class="qs">• Critério de Aceitação</h4>
  <p class="tx">A temperatura máxima durante todo o período de avaliação deve ser menor ou igual ao limite superior de temperatura: ${st.hi == null ? '-' : fmtNum(st.hi, 1) + ' ' + esc(un)}.</p>
  <p class="tx">A temperatura mínima durante todo o período de avaliação deve ser maior ou igual ao limite inferior de temperatura: ${st.lo == null ? '-' : fmtNum(st.lo, 1) + ' ' + esc(un)}.</p>
  ${st.tol ? `<p class="tx">Admite-se que a temperatura permaneça fora desses limites por até ${fmtNum(st.tol, 0)} minutos consecutivos, em cada sensor; acima desse tempo, o equipamento é considerado reprovado.</p>` : ''}
  ${st.pi && st.pf ? `<p class="tx">O intervalo de abertura de porta (${esc(st.pi.slice(0, 16))} a ${esc(st.pf.slice(0, 16))}) não entra na avaliação.</p>` : ''}
  <h4 class="qs">• POSICIONAMENTO DOS SENSORES</h4>
  <p class="tx">Os sensores foram posicionados e distribuídos de forma diagonal do equipamento, garantindo assim, a uniformidade de temperatura por todo o equipamento.${q.esquema ? ' A distribuição dos sensores pode ser verificada na figura a seguir.' : ''}${q.ctrl ? ` O sensor ${esc(q.ctrl)} foi posicionado em paralelo ao sensor do equipamento (controlador).` : ''}</p>
  ${q.esquema ? `<div class="fig"><img src="${q.esquema}" alt=""><br><i>Figura 2 - Ilustração da Distribuição dos Sensores na Câmara</i></div>` : ''}
  ${(q.sens || []).some(s => s.pos) ? `<table class="b"><tr><th>Sensor</th><th>Posição</th></tr>${q.sens.filter(s => s.pos).map(s => `<tr><td>${esc(s.cod)}</td><td>${esc(s.pos)}</td></tr>`).join('')}</table>` : ''}
  <div class="pb"></div>
  ${H(9, `RESULTADOS DOS ESTUDOS DE QUALIFICAÇÃO - ${q.carga === 'Sem carga' ? 'SEM CARGA' : 'COM CARGA'}`)}
  ${chartSVG(ser, st, q, un)}
  <table class="b c"><tr><th>Sensor</th><th>Leituras avaliadas</th><th>Mínimo</th><th>Máximo</th><th>Média</th><th>Dentro do critério</th>${st.tol ? '<th>Maior tempo fora da faixa</th>' : ''}</tr>
   ${st.sens.map(s => `<tr><td>${esc(s.cod)}</td><td>${s.n}</td><td>${s.n ? fmtNum(s.mn, 1) : '-'}</td><td>${s.n ? fmtNum(s.mx, 1) : '-'}</td><td>${s.n ? fmtNum(s.med, 2) : '-'}</td><td>${s.ok == null ? '-' : s.ok ? 'Sim' : '<b>NÃO</b>'}</td>${st.tol ? `<td>${s.n ? fmtNum(s.maxExc, 0) + ' min' : '-'}</td>` : ''}</tr>`).join('')}</table>
  <p class="tx">Mínimo / máximo / média geral: ${fmtNum(st.gmin, 1)} / ${fmtNum(st.gmax, 1)} / ${fmtNum(st.gmed, 2)} ${esc(un)} &nbsp;·&nbsp; Uniformidade (maior diferença entre sensores no mesmo instante): ${fmtNum(st.unif, 1)} ${esc(un)} &nbsp;·&nbsp; Estabilidade (maior variação em um sensor): ${fmtNum(st.estab, 1)} ${esc(un)}${st.hot ? ` &nbsp;·&nbsp; Ponto mais quente: ${esc(st.hot.cod)} (${fmtNum(st.hot.mx, 1)} ${esc(un)}); mais frio: ${esc(st.cold.cod)} (${fmtNum(st.cold.mn, 1)} ${esc(un)})` : ''}</p>
  ${H(10, 'ASSINATURAS E APROVAÇÃO')}
  <p class="res">${st.res === 'APROVADO' ? 'Aprovado ( X ) &nbsp; <span class="rr">Reprovado (&nbsp;&nbsp;)</span>' : st.res === 'REPROVADO' ? 'Aprovado (&nbsp;&nbsp;) &nbsp; <span class="rr">Reprovado ( X )</span>' : esc(st.res)}</p>
  ${encLinha(o)}
  <div class="sigs"><div>${tecAssinatura(tecDe(o))}<div class="ln">Técnico que executou o serviço</div><b>${esc(tecDe(o))}</b><br>${esc(tecRegistro(tecDe(o)))}</div>
   <div><div class="ln">Cliente</div><b>${esc(cli.nome)}</b><br>Nome legível / assinatura</div></div>
  <div class="pb"></div>
  <table class="b data"><thead><tr><th>Tempo</th>${ser.cods.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>
   ${(() => {
      // marca na tabela onde começa/termina o período avaliado; linhas fora dele ficam em cinza
      const nc = ser.cods.length + 1, fmt = t => fmtD(t.slice(0, 10)) + t.slice(10);
      const iIni = st.ei ? ser.rows.findIndex(r => r.t >= st.ei) : -1;
      let iFim = -1; if (st.ef) ser.rows.forEach((r, i) => { if (r.t <= st.ef) iFim = i; });
      const mk = (cls, txt) => `<tr class="mk ${cls}"><td colspan="${nc}">${txt}</td></tr>`;
      return ser.rows.map((r, i) => {
        const fora = (st.ei && r.t < st.ei) || (st.ef && r.t > st.ef);
        return (i === iIni ? mk('ini', `▶ INÍCIO DA AVALIAÇÃO – a partir de ${fmt(r.t)}`) : '') +
          `<tr${fora ? ' class="fora"' : ''}><td>${esc(r.t)}</td>${r.v.map(v => cell(v)).join('')}</tr>` +
          (i === iFim ? mk('fim', `■ FIM DA AVALIAÇÃO – até ${fmt(r.t)}`) : '');
      }).join('');
    })()}</tbody></table>
  </div>`, 'qtdoc', capa);
}
