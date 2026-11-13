// Service worker do Nutra. Deixa o app instalável e mostra uma página própria quando a internet
// cai. Não guarda nenhum dado das páginas (prontuário, plano, chat): tudo continua vindo do servidor.
// Ao mudar offline.html, troque a versão do cache.
const CACHE = "nutra-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      // A página começa a carregar enquanto o service worker acorda.
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      await self.clients.claim();
    })(),
  );
});

// Notificações (Web Push). Chegam com o app em segundo plano ou fechado. Só não aparecem
// quando a pessoa já está olhando a própria tela do aviso (ex.: dentro daquele chat).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/";
  const target = url.split("#")[0];
  event.waitUntil(
    (async () => {
      // Bolinha no ícone do app instalado (iPhone e computador; no Android o sistema já
      // mostra um ponto quando há notificação).
      if (typeof data.badge === "number" && self.navigator.setAppBadge) {
        await (data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge()).catch(() => {});
      }
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const looking = windows.some((w) => w.focused && w.visibilityState === "visible" && new URL(w.url).pathname === target);
      if (looking) return;
      await self.registration.showNotification(data.title || "Nutra", {
        body: data.body || "",
        icon: "/icons/icon-192.png",
        badge: "/icons/badge-96.png",
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        data: { url, badge: data.badge },
      });
    })(),
  );
});

// Tocar na notificação abre a página certa (reaproveita o app se já estiver aberto).
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open) await open.navigate(target).catch(() => {});
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// O navegador trocou o endereço de push: inscreve de novo e avisa o servidor.
self.addEventListener("pushsubscriptionchange", (event) => {
  const options = event.oldSubscription && event.oldSubscription.options;
  if (!options) return;
  event.waitUntil(
    self.registration.pushManager.subscribe(options).then((subscription) =>
      fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      }),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  // Só a abertura de páginas. Dados, imagens e scripts vão direto para a rede.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) return preloaded;
        return await fetch(event.request);
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })(),
  );
});
