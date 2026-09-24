/* Contractor Arsenal Report: newsletter popup + inline (footer) signup forms.
   Both post to /api/newsletter/subscribe (Cloudflare Pages Function -> Resend).
   Analytics go through the existing GTM dataLayer, nothing else is loaded. */
(function(){
  var ENDPOINT='/api/newsletter/subscribe';
  var KEY_SUBSCRIBED='ca_nl_subscribed';
  var KEY_DISMISSED='ca_nl_dismissed_at';
  var KEY_SEEN_SESSION='ca_nl_seen';
  var COOLDOWN_MS=7*24*60*60*1000;
  var DELAY_MS=5000;
  var EMAIL_RE=/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
  /* Conversion, application, checkout-style and legal pages: no popup. */
  var EXCLUDED=/\/(demo|apply|arsenal|partner|privacy|terms)(\.html)?\/?$|\/prez(\/|$)/;

  function store(kind){try{return kind==='session'?window.sessionStorage:window.localStorage;}catch(e){return null;}}
  function get(key,kind){var s=store(kind);try{return s?s.getItem(key):null;}catch(e){return null;}}
  function set(key,val,kind){var s=store(kind);try{if(s)s.setItem(key,val);}catch(e){}}

  function track(event,extra){
    window.dataLayer=window.dataLayer||[];
    var payload={event:event,newsletter_page:location.pathname};
    if(extra)for(var k in extra)payload[k]=extra[k];
    window.dataLayer.push(payload);
  }

  function isSubscribed(){return get(KEY_SUBSCRIBED)==='1';}

  /* ── Shared submit logic (popup + inline forms) ── */
  function bindForm(form,opts){
    var btn=form.querySelector('[type="submit"]');
    var errorEl=opts.errorEl||form.querySelector('[data-nl-error]');
    var emailInput=form.querySelector('input[name="email"]');
    var nameInput=form.querySelector('input[name="firstName"]');
    var sending=false,started=false;
    var btnLabel=btn?btn.textContent:'';

    function showError(msg){
      if(!errorEl)return;
      errorEl.textContent=msg||'';
      errorEl.hidden=!msg;
      if(emailInput)emailInput.setAttribute('aria-invalid',msg?'true':'false');
    }
    form.addEventListener('input',function(){
      if(!started){started=true;track('newsletter_signup_start',{newsletter_source:opts.source});}
      if(errorEl&&!errorEl.hidden)showError('');
    });
    form.addEventListener('submit',function(e){
      e.preventDefault();
      if(sending)return;
      var email=(emailInput.value||'').trim().toLowerCase();
      emailInput.value=email;
      if(nameInput)nameInput.value=(nameInput.value||'').trim();
      if(!email){showError('Enter your email address.');emailInput.focus();return;}
      if(!EMAIL_RE.test(email)){showError('That email doesn’t look right. Check it and try again.');emailInput.focus();return;}
      showError('');
      sending=true;
      btn.disabled=true;btn.textContent='Sending…';
      form.setAttribute('aria-busy','true');
      var hp=form.querySelector('input[name="company_website"]');
      fetch(ENDPOINT,{
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json'},
        body:JSON.stringify({email:email,firstName:nameInput?nameInput.value:'',source:opts.source,company_website:hp?hp.value:''})
      }).then(function(res){
        return res.json().catch(function(){return {};}).then(function(body){return {ok:res.ok&&body.ok,body:body};});
      }).then(function(r){
        if(!r.ok)throw new Error((r.body&&r.body.error)||'');
        set(KEY_SUBSCRIBED,'1');
        track('newsletter_signup_success',{newsletter_source:opts.source});
        opts.onSuccess();
      }).catch(function(err){
        var msg=err&&err.message&&err.message.length<140?err.message:'';
        track('newsletter_signup_error',{newsletter_source:opts.source});
        showError(msg||'Something went wrong. Please try again in a minute.');
        sending=false;btn.disabled=false;btn.textContent=btnLabel;
        form.removeAttribute('aria-busy');
      });
    });
  }

  /* ── Inline forms (footer) ── */
  document.querySelectorAll('[data-nl-inline]').forEach(function(form){
    var wrap=form.closest('[data-nl-inline-wrap]')||form.parentElement;
    var done=wrap.querySelector('[data-nl-inline-done]');
    function showDone(){form.hidden=true;if(done){done.hidden=false;done.focus();}}
    /* No-JS fallback lands back here with ?newsletter=success */
    if(/[?&]newsletter=success/.test(location.search)){set(KEY_SUBSCRIBED,'1');form.hidden=true;if(done)done.hidden=false;}
    bindForm(form,{source:'website-footer',errorEl:wrap.querySelector('[data-nl-error]'),onSuccess:showDone});
  });

  /* ── Popup ── */
  if(EXCLUDED.test(location.pathname))return;
  if(isSubscribed())return;
  var dismissedAt=parseInt(get(KEY_DISMISSED)||'0',10);
  if(dismissedAt&&Date.now()-dismissedAt<COOLDOWN_MS)return;
  if(get(KEY_SEEN_SESSION,'session')==='1')return;
  if(typeof HTMLDialogElement!=='function')return;

  /* Reuse the nav's own light mark so the relative path is right in subfolders too. */
  var markImg=document.querySelector('.nav-logo-mark .mark-light');
  var mark=markImg?markImg.getAttribute('src'):'/assets/mark-light.png';

  var dialog;
  function build(){
    dialog=document.createElement('dialog');
    dialog.className='nl-modal';
    dialog.setAttribute('aria-labelledby','nl-title');
    dialog.setAttribute('aria-describedby','nl-desc');
    dialog.innerHTML=
      '<button type="button" class="nl-close" data-nl-close aria-label="Close newsletter signup">'+
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>'+
      '</button>'+
      '<div class="nl-shell">'+
        '<div class="nl-visual" aria-hidden="true">'+
          '<img class="nl-visual-mark" src="'+mark+'" alt="" width="306" height="125">'+
          '<div class="nl-visual-issue">CA / Report</div>'+
          '<ul class="nl-visual-list">'+
            '<li><span>01</span>Website fixes</li>'+
            '<li><span>02</span>Local search</li>'+
            '<li><span>03</span>Lead flow</li>'+
          '</ul>'+
          '<div class="nl-visual-foot">Weekly · Free</div>'+
        '</div>'+
        '<div class="nl-body">'+
          '<div class="nl-panel" data-nl-panel>'+
            '<div class="nl-label">The Contractor Arsenal Report</div>'+
            '<h2 class="nl-title" id="nl-title" tabindex="-1">Better websites.<br>Better <em>leads.</em></h2>'+
            '<p class="nl-desc" id="nl-desc">Weekly website fixes, local SEO insights, and strategies we’re using across contractor websites.</p>'+
            '<form class="nl-form" novalidate data-nl-form>'+
              '<div class="nl-field"><label for="nl-first">First name</label><input id="nl-first" name="firstName" type="text" autocomplete="given-name" maxlength="60"></div>'+
              '<div class="nl-field"><label for="nl-email">Email</label><input id="nl-email" name="email" type="email" inputmode="email" autocomplete="email" required maxlength="254" aria-describedby="nl-error"></div>'+
              '<div class="nl-hp" aria-hidden="true"><label for="nl-hp">Leave this empty</label><input id="nl-hp" name="company_website" type="text" tabindex="-1" autocomplete="off"></div>'+
              '<p class="nl-error" id="nl-error" role="alert" data-nl-error hidden></p>'+
              '<button type="submit" class="btn btn-primary btn-block nl-submit">Send Me the Report</button>'+
              '<p class="nl-fine">Practical website advice for contractors. No spam.</p>'+
            '</form>'+
          '</div>'+
          '<div class="nl-done" data-nl-done hidden tabindex="-1">'+
            '<div class="nl-label">The Contractor Arsenal Report</div>'+
            '<h2 class="nl-title">You’re <em>in.</em></h2>'+
            '<p class="nl-desc">The next Contractor Arsenal Report will hit your inbox.</p>'+
            '<button type="button" class="btn btn-outline nl-continue" data-nl-close>Continue Browsing</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(dialog);

    var subscribed=false;
    dialog.querySelectorAll('[data-nl-close]').forEach(function(b){b.addEventListener('click',function(){close();});});
    /* Backdrop click: the click lands on the <dialog> itself, outside .nl-shell. */
    dialog.addEventListener('mousedown',function(e){dialog._downOnBackdrop=(e.target===dialog);});
    dialog.addEventListener('click',function(e){if(e.target===dialog&&dialog._downOnBackdrop)close();});
    /* Escape: native "cancel" event; route it through close() for tracking + cleanup. */
    dialog.addEventListener('cancel',function(e){e.preventDefault();close();});

    bindForm(dialog.querySelector('[data-nl-form]'),{source:'website-popup',onSuccess:function(){
      subscribed=true;
      dialog.querySelector('[data-nl-panel]').hidden=true;
      var done=dialog.querySelector('[data-nl-done]');
      done.hidden=false;done.focus();
    }});

    function close(){
      if(!dialog.open)return;
      if(!subscribed){set(KEY_DISMISSED,String(Date.now()));track('newsletter_popup_dismiss');}
      dialog.classList.add('is-closing');
      var finish=function(){
        dialog.classList.remove('is-closing');
        dialog.close();
        document.documentElement.classList.remove('nl-lock');
      };
      var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      reduce?finish():setTimeout(finish,160);
    }
  }

  /* Don't interrupt someone mid-task: wait while a field has focus or the mobile menu is open. */
  function busy(){
    var a=document.activeElement;
    if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))return true;
    if(document.body.classList.contains('nav-open'))return true;
    if(document.querySelector('dialog[open]'))return true;
    return false;
  }

  function open(){
    if(document.hidden||busy()){setTimeout(open,2500);return;}
    if(isSubscribed())return;
    if(!dialog)build();
    set(KEY_SEEN_SESSION,'1','session');
    document.documentElement.classList.add('nl-lock');
    dialog.showModal();
    dialog.querySelector('#nl-title').focus({preventScroll:true});
    track('newsletter_popup_view');
  }

  function schedule(){setTimeout(open,DELAY_MS);}
  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule);
})();
