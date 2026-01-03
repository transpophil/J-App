export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  const stops = waypoints.filter(Boolean);

  // Fallback web URL (api=1) with explicit origin and ordered waypoints forced via "via:"
  const api1Waypoints = stops.map((w) => `via:${w}`);
  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent("Current Location")}` +
    `&destination=${encodeURIComponent(destination)}` +
    (api1Waypoints.length > 0 ? `&waypoints=${encodeURIComponent(api1Waypoints.join("|"))}` : "") +
    `&travelmode=driving` +
    `&dir_action=navigate`;

  // iOS: prefer deep link (supports waypoints and preserves order); fallback opens web route in a new tab
  if (isiOS) {
    const iosParams = new URLSearchParams();
    iosParams.set("saddr", "Current Location");
    if (destination) iosParams.set("daddr", destination);
    if (api1Waypoints.length > 0) iosParams.set("waypoints", api1Waypoints.join("|"));
    iosParams.set("directionsmode", "driving");

    const iosDeepLink = `comgooglemaps://?${iosParams.toString()}`;

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

  // Android & Desktop: use legacy daddr chain with "via:" and "to:" to preserve waypoint order reliably
  // Build: daddr=via:stop1+to:via:stop2+to:destination
  const encodedStops = stops.map((w) => `via:${encodeURIComponent(w)}`);
  const daddrValue =
    (encodedStops.length > 0 ? encodedStops.join("+to:") + "+to:" : "") +
    encodeURIComponent(destination);

  const androidDesktopLink =
    `https://maps.google.com/maps?dirflg=d` +
    `&saddr=${encodeURIComponent("Current Location")}` +
    `&daddr=${daddrValue}`;

  // Open in new tab so the dashboard stays
  window.open(androidDesktopLink, "_blank");
}