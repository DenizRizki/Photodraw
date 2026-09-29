(function () {
  'use strict';

  var THREE = window.THREE;
  var AFRAME = window.AFRAME;

  var SURFACE_WIDTH = 1;
  var SURFACE_HEIGHT = 0.552;
  var TEX_W = 1024;
  var TEX_H = 565;

  var SLOW_HINT_MS = 15000;
  var GIVE_UP_MS = 45000;

  var els = {};
  var ready = false;
  var watchdog = null;

  function cacheEls() {
    els.loader = document.getElementById('loader');
    els.loaderText = document.getElementById('loader-text');
    els.pill = document.getElementById('status-pill');
    els.pillText = document.getElementById('status-text');
    els.hint = document.getElementById('hint');
    els.fatal = document.getElementById('fatal');
    els.fatalText = document.getElementById('fatal-text');
  }

  function paintSurfaceTexture() {
    var canvas = document.createElement('canvas');
    canvas.width = TEX_W;
    canvas.height = TEX_H;
    var g = canvas.getContext('2d');

    g.fillStyle = 'rgba(255, 255, 255, 0.10)';
    g.fillRect(0, 0, TEX_W, TEX_H);

    g.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    g.lineWidth = 2;
    var step = 64;
    var x;
    for (x = step; x < TEX_W; x += step) {
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, TEX_H);
      g.stroke();
    }
    for (x = step; x < TEX_H; x += step) {
      g.beginPath();
      g.moveTo(0, x);
      g.lineTo(TEX_W, x);
      g.stroke();
    }

    g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    g.lineWidth = 6;
    g.strokeRect(3, 3, TEX_W - 6, TEX_H - 6);

    g.lineWidth = 4;
    g.strokeStyle = 'rgba(77, 141, 255, 0.9)';
    var arm = 46;
    var cx = TEX_W / 2;
    var cy = TEX_H / 2;
    g.beginPath();
    g.moveTo(cx - arm, cy);
    g.lineTo(cx + arm, cy);
    g.moveTo(cx, cy - arm);
    g.lineTo(cx, cy + arm);
    g.stroke();

    g.fillStyle = 'rgba(255, 255, 255, 0.55)';
    g.font = '600 38px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('DRAW SURFACE', cx, cy - 76);

    return canvas;
  }

  AFRAME.registerComponent('drawsurface', {
    init: function () {
      var texture = new THREE.CanvasTexture(paintSurfaceTexture());
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      var material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        toneMapped: false
      });

      this.surface = new THREE.Mesh(new THREE.PlaneGeometry(SURFACE_WIDTH, SURFACE_HEIGHT), material);
      this.surface.name = 'draw-surface';
      this.texture = texture;

      this.el.setObject3D('draw-surface', this.surface);
    },

    remove: function () {
      if (this.texture) this.texture.dispose();
      if (this.surface) {
        this.surface.geometry.dispose();
        this.surface.material.dispose();
      }
    }
  });

  function fail(message) {
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (els.loader) {
      els.loader.hidden = true;
      els.loader.classList.remove('done');
    }
    els.fatalText.textContent = message;
    els.fatal.hidden = false;
  }

  function setStatus(state, text) {
    els.pill.setAttribute('data-state', state);
    els.pillText.textContent = text;
  }

  function checkEnvironment() {
    if (window.isSecureContext !== true) {
      return 'Camera access needs a secure connection. Open this page over HTTPS, not plain http.';
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return 'This browser does not expose camera access to web pages.';
    }
    return null;
  }

  function bindScene(sceneEl) {
    sceneEl.addEventListener('arReady', function () {
      ready = true;
      if (watchdog) {
        clearTimeout(watchdog);
        watchdog = null;
      }
      els.loader.classList.add('done');
      setTimeout(function () {
        els.loader.hidden = true;
      }, 400);
      setStatus('searching', 'Searching');
      els.hint.hidden = false;
      els.hint.textContent = 'Point your camera at the marker';
    });

    sceneEl.addEventListener('targetFound', function () {
      setStatus('ready', 'Tracking');
      els.hint.hidden = true;
    });

    sceneEl.addEventListener('targetLost', function () {
      setStatus('searching', 'Searching');
      els.hint.hidden = false;
      els.hint.textContent = 'Marker lost - point your camera back at it';
    });

    sceneEl.addEventListener('arError', function (evt) {
      var code = evt.detail && evt.detail.error;
      if (code === 'VIDEO_FAIL') {
        fail('The camera could not be started. Close any other app using the camera, then reload.');
      } else {
        fail('The AR engine reported an error (' + (code || 'unknown') + '). Reload to try again.');
      }
    });

    document.addEventListener('visibilitychange', function () {
      var system = sceneEl.systems && sceneEl.systems['mindar-image-system'];
      if (!system || !ready) return;
      try {
        if (document.hidden) {
          if (system.pause) system.pause();
        } else if (system.unpause) {
          system.unpause();
        }
      } catch (e) {
        /* tracking keeps running; nothing to do */
      }
    });
  }

  function boot() {
    cacheEls();

    var envError = checkEnvironment();
    if (envError) {
      fail(envError);
      return;
    }

    if (!AFRAME || !AFRAME.components['mindar-image'] || !document.getElementById('scene')) {
      fail('The AR engine failed to load. Check your internet connection and reload.');
      return;
    }

    bindScene(document.getElementById('scene'));

    els.loaderText.textContent = 'Loading the tracker';
    watchdog = setTimeout(function () {
      if (!ready) {
        fail('The tracker took too long to start. This usually means the marker data could not be downloaded. Check your connection and reload.');
      }
    }, GIVE_UP_MS);

    setTimeout(function () {
      if (!ready) els.loaderText.textContent = 'Still loading the tracker';
    }, SLOW_HINT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
