export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  // Force ordered stops with 'via:' to ensure Google Maps treats them as intermediate waypoints in order
  const orderedWaypoints = waypoints.map((w) => `via:${w}`);

  // Web route URL (opens the Google Maps app on mobile) — opened in a new tab so the dashboard stays
  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent("Current Location")}` +
    `&destination=${encodeURIComponent(destination)}` +
    (orderedWaypoints.length > 0 ? `&waypoints=${encodeURIComponent(orderedWaypoints.join("|"))}` : "") +
    `&travelmode=driving`;

  // iOS: try deep link (supports ordered waypoints); fallback opens web route in a new tab (keeps dashboard)
  if (isiOS) {
    const iosParams = new URLSearchParams();
    iosParams.set("saddr", "Current Location");
    if (destination) iosParams.set("daddr", destination);
    if (orderedWaypoints.length > 0) iosParams.set("waypoints", orderedWaypoints.join("|"));
    iosParams.set("directionsmode", "driving");

    const iosDeepLink = `comgooglemaps://?${iosParams.toString()}`;

    const fallbackTimeout = setTimeout(() => {
      window.open(webLink, "_blank"); // open in new tab so the dashboard does not navigate away
    }, 1200);

    const cleanup = () => {
      clearTimeout(fallbackTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", cleanup);
      window.removeEventListener("blur", cleanup);
    };
    const onVisibilityChange = () => {
      if (document.hidden) cleanup(); // app opened, cancel fallback
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cleanup);
    window.addEventListener("blur", cleanup);

    window.location.href = iosDeepLink;
    return;
  }

  // Android & Desktop: open the route in a new tab to keep the dashboard in place (Android app will pick it up)
  window.open(webLink, "_blank");
}