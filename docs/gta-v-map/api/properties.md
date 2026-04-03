# Properties & Attributes

## Declarative Data

### `markers`

An array of markers to render on the map.

**Type:** `GtaMarker[]`

```ts
interface GtaMarker {
  x: number;
  y: number;
  icon: number;
  popup?: string;     // plain text or HTML
  id?: string;        // optional, for upsert
  group?: string;     // layer group name, default "Markers"
}
```

**HTML (JSON string):**
```html
<gta-v-map markers='[
  {"x": 0, "y": 0, "icon": 1, "popup": "<b>Hello</b>", "group": "Spawns"},
  {"x": 500, "y": 500, "icon": 2, "popup": "Shop", "group": "Shops"}
]'></gta-v-map>
```

**JavaScript (array):**
```js
const map = document.querySelector('gta-v-map');
map.markers = [
  { x: 0, y: 0, icon: 1, popup: '<b>Hello</b>', group: 'Spawns' },
];
```

---

### `shapes`

An array of polylines/polygons to render on the map.

**Type:** `GtaShape[]`

```ts
interface GtaShape {
  type: 'polyline' | 'polygon';
  points: [number, number][];
  color?: string;          // default '#3388ff'
  weight?: number;         // default 3
  opacity?: number;        // default 1
  fillColor?: string;      // default same as color
  fillOpacity?: number;    // default 0.2
  popup?: string;          // HTML popup on click
  group?: string;          // layer group, default "Shapes"
  id?: string;             // optional, for upsert
  label?: {
    text: string;
    className?: string;
    fontSize?: number;     // default 12
    color?: string;        // default '#fff'
  };
}
```

**Example:**
```html
<gta-v-map shapes='[
  {
    "type": "polygon",
    "points": [[-200,-400],[300,-400],[300,100],[-200,100]],
    "color": "#ff4444",
    "fillOpacity": 0.15,
    "group": "Zones",
    "label": {"text": "Danger Zone", "color": "#ff4444"}
  },
  {
    "type": "polyline",
    "points": [[0,0],[500,500],[1000,200]],
    "color": "#44ff44",
    "weight": 4,
    "group": "Routes"
  }
]'></gta-v-map>
```
