/* Contractor Arsenal: shared site behavior */

/* Transparent-to-black nav on scroll */
(function(){
  var nav=document.querySelector('.nav');
  if(!nav)return;
  var ticking=false;
  function update(){
    nav.classList.toggle('scrolled',window.scrollY>60);
    ticking=false;
  }
  update();
  window.addEventListener('scroll',function(){
    if(!ticking){
      window.requestAnimationFrame(update);
      ticking=true;
    }
  },{passive:true});
})();

/* Services / Resources nav dropdowns. Visibility is pure CSS (:hover / :focus-within
   on .nav-drop), this only keeps aria-expanded in sync for screen readers, and lets
   Escape move focus back to the trigger so it doesn't get visually stuck open. */
(function(){
  var drops=document.querySelectorAll('.nav-drop');
  if(!drops.length)return;
  drops.forEach(function(d){
    var trigger=d.querySelector('.nav-drop-trigger');
    if(!trigger)return;
    var setOpen=function(v){trigger.setAttribute('aria-expanded',v?'true':'false');};
    d.addEventListener('mouseenter',function(){setOpen(true);});
    d.addEventListener('mouseleave',function(){setOpen(false);});
    d.addEventListener('focusin',function(){setOpen(true);});
    d.addEventListener('focusout',function(e){
      if(!d.contains(e.relatedTarget))setOpen(false);
    });
    d.addEventListener('keydown',function(e){
      if(e.key==='Escape'){setOpen(false);trigger.blur();trigger.focus();}
    });
  });
})();

(function(){
  var toggle=document.getElementById('navToggle');
  var mobile=document.getElementById('navMobile');
  if(toggle&&mobile){
    function closeMobile(){
      mobile.classList.remove('open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded','false');
    }
    toggle.addEventListener('click',function(){
      var open=mobile.classList.toggle('open');
      document.body.classList.toggle('nav-open',open);
      toggle.setAttribute('aria-expanded',open?'true':'false');
    });
    mobile.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click',closeMobile);
    });
    /* Resizing or rotating past the nav breakpoint while the mobile menu is
       open would otherwise leave body scroll locked (CSS force-hides the
       panel at 1181px+, but the JS-applied classes don't know that). */
    var mq=window.matchMedia('(min-width:1181px)');
    var onBreakpointChange=function(e){if(e.matches)closeMobile();};
    if(mq.addEventListener)mq.addEventListener('change',onBreakpointChange);
    else if(mq.addListener)mq.addListener(onBreakpointChange);
  }
})();

(function(){
  if(!('IntersectionObserver' in window))return;
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){e.target.classList.add('visible');obs.unobserve(e.target);}
    });
  },{threshold:0.08,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.reveal, .reveal-left, .reveal-right').forEach(function(r){obs.observe(r);});
})();

/* Count-up for plain integer stats, e.g. data-count-to="120" with a "+" suffix in the markup. */
(function(){
  var els=document.querySelectorAll('[data-count-to]');
  if(!els.length)return;
  var reduceMotion=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function animate(el){
    var target=parseInt(el.getAttribute('data-count-to'),10);
    var suffix=el.getAttribute('data-count-suffix')||'';
    if(reduceMotion||!('IntersectionObserver' in window)){el.textContent=target+suffix;return;}
    var start=null,duration=900;
    function step(ts){
      if(start===null)start=ts;
      var p=Math.min((ts-start)/duration,1);
      var eased=1-Math.pow(1-p,3);
      el.textContent=Math.round(target*eased)+suffix;
      if(p<1)requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if(!('IntersectionObserver' in window)){els.forEach(animate);return;}
  var cobs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){animate(e.target);cobs.unobserve(e.target);}
    });
  },{threshold:0.4});
  els.forEach(function(el){cobs.observe(el);});
})();

(function(){
  document.querySelectorAll('.faq-q').forEach(function(btn){
    btn.addEventListener('click',function(){
      var item=btn.closest('.faq-item');
      var isOpen=item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item.open').forEach(function(i){i.classList.remove('open');});
      if(!isOpen)item.classList.add('open');
    });
  });
})();

/* Demo page: optional plan radio group inside the form, updates the side info panel
   with a short fade-out / shift-up / fade-in transition (~230ms total). */
(function(){
  var group=document.querySelector('[data-plan-group]');
  var panel=document.querySelector('[data-plan-panel]');
  if(!group||!panel)return;
  var radios=Array.prototype.slice.call(group.querySelectorAll('input[type="radio"]'));
  var states=Array.prototype.slice.call(panel.querySelectorAll('[data-plan-state]'));

  function switchPanel(plan){
    var next=panel.querySelector('[data-plan-state="'+plan+'"]');
    var current=states.filter(function(s){return !s.hidden;})[0];
    if(!next||next===current)return;
    function showNext(){
      next.hidden=false;
      next.style.transition='none';
      next.style.opacity='0';
      next.style.transform='translateY(8px)';
      requestAnimationFrame(function(){
        next.style.transition='opacity .13s ease-out,transform .13s ease-out';
        next.style.opacity='1';
        next.style.transform='translateY(0)';
      });
    }
    if(current){
      current.style.transition='opacity .11s ease-out';
      current.style.opacity='0';
      setTimeout(function(){
        current.hidden=true;
        current.style.opacity='';
        current.style.transform='';
        current.style.transition='';
        showNext();
      },110);
    }else{
      showNext();
    }
  }

  radios.forEach(function(radio){
    radio.addEventListener('change',function(){
      radios.forEach(function(r){r.closest('.plan-radio').classList.toggle('is-checked',r===radio);});
      switchPanel(radio.getAttribute('data-plan'));
    });
  });
})();

/* Resource hub: real client-side search with an instant results popover
   (title/description/category/tags/keywords, forgiving substring match),
   keyboard navigation, an empty state that never dead-ends, plus the
   below-the-fold category list staying in sync, and per-category tag chips. */
(function(){
  var input=document.querySelector('[data-res-search]');
  var rows=Array.prototype.slice.call(document.querySelectorAll('[data-res-row]'));
  if(!input||!rows.length)return;
  var cats=Array.prototype.slice.call(document.querySelectorAll('[data-res-cat]'));
  var countEl=document.querySelector('[data-res-count]');
  var emptyEl=document.querySelector('[data-res-empty]');
  var panel=document.querySelector('[data-res-search-panel]');
  var wrap=document.querySelector('[data-res-search-wrap]');

  var items=rows.map(function(row){
    var cat=row.closest('[data-res-cat]');
    var catLabel=cat?((cat.querySelector('h2')||{}).textContent||''):'';
    var titleEl=row.querySelector('.res-article-title');
    var descEl=row.querySelector('.res-article-desc');
    var timeEl=row.querySelector('.res-read-time');
    var title=titleEl?titleEl.textContent:'';
    var desc=descEl?descEl.textContent:'';
    var readTime=timeEl?timeEl.textContent:'';
    var corpus=[title,desc,catLabel,row.getAttribute('data-tags')||'',row.getAttribute('data-keywords')||'']
      .join(' ').toLowerCase();
    return{row:row,href:row.getAttribute('href'),title:title,category:catLabel,readTime:readTime,corpus:corpus};
  });

  function matches(item,q){return item.corpus.indexOf(q)!==-1;}

  function applyBelow(q){
    var visible=0;
    rows.forEach(function(row,i){
      var show=(!q||matches(items[i],q))&&!row.classList.contains('tag-hidden');
      row.style.display=show?'':'none';
      if(show)visible++;
    });
    cats.forEach(function(cat){
      var anyVisible=Array.prototype.slice.call(cat.querySelectorAll('[data-res-row]')).some(function(r){return r.style.display!=='none';});
      cat.style.display=anyVisible?'':'none';
    });
    if(countEl)countEl.textContent=visible+(visible===1?' guide available':' guides available');
    if(emptyEl)emptyEl.style.display=visible?'none':'';
  }

  var activeIndex=-1;

  function closePanel(){
    if(!panel)return;
    panel.hidden=true;
    input.setAttribute('aria-expanded','false');
    input.removeAttribute('aria-activedescendant');
    activeIndex=-1;
  }

  function jumpToLibrary(){
    var target=document.querySelector('[data-res-cat]');
    if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renderPanel(q){
    if(!panel)return;
    var matched=items.filter(function(it){return matches(it,q);});
    var shown=matched.slice(0,6);
    activeIndex=-1;
    panel.innerHTML='';
    if(!matched.length){
      var empty=document.createElement('div');
      empty.className='res-search-empty';
      var p=document.createElement('p');p.textContent='No guides found.';
      var span=document.createElement('span');span.textContent='Try another search or browse the categories below.';
      var actions=document.createElement('div');actions.className='res-search-empty-actions';
      var browse=document.createElement('a');browse.href='#';browse.textContent='Browse All Guides ↓';
      browse.addEventListener('click',function(e){
        e.preventDefault();input.value='';applyBelow('');closePanel();jumpToLibrary();
      });
      var demo=document.createElement('a');demo.href='demo.html';demo.textContent='Get My Free Demo →';
      actions.appendChild(browse);actions.appendChild(demo);
      empty.appendChild(p);empty.appendChild(span);empty.appendChild(actions);
      panel.appendChild(empty);
    }else{
      shown.forEach(function(it,i){
        var a=document.createElement('a');
        a.href=it.href;a.className='res-search-result';a.setAttribute('role','option');a.id='res-result-'+i;
        var t=document.createElement('span');t.className='res-search-result-title';t.textContent=it.title;
        var m=document.createElement('span');m.className='res-search-result-meta';m.textContent=it.category+' · '+it.readTime;
        a.appendChild(t);a.appendChild(m);
        panel.appendChild(a);
      });
      var viewAll=document.createElement('button');
      viewAll.type='button';viewAll.className='res-search-viewall';viewAll.id='res-result-viewall';
      viewAll.textContent='View all '+matched.length+' result'+(matched.length===1?'':'s')+' ↓';
      viewAll.addEventListener('click',function(){applyBelow(q);closePanel();jumpToLibrary();});
      panel.appendChild(viewAll);
    }
    panel.hidden=false;
    input.setAttribute('aria-expanded','true');
  }

  function optionEls(){
    return panel?Array.prototype.slice.call(panel.querySelectorAll('.res-search-result, .res-search-viewall')):[];
  }

  function setActive(i){
    var options=optionEls();
    options.forEach(function(o){o.classList.remove('is-active');});
    activeIndex=i;
    if(i>=0&&options[i]){
      options[i].classList.add('is-active');
      input.setAttribute('aria-activedescendant',options[i].id);
      options[i].scrollIntoView({block:'nearest'});
    }else{
      input.removeAttribute('aria-activedescendant');
    }
  }

  input.addEventListener('input',function(){
    var q=input.value.trim().toLowerCase();
    applyBelow(q);
    if(!q){closePanel();return;}
    renderPanel(q);
  });

  input.addEventListener('keydown',function(e){
    if(!panel||panel.hidden)return;
    var options=optionEls();
    if(e.key==='ArrowDown'){
      e.preventDefault();setActive(Math.min(activeIndex+1,options.length-1));
    }else if(e.key==='ArrowUp'){
      e.preventDefault();setActive(Math.max(activeIndex-1,0));
    }else if(e.key==='Enter'){
      if(activeIndex>=0&&options[activeIndex]){e.preventDefault();options[activeIndex].click();}
    }else if(e.key==='Escape'){
      closePanel();
    }
  });

  document.addEventListener('click',function(e){
    if(wrap&&!wrap.contains(e.target))closePanel();
  });

  var tagBtns=Array.prototype.slice.call(document.querySelectorAll('[data-tag-filter-btn]'));
  tagBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      var scope=btn.closest('[data-tag-filter]');
      var group=scope.closest('[data-res-cat]')||document;
      var tag=btn.getAttribute('data-tag');
      scope.querySelectorAll('[data-tag-filter-btn]').forEach(function(b){b.classList.toggle('active',b===btn);});
      group.querySelectorAll('[data-res-row]').forEach(function(row){
        var tags=(row.getAttribute('data-tags')||'').split(' ');
        var match=tag==='all'||tags.indexOf(tag)!==-1;
        row.classList.toggle('tag-hidden',!match);
      });
      applyBelow(input.value.trim().toLowerCase());
    });
  });

  applyBelow('');
})();

/* Directory: search + trade filter + sort. Looks for [data-directory] wrapper. */
(function(){
  var dir=document.querySelector('[data-directory]');
  if(!dir)return;
  var rows=Array.prototype.slice.call(dir.querySelectorAll('[data-row]'));
  var search=dir.querySelector('[data-dir-search]');
  var sort=dir.querySelector('[data-dir-sort]');
  var filterBtns=Array.prototype.slice.call(dir.querySelectorAll('[data-filter]'));
  var emptyState=dir.querySelector('[data-dir-empty]');
  var countEl=dir.querySelector('[data-dir-count]');
  var activeFilter='all';

  function apply(){
    var q=(search&&search.value||'').trim().toLowerCase();
    var visible=0;
    rows.forEach(function(row){
      var trade=(row.getAttribute('data-trade')||'').toLowerCase();
      var text=(row.textContent||'').toLowerCase();
      var matchesFilter=activeFilter==='all'||trade===activeFilter;
      var matchesSearch=!q||text.indexOf(q)!==-1;
      var show=matchesFilter&&matchesSearch;
      row.style.display=show?'':'none';
      if(show)visible++;
    });
    if(emptyState)emptyState.style.display=visible?'none':'';
    if(countEl)countEl.textContent=visible+(visible===1?' website':' websites');
  }

  function sortRows(mode){
    var container=rows[0]&&rows[0].parentElement;
    if(!container)return;
    var sorted=rows.slice().sort(function(a,b){
      if(mode==='name'){
        return (a.getAttribute('data-name')||'').localeCompare(b.getAttribute('data-name')||'');
      }
      /* default: recently launched = original document order (data-order asc) */
      return (parseInt(a.getAttribute('data-order')||'0',10))-(parseInt(b.getAttribute('data-order')||'0',10));
    });
    sorted.forEach(function(r){container.appendChild(r);});
  }

  if(search)search.addEventListener('input',apply);
  if(sort)sort.addEventListener('change',function(){sortRows(sort.value);apply();});
  filterBtns.forEach(function(btn){
    btn.addEventListener('click',function(){
      activeFilter=btn.getAttribute('data-filter');
      filterBtns.forEach(function(b){b.classList.toggle('active',b===btn);});
      apply();
    });
  });
  apply();
})();

/* Article table of contents: highlight the section currently in view. */
(function(){
  var toc=document.querySelector('.article-toc');
  if(!toc||!('IntersectionObserver' in window))return;
  var links=Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  if(!links.length)return;
  var headings=links.map(function(a){return document.getElementById(a.getAttribute('href').slice(1));}).filter(Boolean);
  var tobs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      var id=e.target.id;
      links.forEach(function(a){a.classList.toggle('active',a.getAttribute('href')==='#'+id);});
    });
  },{rootMargin:'-20% 0px -70% 0px'});
  headings.forEach(function(h){tobs.observe(h);});
})();

/* Horizontal-scroll filter bars (Work directory trades, Search Visibility
   tag chips): the CSS fade at the trailing edge hints there's more to
   scroll; drop it once the user has actually reached the end. */
(function(){
  var bars=document.querySelectorAll('.dir-filter-bar, .res-tag-filter');
  if(!bars.length)return;
  bars.forEach(function(bar){
    function update(){
      var atEnd=bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-4;
      bar.classList.toggle('is-scroll-end',atEnd);
    }
    bar.addEventListener('scroll',update,{passive:true});
    update();
  });
})();
