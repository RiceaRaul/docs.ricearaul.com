# Vanilla HTML

The simplest integration — just import the component and use it in HTML.

## Basic Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>GTA V Map</title>
  <style>
    body { margin: 0; }
    gta-v-map { display: block; width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <gta-v-map
    zoom="3"
    default-style="satellite"
    tile-base-url="/mapStyles"
    blips-url="/blips"
    show-layer-control
    markers='[{"x": 0, "y": 0, "icon": 1, "popup": "<b>Spawn</b>", "group": "Spawns"}]'
  ></gta-v-map>

  <script type="module">
    import 'gta-v-map';
  </script>
</body>
</html>
```

## Accessing the Element

```js
const map = document.querySelector('gta-v-map');

// Wait for ready
map.addEventListener('map-ready', () => {
  console.log('Map is ready!');
});

// Add markers imperatively
map.addMarker({
  x: 100, y: 200,
  icon: 1,
  popup: '<b>Dynamic marker</b>',
  group: 'Dynamic',
});
```

## Full Example with All Features

```html
<gta-v-map
  id="map"
  zoom="3"
  default-style="satellite"
  tile-base-url="/mapStyles"
  blips-url="/blips"
  show-layer-control
  markers='[
    {"x": 0, "y": 0, "icon": 1, "popup": "<b>Spawn</b>", "group": "Spawns"},
    {"x": 500, "y": 500, "icon": 1, "popup": "<b>Safe House</b>", "group": "Properties"}
  ]'
  shapes='[
    {
      "type": "polygon",
      "points": [[-200,-400],[300,-400],[300,100],[-200,100]],
      "color": "#ff4444",
      "fillOpacity": 0.15,
      "group": "Zones",
      "label": {"text": "Danger Zone", "color": "#ff4444"}
    }
  ]'
></gta-v-map>

<script type="module">
  import 'gta-v-map';

  const map = document.getElementById('map');

  // Listen to events
  map.addEventListener('map-click', (e) => {
    console.log('Clicked:', e.detail.x, e.detail.y);
  });

  map.addEventListener('marker-click', (e) => {
    console.log('Marker:', e.detail.id);
  });

  // Toggle heatmap
  map.showHeatmap = true;

  // Enable place mode
  map.placeMode = true;
  map.addEventListener('marker-placed', (e) => {
    map.addMarker({
      ...e.detail,
      icon: 1,
      popup: `Placed at ${e.detail.x.toFixed(0)}, ${e.detail.y.toFixed(0)}`,
    });
  });
</script>
```

## Custom CRS

```js
import { createGtaCRS } from 'gta-v-map';
import L from 'leaflet';

const map = document.querySelector('gta-v-map');

// Use a different CRS before the map initializes
map.crs = L.CRS.Simple;

// Or create a custom one
// map.crs = createGtaCRS(); // this is the default
```

## Styling

```css
/* Change water/background color */
gta-v-map {
  --gta-water-color: #0a2a3a;
  display: block;
  width: 100%;
  height: 600px;
}
```
