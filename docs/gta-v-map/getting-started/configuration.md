# Configuration

All configuration is done via HTML attributes or JavaScript properties.

## Tile Configuration

| Attribute | Type | Default | Description |
|---|---|---|---|
| `tile-base-url` | `string` | `'mapStyles'` | Base path for tile folders |
| `satellite-url` | `string` | — | Override URL template for satellite tiles |
| `atlas-url` | `string` | — | Override URL template for atlas tiles |
| `grid-url` | `string` | — | Override URL template for grid tiles |

### Style Previews

<table>
  <thead>
    <tr>
      <th style="text-align:center">Satellite</th>
      <th style="text-align:center">Atlas</th>
      <th style="text-align:center">Grid</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><img src="/gta-v-map/sattelite.png" alt="Satellite"></td>
      <td><img src="/gta-v-map/atlas.png" alt="Atlas"></td>
      <td><img src="/gta-v-map/grid.png" alt="Grid"></td>
    </tr>
  </tbody>
</table>

Individual tile URLs take priority over `tile-base-url`. Example:

```html
<!-- Uses base URL for all styles -->
<gta-v-map tile-base-url="/assets/tiles"></gta-v-map>

<!-- Override satellite only, others use base -->
<gta-v-map
  tile-base-url="/assets/tiles"
  satellite-url="https://cdn.example.com/sat/{z}/{x}/{y}.jpg"
></gta-v-map>
```

## Map Configuration

| Attribute | Type | Default | Description |
|---|---|---|---|
| `default-style` | `'satellite' \| 'atlas' \| 'grid'` | `'satellite'` | Initial tile style |
| `zoom` | `number` | `3` | Initial zoom level |
| `min-zoom` | `number` | `1` | Minimum zoom level |
| `max-zoom` | `number` | `5` | Maximum zoom level |
| `max-bounds` | `[[number,number],[number,number]]` | `[[-4000,-5500],[8000,6000]]` | Pan bounds (GTA V coordinates) |
| `max-bounds-viscosity` | `number` | `1` | How hard bounds resist panning (0-1) |
| `leaflet-css-url` | `string` | Leaflet CDN | URL for Leaflet CSS |

## Feature Toggles

| Attribute | Type | Default | Description |
|---|---|---|---|
| `show-layer-control` | `boolean` | `false` | Show tile/layer switcher |
| `show-heatmap` | `boolean` | `false` | Show heatmap layer |
| `disable-clustering` | `boolean` | `false` | Disable marker clustering |
| `place-mode` | `boolean` | `false` | Enable click-to-place mode |

## Icon Configuration

| Attribute | Type | Default | Description |
|---|---|---|---|
| `blips-url` | `string` | `'blips'` | Base path for marker icon images |

Icons are loaded as `{blips-url}/{icon-number}.png`.

## Custom CRS

The CRS can only be set via JavaScript (not an attribute). It's read once at initialization.

```js
import L from 'leaflet';

const map = document.querySelector('gta-v-map');
map.crs = L.CRS.EPSG3857; // or any custom CRS
```

Default: GTA V custom CRS (included in the package as `createGtaCRS()`).

## CSS Custom Properties

| Property | Default | Description |
|---|---|---|
| `--gta-water-color` | `#1a3a4a` | Background color for empty/ocean areas |

```css
gta-v-map {
  --gta-water-color: #0a2a3a;
}
```
