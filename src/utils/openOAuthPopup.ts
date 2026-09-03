/**
 * Keeps the Google authorization flow out of the main JoinDrive tab.
 * The backend closes this popup and replaces the opener's URL when the
 * OAuth callback finishes, so browser Back never returns to Google.
 */
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

  // Browsers can block popups. Keep the existing full-page flow as a
  // fallback so sign-in still works, even though it has normal history.
  window.location.href = oauthUrl.toString();
}
