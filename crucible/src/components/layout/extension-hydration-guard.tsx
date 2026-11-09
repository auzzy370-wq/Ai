import Script from "next/script";

/**
 * Browser extensions / Chrome inject attributes onto html, body, and form
 * controls before React hydrates (Grammarly data-gr-*, Chrome __gcruniqueid, …).
 * Strip them early so SSR HTML matches the live DOM.
 */
export function ExtensionHydrationGuard() {
  return (
    <Script id="extension-hydration-guard" strategy="beforeInteractive">{`
(function () {
  var EXACT = {
    "data-new-gr-c-s-check-loaded": 1,
    "data-gr-ext-installed": 1,
    "data-gr-c-s-loaded": 1,
    "data-lt-installed": 1,
    "cz-shortcut-listen": 1,
    "data-darkreader-mode": 1,
    "data-darkreader-scheme": 1,
    "bis_skin_checked": 1,
    "__gcruniqueid": 1,
    "__gchrome_uniqueid": 1
  };
  function shouldStrip(name) {
    if (!name) return false;
    if (EXACT[name]) return true;
    if (name.indexOf("__gcr") === 0) return true;
    if (name.indexOf("__gchrome") === 0) return true;
    if (name.indexOf("data-gr-") === 0) return true;
    if (name.indexOf("data-new-gr-") === 0) return true;
    if (name.indexOf("data-lt-") === 0) return true;
    if (name.indexOf("data-darkreader") === 0) return true;
    return false;
  }
  function strip(el) {
    if (!el || !el.attributes || !el.removeAttribute) return;
    for (var i = el.attributes.length - 1; i >= 0; i--) {
      var n = el.attributes[i].name;
      if (shouldStrip(n)) el.removeAttribute(n);
    }
  }
  function scrub(root) {
    strip(document.documentElement);
    strip(document.body);
    var scope = root && root.querySelectorAll ? root : document;
    var nodes = scope.querySelectorAll
      ? scope.querySelectorAll("form, input, textarea, select, button, label")
      : [];
    for (var i = 0; i < nodes.length; i++) strip(nodes[i]);
    if (root && root.nodeType === 1) strip(root);
  }
  scrub(document);
  try {
    var obs = new MutationObserver(function (records) {
      for (var r = 0; r < records.length; r++) {
        var rec = records[r];
        if (rec.type === "attributes" && rec.target) strip(rec.target);
        if (rec.addedNodes && rec.addedNodes.length) {
          for (var n = 0; n < rec.addedNodes.length; n++) {
            var node = rec.addedNodes[n];
            if (node && node.nodeType === 1) scrub(node);
          }
        }
      }
    });
    obs.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true
    });
    window.addEventListener("DOMContentLoaded", function () { scrub(document); });
    // Keep scrubbing through the hydrate window; then disconnect.
    window.addEventListener("load", function () {
      scrub(document);
      setTimeout(function () {
        scrub(document);
        try { obs.disconnect(); } catch (e) {}
      }, 8000);
    });
  } catch (e) {}
})();
`}</Script>
  );
}
