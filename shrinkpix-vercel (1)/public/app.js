const $=s=>document.querySelector(s),kb=n=>n>1048576?(n/1048576).toFixed(2)+' MB':(n/1024).toFixed(1)+' KB';
const cc=$('#cc');try{if(!localStorage.getItem('consent'))cc.hidden=false;}catch(e){cc.hidden=false}
cc.onclick=e=>{const c=e.target.dataset.c;if(c==null)return;try{localStorage.setItem('consent',c)}catch(e){}cc.hidden=true;
 // Load the AdSense script here only when c==='1' (see README)
};
if($('#drop')){let files=[];const drop=$('#drop'),inp=$('#file'),msg=$('#msg'),go=$('#go');
 const OK=/\.(jpe?g|png|gif)$/i;
 const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 // ---- Live size estimate (shown before the user clicks Compress) ----
 const estCache=new Map();let estTimer=0,estRun=0;
 const ekey=(f,q)=>f.name+'|'+f.size+'|'+f.lastModified+'|'+q;
 async function estimate(f,q){const k=ekey(f,q);if(estCache.has(k))return estCache.get(k);let n;
  if(f.type==='image/jpeg'){ // JPEG: instant, done in the browser
   const bmp=await createImageBitmap(f),c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;
   c.getContext('2d').drawImage(bmp,0,0);if(bmp.close)bmp.close();
   const b=await new Promise(r=>c.toBlob(r,'image/jpeg',q/100));n=Math.min(b.size,f.size)}
  else{ // PNG/GIF: ask the server for the size only (probe)
   const fd=new FormData();fd.append('image',f);fd.append('quality',q);fd.append('probe','1');
   const r=await fetch('/api/compress',{method:'POST',body:fd});if(!r.ok)throw 0;n=(await r.json()).size}
  estCache.set(k,n);return n}
 function renderList(){
  $('#res').innerHTML=files.map((f,i)=>`<div class="item"><div class="i"><span>${esc(f.name)}</span><span>${kb(f.size)} → <b class="est" data-i="${i}">…</b></span></div></div>`).join('')+(files.length?'<p id="tot" class="muted"></p>':'');
  $('#dl').hidden=true;updateEst()}
 function updateEst(){clearTimeout(estTimer);const run=++estRun,q=+$('#q').value;
  document.querySelectorAll('.est').forEach(e=>e.textContent='…');
  if(!files.length)return;
  estTimer=setTimeout(async()=>{let tot=0,totE=0;const batch=files.slice();
   await Promise.all(batch.map(async(f,i)=>{let n=null;try{n=await estimate(f,q)}catch(e){}
    if(run!==estRun)return;const el=document.querySelector(`.est[data-i="${i}"]`);if(!el)return;
    if(n==null){el.textContent='n/a';return}
    tot+=f.size;totE+=n;el.innerHTML=`~${kb(n)} <span class="save">−${Math.max(0,Math.round((1-n/f.size)*100))}%</span>`}));
   const t=$('#tot');if(run!==estRun||!t||!tot)return;
   t.innerHTML=`${batch.length>1?'Total: ':''}${kb(tot)} → ~<b>${kb(totE)}</b> at ${q}% quality (−${Math.max(0,Math.round((1-totE/tot)*100))}%). This is an estimate; the final size may be slightly smaller. Move the slider to compare, then press Compress.`},350)}
 function add(list){msg.textContent='';const good=[];for(const f of list){
  if(!OK.test(f.name)||!/^image\/(jpeg|png|gif)$/.test(f.type)){msg.textContent=`"${f.name}" is not supported. Use JPG, PNG or GIF.`;continue}
  if(f.size>4*1000*1000){msg.textContent=`"${f.name}" is larger than 4 MB.`;continue}good.push(f)}
  if(files.length+good.length>10){msg.textContent='Maximum 10 images per batch.';good.length=Math.max(0,10-files.length)}
  files=files.concat(good);go.disabled=!files.length;renderList()}
 $('#pick').onclick=()=>inp.click();inp.onchange=()=>{add([...inp.files]);inp.value=''};
 ['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.add('on')}));
 ['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.classList.remove('on')}));
 drop.addEventListener('drop',e=>add([...e.dataTransfer.files]));
 $('#q').oninput=e=>{$('#qv').textContent=e.target.value+'%';updateEst()};
 let okList=[];
 go.onclick=async()=>{const bar=$('#bar'),q=$('#q').value,batch=files.slice();estRun++;let done=0;
  bar.hidden=false;bar.firstChild.style.width='5%';go.disabled=true;msg.textContent='';
  const results=await Promise.all(batch.map(async f=>{try{
    const fd=new FormData();fd.append('image',f);fd.append('quality',q);
    const r=await fetch('/api/compress',{method:'POST',body:fd});
    if(!r.ok){let d={};try{d=await r.json()}catch(e){}throw new Error(d.error||'Upload failed (file may be too large).')}
    const blob=await r.blob();return {f,name:f.name,original:f.size,compressed:blob.size,blob,url:URL.createObjectURL(blob)};
   }catch(e){return {f,name:f.name,error:e.message||'Network error. Please try again.'}}
   finally{done++;bar.firstChild.style.width=(done/batch.length*100)+'%'}}));
  setTimeout(()=>bar.hidden=true,400);go.disabled=false;files=[];
  okList=results.filter(r=>!r.error);
  $('#res').innerHTML=results.map(r=>r.error
   ?`<div class="item"><div class="i"><span>${esc(r.name)}</span><span class="bad">${esc(r.error)}</span></div></div>`
   :`<div class="item"><div><small>Original</small><img src="${URL.createObjectURL(r.f)}" alt="Original"></div><div><small>Compressed</small><img src="${r.url}" alt="Compressed"></div><div class="i"><span>${esc(r.name)}</span><span>${kb(r.original)} → <b>${kb(r.compressed)}</b> <span class="save">−${Math.round((1-r.compressed/r.original)*100)}%</span></span><a class="btn" href="${r.url}" download="min-${esc(r.name)}">Download</a></div></div>`).join('');
  $('#dl').hidden=okList.length<2;};
 $('#zip').onclick=async e=>{e.preventDefault();const b=e.target;b.textContent='Preparing ZIP…';
  try{if(!window.JSZip)await new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';s.onload=ok;s.onerror=no;document.head.appendChild(s)});
   const z=new JSZip(),seen={};okList.forEach(r=>{let n='min-'+r.name;if(seen[n]){const k=n.lastIndexOf('.');n=n.slice(0,k)+'-'+seen[n]+n.slice(k)}seen['min-'+r.name]=(seen['min-'+r.name]||0)+1;z.file(n,r.blob)});
   const blob=await z.generateAsync({type:'blob'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='shrinkpix-images.zip';a.click();
  }catch(err){msg.textContent='Could not create the ZIP. Please download images one by one.'}
  b.textContent='Download all (ZIP)';};
}
