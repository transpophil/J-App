export function openGoogleMapsApp(destination: string, waypoints: string[] = []) {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const params = new URLSearchParams();

  if (destination) params.set("daddr", destination);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  params.set("directionsmode", "driving");

  const deepLink = `comgooglemaps://?${params.toString()}`;

  const webLink =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${encodeURIComponent(destination)}` +
    (waypoints.length > 0 ? `&waypoints=${encodeURIComponent(waypoints.join("|"))}` : "") +
    `&travelmode=driving`;

  if (!isMobile) {
    // Desktop: open web maps
    window.location.href = webLink;
    return;
  }

  // Mobile: attempt to open the Google Maps app; if not installed, fall back to web
  const fallbackTimeout = setTimeout(() => {
    window.location.href = webLink;
  }, 1200);

  // If the page gets hidden (app switch), cancel the fallback
  const onVisibilityChange = () => {
    if (document.hidden) {
      clearTimeout(fallbackTimeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  window.location.href = deepLink;
}