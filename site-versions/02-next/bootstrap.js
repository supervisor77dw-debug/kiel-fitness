// Frueher Anfangszustand der Navigation ohne Inline-Skript, damit eine strenge CSP (script-src 'self') genuegt
// (AW-20261024-GE-CLAUDE-KIELS-AIW-LEAD-LIVE-INTEGRATION-009). Laedt script.js nicht, wird die Klasse wieder entfernt,
// damit die Navigation ohne JavaScript sichtbar bleibt (bisher onerror-Attribut am Skript-Tag).
(function () {
  var root = document.documentElement;
  root.classList.add("prototype-js");
  window.addEventListener("error", function (event) {
    var target = event.target;
    if (target && target.tagName === "SCRIPT" && /(^|\/)script\.js(\?|$)/.test(target.getAttribute("src") || "")) {
      root.classList.remove("prototype-js");
    }
  }, true);
})();
