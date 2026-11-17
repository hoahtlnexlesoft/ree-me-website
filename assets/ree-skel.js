/* R.E.E M&E — image skeletons: shimmer placeholder on every image until it has loaded (all pages, incl. careers iframes) */
(function(){
  if(window.__reeSkel)return;window.__reeSkel=1;
  var css='@keyframes reeSk{0%{background-position:150% 0}100%{background-position:-50% 0}}'+
    'img.ree-sk{background-color:rgba(148,163,184,.22)!important;background-image:linear-gradient(100deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.45) 50%,rgba(255,255,255,0) 70%)!important;background-size:200% 100%!important;background-repeat:no-repeat!important;animation:reeSk 1.3s ease-in-out infinite;color:transparent!important}'+
    'img.ree-sk-in{animation:reeSkIn .45s ease both}@keyframes reeSkIn{from{opacity:0}}'+
    '@media (prefers-reduced-motion:reduce){img.ree-sk{animation:none}img.ree-sk-in{animation:none}}';
  var st=document.createElement('style');st.id='ree-skel-css';st.textContent=css;(document.head||document.documentElement).appendChild(st);
  function skip(im){
    if(im.closest('#ree-mini,header,footer,.site-header,.site-footer,.fo,[data-review-ui],.rv,.ht,.dock'))return true;
    if(/logo|\.svg(\?|$)/i.test(im.currentSrc||im.src||''))return true;
    var r=im.getBoundingClientRect();return r.width<48||r.height<32;
  }
  function done(im){if(!im.classList.contains('ree-sk'))return;im.classList.remove('ree-sk');
    var cs=getComputedStyle(im);if(cs.animationName==='none'&&cs.opacity!=='0'){im.classList.add('ree-sk-in');setTimeout(function(){im.classList.remove('ree-sk-in')},500);}}
  function watch(im){
    if(im.__reeSk)return;im.__reeSk=1;
    if(im.complete&&im.naturalWidth)return;
    var go=function(){if(im.complete&&im.naturalWidth)return; if(skip(im))return; im.classList.add('ree-sk');};
    requestAnimationFrame(go);
    im.addEventListener('load',function(){done(im)});
    im.addEventListener('error',function(){im.classList.remove('ree-sk')});
  }
  function scan(root){(root.querySelectorAll?root:document).querySelectorAll('img').forEach(watch);if(root.tagName==='IMG')watch(root);}
  function rewatch(im){im.__reeSk=0;watch(im);}
  new MutationObserver(function(ms){ms.forEach(function(m){
    if(m.type==='attributes'){var t=m.target;if(t.tagName==='IMG'){t.classList.remove('ree-sk');rewatch(t);}return;}
    m.addedNodes.forEach(function(n){if(n.nodeType===1)scan(n);});
  });}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['src','srcset']});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scan(document)});else scan(document);
})();
