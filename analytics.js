/*
 * analytics.js: the one tracking helper for willvinton.com and /springspot/.
 * Every event and parameter is listed in TRACKING.md.
 *
 * GA4 runs through Google Tag Manager (GTM-W64VTKTX), so events go to window.dataLayer
 * as { event, wv: { ...params } } and the GTM tag "GA4 - wvTrack events" forwards them to
 * GA4 (import gtm/ga4-events.json). Without GTM the pushes just sit in an array.
 *
 *   wvTrack('cta_click', { cta_label: 'Get in touch' })   // from code
 *   <a data-track="cta_click" data-track-cta-label="Get in touch">   // from markup
 *
 * Markup:
 *   data-track="event_name"           on the clicked element; data-track-<param-name> adds params
 *   data-track-area="nav|footer|..."  container: plain links inside send nav_click / footer_click,
 *                                     and its own data-track-* params apply to everything inside
 *   data-track-location="hero"        names the place on the page for cta_location
 *   data-track-form="form_id"         on <form>: form_start, form_abandon (+ data-track-form-name)
 *   data-track-article                the post body: scroll_depth marks and read_complete
 *   data-track-project="Name"         project_view when half on screen, project_click on its links
 *   data-track-auto="off"             skip the automatic link events for this link
 *
 * Debug: ?ga_debug=1 turns on debug_mode (GA4 DebugView) and logs every event to the console;
 * it sticks for the browser (localStorage) until ?ga_debug=0.
 * Privacy: never sends emails, phone numbers, form values or query strings.
 */
(function () {
  'use strict';
  var w = window;
  var d = document;
  if (w.wvTrack) return;

  var SECTION = /^\/springspot(\/|$)/.test(location.pathname) ? 'springspot' : 'personal';
  var NAME = /^[a-z][a-z0-9_]{0,39}$/;
  var EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  var FILE = /\.(pdf|docx?|xlsx?|pptx?|csv|zip|txt|key|pages|numbers)$/i;
  var NETWORKS = {
    'linkedin.com': 'linkedin',
    'github.com': 'github',
    'x.com': 'x',
    'twitter.com': 'x',
    'instagram.com': 'instagram',
    'facebook.com': 'facebook',
    'youtube.com': 'youtube',
  };
  // data-track-* attributes that mark things rather than carry parameters.
  var MARKERS = { area: 1, location: 1, form: 1, article: 1, project: 1, auto: 1 };

  var debug = false;
  try {
    var flag = new URLSearchParams(location.search).get('ga_debug');
    if (flag === '1') localStorage.setItem('ga_debug', '1');
    if (flag === '0') localStorage.removeItem('ga_debug');
    debug = localStorage.getItem('ga_debug') === '1';
  } catch (e) {
    debug = /[?&]ga_debug=1(&|$)/.test(location.search);
  }

  function warn(what, detail) {
    if (debug && w.console) console.warn('[wvTrack] ' + what, detail === undefined ? '' : detail);
  }

  function assign(to) {
    for (var i = 1; i < arguments.length; i++) {
      var from = arguments[i];
      for (var k in from) if (Object.prototype.hasOwnProperty.call(from, k)) to[k] = from[k];
    }
    return to;
  }

  function looksLikePhone(v) {
    var m = v.match(/\+?\d[\d\s().-]{8,}\d/g);
    if (!m) return false;
    for (var i = 0; i < m.length; i++) if (m[i].replace(/\D/g, '').length >= 10) return true;
    return false;
  }

  // snake_case names only; strings trimmed to GA4's 100-character limit; anything that looks
  // like an email address or phone number is dropped rather than sent.
  function clean(params) {
    var out = {};
    for (var k in params) {
      if (!Object.prototype.hasOwnProperty.call(params, k)) continue;
      if (!NAME.test(k)) {
        warn('dropped parameter with a non-snake_case name', k);
        continue;
      }
      var v = params[k];
      if (v === undefined || v === null || v === '') continue;
      if (typeof v === 'number') {
        if (isFinite(v)) out[k] = v;
        continue;
      }
      if (typeof v === 'boolean') {
        out[k] = v;
        continue;
      }
      v = String(v).replace(/\s+/g, ' ').trim();
      if (!v) continue;
      if (EMAIL.test(v) || looksLikePhone(v)) {
        warn('dropped a value that looks like personal data', k);
        continue;
      }
      out[k] = v.slice(0, 100);
    }
    return out;
  }

  /** origin + path (and a plain #anchor), never the query string. */
  function cleanUrl(href) {
    try {
      var u = new URL(href, location.href);
      if (!/^https?:$/.test(u.protocol)) return u.protocol.replace(':', '');
      var hash = /^#[\w-]+$/.test(u.hash) ? u.hash : '';
      return (u.origin + u.pathname + hash).slice(0, 100);
    } catch (e) {
      return '';
    }
  }

  // ---- forms: form_start once someone types or picks something; form_abandon if they leave
  // after that without a form_submit. State is per form_id.
  var forms = {};

  function track(name, params) {
    try {
      if (!NAME.test(name)) {
        warn('ignored event with a non-snake_case name', name);
        return;
      }
      var p = clean(params || {});
      p.site_section = SECTION;
      if (debug) p.debug_mode = true;
      if (p.form_id) {
        if (name === 'form_start') forms[p.form_id] = { state: 'started', name: p.form_name };
        // A submit, or a failed send after a valid submit, ends the attempt: no form_abandon.
        var ended = name === 'form_submit' || (name === 'form_error' && p.error_type === 'submit_failed');
        if (ended && forms[p.form_id]) forms[p.form_id].state = 'done';
      }
      var dl = (w.dataLayer = w.dataLayer || []);
      dl.push({ wv: null }); // GTM merges dataLayer state: clear the last event's params first
      dl.push({ event: name, wv: p });
      if (debug && w.console) console.info('[wvTrack] ' + name, p);
    } catch (e) {
      warn('failed', e);
    }
  }

  function attrParams(el) {
    var out = {};
    if (!el || !el.attributes) return out;
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i].name;
      if (a.indexOf('data-track-') !== 0) continue;
      var key = a.slice(11);
      if (MARKERS[key]) continue;
      out[key.replace(/-/g, '_')] = el.attributes[i].value;
    }
    return out;
  }

  function text(el) {
    if (!el) return '';
    var t = el.getAttribute('aria-label') || el.innerText || el.textContent || '';
    return t.replace(/\s+/g, ' ').trim();
  }

  /** Where on the page an element is: data-track-location, its area, or its section. */
  function where(el) {
    var named = el.closest('[data-track-location]');
    if (named) return named.getAttribute('data-track-location');
    var area = el.closest('[data-track-area]');
    if (area) return area.getAttribute('data-track-area');
    var s = el.closest('section, header, footer, nav, aside, article, main');
    if (!s) return 'page';
    if (s.id) return s.id;
    var cls = (s.getAttribute('class') || '').split(/\s+/)[0];
    return cls || s.tagName.toLowerCase();
  }

  function linkInfo(a) {
    var u;
    try {
      u = new URL(a.href, location.href);
    } catch (e) {
      return null;
    }
    var domain = u.hostname.replace(/^www\./, '');
    return {
      url: u,
      kind: u.protocol === 'mailto:' ? 'mailto'
        : u.protocol === 'tel:' ? 'tel'
        : !/^https?:$/.test(u.protocol) ? 'other'
        : u.hostname !== location.hostname ? 'outbound'
        : FILE.test(u.pathname) ? 'file'
        : 'internal',
      domain: domain,
      network: NETWORKS[domain] || NETWORKS[domain.split('.').slice(-2).join('.')],
    };
  }

  function onClick(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var tagged = t.closest('[data-track]');
    var link = t.closest('a[href]');
    var summary = t.closest('summary');
    var fired = {};

    // Params from every enclosing data-track-area (outermost first), then the element itself.
    function scoped(el) {
      var chain = [];
      for (var a = el.closest('[data-track-area]'); a; a = a.parentElement && a.parentElement.closest('[data-track-area]')) chain.unshift(a);
      var p = {};
      for (var i = 0; i < chain.length; i++) assign(p, attrParams(chain[i]));
      return p;
    }

    if (tagged) {
      var name = tagged.getAttribute('data-track');
      var p = assign(scoped(tagged), attrParams(tagged));
      var label = text(tagged);
      if (/cta_click$/.test(name)) {
        if (!p.cta_label) p.cta_label = label;
        if (!p.cta_location) p.cta_location = where(tagged);
      } else if (/^(nav|footer|logo)_click$/.test(name)) {
        if (!p.link_text) p.link_text = label;
      } else if (name === 'project_click') {
        var proj = tagged.closest('[data-track-project]');
        if (!p.project_name && proj) p.project_name = proj.getAttribute('data-track-project');
      } else if (/^(carousel_nav|accordion_open|copy_to_clipboard)$/.test(name)) {
        if (!p.ui_location) p.ui_location = where(tagged);
      }
      if (link && !p.link_url) p.link_url = cleanUrl(link.href);
      track(name, p);
      fired[name] = true;
    }

    if (link && link.getAttribute('data-track-auto') !== 'off') {
      var info = linkInfo(link);
      if (info) {
        var area = link.closest('[data-track-area]');
        var areaName = area && area.getAttribute('data-track-area');
        if (!tagged && (areaName === 'nav' || areaName === 'footer')) {
          var navEvent = areaName + '_click';
          track(navEvent, assign(scoped(link), { link_text: text(link), link_url: cleanUrl(link.href) }));
          fired[navEvent] = true;
        }
        var project = link.closest('[data-track-project]');
        if (project && !fired.project_click) {
          track('project_click', {
            project_name: project.getAttribute('data-track-project'),
            project_status: project.getAttribute('data-track-project-status'),
            link_url: cleanUrl(link.href),
          });
        }
        if ((info.kind === 'mailto' || info.kind === 'tel') && !fired.contact_click) {
          track('contact_click', {
            contact_method: info.kind === 'mailto' ? 'email' : 'phone',
            cta_location: where(link),
          });
        }
        if (info.kind === 'outbound') {
          if (!fired.click) {
            track('click', {
              outbound: true,
              link_url: cleanUrl(link.href),
              link_domain: info.domain,
              link_text: text(link),
            });
          }
          if (info.network && !fired.social_click) {
            track('social_click', { network: info.network, link_url: cleanUrl(link.href), cta_location: where(link) });
          }
        }
        if (info.kind === 'file' || (info.kind === 'outbound' && FILE.test(info.url.pathname))) {
          var file = info.url.pathname.split('/').pop();
          var dl = {
            file_name: file,
            file_extension: (file.match(FILE) || ['', ''])[1].toLowerCase(),
            link_url: cleanUrl(link.href),
          };
          if (/resume|cv/i.test(file) || link.hasAttribute('data-track-resume')) {
            if (!fired.resume_download) track('resume_download', dl);
          } else if (!fired.file_download) {
            track('file_download', dl);
          }
        }
      }
    }

    // A closed <details> about to open (pages that handle their own, like the pinned work
    // list, keep every row open, so this stays quiet there).
    if (summary && !tagged && !link) {
      var det = summary.parentElement;
      if (det && det.tagName === 'DETAILS' && !det.open) {
        var h = summary.querySelector('h1, h2, h3, h4');
        track('accordion_open', { ui_item: text(h || summary), ui_location: where(det) });
      }
    }
  }

  function formOf(el) {
    return el && el.closest ? el.closest('form[data-track-form]') : null;
  }

  function onField(e) {
    var f = formOf(e.target);
    var el = e.target;
    if (!f || el.hasAttribute('data-honeypot') || el.closest('[data-honeypot]')) return;
    var id = f.getAttribute('data-track-form');
    var state = forms[id];
    if (!state || state.state !== 'started') {
      track('form_start', { form_id: id, form_name: f.getAttribute('data-track-form-name') });
    }
    forms[id].field = el.getAttribute('name') || el.id || el.type || '';
  }

  function onLeave() {
    for (var id in forms) {
      if (forms[id].state !== 'started') continue;
      forms[id].state = 'abandoned';
      track('form_abandon', { form_id: id, form_name: forms[id].name, field_name: forms[id].field });
    }
  }

  // ---- scroll depth: 25/50/75/90% of the post body (or of the page when there isn't one),
  // and read_complete when the end of a post is on screen. Fires on scroll only.
  function initScroll() {
    var art = d.querySelector('[data-track-article]');
    var info = assign({ content_type: art ? 'article' : 'page' }, art ? attrParams(art) : {});
    var marks = [25, 50, 75, 90];
    var sent = {};
    var complete = false;
    var queued = false;
    function check() {
      queued = false;
      var vh = w.innerHeight || d.documentElement.clientHeight;
      var pct;
      if (art) {
        var r = art.getBoundingClientRect();
        pct = r.height > 0 ? ((vh - r.top) / r.height) * 100 : 0;
      } else {
        var h = d.documentElement.scrollHeight;
        pct = h > 0 ? (((w.scrollY || w.pageYOffset) + vh) / h) * 100 : 0;
      }
      for (var i = 0; i < marks.length; i++) {
        if (pct >= marks[i] && !sent[marks[i]]) {
          sent[marks[i]] = true;
          track('scroll_depth', assign({ percent_scrolled: marks[i] }, info));
        }
      }
      if (art && !complete && pct >= 100) {
        complete = true;
        track('read_complete', info);
      }
    }
    w.addEventListener('scroll', function () {
      if (!queued) {
        queued = true;
        w.requestAnimationFrame(function () {
          try {
            check();
          } catch (e) {
            warn('scroll', e);
          }
        });
      }
    }, { passive: true });
  }

  // ---- projects: project_view once a project is half on screen.
  function initProjects() {
    var els = d.querySelectorAll('[data-track-project]');
    if (!els.length || !('IntersectionObserver' in w)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        track('project_view', {
          project_name: en.target.getAttribute('data-track-project'),
          project_status: en.target.getAttribute('data-track-project-status'),
        });
      });
    }, { threshold: 0.5 });
    for (var i = 0; i < els.length; i++) io.observe(els[i]);
  }

  function guard(fn) {
    return function (e) {
      try {
        fn(e);
      } catch (err) {
        warn('handler failed', err);
      }
    };
  }

  function init() {
    try {
      initScroll();
      initProjects();
    } catch (e) {
      warn('init failed', e);
    }
  }

  w.wvTrack = track;
  w.wvTrack.debug = debug;
  d.addEventListener('click', guard(onClick), true);
  d.addEventListener('input', guard(onField), true);
  d.addEventListener('change', guard(onField), true);
  w.addEventListener('pagehide', guard(onLeave));
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init);
  else init();
})();
