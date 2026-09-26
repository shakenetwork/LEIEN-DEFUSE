/* Abstract suppression targets, not simulated C4 damage or extra enemies. */
(function(root){
  const GOAL=15, TOTAL=50;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  class Crossfire {
    constructor({level=0,pattern=0}={}) {
      this.level=clamp(Math.floor(Number(level)||0),0,3);
      this.pattern=clamp(Math.floor(Number(pattern)||0),0,2);
      this.interval=[800,760,720,680][this.level];
      this.flight=[2400,2250,2100,2000][this.level];
      this.duration=9*this.interval+this.flight;
      this.elapsed=0; this.hits=new Map(); this.cleared=false; this.started=false;
    }
    start(){this.started=true;return this;}
    advance(delta){if(this.started&&!this.cleared&&Number.isFinite(delta)&&delta>0)this.elapsed=Math.min(this.duration,this.elapsed+delta);}
    spawnAt(id){return Math.floor(id/5)*this.interval;}
    target(id){
      const age=this.elapsed-this.spawnAt(id);
      if(!this.started||this.cleared||this.hits.has(id)||age<0||age>=this.flight)return null;
      const t=age/this.flight, wave=Math.floor(id/5), lane=id%5;
      const reverse=this.pattern===1&&wave%2===1;
      const center=.13+(reverse?4-lane:lane)*.185;
      const drift=this.pattern===2?Math.sin(t*Math.PI*2+wave)*.04:(lane%2?1:-1)*Math.sin(t*Math.PI)*.025;
      return {id,x:clamp(center+drift,.1,.9),y:1.16-3.68*t*(1-t),angle:(lane-2)*12*Math.sin(t*Math.PI)};
    }
    visible(){return Array.from({length:TOTAL},(_,id)=>this.target(id)).filter(Boolean);}
    hit(id){
      if(!Number.isInteger(id)||id<0||id>=TOTAL||!this.target(id))return false;
      // Targets below the panel edge are never hittable.
      if(this.target(id).y>1)return false;
      this.hits.set(id,this.elapsed);return true;
    }
    swipe(a,b,{width=300,height=220,radius=27}={}){
      if(!a||!b||![a.x,a.y,b.x,b.y,width,height,radius].every(Number.isFinite)||width<=0||height<=0)return [];
      const dx=b.x-a.x,dy=b.y-a.y,d2=dx*dx+dy*dy;
      if(d2<9)return []; // Holding still cannot harvest passing targets.
      const hit=[];
      for(const p of this.visible()){
        if(p.y<0||p.y>1)continue;
        const x=p.x*width,y=p.y*height,t=d2?clamp(((x-a.x)*dx+(y-a.y)*dy)/d2,0,1):0;
        if(Math.hypot(x-a.x-t*dx,y-a.y-t*dy)<=radius&&this.hit(p.id))hit.push(p.id);
      }
      return hit;
    }
    get ready(){return this.hits.size>=GOAL;}
    get ended(){return this.elapsed>=this.duration;}
    get grade(){return this.hits.size>=40?'火力全开':this.hits.size>=30?'强势压制':'压制成功';}
    commit(){if(!this.ready||this.cleared)return false;this.cleared=true;return true;}
    proof(){return {cleared:this.cleared,level:this.level,pattern:this.pattern,elapsed:this.elapsed,hits:[...this.hits].map(([id,at])=>({id,at}))};}
  }
  function validCrossfireProof(p){
    if(!p||p.cleared!==true||!Number.isInteger(p.level)||p.level<0||p.level>3||!Number.isInteger(p.pattern)||p.pattern<0||p.pattern>2||!Array.isArray(p.hits)||p.hits.length<GOAL||p.hits.length>TOTAL)return false;
    const model=new Crossfire(p),ids=new Set();
    if(!Number.isFinite(p.elapsed)||p.elapsed<0||p.elapsed>model.duration)return false;
    for(const hit of p.hits){if(!hit||!Number.isInteger(hit.id)||hit.id<0||hit.id>=TOTAL||ids.has(hit.id)||!Number.isFinite(hit.at)||hit.at>p.elapsed)return false;
      model.started=true;model.elapsed=hit.at;const target=model.target(hit.id);
      if(!target||target.y>1)return false;ids.add(hit.id);
    }
    return true;
  }
  const api={Crossfire,validCrossfireProof};
  if(typeof module==='object'&&module.exports)module.exports=api;
  Object.assign(root.Defuse||={},api);
})(typeof globalThis!=='undefined'?globalThis:this);
