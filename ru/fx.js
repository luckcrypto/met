(function(){
"use strict";
if(typeof document==='undefined'||!document.getElementById||!window.MutationObserver)return;
var FALL={USD:1,EUR:0.92,GBP:0.78,JPY:158,CNY:7.2,RUB:88,INR:86,AED:3.67,KES:129,TZS:2600,NGN:1550,ZAR:18,EGP:48};
var SYM={USD:'$',EUR:'\u20ac',GBP:'\u00a3',JPY:'\u00a5',CNY:'CN\u00a5',RUB:'\u20bd',INR:'\u20b9',AED:'AED ',KES:'KSh ',TZS:'TZS ',NGN:'\u20a6',ZAR:'R',EGP:'EGP '};
var rates=FALL, target=null;
try{target=localStorage.getItem('fx-target');}catch(e){}
if(!target)target='RUB';
function fmt(v){try{return new Intl.NumberFormat('ru',{maximumSignificantDigits:3}).format(v);}catch(e){return String(Math.round(v*100)/100);}}
function loadRates(){
  try{
    var c=localStorage.getItem('fx-usd');
    if(c){var o=JSON.parse(c);if(o&&o.t&&(Date.now()-o.t)<864e5&&o.r){rates=o.r;render();return;}}
  }catch(e){}
  if(typeof fetch!=='function')return;
  try{
    fetch('https://open.er-api.com/v6/latest/USD').then(function(r){return r.json();}).then(function(j){
      if(j&&j.rates){rates=j.rates;try{localStorage.setItem('fx-usd',JSON.stringify({t:Date.now(),r:j.rates}));}catch(e){}render();}
    }).catch(function(){});
  }catch(e){}
}
function conv(v,from){var rf=rates[from]||FALL[from],rt=rates[target]||FALL[target];if(!rf||!rt)return null;return v/rf*rt;}
function render(){
  var amts=document.querySelectorAll('[data-fx-cur]');
  for(var i=0;i<amts.length;i++){(function(a){
    var from=a.getAttribute('data-fx-cur');
    var sub=a.nextElementSibling&&a.nextElementSibling.className==='fx-sub'?a.nextElementSibling:null;
    if(!sub){sub=document.createElement('div');sub.className='fx-sub';a.parentNode.insertBefore(sub,a.nextSibling);}
    if(target===from){sub.textContent='';return;}
    var m=(a.textContent||'').replace(/,/g,'').match(/(\d+(?:\.\d+)?)(?:\s*[\u2013-]\s*(\d+(?:\.\d+)?))?/);
    if(!m){sub.textContent='';return;}
    var lo=conv(parseFloat(m[1]),from), hi=m[2]?conv(parseFloat(m[2]),from):null;
    if(lo==null){sub.textContent='';return;}
    sub.textContent='\u2248 '+SYM[target]+fmt(lo)+(hi!=null?'\u2013'+fmt(hi):'');
  })(amts[i]);}
}
var sel=document.getElementById('fxSel');
if(sel){
  sel.value=target;
  sel.addEventListener('change',function(){target=sel.value;try{localStorage.setItem('fx-target',target);}catch(e){}render();});
}
var obs=new MutationObserver(render);
var amts=document.querySelectorAll('[data-fx-cur]');
for(var i=0;i<amts.length;i++)obs.observe(amts[i],{childList:true,characterData:true,subtree:true});
loadRates();render();
})();
