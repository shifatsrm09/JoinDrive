export function openOAuthPopup(url: string) {
  const oauthUrl = new URL(url);
  oauthUrl.searchParams.set("popup", "1");

  const popup = window.open(
    oauthUrl.toString(),
    "joindrive-oauth",
    "popup=yes,width=520,height=720,noopener=no"
  );

  if (popup) {
    popup.focus();
    return;
  }

  window.location.href = oauthUrl.toString();
}
