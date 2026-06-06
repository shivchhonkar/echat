export const WIDGET_PROD_URL = "https://care.shribi.com";

export function buildInstallSnippet(widgetKey, baseUrl = WIDGET_PROD_URL) {
  return `<script>
  window.WeChatSupportConfig = {
    widgetKey: "${widgetKey}",
    widgetBaseUrl: "${baseUrl}",
    title: "Support Chat",
    tagline: "We're here to help!"
  };
</script>
<script src="${baseUrl}/embed.js" async></script>`;
}
