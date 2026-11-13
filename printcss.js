// CSS de impressão dos documentos (certificado, checklist, laudos...). Fica em JS para valer também quando o app é aberto
// direto do arquivo (file://), onde o navegador não deixa ler o style.css. Entra na página como <style media="print"> e é
// reaproveitado pelo download em lote (lote.js), que desenha os documentos na tela como se fossem impressos.
const PRINT_CSS = String.raw`
@media print{
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  :root,:root[data-theme=dark]{color-scheme:light!important;--bg:#fff;--card:#fff;--ink:#000}
  html,body{background:#fff!important;color:#000;font-family:Arial,Helvetica,sans-serif}
  .app,dialog,#bnav,#more,#moreBg{display:none!important}
  body{padding-bottom:0!important}
  #laudo{display:block;font-size:12px;line-height:1.4;color:#000}
  #laudo table.shell,#laudo table.shell>thead>tr>td,#laudo table.shell>tfoot>tr>td,#laudo table.shell>tbody>tr>td{border:0;padding:0;background:transparent;font-size:inherit}
  #laudo table.shell>thead{display:table-header-group}#laudo table.shell>tfoot{display:table-footer-group}
  #laudo table.shell>tbody>tr{page-break-inside:auto}
  #laudo table.shell{height:279mm}#laudo table.shell>tbody>tr>td{vertical-align:top}
  #laudo .ph{text-align:center;margin-bottom:4mm}
  #laudo .ph img{height:17mm}
  #laudo .pfl{margin-top:2mm}#laudo .pfl img{height:9mm}
  #laudo .pf{text-align:center;font-size:8px;line-height:1.3;margin-top:4mm}
  #laudo .pb{page-break-before:always}
  #laudo table{width:100%;border-collapse:collapse;background:#fff;border:0;border-radius:0;overflow:visible}
  #laudo th,#laudo td{border:1px solid #000;padding:3px 6px;text-align:left;color:#000;background:#fff;font-size:12px}
  #laudo th{background:#eee}
  #laudo tr{page-break-inside:avoid}
  #laudo thead{display:table-header-group}
  #laudo h1::after,#laudo h1::before{display:none!important;content:none!important}
  #laudo h2{margin:0 0 4px;font-size:16px}
  #laudo h3{margin:14px 0 4px;font-size:14px}
  #laudo h4{margin:12px 0 2px;font-size:12px}
  #laudo p{margin:4px 0}
  #laudo .sig{display:flex;gap:40px;margin-top:60px}
  #laudo .sig div{flex:1;border-top:1px solid #000;text-align:center;padding-top:4px}
  #laudo .sig-img{max-height:18mm;display:block;margin:4px 0}
  /* checklist da preventiva e laudo da corretiva: layout moderno (mesma paleta do app) */
  #laudo .mod{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#0b2f36;font-size:11.5px;line-height:1.35}
  #laudo .mod small{display:block;font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:#587279;font-weight:600}
  #laudo .mod .mtop{display:flex;justify-content:space-between;align-items:stretch;gap:12px;background:#0f4c55;color:#fff;border-radius:12px;padding:12px 16px;border-bottom:4px solid #eba98a}
  #laudo .mod .tt{font-size:19px;font-weight:700;letter-spacing:.01em}
  #laudo .mod .sb{margin-top:2px;font-size:12px;color:#cfe6e8}
  #laudo .mod .osb{text-align:right;background:#fde7da;color:#0b2f36;border-radius:10px;padding:6px 12px;min-width:30mm}
  #laudo .mod .osb small{color:#7a4a33}
  #laudo .mod .osb b{display:block;font-size:17px;line-height:1.15}
  #laudo .mod .osb span{display:block;font-size:9.5px;color:#7a4a33}
  #laudo .mod .sec{margin:14px 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#0f4c55;border-left:4px solid #eba98a;padding-left:8px}
  #laudo .mod .kvg{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}
  #laudo .mod .kvg.k3{grid-template-columns:1fr 1fr 1fr}
  #laudo .mod .kvg.k4{grid-template-columns:1fr 1fr 1fr 1fr;margin-top:0}
  #laudo .mod .sec+.kvg{margin-top:0}
  #laudo .mod .kv{background:#f2f8f9;border:1px solid #d9e7ea;border-radius:8px;padding:5px 9px;break-inside:avoid}
  #laudo .mod .kv b{display:block;font-size:12px;font-weight:600;word-break:break-word}
  #laudo .mod .prox{margin:6px 0 0;text-align:right;font-size:11px;color:#587279}
  #laudo .mod .prox b{color:#0f4c55}
  #laudo .mod .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  #laudo .mod .chip{border:1px solid #b9d3d7;background:#f2f8f9;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;color:#0f4c55}
  #laudo .mod .chip.ok{background:#e1f3e8;border-color:#7cc59b;color:#17734a}
  #laudo .mod .chip.wa{background:#fff3da;border-color:#e8bd63;color:#8a5200}
  #laudo .mod .chip.ab{background:#fdeeec;border-color:#e9a097;color:#a02218}
  #laudo .mod .orig{margin:8px 0 0;padding:6px 10px;background:#fde7da;border-left:4px solid #eba98a;border-radius:6px}
  #laudo .mod .box{border:1px solid #d9e7ea;border-radius:10px;padding:7px 11px;margin-bottom:6px;background:#fff;break-inside:avoid}
  #laudo .mod .box .tx{margin-top:2px;font-size:12px;min-height:14mm;white-space:pre-wrap}
  #laudo .mod .box.obs .tx{min-height:12mm}
  #laudo .mod .nc{margin-top:4px;padding:3px 8px;border-left:3px solid #b3261e;background:#fdeeec;border-radius:4px;font-size:11px}
  #laudo .mod .leg{display:flex;align-items:center;gap:6px;margin:12px 0 6px;font-size:10.5px;color:#587279}
  #laudo .mod .itens{display:grid;grid-template-columns:1fr 1fr;gap:5px 8px}
  #laudo .mod .it{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid #d9e7ea;border-radius:8px;padding:4px 8px;background:#fff;break-inside:avoid}
  #laudo .mod .it:nth-child(4n+1),#laudo .mod .it:nth-child(4n+2){background:#f2f8f9}
  #laudo .mod .it.bad{border-color:#e9a097;background:#fdeeec}
  #laudo .mod .it .tx{flex:1}
  #laudo .mod .ops{display:inline-flex;gap:3px;flex:none}
  #laudo .mod .op{font-style:normal;font-weight:700;font-size:10px;min-width:20px;text-align:center;padding:1px 5px;border-radius:99px;border:1px solid #c8d8db;color:#9ab0b5;background:#fff}
  #laudo .mod .op.ok{background:#17734a;border-color:#17734a;color:#fff}
  #laudo .mod .op.nc{background:#b3261e;border-color:#b3261e;color:#fff}
  #laudo .mod .qas{display:grid;grid-template-columns:1fr 1fr;gap:5px 8px}
  #laudo .mod .qa{display:flex;justify-content:space-between;align-items:center;gap:8px;border:1px solid #d9e7ea;border-radius:8px;padding:5px 10px;background:#f2f8f9;break-inside:avoid}
  #laudo .mod .yn{font-size:11px;padding:1px 9px;border-radius:99px;background:#fff;border:1px solid #c8d8db;white-space:nowrap}
  #laudo .mod .yn.y{background:#17734a;border-color:#17734a;color:#fff}
  #laudo .mod .yn.n{background:#0f4c55;border-color:#0f4c55;color:#fff}
  #laudo .mod .sigs2{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:14px;text-align:center;break-inside:avoid}
  #laudo .mod .sigs2 .im{height:16mm;display:flex;align-items:flex-end;justify-content:center}
  #laudo .mod .sigs2 .sig-img{max-height:16mm;max-width:50mm;margin:0;object-fit:contain}
  #laudo .mod .sigs2 .ln{border-top:1.5px solid #0f4c55;padding-top:3px;font-size:10.5px}
  /* relatório de calibração */
  /* modelo fiel: A4 sem margem, Tahoma 12pt, logo no canto, marca d'água e rodapé em cada página */
  #laudo .anxdoc{page:anx}
  #laudo .anxpg{width:210mm;height:296mm;display:flex;align-items:center;justify-content:center;page-break-before:always;break-before:page;overflow:hidden;background:#fff}
  #laudo .anxpg img{max-width:100%;max-height:100%;object-fit:contain}
  #laudo .certdoc{page:cert}
  #laudo .pg{position:relative;width:210mm;height:296.5mm;overflow:hidden;page-break-after:always;break-after:page;font-family:Tahoma,Verdana,sans-serif;font-size:12pt;line-height:14.5pt;color:#000;box-sizing:border-box;padding:84pt 84pt 70pt 78pt}
  #laudo .pg:last-child{page-break-after:auto;break-after:auto}
  #laudo .pg .logo{position:absolute;left:0;top:0;width:100pt;height:89pt}
  #laudo .pg .wm{position:absolute;left:72pt;top:209pt;width:451pt;height:451pt}
  #laudo .pg .flogo{position:absolute;left:50%;margin-left:-12pt;bottom:3pt;height:24pt;width:24pt}
  #laudo .pg .rod{position:absolute;left:40pt;right:40pt;bottom:30pt;text-align:center;font:bold 9pt/11pt Arial,Helvetica,sans-serif}
  #laudo .pg .body{position:relative;z-index:1}
  #laudo .pg p,#laudo .pg h3,#laudo .pg h4{margin:0 0 12pt;font-size:12pt;line-height:14.5pt;font-weight:normal}
  #laudo .pg h3,#laudo .pg h4{font-weight:bold}
  #laudo .pg h3.t{margin-top:0}
  #laudo .pg .c{text-align:center}
  #laudo .pg .g14{font-size:14pt;line-height:17pt}
  #laudo .pg .amb{font-size:11pt}
  #laudo .pg table{border-collapse:collapse;margin:0 0 12pt}
  #laudo .pg th,#laudo .pg td{border:1px solid #000;padding:2pt 4pt;font-size:10pt;line-height:12pt;font-weight:bold;background:transparent;text-align:left}
  #laudo .pg table.pad th{font-size:11.6pt;text-align:center}
  #laudo .pg table.res{width:100%;table-layout:fixed}
  #laudo .pg table.res th,#laudo .pg table.res td{text-align:center;font-size:12pt;line-height:14.5pt;font-weight:normal}
  #laudo .pg table.res th{font-weight:bold}
  #laudo .pg table.sg{width:100%}
  #laudo .pg .sig-img{max-height:18mm;display:block;margin:4px 0}
  #laudo .pg .cs{display:grid;grid-template-columns:1fr 1fr;gap:28pt;margin-top:10pt;text-align:center;font-size:10pt;line-height:12pt}
  #laudo .pg .cs .im{height:13mm;display:flex;align-items:flex-end;justify-content:center;gap:6pt}
  #laudo .pg .cs .sig-img{max-height:13mm;max-width:46mm;margin:0;object-fit:contain}
  #laudo .pg .cs .ln{border-top:1px solid #000;padding-top:2pt}
  /* checklist */
  /* qualificação térmica */
  #laudo .qt{color:#0a2a6b;font-weight:600}
  /* capa da qualificação: página inteira, sem margem */
  #laudo .qt .cover{page:qcover;position:relative;width:210mm;height:296mm;margin:0!important;overflow:hidden;page-break-after:always;break-after:page;color:#fff;font-family:Tahoma,Verdana,Arial,sans-serif;margin:0}
  #laudo .qt .cover .cv-bg{position:absolute;inset:0;width:100%;height:100%}
  #laudo .qt .cover .cv-in{position:relative;z-index:1;height:100%;box-sizing:border-box;padding:18mm 18mm 14mm;display:flex;flex-direction:column;justify-content:space-between}
  #laudo .qt .cover .cv-top{display:flex;justify-content:space-between;align-items:center}
  #laudo .qt .cover .cv-top span{font-size:11pt;letter-spacing:.08em;font-weight:700;border:1.5px solid #3fd1c4;color:#fff;padding:3mm 5mm;border-radius:2mm;background:rgba(6,24,47,.55)}
  #laudo .qt .cover .clogo{height:26mm;background:#fff;border-radius:3mm;padding:2mm}
  #laudo .qt .cover .cv-kick{font-size:13pt;letter-spacing:.3em;text-transform:uppercase;color:#7fe6dc;font-weight:700;margin-bottom:4mm}
  #laudo .qt .cover .ct{font-size:46pt;line-height:1.05;margin:0;color:#fff;font-weight:800;letter-spacing:.02em}
  #laudo .qt .cover .cbar{width:50mm;height:0;border-top:2.5mm solid #3fd1c4;margin:7mm 0 5mm}
  #laudo .qt .cover .cv-tipo{font-size:16pt;color:#fff;font-weight:600}
  #laudo .qt .cover .cv-info{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;border-top:1px solid rgba(255,255,255,.5);padding-top:6mm;margin-bottom:8mm}
  #laudo .qt .cover .cv-info small{display:block;font-size:8.5pt;letter-spacing:.14em;text-transform:uppercase;color:#7fe6dc;font-weight:700;margin-bottom:1.5mm}
  #laudo .qt .cover .cv-info b{display:block;font-size:13pt;color:#fff;line-height:1.2}
  #laudo .qt .cover .cv-info span{display:block;font-size:9.5pt;color:#dbe9f5;margin-top:1mm}
  #laudo .qt .cover .cv-foot{font-size:9pt;line-height:1.5;color:#dbe9f5}
  #laudo .qt h1.qh{font-size:22px;margin:16px 0 8px;color:#0f4c55;border-top:3px solid #eba98a;padding-top:6px}
  #laudo .qt h4.qs{font-size:13px;color:#0a2a6b}
  #laudo .qt p{color:#0a2a6b}
  #laudo .qt .tx{text-align:justify}
  #laudo .qt .cols{display:grid;grid-template-columns:1fr 1fr;gap:0 16px}
  #laudo .qt .fig{text-align:center;margin:8px 0}
  #laudo .qt .fig img{max-height:90mm;max-width:100%}
  #laudo .qt svg{margin:6px 0}
  #laudo .qt table th,#laudo .qt table td{border-color:#0a2a6b;color:#0a2a6b}
  #laudo .qt table.c td,#laudo .qt table.c th{text-align:center}
  #laudo .qt table.data th,#laudo .qt table.data td{font-size:9px;padding:1px 4px;text-align:center;font-weight:400}
  #laudo .qt table.data tr.mk td{background:#dff3e4!important;color:#145c2a!important;font-weight:700;text-align:left;border-top:1.5px solid #1a7f37;border-bottom:1.5px solid #1a7f37;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #laudo .qt table.data tr.fora td{color:#999!important;background:#f3f3f3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  #laudo .qt td.hi{color:#d00;font-weight:600}
  #laudo .qt td.lo{color:#00c;font-weight:600}
  #laudo .qt .res{text-align:center;font-size:16px;margin:10px 0}
  #laudo .qt .rr{color:#d00}
  #laudo .qt .sigs{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:20px;text-align:center}
  #laudo .qt .sigs>div{min-height:34mm;display:flex;flex-direction:column;justify-content:flex-end}
  #laudo .qt .sigs .sig-img{margin:0 auto 4px}
  #laudo .qt .sigs .ln{border-top:1px solid #0a2a6b;margin-top:26px;padding-top:4px}
}
`;
{ const st = document.createElement('style'); st.media = 'print'; st.textContent = PRINT_CSS; document.head.appendChild(st); }
