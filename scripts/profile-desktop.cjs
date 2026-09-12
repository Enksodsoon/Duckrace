const {chromium}=require('../node_modules/playwright');
const fs=require('fs');
const assert=require('node:assert/strict');
const os=require('node:os');
// Opt-in real-time QA: ordinary/high-density races as well as the 100-entry LOD
// path, all at explicit High graphics. Run after npm run build with preview on
// port 4173. Pass an output path to retain frame-time evidence.
(async()=>{
 const browser=await chromium.launch({channel:'chromium',headless:true});
 const results=[];
 const quality=process.env.PROFILE_QUALITY || 'high';
 const cases=[[6,1,'Forest Lake'],[12,2,'Forest Lake'],[100,1,'Forest Lake'],[12,2,'Mountain River'],[12,2,'Lotus Pond'],[12,2,'Sunset Marsh'],[12,2,'Village Canal']];
 for(const [count,dpr,stage] of cases.filter(row=>!process.env.PROFILE_STAGE || row[2]===process.env.PROFILE_STAGE)){
  const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:dpr});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await page.goto(process.env.PROFILE_URL || 'http://localhost:4173');
  await page.getByRole('button',{name:'Settings',exact:true}).first().click();
  await page.getByLabel('Graphics quality').selectOption(quality);
  await page.getByRole('button',{name:'Play Race',exact:true}).first().click();
  await page.getByLabel('Race entries',{exact:true}).fill(Array.from({length:count},(_,i)=>`Benchmark ${i+1}`).join('\n'));
  await page.getByLabel('Race duration',{exact:true}).selectOption('20');
  await page.getByText('Advanced options',{exact:true}).click();
  await page.getByLabel('Race seed',{exact:true}).fill('desktop-performance-v1');
  await page.getByRole('button',{name:'Stages',exact:true}).first().click();
  await page.getByRole('button',{name:new RegExp(stage)}).click();
  await page.getByRole('button',{name:'Continue to Race',exact:true}).click();
  await page.getByRole('button',{name:'Start Race',exact:true}).click();
  await page.locator('.scene-layer[data-phase="racing"]').waitFor({timeout:120000});
  const sample=await page.evaluate(()=>new Promise(resolve=>{
   const intervals=[],metrics=[],sizes=new Set();let last=performance.now(),start=last;
   function frame(now){intervals.push(now-last);last=now;const c=document.querySelector('canvas');sizes.add(`${c.width}x${c.height}`);const m=document.documentElement.dataset.graphicsMetrics;if(m&&metrics.at(-1)!==m)metrics.push(m);
    if(now-start<12000)requestAnimationFrame(frame);else {resolve({intervals,metrics:metrics.map(JSON.parse),canvasSizes:[...sizes],canvas:{width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight}});}}
   requestAnimationFrame(frame);
  }));
  const sorted=sample.intervals.slice().sort((a,b)=>a-b),sum=sorted.reduce((a,b)=>a+b,0);
  assert.deepEqual(errors,[]);
  if(quality==='high')assert.equal(sample.canvasSizes.length,1,'Race updates must not reset render resolution');
  if(process.env.PROFILE_BASELINE!=='1')assert.ok(sample.canvas.width*sample.canvas.height<=2_400_000*1.01,'High pixel budget');
  if(dpr>1 && quality==='high')assert.ok(sample.canvas.width>sample.canvas.cssWidth,'High-density detail retained');
  assert.ok(sample.metrics.length>0 && sample.metrics.every(m=>quality==='auto' ? ['high','medium','low'].includes(m.quality) : m.quality===quality));
  const tail=[];let tailMs=0;for(const interval of sample.intervals.slice().reverse()){tail.push(interval);tailMs+=interval;if(tailMs>=4000)break;}
  results.push({count,dpr,stage,requestedQuality:quality,canvas:sample.canvas,canvasSizes:sample.canvasSizes,fps:sorted.length/sum*1000,finalFourSecondsFps:tail.length/tailMs*1000,p95ms:sorted[Math.floor(sorted.length*.95)],p99ms:sorted[Math.floor(sorted.length*.99)],over50ms:sorted.filter(x=>x>50).length,errors,metrics:sample.metrics});
  console.log(JSON.stringify(results.at(-1))); await page.close();
 }
 fs.writeFileSync(process.argv[2]||'.git/profile.json',JSON.stringify({generatedAt:new Date().toISOString(),browser:browser.version(),cpu:os.cpus()[0].model,ramBytes:os.totalmem(),os:os.release(),platform:os.platform(),qualification:'Measured desktop browser on this host; shared GPU, not a physical mobile measurement.',results},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
