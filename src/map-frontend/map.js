let map;
let selectedMarker;
let dentistMarkers = [];
let dentists = [];
console.log("script starts");
// Fetch dentists from server
async function loadDentists() {
  const res = await fetch("/dentists");
  dentists = await res.json();
}

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 20.2961, lng: 85.8245 },
    zoom: 14
  });

  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  map.addListener("bounds_changed", () => searchBox.setBounds(map.getBounds()));

  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();
    if (!places || places.length === 0) return;
    const place = places[0];
    if (!place.geometry) return;

    selectLocation(place.geometry.location);
  });

  map.addListener("click", (event) => {
    selectLocation(event.latLng);
  });
}

function selectLocation(latLng) {
  if (selectedMarker) selectedMarker.setMap(null);
  selectedMarker = new google.maps.Marker({
    position: latLng,
    map,
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    title: "Selected Location"
  });
  map.setCenter(latLng);

  showNearby(latLng);
}

function showNearby(latLng) {
  // Remove previous markers
  dentistMarkers.forEach(m => m.setMap(null));
  dentistMarkers = [];

  // Show only dentists within 1km
  dentists.forEach(d => {
    const distance = getDistance(latLng.lat(), latLng.lng(), d.lat, d.lng);
    if (distance <= 1) {
      const m = new google.maps.Marker({
        position: { lat: d.lat, lng: d.lng },
        map,
        title: d.address,
        icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
      });
      dentistMarkers.push(m);
    }
  });
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI/180;
  const dLng = (lng2 - lng1) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 +
            Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
            Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Load dentists and initialize map
loadDentists().then(() => {
  window.initMap = initMap;
});
