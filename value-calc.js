/* Website value illustration. Pure arithmetic on the visitor's own inputs; no data is stored or sent.
   jobs = inquiries x closing rate; revenue = jobs x project value; subscription = plan x 12;
   multiple = revenue / subscription; jobs to equal subscription = subscription / project value. */
(function(){
  var root=document.querySelector('[data-vc]');
  if(!root)return;
  var scope=root.closest('section')||document;
  var $=function(s){return scope.querySelector(s);};
  var value=$('[data-vc-value]'),inq=$('[data-vc-inq]'),rate=$('[data-vc-rate]');
  var money=function(n){return '$'+Math.round(n).toLocaleString('en-US');};
  /* up to two decimals, trailing zeros dropped: 12, 8.25, 0.5 */
  var num=function(n){return String(Math.round(n*100)/100);};
  var one=function(n){return (Math.round(n*10)/10).toFixed(1).replace(/\.0$/,'');};
  function fee(){var r=root.querySelector('[data-vc-plan]:checked');return r?parseInt(r.value,10):497;}
  function set(sel,text){scope.querySelectorAll(sel).forEach(function(el){el.textContent=text;});}
  function figures(f,v,q,c){
    var jobs=q*c,revenue=jobs*v,yearFee=f*12;
    var need=v>0?yearFee/v:null;
    return {jobs:jobs,revenue:revenue,yearFee:yearFee,multiple:revenue/yearFee,need:need};
  }
  function multText(m){return m>0&&m<0.05?'under 0.1x':one(m)+'x';}
  function needText(n){
    if(n===null)return 'n/a';
    var whole=Math.ceil(n-1e-9);
    return one(n)+' ('+whole+(whole===1?' whole job)':' whole jobs)');
  }
  function calc(){
    var v=parseInt(value.value,10)||0,q=parseInt(inq.value,10)||0,p=parseInt(rate.value,10)||0,f=fee();
    var r=figures(f,v,q,p/100);
    set('[data-vc-value-out]',money(v));
    set('[data-vc-inq-out]',q+(q===1?' inquiry':' inquiries'));
    set('[data-vc-rate-out]',p+'%');
    set('[data-vc-jobs-math]',q+(q===1?' inquiry':' inquiries')+' x '+p+'%');
    set('[data-vc-jobs]',num(r.jobs));
    set('[data-vc-math]',num(r.jobs)+(r.jobs===1?' estimated job':' estimated jobs')+' x '+money(v));
    set('[data-vc-revenue],[data-vc-revenue-2],[data-vc-revenue-3]',money(r.revenue));
    set('[data-vc-fee],[data-vc-fee-2]',money(r.yearFee));
    set('[data-vc-fee-math]','$'+f+' x 12 months');
    set('[data-vc-multiple]',multText(r.multiple));
    set('[data-vc-breakeven]',needText(r.need));
    var max=Math.max(r.revenue,r.yearFee,1);
    var w=function(sel,n,min){var el=$(sel);if(el)el.style.width=Math.max(n/max*100,min).toFixed(1)+'%';};
    w('[data-vc-bar-rev]',r.revenue,0);w('[data-vc-bar-fee]',r.yearFee,1.5);
    scope.querySelectorAll('[data-vc-row]').forEach(function(row){
      var pf=parseInt(row.getAttribute('data-vc-row'),10),x=figures(pf,v,q,p/100);
      row.querySelector('[data-c="fee"]').textContent=money(x.yearFee);
      row.querySelector('[data-c="mult"]').textContent=multText(x.multiple);
      row.querySelector('[data-c="be"]').textContent=needText(x.need);
      row.classList.toggle('is-current',pf===f);
    });
  }
  root.addEventListener('input',calc);
  root.addEventListener('change',calc);
  calc();
})();
