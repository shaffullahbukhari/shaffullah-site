/* shaffullah.com — small, dependency-free interactions. Every section works
   (as plain content or a normal form) if this script doesn't load. */
(function () {
  'use strict';

  var CONFIG = {
    // false until the report server is running. Report requests and other
    // forms are then delivered to the inbox by FormSubmit, and the report is
    // run and emailed by hand.
    toolsLive: false,
    email: 'hello@shaffullah.com',
    reports: 'https://reports.shaffullah.com',
    aeo: 'https://aeo.shaffullah.com',
    agentId: 'agent_5301m7nkmr3te8y9ve9r1dmey9f4',
    demoFirm: 'Ramírez & Cruz'
  };
  // Local testing only: ?reports=http://localhost:3011&aeo=http://localhost:3012 (turns the tools on)
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    var qs = new URLSearchParams(location.search);
    if (qs.get('reports')) { CONFIG.reports = qs.get('reports'); CONFIG.toolsLive = true; }
    if (qs.get('aeo')) CONFIG.aeo = qs.get('aeo');
  }
  var FORM_ENDPOINT = 'https://formsubmit.co/ajax/' + CONFIG.email;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var CONSENT_TEXT = 'Yes, send me occasional emails about new scams targeting immigration firms and about my services. I can unsubscribe at any time.';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var el = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Deliver a form to the inbox (FormSubmit). Resolves true when accepted.
  function deliver(payload) {
    return fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({ _template: 'table', _captcha: 'false' }, payload))
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && String(j.success) === 'true'; });
    }).catch(function () { return false; });
  }
  function showMsg(node, kind, text, withMailLink) {
    if (!node) return;
    node.hidden = false;
    node.className = 'form-msg ' + kind;
    node.textContent = text;
    if (withMailLink) {
      node.appendChild(document.createTextNode(' '));
      var a = el('a', null, CONFIG.email);
      a.href = 'mailto:' + CONFIG.email;
      node.appendChild(a);
      node.appendChild(document.createTextNode('.'));
    }
  }

  // Point report links at the live tools once they exist.
  if (CONFIG.toolsLive) {
    $$('[data-link=exposure]').forEach(function (a) { a.href = CONFIG.reports + '/exposure?src=site'; });
    $$('[data-link=aeo]').forEach(function (a) { a.href = CONFIG.aeo + '/'; });
  }

  /* ── free report request forms (home, /shield/, /aeo/) ──────────── */
  var NAMES = { exposure: 'Impersonation Exposure Report', aeo: 'AEO audit' };
  var BLURBS = {
    exposure: 'Lookalike websites registered in your name, new sites using it, how clients can verify you, and four free fixes.',
    aeo: 'A 0–100 score for how well AI assistants can find and quote your site, with ready-to-paste fixes.'
  };
  $$('[data-report-form]').forEach(function (form) {
    var blurb = $('[data-blurb]', form);
    var msg = $('.form-msg', form);
    var button = $('button[type=submit]', form);
    var kindOf = function () {
      var r = $('input[name=report]:checked', form) || $('input[name=report][type=hidden]', form);
      return (r && r.value) || 'exposure';
    };
    var sync = function () { if (blurb) blurb.textContent = BLURBS[kindOf()]; };
    $$('input[name=report]', form).forEach(function (r) { r.addEventListener('change', sync); });
    sync();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var site = form.website.value.trim();
      var email = form.email.value.trim();
      var firm = form.firm ? form.firm.value.trim() : '';
      var kind = kindOf();
      if (!site) { showMsg(msg, 'err', 'Please enter your firm’s website.'); form.website.focus(); return; }
      if (!EMAIL_RE.test(email)) { showMsg(msg, 'err', 'Please enter your email so the report can reach you.'); form.email.focus(); return; }
      if (CONFIG.toolsLive) {
        window.location.href = kind === 'aeo'
          ? CONFIG.aeo + '/?url=' + encodeURIComponent(site)
          : CONFIG.reports + '/exposure?src=site&site=' + encodeURIComponent(site) + (firm ? '&firm=' + encodeURIComponent(firm) : '');
        return;
      }
      var consent = form.consent && form.consent.checked;
      if (form._honey && form._honey.value) { showMsg(msg, 'ok', 'Thank you.'); return; }
      button.disabled = true;
      button.textContent = 'Sending…';
      deliver({
        _subject: 'Free ' + NAMES[kind] + ' request: ' + site,
        _autoresponse: 'Thanks for requesting a free ' + NAMES[kind] + ' for ' + site + '. I’ll run it and email the report to this address, usually within one business day. If you have questions, just reply. — Shaffullah Bukhari, shaffullah.com',
        Report: NAMES[kind],
        Website: site,
        'Firm name': firm || '—',
        email: email,
        'Occasional emails': consent ? 'YES, opted in (' + CONSENT_TEXT + ')' : 'No',
        Page: location.pathname
      }).then(function (ok) {
        button.disabled = false;
        button.textContent = 'Request my free report';
        if (ok) {
          form.reset();
          sync();
          showMsg(msg, 'ok', 'Got it. I’ll run your ' + NAMES[kind] + ' and email it to ' + email + ', usually within one business day. A confirmation email is on its way.');
        } else {
          showMsg(msg, 'err', 'That didn’t go through. Please email your website to', true);
        }
      });
    });
  });

  /* ── 60-second self-check ───────────────────────────────────────── */
  var sc = $('#self-check');
  if (sc) {
    var answers = {};
    var rows = $$('.qrow', sc);
    var total = rows.length;
    var out = { inPlace: $('#sc-in-place'), meter: $('#sc-meter'), level: $('#sc-level'), body: $('#sc-body'), gaps: $('#sc-gaps') };
    var render = function () {
      var answered = Object.keys(answers).length;
      var yes = rows.filter(function (r) { return answers[r.dataset.id] === 'yes'; }).length;
      var gaps = rows.filter(function (r) { return answers[r.dataset.id] === 'no'; });
      out.inPlace.textContent = answered ? String(yes) : '–';
      out.meter.style.width = Math.round((yes / total) * 100) + '%';
      var title = 'Answer the six questions';
      var body = 'Your gaps appear here as you go, each with what to do about it.';
      var color = '#A3AEC2';
      if (answered === total) {
        if (gaps.length >= 4) { title = 'High exposure'; color = '#F87171'; body = 'A scammer could pose as your firm today with little chance a client would notice.'; }
        else if (gaps.length >= 2) { title = 'Some exposure'; color = '#F2B441'; body = 'You have the basics, but a few gaps make a convincing fake easy.'; }
        else { title = 'Low exposure'; color = '#4ADE80'; body = 'Good. The free report checks what a self-check can’t: lookalike websites already registered in your name.'; }
      } else if (answered) {
        title = answered + ' of ' + total + ' answered';
        body = 'Keep going. Your result appears when all six are answered.';
      }
      out.level.textContent = title;
      out.level.style.color = color;
      out.meter.style.background = color;
      out.body.textContent = body;
      out.gaps.innerHTML = '';
      gaps.forEach(function (r) {
        var li = el('li');
        li.appendChild(el('b', null, r.dataset.gap));
        li.appendChild(el('span', null, r.dataset.fix));
        out.gaps.appendChild(li);
      });
    };
    rows.forEach(function (r) {
      $$('button', r).forEach(function (b) {
        b.addEventListener('click', function () {
          answers[r.dataset.id] = b.dataset.v;
          $$('button', r).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          render();
        });
      });
    });
    render();
  }

  /* ── Shield steps (tabs) ────────────────────────────────────────── */
  var tabs = $$('#shield-steps [role=tab]');
  function select(i, focus) {
    tabs.forEach(function (t, j) {
      var on = i === j;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % tabs.length, true); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + tabs.length) % tabs.length, true); }
    });
  });

  /* ── "Is this really you?" demo ─────────────────────────────────── */
  var vf = $('#verify-form');
  if (vf) {
    var RESULTS = {
      official: ['v-official', 'Sí, es un canal oficial', 'Este número está en la lista oficial. Si alguien le llama pidiendo dinero, cuelgue y llame usted mismo a este número.'],
      scam: ['v-bad', 'Alerta: esto NO es Ramírez & Cruz', 'Este contacto fue reportado como una estafa. No envíe dinero, documentos ni datos personales.'],
      lookalike: ['v-bad', 'Cuidado: esto imita a la firma', 'Se parece al sitio oficial pero cambia una “l” por un “1”. Es una señal típica de estafa.'],
      unknown: ['v-unknown', 'Esto no está en la lista oficial', 'La firma no reconoce este contacto. Solo se comunica por sus canales oficiales. No envíe dinero ni documentos.']
    };
    var vInput = $('#verify-input');
    var vOut = $('#verify-result');
    var check = function () {
      var key = vInput.value.toLowerCase().replace(/[^a-z0-9.]/g, '');
      if (!key) { vOut.hidden = true; return; }
      var kind = /3055550142$/.test(key) ? 'official' : /7865550199$/.test(key) ? 'scam' : key.indexOf('ramirezcruz1aw') > -1 ? 'lookalike' : 'unknown';
      var r = RESULTS[kind];
      vOut.className = 'verdict ' + r[0];
      vOut.innerHTML = '';
      vOut.appendChild(el('b', null, r[1]));
      vOut.appendChild(el('span', null, r[2]));
      vOut.hidden = false;
    };
    vf.addEventListener('submit', function (e) { e.preventDefault(); check(); });
    $$('[data-sample]').forEach(function (b) {
      b.addEventListener('click', function () { vInput.value = b.dataset.sample; check(); });
    });
    check();
  }

  /* ── 9 PM call (shown where the page has it) ────────────────────── */
  var callBtn = $('#play-call');
  if (callBtn) {
    var CALL = [
      ['ai', 'Sofia · AI', 'Ramírez & Cruz, buenas noches. Soy Sofia, una asistente de inteligencia artificial. ¿En qué le puedo ayudar?', 'Good evening, I’m Sofia, an AI assistant. How can I help?'],
      ['caller', 'Caller', 'A mi hermano lo detuvo ICE ayer. Necesitamos un abogado para la fianza.', 'ICE detained my brother yesterday. We need a lawyer for bond.'],
      ['ai', 'Sofia · AI', 'Lo siento mucho. Esto es urgente, así que aviso ahora mismo al abogado de guardia. ¿Me da un número para devolverle la llamada?', 'I’m so sorry. This is urgent, so I’m alerting the on-call attorney now. What number can we call you back on?'],
      ['caller', 'Caller', 'Sí, el 305 555 0188.', 'Yes, 305 555 0188.'],
      ['ai', 'Sofia · AI', 'Gracias. También le reservo una consulta el jueves a las 11:30. Le llegará un mensaje de confirmación.', 'Thank you. I’ve also booked a consultation Thursday 11:30. You’ll get a confirmation.']
    ];
    var chat = $('#chat');
    var timer = null;
    callBtn.addEventListener('click', function () {
      clearInterval(timer);
      chat.innerHTML = '';
      var i = 0;
      callBtn.textContent = 'Playing…';
      var step = function () {
        if (i >= CALL.length) {
          clearInterval(timer);
          chat.appendChild(el('div', 'call-done', 'Flagged URGENT · on-call attorney texted 9:16 PM · consult booked Thu 11:30 · summary emailed'));
          callBtn.textContent = 'Replay';
          return;
        }
        var m = CALL[i++];
        var box = el('div', 'msg ' + m[0]);
        box.appendChild(el('span', 'who', m[1]));
        var t = el('span', 'text', m[2]);
        t.lang = 'es';
        box.appendChild(t);
        box.appendChild(el('span', 'en', m[3]));
        chat.appendChild(box);
      };
      step();
      timer = setInterval(step, 1600);
    });
  }

  /* ── live demo agent (/line) ────────────────────────────────────── */
  var tryCard = $('#try-card');
  if (tryCard) {
    var LANGS = {
      es: ['Ramírez & Cruz, buenas noches. Soy Sofia, una asistente de inteligencia artificial. ¿En qué le puedo ayudar?', '“A mi hermano lo detuvo ICE ayer.”'],
      en: ['Ramírez & Cruz, good evening. I’m Sofia, an AI assistant. How can I help you?', '“I need help renewing my work permit.”'],
      pt: ['Ramírez & Cruz, boa noite. Sou a Sofia, uma assistente de inteligência artificial. Como posso ajudar?', '“Meu marido tem audiência na próxima semana.”'],
      fr: ['Ramírez & Cruz, bonsoir. Je suis Sofia, une assistante d’intelligence artificielle. Comment puis-je vous aider ?', '“J’ai besoin d’aide pour une demande d’asile.”'],
      ar: ['مساء الخير، معك صوفيا، مساعدة ذكاء اصطناعي لمكتب Ramírez & Cruz. كيف يمكنني مساعدتك؟', '“I need an appointment about my green card.”']
    };
    var lang = 'es';
    var greet = $('#greeting');
    var prompt = $('#try-prompt');
    var showLang = function () {
      greet.textContent = LANGS[lang][0];
      greet.lang = lang;
      greet.dir = lang === 'ar' ? 'rtl' : 'ltr';
      prompt.textContent = LANGS[lang][1];
    };
    $$('#lang-row button').forEach(function (b) {
      b.addEventListener('click', function () {
        lang = b.dataset.lang;
        $$('#lang-row button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        showLang();
      });
    });
    showLang();
    var start = $('#start-talking');
    var loaded = false;
    start.addEventListener('click', function () {
      if (loaded) return;
      loaded = true;
      var w = document.createElement('elevenlabs-convai');
      w.setAttribute('agent-id', CONFIG.agentId);
      w.setAttribute('dynamic-variables', JSON.stringify({ firm_name: CONFIG.demoFirm, firm_city: 'Miami', firm_languages: 'English, Spanish, Portuguese, French and Arabic' }));
      document.body.appendChild(w);
      var s = document.createElement('script');
      s.src = 'https://unpkg.com/@elevenlabs/convai-widget-embed';
      s.async = true;
      document.body.appendChild(s);
      $('#try-status').classList.add('live');
      $('#try-status-text').textContent = 'Opening the call panel at the bottom right…';
      start.textContent = 'Use the call panel at the bottom right';
    });
  }

  /* ── other forms: test run (/line), Learn waitlist ──────────────── */
  $$('form[data-inquiry]').forEach(function (form) {
    var msg = $('.form-msg', form) || $('.form-status', form);
    var button = $('button[type=submit]', form);
    var label = button.textContent;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var body = { kind: form.dataset.inquiry, page: location.pathname };
      data.forEach(function (v, k) {
        if (k === 'languages') (body.languages = body.languages || []).push(v);
        else if (k === 'consent') body.consent = true;
        else if (k.charAt(0) !== '_') body[k] = String(v);
      });
      if (!EMAIL_RE.test(body.email || '')) { showMsg(msg, 'err', 'Please enter a valid email address.'); return; }
      if (data.get('_honey')) { showMsg(msg, 'ok', form.dataset.thanks || 'Thank you.'); return; }
      button.disabled = true;
      button.textContent = 'Sending…';
      var done = function (ok) {
        button.disabled = false;
        button.textContent = label;
        if (ok) { form.reset(); showMsg(msg, 'ok', form.dataset.thanks || 'Thank you. I’ll be in touch soon.'); }
        else showMsg(msg, 'err', 'That didn’t go through. Please email', true);
      };
      if (CONFIG.toolsLive) {
        fetch(CONFIG.reports + '/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j.ok; }); })
          .catch(function () { return false; })
          .then(done);
        return;
      }
      var waitlist = body.kind === 'waitlist';
      var payload = {
        _subject: waitlist ? 'Learn waitlist: ' + (body.name || body.email) : 'Test run request: ' + (body.firm || body.name || body.email),
        _autoresponse: waitlist
          ? 'Thanks for joining the waitlist. You’ll get the field notes and hear about workshop dates and fees before anyone else. Reply “unsubscribe” any time. — Shaffullah Bukhari'
          : 'Thanks for asking for a test run of the 24/7 multilingual line. I’ll set up a test line that answers with your firm’s name and email you within one business day to pick a time. — Shaffullah Bukhari',
        Request: waitlist ? 'Learn waitlist' : 'Test run of the 24/7 line',
        Name: body.name || '—',
        email: body.email
      };
      if (body.firm) payload.Firm = body.firm;
      if (body.languages) payload['Languages callers speak'] = body.languages.join(', ');
      if (body.interest) payload['Wants to learn'] = body.interest;
      if (body.role) payload.Role = body.role;
      if (body.message) payload.Message = body.message;
      payload['Occasional emails'] = waitlist || body.consent ? 'YES, opted in' : 'No';
      payload.Page = body.page;
      deliver(payload).then(done);
    });
  });
})();
