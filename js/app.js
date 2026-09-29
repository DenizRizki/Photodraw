(function () {
  'use strict';

  var list = document.getElementById('check-list');
  var detail = document.getElementById('check-detail');
  var startBtn = document.getElementById('start-btn');
  var markerToggle = document.getElementById('marker-toggle');
  var markerPanel = document.getElementById('marker-panel');

  function setState(name, state) {
    var row = list.querySelector('[data-check="' + name + '"]');
    if (row) row.setAttribute('data-state', state);
  }

  function hasWebGL() {
    try {
      var canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  }

  function checkCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return Promise.resolve({ ok: false, reason: 'This browser does not expose camera access to web pages.' });
    }
    if (!navigator.permissions || !navigator.permissions.query) {
      return Promise.resolve({ ok: true, willPrompt: true });
    }
    return navigator.permissions
      .query({ name: 'camera' })
      .then(function (status) {
        if (status.state === 'denied') {
          return { ok: false, reason: 'Camera permission is blocked for this site. Re-enable it in your browser settings, then reload.' };
        }
        if (status.state === 'granted') return { ok: true };
        return { ok: true, willPrompt: true };
      })
      .catch(function () {
        return { ok: true, willPrompt: true };
      });
  }

  function render() {
    var problems = [];

    var secure = window.isSecureContext === true;
    setState('secure', secure ? 'pass' : 'fail');
    if (!secure) {
      problems.push(
        location.hostname === 'localhost' || location.hostname === '127.0.0.1'
          ? 'Open this page over HTTPS. The browser blocks camera access on insecure origins.'
          : 'This page is not on a secure origin. Browsers only allow camera access over HTTPS.'
      );
    }

    var webgl = hasWebGL();
    setState('webgl', webgl ? 'pass' : 'fail');
    if (!webgl) {
      problems.push('WebGL is unavailable, so the 3D camera view cannot render. Update your browser or enable hardware acceleration.');
    }

    return checkCamera().then(function (cam) {
      setState('camera', cam.ok ? 'pass' : 'fail');
      if (!cam.ok) {
        problems.push(cam.reason);
      } else {
        startBtn.removeAttribute('aria-disabled');
      }

      if (problems.length) {
        detail.textContent = problems.join(' ');
        detail.hidden = false;
        startBtn.setAttribute('aria-disabled', 'true');
      } else {
        detail.hidden = true;
      }
    });
  }

  markerToggle.addEventListener('click', function () {
    var open = markerPanel.hidden;
    markerPanel.hidden = !open;
    markerToggle.setAttribute('aria-expanded', String(open));
    markerToggle.textContent = open ? 'Hide the marker' : 'Show the marker';
  });

  render();
})();
