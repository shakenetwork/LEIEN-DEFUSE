Defuse.modules.suppression={
  title:'交火压制',english:'COVER THE RETAKE',instruction:'按住划过弹起的 C4，划中 15 个即可继续拆包。',
  banter:'B 门和洞口都在拉！先把枪线压回去，再拆。',
  mount(ctx){
    const level=ctx.round.difficulty?.level||0,pattern=Math.floor(Math.random()*3);
    let model=ctx.round.suppression=new Defuse.Crossfire({level,pattern}),pointer=null,last=null,lastFrame=performance.now(),shotAt=-Infinity,announced=false,done=false;
    const story=Defuse.sceneDirector.pickSuppression();
    const lines=[story.label,'「'+story.start+'」','「'+story.middle+'」'];
    const c4='<svg viewBox="0 0 60 64" aria-hidden="true"><path d="M14 14C0 0 38 2 30 17M45 16C57 2 25 0 24 15" fill="none" stroke="#e9c061" stroke-width="3"/><rect x="7" y="16" width="46" height="41" rx="5" fill="#213c35" stroke="#e9cf83" stroke-width="2"/><rect x="13" y="23" width="34" height="13" rx="2" fill="#e6d79d"/><text x="30" y="33" fill="#23342b" text-anchor="middle" font-size="11" font-family="monospace" font-weight="bold">C4</text><path d="M16 42h7m4 0h7m4 0h7M16 48h7m4 0h7m4 0h7" stroke="#91aa96" stroke-width="3"/></svg>';
    ctx.root.innerHTML=`<section class="suppression-unit" data-state="ready" aria-label="交火压制划击关卡"><div class="suppression-field" role="group" aria-label="按住滑动划过 C4，也可点击目标"><div class="suppression-hud"><span>${lines[0]}</span><b><span data-slice-count>0</span><small> / 15</small></b><span data-slice-time>50 个目标</span></div><div class="suppression-targets"></div><svg class="suppression-trail" aria-hidden="true"><path/></svg><div class="suppression-ready"><b>划过 C4，先把人打退</b><span>至少 15 个 · 漏掉不扣血</span><button class="button primary" data-slice-start>开始交火 ${Defuse.icon('arrowRight','action-icon')}</button></div><p class="suppression-radio" aria-live="polite">${lines[1]}</p></div><button class="button primary suppression-exit" data-slice-exit disabled>划中 15 个后继续拆包</button></section>`;
    const unit=ctx.root.querySelector('.suppression-unit'),field=unit.querySelector('.suppression-field'),targets=unit.querySelector('.suppression-targets'),trail=unit.querySelector('.suppression-trail path'),radio=unit.querySelector('.suppression-radio'),exit=unit.querySelector('[data-slice-exit]');
    Defuse.sceneDirector.setScene(field,story.scene);
    const nodes=Array.from({length:50},(_,id)=>{const b=document.createElement('button');b.type='button';b.className='suppression-target';b.hidden=true;b.dataset.sliceTarget=id;b.setAttribute('aria-label','划击 C4 目标 '+(id+1));b.innerHTML=c4;targets.append(b);return b;});
    // Keep touch targets stable between touchstart and the synthesized click.
    const label=(node,value)=>{if(node.textContent!==String(value))node.textContent=value;};
    const available=()=>!done&&!document.hidden&&!window.leienOrientation?.blocked&&!document.querySelector('dialog[open], [popover]:popover-open')&&ctx.active();
    function stop(){const held=pointer;pointer=null;last=null;trail.setAttribute('d','');if(held!==null&&field.hasPointerCapture?.(held))field.releasePointerCapture(held);}
    function finish(){if(!available()||!model.commit())return;done=true;stop();ctx.complete(`${model.grade}！${model.hits.size} 次命中，把人打退了，接着拆。`);}
    function feedback(ids){if(!ids.length)return;
      for(const id of ids){const mark=document.createElement('span');mark.className='suppression-impact';mark.textContent='+1';mark.style.left=nodes[id].style.left;mark.style.top=nodes[id].style.top;field.append(mark);ctx.after(350,()=>mark.remove());}const now=performance.now();if(now-shotAt>110){ctx.sound('distant',{volume:.12});shotAt=now;}unit.classList.add('is-hit');ctx.action('交火压制 · '+model.hits.size+' / 15',Math.min(100,model.hits.size/15*100));paint();}
    function paint(){
      label(unit.querySelector('[data-slice-count]'),model.hits.size);
      label(unit.querySelector('[data-slice-time]'),model.started?(Math.max(0,model.duration-model.elapsed)/1000).toFixed(1)+' 秒':'50 个目标');
      const visible=new Map(model.visible().map(t=>[t.id,t]));
      nodes.forEach((b,id)=>{const t=visible.get(id);b.hidden=!t;if(t){b.style.left=(t.x*100)+'%';b.style.top=(t.y*100)+'%';b.style.setProperty('--angle',t.angle+'deg');}});
      if(model.ready){exit.disabled=false;label(exit,model.grade+' · 继续拆包');unit.dataset.state='qualified';if(!announced){announced=true;radio.textContent='「'+story.clear+'」';ctx.sound('tap',{volume:.18});}}
      else if(model.started&&model.elapsed>model.interval*4&&unit.dataset.story!=='middle'){unit.dataset.story='middle';radio.textContent=lines[2];}
    }
    // Mobile browsers may omit a compatibility click after repeated swipes.
    // Commit a button action only on a matching, stationary press/release.
    function bindAction(button,run){
      let press=null;
      const clear=()=>{press=null;};
      ctx.listen(button,'pointerdown',e=>{if(press||!e.isPrimary||e.button!==0||button.disabled||!available())return;press={id:e.pointerId,x:e.clientX,y:e.clientY};});
      ctx.listen(window,'pointermove',e=>{if(press&&press.id===e.pointerId&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>14)clear();});
      ctx.listen(window,'pointerup',e=>{if(!press||press.id!==e.pointerId)return;const held=press;clear();if(!button.contains(e.target)||Math.hypot(e.clientX-held.x,e.clientY-held.y)>14||button.disabled)return;e.preventDefault();run();});
      ctx.listen(window,'pointercancel',e=>{if(press?.id===e.pointerId)clear();});ctx.listen(window,'blur',clear);
      ctx.listen(document,'visibilitychange',clear);ctx.listen(document,'defuse-orientation-block',clear);
      ctx.listen(button,'click',e=>{if(e.detail>0){e.preventDefault();return;}if(!button.disabled)run();});
    }
    bindAction(unit.querySelector('[data-slice-start]'),()=>{
      if(!available()||model.started&&!model.ended)return;
      if(model.ended){model=ctx.round.suppression=new Defuse.Crossfire({level,pattern});announced=false;delete unit.dataset.story;}
      model.start();unit.dataset.state='playing';unit.querySelector('.suppression-ready').hidden=true;lastFrame=performance.now();radio.textContent=lines[1];paint();
    });
    bindAction(exit,finish);
    const point=e=>{const r=field.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    ctx.listen(field,'pointerdown',e=>{if(!available()||!model.started||model.ended||pointer!==null||!e.isPrimary||e.button!==0||e.target.closest('[data-slice-start]'))return;e.preventDefault();pointer=e.pointerId;last=point(e);field.setPointerCapture?.(pointer);const b=e.target.closest('[data-slice-target]');if(b&&model.hit(Number(b.dataset.sliceTarget)))feedback([Number(b.dataset.sliceTarget)]);});
    ctx.listen(field,'pointermove',e=>{if(e.pointerId!==pointer)return;if(!available()){stop();return;}e.preventDefault();const r=field.getBoundingClientRect();for(const sample of e.getCoalescedEvents?.().length?e.getCoalescedEvents():[e]){const next=point(sample);feedback(model.swipe(last,next,{width:r.width,height:r.height,radius:28}));trail.setAttribute('d',`M${last.x} ${last.y} L${next.x} ${next.y}`);last=next;}});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])ctx.listen(field,type,e=>{if(e.pointerId===pointer)stop();});
    ctx.listen(targets,'click',e=>{const b=e.target.closest('[data-slice-target]');if(e.detail===0&&b&&available()&&model.hit(Number(b.dataset.sliceTarget)))feedback([Number(b.dataset.sliceTarget)]);});
    ctx.listen(window,'blur',stop);ctx.listen(document,'visibilitychange',stop);ctx.listen(document,'defuse-orientation-block',stop);
    ctx.frame(now=>{const delta=Math.min(100,Math.max(0,now-lastFrame));lastFrame=now;if(!available()){stop();return;}if(!model.started||model.cleared)return;model.advance(delta);paint();if(now-shotAt>90)unit.classList.remove('is-hit');if(model.ended){stop();if(model.ready)finish();else if(unit.dataset.state!=='retry'){unit.dataset.state='retry';const panel=unit.querySelector('.suppression-ready');panel.hidden=false;panel.querySelector('b').textContent=`命中 ${model.hits.size} / 15`;panel.querySelector('span').textContent='没到 15 个。还能重试，注意剩余时间。';panel.querySelector('button').textContent='再压一轮';radio.textContent='「还在架！再来，划过整排 C4。」';}}});
  }
};
