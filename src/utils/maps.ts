export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isiOS || isAndroid;

  // Build web route URL (opens Google Maps app on mobile) with explicit origin and ordered waypoints
  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent("Current Location")}` +
    `&destination=${encodeURIComponent(destination)}` +
    (waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "") +
    `&travelmode=driving` +
    `&dir_action=navigate`;

  if (!isMobile) {
    // Desktop: open web maps with route
    window.location.href = webLink;
    return;
  }

  if (isiOS) {
    // iOS deep link supports waypoints; preserves order provided
    const iosParams = new URLSearchParams();
    iosParams.set("saddr", "Current Location");
    if (destination) iosParams.set("daddr", destination);
    if (waypoints.length > 0) iosParams.set("waypoints", waypoints.join("|")); // ordered
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

  // Android: use the web route URL (opens app) because google.navigation does not support waypoints.
  window.location.href = webLink;
}