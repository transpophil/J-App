export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const stops = waypoints.filter(Boolean);

  // Build "via:"-forced waypoints for API v1 web link (fallback) in the chosen order
  const api1Waypoints = stops.map((w) => `via:${w}`);
  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent("Current Location")}` +
    `&destination=${encodeURIComponent(destination)}` +
    (api1Waypoints.length > 0 ? `&waypoints=${encodeURIComponent(api1Waypoints.join("|"))}` : "") +
    `&travelmode=driving` +
    `&map_action=map`;

  if (isiOS) {
    // iOS: Use the legacy daddr chain with "via:" and "to:" to lock waypoint order
    // daddr=via:stop1+to:via:stop2+to:destination
    const encodedStops = stops.map((addr) => `via:${encodeURIComponent(addr)}`);
    const daddrChain =
      (encodedStops.length > 0 ? encodedStops.join("+to:") + "+to:" : "") +
      encodeURIComponent(destination);

    const iosDeepLink =
      `comgooglemaps://?` +
      `saddr=${encodeURIComponent("Current Location")}` +
      `&daddr=${daddrChain}` +
      `&directionsmode=driving`;

    // Fallback to web route (opens in new tab so dashboard stays) if app isn't installed
    const fallbackTimeout = setTimeout(() => {
      window.open(webLink, "_blank");
    }, 1200);

    const cleanup = () => {
      clearTimeout(fallbackTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", cleanup);
      window.removeEventListener("blur", cleanup);
    };
    const onVisibilityChange = () => {
      if (document.hidden) cleanup();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", cleanup);
    window.addEventListener("blur", cleanup);

    window.location.href = iosDeepLink;
    return;
  }

  // Android & Desktop: use legacy Google Maps link with "via:" and "to:" to preserve order; open in new tab
  const encodedStops = stops.map((addr) => `via:${encodeURIComponent(addr)}`);
  const daddrValue =
    (encodedStops.length > 0 ? encodedStops.join("+to:") + "+to:" : "") +
    encodeURIComponent(destination);

  const androidDesktopLink =
    `https://maps.google.com/maps?dirflg=d` +
    `&saddr=${encodeURIComponent("Current Location")}` +
    `&daddr=${daddrValue}`;

  window.open(androidDesktopLink, "_blank");
}