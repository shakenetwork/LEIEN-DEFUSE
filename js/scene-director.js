/* Cosmetic scene bags: independent of combat rolls and never award damage/kills. */
(() => {
  const root='assets/scenes/';
  const scenes={
    site:{file:'dust2-b-hold.webp',label:'B 包点',position:'50% 55%'},
    platform:{file:'cs2-dust2-cover-1280.webp',label:'B 后平台',position:'55% 55%'},
    doors:{file:'dust2-b-doors.webp',label:'B 门',position:'52% 55%'},
    approach:{file:'dust2-b-entry-wide.webp',label:'B 门外',position:'46% 55%'},
    scaffold:{file:'dust2-window-route.webp',label:'B 窗外通道',position:'60% 55%'},
    mid:{file:'dust2-mid-b-sign.webp',label:'CT 中路',position:'60% 55%'},
    spawn:{file:'dust2-ct-shelter.webp',label:'CT 出生通道',position:'45% 50%'},
    tunnel:{file:'dust2-tunnel-exit.webp',label:'B 洞内',position:'54% 53%'},
  };
  const stories={
    rush:[
      {id:'door-trade',route:'approach',plant:'我下包。B 门补枪位站开，别挤一块。',scene:'包好了。门口留一个，别都挤这儿。'},
      {id:'window-watch',route:'scaffold',plant:'我下包，帮我看窗口。别都盯着门。',scene:'包好了。听到拆包再看，先别送。'},
      {id:'tunnel-reset',route:'mid',plant:'我下包。洞口先卡住，他们要回来了。',scene:'包好了，散开一点。等他来摸。'},
      {id:'crossfire',route:'spawn',plant:'别追了，回来守包。门和洞各站一个。',scene:'下好了。听到拆包就报，别乱拉。'},
    ],
    fake:[
      {id:'long-noise',route:'mid',plant:'A 大再响两枪，我在 B 下。打完就走。',scene:'包下了。他们回得快，先架住。'},
      {id:'quiet-plant',route:'spawn',plant:'先别踩脚步。我下完，你们再拉开。',scene:'下好了。别急着探头，听拆包声。'},
      {id:'split-return',route:'approach',plant:'中路别贪，包在 B。回防放进来再打。',scene:'B 下好了。一个看门，一个留洞。'},
      {id:'late-rotate',route:'scaffold',plant:'A 点别再去了，赶紧回 B。我下包。',scene:'包好了，枪线站开。别全露给一颗闪。'},
    ],
  };
  const suppression=[
    {id:'door-cover',scene:'approach',label:'B 门来人',start:'门口在拉！压一下，我跟你进。',middle:'别追！门后还有补枪的。',clear:'缩回去了。回包，我看门。'},
    {id:'window-route',scene:'scaffold',label:'回防通道',start:'这边有人架！帮我打一下，我过不去。',middle:'我过来了！打退他就回去拆。',clear:'他缩了，回去拆。'},
    {id:'tunnel-angle',scene:'site',label:'B 洞来人',start:'洞口露了！打他，别让他拉出来。',middle:'他缩了！盯住洞口，别让他跑。',clear:'洞口暂时没动静。你拆，我盯着。'},
    {id:'platform-trade',scene:'platform',label:'包点两边来人',start:'两边都拉了！先打人！',middle:'另一边也在拉，注意补枪！',clear:'人退了！回去拆！'},
    {id:'door-second',scene:'doors',label:'架住 B 门',start:'门缝有人架，别直走！先打他！',middle:'贴左边，别堵我枪线。继续压！',clear:'门口没再拉。行，回去拆。'},
    {id:'cover-relocate',scene:'site',label:'掩护换位',start:'我被架死了！帮我打一下，我换个位置。',middle:'快到箱后了，再帮我打两枪！',clear:'我架住了，你拆。'},
  ];
  const bags=new Map();
  function draw(key,list,random=Math.random){
    let state=bags.get(key);if(!state){state={bag:[],last:null};bags.set(key,state);}
    if(!state.bag.length){state.bag=Defuse.shuffle(list,random);if(state.bag.at(-1)?.id===state.last&&list.length>1)[state.bag[0],state.bag[state.bag.length-1]]=[state.bag.at(-1),state.bag[0]];}
    const selected=state.bag.pop();state.last=selected.id;return selected;
  }
  const css=id=>`url("${new URL(root+(scenes[id]||scenes.site).file,document.baseURI).href}")`;
  function setScene(element,id){const scene=scenes[id]||scenes.site;element.style.setProperty('--scene-image',css(id));element.style.setProperty('--scene-position',scene.position);element.dataset.scene=id;}
  const previous=Defuse.rollMatchPlan;
  Defuse.rollMatchPlan=(...args)=>{
    const plan=previous(...args),mode=plan.mode==='fake'?'fake':'rush';
    const story=draw(mode,stories[mode]);plan.story={...story,siteScene:Math.random()<.5?'site':'platform'};
    if(!['rescue','rush-defense'].includes(plan.opening)){plan.plant=story.plant;plan.scene=story.scene;}
    document.documentElement.style.setProperty('--round-approach',css(story.route));
    document.documentElement.style.setProperty('--round-site',css(plan.story.siteScene));
    return plan;
  };
  Defuse.sceneDirector={scenes,stories,suppression,draw,css,setScene,
    pickSuppression(){return draw('suppression',suppression);},
    applyGame(element){setScene(element,Defuse.matchPlan?.story?.siteScene||'site');},
  };
})();
