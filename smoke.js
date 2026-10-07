const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const errors = [];
const vc = new (require('jsdom').VirtualConsole)();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.detail ? (e.detail.stack||e.detail.message||e.detail) : e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://local.test/', virtualConsole: vc });
const { window } = dom;
// canvas not implemented in jsdom -> stub getContext to avoid throw
window.HTMLCanvasElement.prototype.getContext = function(){ return { scale(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},set strokeStyle(v){},set lineWidth(v){},set lineJoin(v){},set shadowColor(v){},set shadowBlur(v){} }; };
function fire(el, type){ const ev = new window.Event(type, {bubbles:true}); el.dispatchEvent(ev); }
setTimeout(() => {
  const d = window.document;
  const tabs = d.querySelectorAll('#tabs .tab');
  tabs[1].dispatchEvent(new window.MouseEvent('click',{bubbles:true})); // Agendados
  const schedRows = d.querySelectorAll('#list .matchrow').length;
  tabs[2].dispatchEvent(new window.MouseEvent('click',{bubbles:true})); // Finalizados
  const finRows = d.querySelectorAll('#list .matchrow').length;
  tabs[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true})); // Ao Vivo
  const liveRows = d.querySelectorAll('#list .matchrow').length;
  // chips de liga
  const chips = d.querySelectorAll('#leagues .chip');
  chips[1] && chips[1].dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const afterChip = d.querySelectorAll('#list .matchrow').length;
  chips[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  tabs[4].dispatchEvent(new window.MouseEvent('click',{bubbles:true})); // Todos
  const allRows = d.querySelectorAll('#list .matchrow').length;
  // abre detalhe do primeiro jogo
  const row = d.querySelector('#list .matchrow');
  row && row.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const panelOpen = d.querySelector('#panel').classList.contains('open');
  const panelText = d.querySelector('#panelBody').textContent;
  const hasStats = /Posse de bola/.test(panelText);
  const hasPeriod = /Escanteios por período/.test(panelText);
  const hasH2H = /Confronto direto/.test(panelText);
  d.querySelector('#closePanel') && d.querySelector('#closePanel').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const closed = !d.querySelector('#panel').classList.contains('open');
  // favoritar
  const fav = d.querySelector('[data-fav]');
  fav && fav.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const favsStored = window.localStorage.getItem('cp_favs');
  // nav -> ranking
  const navBtns = d.querySelectorAll('#nav button');
  navBtns[1].dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const rankItems = d.querySelectorAll('#rankCard .matchrow').length;
  // nav -> bots
  navBtns[2].dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const botsEmpty = /Nenhum bot/.test(d.querySelector('#botList').textContent);
  // cria bot
  d.querySelector('#openBot').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  d.querySelector('#bName').value = 'Teste';
  d.querySelector('#saveBot').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  const botsCount = d.querySelectorAll('#botList .botcard').length;
  const botsStored = JSON.parse(window.localStorage.getItem('cp_bots')||'[]').length;
  // busca
  d.querySelector('#openSearch').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  d.querySelector('#searchInput').value='Real';
  d.querySelector('#searchInput').dispatchEvent(new window.Event('input',{bubbles:true}));
  const searchHits = d.querySelectorAll('#searchResults .sres').length;
  console.log(JSON.stringify({schedRows,finRows,liveRows,afterChip,allRows,panelOpen,hasStats,hasPeriod,hasH2H,closed,favsStored,rankItems,botsEmpty,botsCount,botsStored,searchHits,errors},null,1));
  process.exit(errors.length?1:0);
}, 700);
