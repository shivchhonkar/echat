(function () {
  if (typeof window === "undefined") return;
  if (window.__echatEmbedLoaded) return;
  window.__echatEmbedLoaded = true;

  var cfg = window.EchatConfig || window.WeChatSupportConfig || {};
  var tenantKey = cfg.widgetKey || cfg.tenantKey || "default-key";
  var baseUrl = cfg.widgetBaseUrl || "http://localhost:5173";
  var iframeUrl = cfg.iframeUrl || (baseUrl + "/?embed=1&tenantKey=" + encodeURIComponent(tenantKey));

  var iframe = document.createElement("iframe");
  iframe.src = iframeUrl;
  iframe.title = cfg.title || "Support Chat";
  iframe.style.position = "fixed";
  iframe.style.right = (cfg.right || 12) + "px";
  iframe.style.bottom = (cfg.bottom || 12) + "px";
  iframe.style.width = (cfg.width || 390) + "px";
  iframe.style.height = (cfg.height || 560) + "px";
  iframe.style.border = "0";
  iframe.style.borderRadius = "16px";
  iframe.style.zIndex = String(cfg.zIndex || 2147483000);
  iframe.style.background = "transparent";
  iframe.style.boxShadow = "0 20px 50px rgba(15,23,42,0.25)";
  iframe.allow = "clipboard-write";

  function setOpenState(isOpen) {
    if (isOpen) {
      iframe.style.width = (cfg.width || 390) + "px";
      iframe.style.height = (cfg.height || 560) + "px";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 20px 50px rgba(15,23,42,0.25)";
    } else {
      iframe.style.width = "72px";
      iframe.style.height = "72px";
      iframe.style.borderRadius = "999px";
      iframe.style.boxShadow = "none";
    }
  }

  window.addEventListener("message", function (event) {
    var data = event && event.data;
    if (!data || (data.source !== "echat-widget" && data.source !== "wechat-widget") || data.type !== "toggle") return;
    setOpenState(!!data.open);
  });

  document.body.appendChild(iframe);
})();
