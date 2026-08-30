(function(){
  if (window.__amktConsent) { return; }

  var CHAVE = "amkt_consent_v1";
  var DIAS = 180;
  var ESCOPO = "reguladas";
  var POLITICA = "/politica-de-privacidade.html";
  var NOME = "AlexMKT";
  var REGULADAS = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH','BR'];

  /* 1) Consent Mode v2: nega tudo ANTES de qualquer tag. */
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    functionality_storage: "granted",
    security_storage: "granted",
    wait_for_update: 2000
  });
  gtag("set", "ads_data_redaction", true);
  gtag("set", "url_passthrough", true);

  /* 2) AdSense sem consentimento => anúncios NÃO personalizados. */
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;

  function ler(){
    try {
      var cru = localStorage.getItem(CHAVE);
      if (!cru) { return null; }
      var d = JSON.parse(cru);
      if (!d || !d.ts) { return null; }
      if (Date.now() - d.ts > DIAS * 864e5) { return null; }
      return d;
    } catch (e) { return null; }
  }

  function gravar(aceito){
    try {
      localStorage.setItem(CHAVE, JSON.stringify({
        aceito: !!aceito, ts: Date.now(), v: 1
      }));
    } catch (e) {}
  }

  function aplicar(aceito, avisar){
    var estado = aceito ? "granted" : "denied";
    gtag("consent", "update", {
      ad_storage: estado,
      ad_user_data: estado,
      ad_personalization: estado,
      analytics_storage: estado
    });
    gtag("set", "ads_data_redaction", !aceito);
    if (aceito) { window.adsbygoogle.requestNonPersonalizedAds = 0; }
    if (avisar) {
      window.dataLayer.push({
        event: "consent_update", consent_state: estado
      });
      try {
        document.dispatchEvent(new CustomEvent("amkt:consent", {
          detail: { aceito: !!aceito }
        }));
      } catch (e) {}
    }
  }

  function montar(){
    if (document.getElementById("amkt-consent")) { return; }

    var barra = document.createElement("div");
    barra.id = "amkt-consent";
    barra.setAttribute("role", "dialog");
    barra.setAttribute("aria-live", "polite");
    barra.setAttribute("aria-label", "Aviso de cookies");
    barra.innerHTML =
      '<div class="amkt-wrap"><p>' + NOME + ' usa cookies para medir ' +
      'audiência e exibir anúncios (Google AdSense e parceiros). ' +
      'Você pode aceitar ou recusar; recusando, os anúncios continuam ' +
      'mas sem personalização. <a href="' + POLITICA + '" ' +
      'rel="nofollow">Política de privacidade</a>.</p>' +
      '<div class="amkt-btns">' +
      '<button type="button" data-amkt="no">Recusar</button>' +
      '<button type="button" data-amkt="yes" class="amkt-primary">' +
      'Aceitar</button></div></div>';

    var prefs = document.createElement("button");
    prefs.id = "amkt-prefs";
    prefs.type = "button";
    prefs.textContent = "Preferências de cookies";

    document.body.appendChild(barra);
    document.body.appendChild(prefs);

    function fechar(aceito){
      gravar(aceito);
      aplicar(aceito, true);
      barra.classList.remove("amkt-on");
      prefs.classList.add("amkt-on");
    }

    barra.addEventListener("click", function(ev){
      var alvo = ev.target && ev.target.getAttribute
        ? ev.target.getAttribute("data-amkt") : null;
      if (alvo === "yes") { fechar(true); }
      if (alvo === "no") { fechar(false); }
    });

    prefs.addEventListener("click", function(){
      barra.classList.add("amkt-on");
      prefs.classList.remove("amkt-on");
    });

    barra.classList.add("amkt-on");
  }

  function comBody(fn){
    if (document.body) { fn(); return; }
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  }

  /* 3) Região: só pergunta onde a lei exige. Falha aberta. */
  function precisaBanner(cb){
    if (ESCOPO === "sempre") { cb(true); return; }
    var pronto = false;
    var timer = setTimeout(function(){
      if (!pronto) { pronto = true; cb(true); }
    }, 2000);
    try {
      fetch("/cdn-cgi/trace", { cache: "no-store" })
        .then(function(r){ return r.ok ? r.text() : ""; })
        .then(function(txt){
          if (pronto) { return; }
          pronto = true; clearTimeout(timer);
          var m = /loc=([A-Z0-9]{2})/.exec(txt || "");
          var loc = m ? m[1] : "XX";
          if (loc === "XX" || loc === "T1") { cb(true); return; }
          cb(REGULADAS.indexOf(loc) !== -1);
        })
        .catch(function(){
          if (pronto) { return; }
          pronto = true; clearTimeout(timer); cb(true);
        });
    } catch (e) {
      if (!pronto) { pronto = true; clearTimeout(timer); cb(true); }
    }
  }

  var salvo = ler();

  if (salvo) {
    aplicar(salvo.aceito, false);
    comBody(function(){
      montar();
      var b = document.getElementById("amkt-consent");
      var p = document.getElementById("amkt-prefs");
      if (b) { b.classList.remove("amkt-on"); }
      if (p) { p.classList.add("amkt-on"); }
    });
  } else {
    precisaBanner(function(exige){
      if (!exige) {
        /* Fora das regiões reguladas: permitido por padrão. */
        aplicar(true, true);
        return;
      }
      comBody(montar);
    });
  }

  window.__amktConsent = {
    estado: function(){ return ler(); },
    aceitar: function(){ gravar(true); aplicar(true, true); },
    recusar: function(){ gravar(false); aplicar(false, true); },
    abrir: function(){
      comBody(function(){
        montar();
        var b = document.getElementById("amkt-consent");
        if (b) { b.classList.add("amkt-on"); }
      });
    }
  };
})();