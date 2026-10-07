/* Rasteriza o grafico de saldo com o PROPRIO codigo do app (jsdom + node-canvas).
   Non-interactive, com watchdog e process.exit: nao fica preso em timers do jsdom. */
const fs = require('fs');
const OUT = '/home/user/cornerpro/';
let JSDOM;
try { JSDOM = require('/home/user/node_modules/jsdom').JSDOM; }
catch (e){ console.log('sem jsdom:', e.message); process.exit(2); }

const watchdog = setTimeout(() => { console.log('watchdog: encerrando sem rasterizar'); process.exit(3); }, 20000);

let html;
try { html = fs.readFileSync(OUT + 'index.html', 'utf8'); }
catch (e){ console.log('sem index.html:', e.message); process.exit(4); }

let dom;
try {
  dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
    beforeParse(win){
      win.fetch = () => Promise.reject(new Error('sem rede no sandbox'));
      win.matchMedia = win.matchMedia || (() => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
      win.addEventListener('error', () => {});
    }
  });
} catch (e){ console.log('jsdom falhou:', e.message); process.exit(5); }

const w = dom.window, d = w.document;
const ev = (c) => w.eval(c);

function png(cv){
  try { if (typeof cv.toBuffer === 'function') return cv.toBuffer('image/png'); } catch(e){}
  try { const c = cv.getContext('2d'); if (c && c.canvas && typeof c.canvas.toBuffer === 'function') return c.canvas.toBuffer('image/png'); } catch(e){}
  try { const u = cv.toDataURL('image/png'); if (u && u.indexOf('base64,') > 0) return Buffer.from(u.split('base64,')[1], 'base64'); } catch(e){}
  return null;
}
function shot(sp, file, view){
  ev("state.saldoView='" + (view || 'league') + "';state.saldoMetric='sum';state.saldoPeriod='" + sp + "';renderSaldoChart();true");
  const cv = d.querySelector('#saldoChart');
  const buf = png(cv);
  let info = 'PNG nao gerado (canvas sem backend)';
  if (buf){ fs.writeFileSync(OUT + file, buf); info = 'PNG ' + file + ' (' + fs.statSync(OUT + file).size + ' B)'; }
  console.log('--- filtro=' + sp + ' visao=' + (view || 'league') + ' | ' + info);
  console.log('    tamanho do bitmap: ' + cv.width + 'x' + cv.height + ' | data-geom: ' + cv.getAttribute('data-geom'));
  console.log('    titulo : ' + (d.querySelector('#saldoTitle') || {}).textContent);
  console.log('    legenda: ' + String((d.querySelector('#saldoLegend') || {}).textContent).slice(0, 220));
}

setTimeout(() => {
  try {
    console.log('jogos carregados : ' + ev("(typeof MATCHES!=='undefined')?MATCHES.length:'sem MATCHES'"));
    console.log('com periodo      : ' + ev("(typeof MATCHES!=='undefined')?filtered().filter(function(m){return periodBuckets(m)}).length:'n/d'"));
    console.log('provedor         : ' + ev("(function(){try{return prov().name+'/'+prov().src}catch(e){return 'n/d'}})()"));
    shot('both', 'chart-ambos.png');
    shot('h1', 'chart-1tempo.png');
    shot('h2', 'chart-2tempo.png');
    shot('both', 'chart-por-time.png', 'team');
    console.log('rasterizacao concluida');
  } catch (e){ console.log('erro ao rasterizar:', e && e.message); }
  clearTimeout(watchdog);
  process.exit(0);
}, 1500);
