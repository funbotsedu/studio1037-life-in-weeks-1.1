// Run with node smoke.mjs, then open the printed URL in a browser.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const base = new URL('.', import.meta.url);
const current = readFileSync(new URL('index.html', base), 'utf8');
const legacy = execFileSync('git', ['show','v1.1:index.html'], {cwd:base,encoding:'utf8'})
  .replaceAll('life4000_', 'legacy4000_');
const harness = `<!doctype html><meta charset="utf-8"><title>Life in Weeks browser smoke</title>
<h1>Life in Weeks — synthetic browser checks</h1><pre id="report"></pre><iframe width="390" height="700"></iframe>
<script>
const frame=document.querySelector('iframe'), out=document.querySelector('#report');
const say=s=>out.textContent+=s+'\\n';
const check=(value,label)=>{if(!value)throw Error(label);say('PASS '+label)};
const wait=async(fn)=>{for(let i=0;i<120;i++){if(fn())return;await new Promise(r=>setTimeout(r,35))}throw Error('Timed out: '+fn)};
let w,d,$,backup,permit=true,errors=[];
const load=path=>new Promise(r=>{frame.onload=()=>{w=frame.contentWindow;d=w.document;$=id=>d.getElementById(id);
  w.confirm=()=>permit;w.alert=message=>{if(/ошибка|не удалось/i.test(message))errors.push(message)};
  w.addEventListener('error',e=>errors.push(e.message));w.addEventListener('unhandledrejection',e=>errors.push(String(e.reason)));
  w.HTMLAnchorElement.prototype.click=function(){if(this.download)w.fetch(this.href).then(r=>r.json()).then(v=>backup=v)};
  r()};frame.src=path});
const selectFile=(id,file)=>{const dt=new w.DataTransfer();dt.items.add(file);$(id).files=dt.files;$(id).dispatchEvent(new w.Event('change'))};
const birth=async()=>{await wait(()=>$('profileDialog').open);$('birth').value='2000-01-01';$('saveProfile').click();await wait(()=>$('weeks').children.length===4000)};
const open=async(i)=>{$('weeks').children[i].click();await wait(()=>$('weekDialog').open)};
const save=async()=>{$('saveEntry').click();await wait(()=>$('weekDialog').open===false)};
const photo=async()=>{const canvas=d.createElement('canvas');canvas.width=12;canvas.height=12;const c=canvas.getContext('2d');c.fillStyle='orange';c.fillRect(0,0,12,12);const blob=await new Promise(r=>canvas.toBlob(r));selectFile('photoInput',new w.File([blob],'synthetic.png',{type:'image/png'}));await wait(()=>d.querySelector('#photos img')?.naturalWidth===12)};
(async()=>{
 await load('/legacy');await birth();await open(0);$('entryTitle').value='v1.1 synthetic';$('entryText').value='legacy note';await photo();await save();$('exportBtn').click();await wait(()=>backup?.photos.length===1);
 const legacyBackup=backup;check(legacyBackup.format==='life4000-v1','v1.1 generated a real JSON backup with PNG');
 await load('/app');await wait(()=>$('profileDialog').open);check($('weeks').children.length===0,'fresh profile prompt');await birth();
 check($('weeks').children.length===4000&&!!d.querySelector('.past')&&!!d.querySelector('.current'),'birth, 4000 weeks and elapsed colors');
 $('jumpCurrent').click();check(d.activeElement.classList.contains('current'),'current-week navigation');
 for(const [id,n] of [['jumpAge','25'],['jumpDecade','40']]){$(id).value=n;$(id).dispatchEvent(new w.Event('change'));check($('jumpStatus').textContent.startsWith('Возраст '+n),id)}
 await open(3);$('entryText').value='new local note';await photo();d.querySelector('.thumb').click();await wait(()=>$('fullPhoto').naturalWidth===12);
 check($('viewer').open,'fullscreen overlay');$('zoomIn').click();check($('zoomLevel').value==='150%','photo zoom');$('closeViewer').click();check(!$('viewer').open,'close with button');
 d.querySelector('.thumb').click();$('photoStage').click();check(!$('viewer').open,'close by tapping background');
 permit=false;d.querySelector('.remove-photo').click();check(!!d.querySelector('.thumb'),'cancel photo removal');permit=true;d.querySelector('.remove-photo').click();await wait(()=>!d.querySelector('.thumb'));await save();
 await open(3);check($('entryText').value==='new local note'&&!d.querySelector('.thumb'),'save note with photo removed');$('entryText').value='edited local note';await save();
 await load('/app');await wait(()=>$('weeks').children.length===4000);await open(3);check($('entryText').value==='edited local note','edit and reload persistence');
 permit=false;$('deleteEntry').click();check($('weekDialog').open,'cancel full record deletion');permit=true;$('closeWeek').click();
 const importData={...legacyBackup,entries:[...legacyBackup.entries,{...legacyBackup.entries[0],week:3,title:'must not overwrite'}]};
 selectFile('importInput',new w.File([JSON.stringify(importData)],'synthetic-v11.json',{type:'application/json'}));
 await wait(()=>$('recorded').textContent==='2');await open(0);await wait(()=>d.querySelector('#photos img')?.naturalWidth===12);check($('entryText').value==='legacy note','v1.1 text and PNG import');$('closeWeek').click();
 await open(3);check($('entryText').value==='edited local note','import preserved occupied week');$('closeWeek').click();
 backup=null;$('exportBtn').click();await wait(()=>backup?.photos.length===1);check(backup.format==='life4000-v1'&&backup.photos[0].data===legacyBackup.photos[0].data,'v1.2 export retains identical PNG');
 check(w.innerWidth===390&&d.documentElement.scrollWidth<=390&&d.querySelector('.gridwrap').scrollWidth>390,'390 px layout: scroll confined to week grid');
 check(errors.length===0,'no captured JavaScript errors: '+errors.join('; '));say('ALL PASSED');
})().catch(e=>say('FAIL '+e.stack));
</script>`;
const server = createServer((req,res)=>{
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
  res.end(req.url==='/app'?current:req.url==='/legacy'?legacy:harness);
});
server.listen(0,'127.0.0.1',()=>console.log('Open http://127.0.0.1:'+server.address().port+'/'));
