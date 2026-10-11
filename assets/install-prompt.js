// Bridgewater YOU - "Add to Phone" install button (Android)
//
// The button only appears when the browser itself signals that a one-tap
// install is available (Android Chrome-family browsers). iPhone Safari and
// any browser without this feature never fire the event below, so the button
// stays hidden there and the written steps on the page are all that shows.
(function () {
  "use strict";

  // Register the service worker that install-capable browsers look for.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js").catch(function () {
        // Ignore: the written steps on the page still work without it.
      });
    });
  }

  var deferredPrompt = null;
  var banner = document.getElementById("install-banner");
  var installBtn = document.getElementById("install-banner-btn");

  if (!banner || !installBtn) return;

  window.addEventListener("beforeinstallprompt", function (event) {
    // Stop the browser's own mini-banner so we can show our own button.
    event.preventDefault();
    deferredPrompt = event;
    banner.hidden = false;
  });

  installBtn.addEventListener("click", function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      banner.hidden = true;
    });
  });

  // If the install finishes by any route, make sure the button is gone.
  window.addEventListener("appinstalled", function () {
    banner.hidden = true;
    deferredPrompt = null;
  });
})();
