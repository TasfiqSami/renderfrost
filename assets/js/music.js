/* ==========================================================================
   RenderFrost SMP â€” 04 Soundtrack controller

   One <audio> element for the whole session, so the track never restarts
   between pages. Autoplay is never attempted: playback starts from an
   explicit visitor action. The visitor's own volume choice always wins.
   ========================================================================== */

(function (global) {
  "use strict";

  var SRC = "assets/audio/renderfrost-bgm.mp3";
  var KEY = "rf.music";

  var FADE_STEP_MS = 90;
  var INTRO_LEVEL = 0.22;
  var TARGET_LEVEL = 0.45;
  var DEFAULT_VOLUME = 0.4;

  function clamp(v) {
    if (isNaN(v)) return DEFAULT_VOLUME;
    return Math.min(1, Math.max(0, v));
  }

  var store = {
    read: function () {
      try {
        var raw = global.localStorage.getItem(KEY);
        if (!raw) return null;
        var v = JSON.parse(raw);
        if (typeof v !== "object" || v === null) return null;
        return {
          volume: clamp(typeof v.volume === "number" ? v.volume : DEFAULT_VOLUME),
          muted: v.muted === true
        };
      } catch (err) {
        return null;
      }
    },
    write: function (s) {
      try {
        global.localStorage.setItem(KEY, JSON.stringify(s));
      } catch (err) {
        /* storage blocked: preferences simply won't persist */
      }
    }
  };

  var saved = store.read() || { volume: DEFAULT_VOLUME, muted: false };

  var audio = null;
  var failed = false;
  var fadeTimer = 0;
  var userAdjusted = false;
  /* Explicit intent flag. `audio.paused` is unreliable the instant play() is
     called: Chrome reports paused=false before the promise resolves, which
     made toggle() treat the first press as a pause. */
  var wantsPlay = false;
  var els = {};

  function q(root, sel) { return root ? root.querySelector(sel) : null; }

  function findControls() {
    els.root = q(document, ".music");
    els.toggle = q(document, ".music__toggle");
    els.play = q(els.root, '[data-music="play"]');
    els.pause = q(els.root, '[data-music="pause"]');
    els.mute = q(els.root, '[data-music="mute"]');
    els.unmute = q(els.root, '[data-music="unmute"]');
    els.slider = q(els.root, '[data-music="volume"]');
    els.value = q(els.root, ".music__value");
    els.pop = q(els.root, ".music__pop");
    els.popTrigger = q(els.root, '[data-music="pop"]');
    els.popClose = q(els.root, '[data-music="pop-close"]');
    els.note = q(els.root, ".music__note");
  }

  function ensureAudio() {
    if (audio || failed) return audio;
    try {
      audio = new Audio();
      audio.preload = "metadata";
      audio.loop = true;
      audio.src = SRC;
      audio.volume = clamp(saved.muted ? 0 : saved.volume);
      audio.addEventListener("error", onError);
      audio.addEventListener("playing", sync);
      audio.addEventListener("pause", sync);
      audio.addEventListener("volumechange", sync);
      // Exposed so the browser test suite can assert real playback state.
      global.__rfAudio = audio;
    } catch (err) {
      onError();
    }
    return audio;
  }

  function onError() {
    failed = true;
    stopFade();
    if (els.root) els.root.classList.remove("is-playing");
    setDisabled(true);
    if (els.note) {
      els.note.textContent =
        "Soundtrack unavailable on this device. The rest of the site works normally.";
    }
    if (els.toggle) {
      els.toggle.setAttribute("aria-label", "Soundtrack unavailable");
      els.toggle.setAttribute("aria-disabled", "true");
    }
    sync();
  }

  function setDisabled(state) {
    var targets = [els.toggle, els.play, els.pause, els.mute, els.unmute, els.slider];
    targets.forEach(function (el) {
      if (!el) return;
      if (state) el.setAttribute("disabled", "");
      else el.removeAttribute("disabled");
    });
  }


  function play() {
    var el = ensureAudio();
    if (!el || failed) return;
    stopFade();

    if (saved.muted) {
      saved.muted = false;
      store.write(saved);
    }

    userAdjusted = false;
    wantsPlay = true;
    var attempt = el.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(function () {
        if (!wantsPlay) {
          el.pause();
          return;
        }
        if (userAdjusted) return;
        // Gentle atmospheric entrance: silence -> quiet -> comfortable.
        el.volume = 0;
        fadeTo(INTRO_LEVEL, 1.4, 0);
        setTimeout(function () {
          if (userAdjusted || !wantsPlay || !audio || audio.paused) return;
          var settle = saved.volume > INTRO_LEVEL ? saved.volume : TARGET_LEVEL;
          fadeTo(settle, 5);
        }, 1500);
      }).catch(function () {
        wantsPlay = false;
        onError();
      });
    } else {
      el.volume = clamp(saved.volume);
    }
    sync();
  }

  function pause() {
    if (!audio) return;
    wantsPlay = false;
    stopFade();
    userAdjusted = true;
    var from = audio.volume;
    var steps = 8;
    var i = 0;
    fadeTimer = setInterval(function () {
      i++;
      if (!audio) {
        stopFade();
        return;
      }
      audio.volume = clamp(from * (1 - i / steps));
      if (i >= steps) {
        stopFade();
        audio.pause();
        audio.volume = clamp(saved.muted ? 0 : saved.volume);
      }
    }, 45);
    sync();
  }

  function toggle() {
    if (failed) return;
    if (wantsPlay && audio && !audio.paused) pause();
    else play();
  }

  function setVolume(v) {
    var el = ensureAudio();
    if (!el) return;
    userAdjusted = true;
    stopFade();
    saved.volume = clamp(v);
    saved.muted = saved.volume === 0;
    el.volume = clamp(saved.muted ? 0 : saved.volume);
    store.write(saved);
    render();
  }

  function setMuted(state) {
    var el = ensureAudio();
    if (!el) return;
    userAdjusted = true;
    stopFade();
    saved.muted = !!state;
    el.volume = saved.muted ? 0 : clamp(saved.volume);
    store.write(saved);
    render();
  }

  function sync() {
    if (els.root) {
      els.root.classList.toggle(
        "is-playing",
        !!(audio && !audio.paused && !failed && wantsPlay)
      );
    }
    render();
  }

  function render() {
    var playing = !!(audio && !audio.paused && !failed && wantsPlay);
    var eff = saved.muted ? 0 : clamp(saved.volume);

    if (els.play) els.play.classList.toggle("music__icon--hidden", playing);
    if (els.pause) els.pause.classList.toggle("music__icon--hidden", !playing);
    if (els.mute) els.mute.classList.toggle("music__icon--hidden", saved.muted);
    if (els.unmute) els.unmute.classList.toggle("music__icon--hidden", !saved.muted);

    if (els.slider) {
      els.slider.value = String(Math.round(eff * 100));
      els.slider.style.setProperty("--fill", Math.round(eff * 100) + "%");
      els.slider.setAttribute("aria-valuetext", Math.round(eff * 100) + "% volume");
    }
    if (els.value) els.value.textContent = Math.round(eff * 100) + "%";

    if (els.toggle) {
      els.toggle.setAttribute("aria-label", playing ? "Pause soundtrack" : "Play soundtrack");
      els.toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    }
  }

  function openPop(open) {
    if (!els.pop || !els.popTrigger) return;
    els.pop.classList.toggle("is-open", open);
    els.popTrigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function bind() {
    findControls();
    if (!els.root) return;

    if (audio) audio.volume = clamp(saved.muted ? 0 : saved.volume);
    render();

    if (els.toggle) {
      els.toggle.addEventListener("click", function () {
        openPop(false);
        toggle();
      });
    }
    /* The play/pause icons live inside .music__toggle and are purely
       decorative (aria-hidden), so no listeners are attached to them —
       only the button itself handles the action. */
    if (els.mute) els.mute.addEventListener("click", function () { setMuted(true); });
    if (els.unmute) els.unmute.addEventListener("click", function () { setMuted(false); });

    if (els.slider) {
      els.slider.addEventListener("input", function (e) {
        setVolume(Number(e.target.value) / 100);
      });
    }

    if (els.popTrigger) {
      els.popTrigger.addEventListener("click", function (e) {
        e.stopPropagation();
        openPop(!els.pop.classList.contains("is-open"));
      });
    }

    if (els.popClose) {
      els.popClose.addEventListener("click", function () {
        openPop(false);
        if (els.popTrigger) els.popTrigger.focus();
      });
    }

    document.addEventListener("click", function (e) {
      if (!els.pop || !els.pop.classList.contains("is-open")) return;
      if (els.root && els.root.contains(e.target)) return;
      openPop(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (els.pop && els.pop.classList.contains("is-open")) {
        openPop(false);
        if (els.popTrigger) els.popTrigger.focus();
      }
    });
  }

  /* The <audio> error event is the authoritative check for whether the track
     can play, so no extra HEAD probe is made: a speculative request would
     race the real one and show up as an aborted request in the console. */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  global.RFMusic = { play: play, pause: pause, toggle: toggle };
  function stopFade() {
    if (fadeTimer) {
      clearInterval(fadeTimer);
      fadeTimer = 0;
    }
  }

  /* Fade from the current volume toward `to`. Any real user input cancels it,
     so the automatic ramp never overrides a visitor's choice. */
  function fadeTo(to, seconds, from) {
    if (!audio) return;
    stopFade();
    var start = typeof from === "number" ? from : audio.volume;
    var steps = Math.max(1, Math.round((seconds * 1000) / FADE_STEP_MS));
    var i = 0;
    fadeTimer = setInterval(function () {
      i++;
      if (userAdjusted || !audio) {
        stopFade();
        return;
      }
      var p = i / steps;
      audio.volume = clamp(start + (to - start) * p);
      if (i >= steps) {
        stopFade();
        audio.volume = clamp(to);
      }
    }, FADE_STEP_MS);
  }
})(window);
