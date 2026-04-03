# Methods

All methods are called on the `<gta-v-map>` element instance.

## Marker Methods

### `addMarker(marker)`

Add a new marker or update an existing one (upsert). If `marker.id` is provided and already exists, the marker is updated in place.

**Parameters:** `GtaMarker` — `{ x, y, icon, popup?, id?, group? }`

**Returns:** `string` — the marker id

::: code-group
```js [Vanilla]
const map = document.querySelector('gta-v-map');

// Create new marker (auto-generated id)
const id = map.addMarker({
  x: 100, y: 200,
  icon: 1,
  popup: '<b>New marker</b>',
  group: 'Points of Interest',
});

// Upsert — update if id exists, create if not
map.addMarker({
  id: 'hq',
  x: 300, y: 400,
  icon: 2,
  popup: '<b>HQ</b><br>Moves each call',
});
```
```tsx [React]
const { addMarker } = useGtaVMap();

const id = addMarker({
  x: 100, y: 200,
  icon: 1,
  popup: '<b>New</b>',
  group: 'POI',
});
```
```ts [Angular]
@ViewChild('mapEl') mapRef!: ElementRef<GtaVMap>;

addPoint() {
  this.mapRef.nativeElement.addMarker({
    x: 100, y: 200,
    icon: 1,
    popup: '<b>New</b>',
    group: 'POI',
  });
}
```
:::

---

### `removeMarker(id)`

Remove a marker by its id.

**Parameters:** `string` — marker id

**Returns:** `boolean` — `true` if found and removed

::: code-group
```js [Vanilla]
const removed = map.removeMarker('hq');
console.log(removed); // true or false
```
```tsx [React]
const { removeMarker } = useGtaVMap();
removeMarker('hq');
```
```ts [Angular]
this.mapRef.nativeElement.removeMarker('hq');
```
:::

---

### `getMarkers()`

Returns all current markers (both declarative and imperative).

**Returns:** `ReadonlyArray<{ id, x, y, icon, popup?, group }>` — markers without internal Leaflet refs

::: code-group
```js [Vanilla]
const markers = map.getMarkers();
console.log(`${markers.length} markers on the map`);
markers.forEach(m => console.log(m.id, m.x, m.y));
```
```tsx [React]
const { getMarkers } = useGtaVMap();
const all = getMarkers();
```
```ts [Angular]
const markers = this.mapRef.nativeElement.getMarkers();
```
:::

---

### `clearMarkers()`

Remove all markers from the map.

::: code-group
```js [Vanilla]
map.clearMarkers();
```
```tsx [React]
const { clearMarkers } = useGtaVMap();
clearMarkers();
```
```ts [Angular]
this.mapRef.nativeElement.clearMarkers();
```
:::

---

## Shape Methods

### `addShape(shape)`

Add a polyline or polygon. If `shape.id` is provided and already exists, the shape is replaced.

**Parameters:** `GtaShape` — `{ type, points, color?, weight?, opacity?, fillColor?, fillOpacity?, popup?, group?, id?, label? }`

**Returns:** `string` — the shape id

::: code-group
```js [Vanilla]
// Polygon
const zoneId = map.addShape({
  type: 'polygon',
  points: [[-200, -400], [300, -400], [300, 100], [-200, 100]],
  color: '#ff4444',
  fillOpacity: 0.15,
  popup: '<b>Danger Zone</b>',
  group: 'Zones',
  label: { text: 'Danger Zone', color: '#ff4444', fontSize: 14 },
});

// Polyline
const routeId = map.addShape({
  type: 'polyline',
  points: [[0, 0], [500, 500], [1000, 200]],
  color: '#44ff44',
  weight: 4,
  group: 'Routes',
  label: { text: 'Route A', color: '#44ff44' },
});
```
```tsx [React]
const { addShape } = useGtaVMap();

addShape({
  type: 'polygon',
  points: [[-200, -400], [300, -400], [300, 100], [-200, 100]],
  color: '#ff4444',
  fillOpacity: 0.15,
  group: 'Zones',
});
```
```ts [Angular]
this.mapRef.nativeElement.addShape({
  type: 'polygon',
  points: [[-200, -400], [300, -400], [300, 100], [-200, 100]],
  color: '#ff4444',
  fillOpacity: 0.15,
  group: 'Zones',
});
```
:::

---

### `removeShape(id)`

Remove a shape by its id.

**Parameters:** `string` — shape id

**Returns:** `boolean` — `true` if found and removed

::: code-group
```js [Vanilla]
map.removeShape(zoneId);
```
```tsx [React]
const { removeShape } = useGtaVMap();
removeShape(zoneId);
```
```ts [Angular]
this.mapRef.nativeElement.removeShape(zoneId);
```
:::

---

### `getShapes()`

Returns all current shapes.

**Returns:** `ReadonlyArray<{ id, type, points, color, weight, ... }>`

::: code-group
```js [Vanilla]
const shapes = map.getShapes();
```
```tsx [React]
const { ref } = useGtaVMap();
const shapes = ref.current?.getShapes();
```
```ts [Angular]
const shapes = this.mapRef.nativeElement.getShapes();
```
:::

---

### `clearShapes()`

Remove all shapes from the map.

::: code-group
```js [Vanilla]
map.clearShapes();
```
```tsx [React]
const { clearShapes } = useGtaVMap();
clearShapes();
```
```ts [Angular]
this.mapRef.nativeElement.clearShapes();
```
:::
