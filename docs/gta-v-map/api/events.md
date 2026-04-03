# Events

All events are `CustomEvent`s with `bubbles: true` and `composed: true`, so they cross Shadow DOM boundaries.

## `map-ready`

Fired when the Leaflet map is initialized and ready.

**Detail:** `{ map: L.Map }`

::: code-group
```js [Vanilla]
map.addEventListener('map-ready', (e) => {
  console.log('Map initialized:', e.detail.map);
});
```
```tsx [React]
import { useMapEvent } from './useGtaVMap';

useMapEvent(ref, 'map-ready', (detail) => {
  console.log('Map initialized');
});
```
```ts [Angular]
// In template:
// <gta-v-map (map-ready)="onMapReady()">

onMapReady() {
  console.log('Map initialized');
}
```
:::

---

## `map-click`

Fired when the user clicks on the map.

**Detail:** `{ x: number, y: number }` — GTA V coordinates

::: code-group
```js [Vanilla]
map.addEventListener('map-click', (e) => {
  console.log(`Clicked at x=${e.detail.x}, y=${e.detail.y}`);
});
```
```tsx [React]
useMapEvent(ref, 'map-click', (detail) => {
  console.log(`Clicked at x=${detail.x}, y=${detail.y}`);
});
```
```ts [Angular]
// <gta-v-map (map-click)="onMapClick($event)">

onMapClick(e: Event) {
  const { x, y } = (e as CustomEvent).detail;
  console.log(`Clicked at x=${x}, y=${y}`);
}
```
:::

---

## `marker-click`

Fired when the user clicks on a marker.

**Detail:** `{ id: string, x: number, y: number, icon: number, popup?: string }`

::: code-group
```js [Vanilla]
map.addEventListener('marker-click', (e) => {
  const { id, x, y } = e.detail;
  console.log(`Marker ${id} clicked at ${x}, ${y}`);
});
```
```tsx [React]
useMapEvent(ref, 'marker-click', (detail) => {
  console.log(`Marker ${detail.id} clicked`);
});
```
```ts [Angular]
// <gta-v-map (marker-click)="onMarkerClick($event)">

onMarkerClick(e: Event) {
  const { id } = (e as CustomEvent).detail;
  console.log(`Marker ${id} clicked`);
}
```
:::

---

## `marker-placed`

Fired when the user clicks on the map while `place-mode` is enabled. Use this to create a marker at the clicked location.

**Detail:** `{ x: number, y: number }` — GTA V coordinates

::: code-group
```js [Vanilla]
map.setAttribute('place-mode', '');

map.addEventListener('marker-placed', (e) => {
  const { x, y } = e.detail;
  map.addMarker({
    x, y,
    icon: 1,
    popup: `<b>Placed</b><br>x: ${x.toFixed(1)}, y: ${y.toFixed(1)}`,
  });
});
```
```tsx [React]
useMapEvent(ref, 'marker-placed', (detail) => {
  addMarker({
    ...detail,
    icon: 1,
    popup: `<b>Placed at ${detail.x.toFixed(1)}, ${detail.y.toFixed(1)}</b>`,
  });
});
```
```ts [Angular]
// <gta-v-map place-mode (marker-placed)="onPlace($event)">

onPlace(e: Event) {
  const { x, y } = (e as CustomEvent).detail;
  this.mapRef.nativeElement.addMarker({
    x, y, icon: 1,
    popup: `<b>Placed</b>`,
  });
}
```
:::
