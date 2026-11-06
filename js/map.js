/* Nexus Pro | js/map.js
   Opt-in "Am I in the service area?" check using the Geolocation API.
   The visitor's position is used in the browser only and is never sent anywhere. */
(function () {
  'use strict';

  var CENTRE = { lat: -34.1167, lng: 18.8333 };   /* Strand, Western Cape (town centre, not a street address) */
  var RADIUS_M = 25000;

  var button = document.getElementById('locate-btn');
  var status = document.getElementById('locate-status');
  if (!button || !status) { return; }

  /* Great-circle (haversine) distance in metres */
  function distance(a, b) {
    var R = 6371000, rad = Math.PI / 180;
    var dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  button.addEventListener('click', function () {
    if (!navigator.geolocation) {
      status.textContent = 'Your browser cannot share your location. You can still contact us.';
      return;
    }
    status.textContent = 'Checking\u2026 your browser may ask for permission.';
    navigator.geolocation.getCurrentPosition(function (pos) {
      var m = distance({ lat: pos.coords.latitude, lng: pos.coords.longitude }, CENTRE);
      var km = Math.round(m / 1000);
      status.textContent = m <= RADIUS_M
        ? 'You are about ' + km + ' km from Strand, inside our usual service area.'
        : 'You are about ' + km + ' km from Strand, outside our usual in-person area. We still build and support websites remotely.';
    }, function (err) {
      status.textContent = err.code === 1
        ? 'Location permission was declined. No problem, you can still contact us.'
        : 'We could not read your location. You can still contact us.';
    }, { timeout: 10000, maximumAge: 60000 });
  });
})();
