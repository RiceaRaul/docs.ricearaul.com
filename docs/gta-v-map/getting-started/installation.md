# Installation

## npm

```bash
npm install gta-v-map
```

The package bundles all dependencies (Leaflet, Lit, markercluster, heatmap) — no peer dependencies required.

## Import

```js
import 'gta-v-map';
```

This registers the `<gta-v-map>` custom element globally.

## Tile Assets

The component does **not** include map tile images. You need to host them yourself and point to them via the `tile-base-url` attribute.

Expected folder structure:

```
/mapStyles/
  styleSatelite/{z}/{x}/{y}.jpg
  styleAtlas/{z}/{x}/{y}.jpg
  styleGrid/{z}/{x}/{y}.png
/blips/
  1.png
  2.png
  ...
```

## TypeScript

Types are included in the package:

```ts
import type { GtaVMap, GtaMarker, GtaShape, MapClickDetail } from 'gta-v-map';
```

### React JSX Types

The package includes JSX intrinsic element types. They're automatically available when you import from `gta-v-map`:

```tsx
// No extra setup needed
<gta-v-map zoom="3" show-layer-control></gta-v-map>
```
