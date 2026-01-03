export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isiOS || isAndroid;

  // Web URL (also used as fallback) with explicit origin so route is computed
  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent("Current Location")}` +
    `&destination=${encodeURIComponent(destination)}` +
    (waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "") +
    `&travelmode=driving`;

  if (!isMobile) {
    // Desktop: open web maps with route
    window.location.href = webLink;
    return;
  }

  // iOS: Google Maps deep link with origin (saddr) to show route and Start button
  if (isiOS) {
    const iosParams = new URLSearchParams();
    iosParams.set("saddr", "Current Location"); // ensures route is computed
    if (destination) iosParams.set("daddr", destination);
    if (waypoints.length > 0) iosParams.set("waypoints", waypoints.join("|"));
    iosParams.set("directionsmode", "driving");

    const iosDeepLink = `comgooglemaps://?${iosParams.toString()}`;

    const fallbackTimeout = setTimeout(() => {
      window.location.href = webLink;
    }, 1200);

    const onVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(fallbackTimeout);
        document.removeEventListener("visibilitychange", onVisibilityChange);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    window.location.href = iosDeepLink;
    return;
  }

  // Android: use navigation intent to jump directly into navigation
  // Note: waypoints aren't supported in google.navigation intent.
  const androidNavLink =
    `google.navigation:` +
    `q=${encodeURIComponent(destination)}` +
    `&mode=d`;

  // Try Android navigation intent; if it fails, fall back to web route (usually opens in app with Start option)
  const fallbackTimeout = setTimeout(() => {
    window.location.href = webLink;
  }, 1200);

  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTimeout(fallbackTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  window.location.href = androidNavLink;
}