import { createRoot } from 'react-dom/client';
import { useCallback, useMemo, useState } from 'react';
import DuckScene from '../../src/scene/DuckScene';
function Preview(){
 const [ready,setReady]=useState(null);
 const [screen,setScreen]=useState('home'),[stage,setStage]=useState('forest-lake'),[count,setCount]=useState(8),[metrics,setMetrics]=useState({}),[cameraMode,setCamera]=useState('chase'),[quality,setQuality]=useState('auto'),[samples,setSamples]=useState([]);
 const recordMetrics=useCallback(sample=>{setMetrics(sample);setSamples(previous=>[...previous.slice(-15),sample]);},[]);
 const participants=useMemo(()=>Array.from({length:count},(_,i)=>({id:'d'+i,name:'Duck '+i})),[count]);
 const looks=useMemo(()=>Array.from({length:count},(_,i)=>({breed:['mallard','pekin','khaki','mandarin','runner'][i%5],accessory:['none','hat','glasses','bow','medal','charm','badge'][i%7]})),[count]);
 const progress=useMemo(()=>Array.from({length:count},(_,i)=>30+Math.sin(i*1.71)*3),[count]);
 return <><nav><select aria-label="Screen" value={screen} onChange={e=>setScreen(e.target.value)}>{['home','garage','stages','race','results'].map(v=><option key={v}>{v}</option>)}</select><select aria-label="Stage" value={stage} onChange={e=>setStage(e.target.value)}>{['forest-lake','mountain-river','lotus-pond','sunset-marsh','village-canal'].map(v=><option key={v}>{v}</option>)}</select><button onClick={()=>setCount(count===8?100:8)}>{count} racers</button><select aria-label="Camera" value={cameraMode} onChange={e=>setCamera(e.target.value)}>{['chase','overview','follow'].map(v=><option key={v}>{v}</option>)}</select><select aria-label="Quality" value={quality} onChange={e=>setQuality(e.target.value)}>{["auto","low","medium","high"].map(v=><option key={v}>{v}</option>)}</select><button onClick={()=>setSamples([])}>Reset sample</button></nav><DuckScene quality={quality} onReady={setReady} screen={screen} stage={stage} participants={participants} progress={progress} appearances={looks} cameraMode={cameraMode} followId="d2" isRacing onMetrics={recordMetrics} onError={e=>setMetrics({error:e.message})}/><output>{JSON.stringify({...metrics,ready,sampleCount:samples.length,seconds:samples.reduce((sum,s)=>sum+(s.sampleSeconds||0),0),frames:samples.reduce((sum,s)=>sum+(s.sampleFrames||0),0),allFocused:samples.every(s=>s.focused),minimumSampleFps:Math.min(...samples.map(s=>s.fps))})}</output></>;
}createRoot(document.getElementById('root')).render(<Preview/>);


