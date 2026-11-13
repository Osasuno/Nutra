// Carregado antes da página (next/script beforeInteractive, em app/layout.tsx).
// Guarda o convite de instalação do Chrome, Edge e Android para o item "Instalar app" do menu
// (components/pwa/InstallAppButton.tsx) e registra o service worker em produção.
(function () {
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    window.__nutraInstall = e;
    window.dispatchEvent(new Event("nutra:installable"));
  });
  window.addEventListener("appinstalled", function () {
    window.__nutraInstall = null;
    window.__nutraInstalled = true;
    window.dispatchEvent(new Event("nutra:installable"));
  });
  if ("serviceWorker" in navigator && document.documentElement.dataset.sw === "on") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(function () {});
    });
  }
})();
