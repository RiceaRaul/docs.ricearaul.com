# Angular

Angular has native web component support via `CUSTOM_ELEMENTS_SCHEMA`. No wrapper needed.

## Setup

```bash
npm install gta-v-map
```

Import the component in your `main.ts` or component file:

```ts
import 'gta-v-map';
```

Add `CUSTOM_ELEMENTS_SCHEMA` to your component:

```ts
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  // ...
})
```

## Basic Usage

```ts
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'gta-v-map';

@Component({
  selector: 'app-map',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <gta-v-map
      zoom="3"
      default-style="satellite"
      tile-base-url="/assets/mapStyles"
      blips-url="/assets/blips"
      show-layer-control
      [attr.markers]="markersJson"
    ></gta-v-map>
  `,
  styles: [`
    gta-v-map { display: block; width: 100%; height: 100vh; }
  `],
})
export class MapComponent {
  markersJson = JSON.stringify([
    { x: 0, y: 0, icon: 1, popup: '<b>Spawn</b>', group: 'Spawns' },
  ]);
}
```

::: warning
Use `[attr.markers]` (not `[markers]`) to pass JSON strings as HTML attributes. Angular's property binding would pass the string directly, but the attribute binding triggers Lit's JSON parsing.
:::

## Imperative API via ViewChild

```ts
import { Component, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import 'gta-v-map';
import type { GtaVMap } from 'gta-v-map';

@Component({
  selector: 'app-map',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <gta-v-map #mapEl
      zoom="3"
      tile-base-url="/assets/mapStyles"
      blips-url="/assets/blips"
      show-layer-control
    ></gta-v-map>

    <button (click)="addRandomMarker()">Add Marker</button>
    <button (click)="clearAll()">Clear All</button>
  `,
  styles: [`
    gta-v-map { display: block; width: 100%; height: 80vh; }
  `],
})
export class MapComponent {
  @ViewChild('mapEl') mapRef!: ElementRef<GtaVMap>;

  private get map(): GtaVMap {
    return this.mapRef.nativeElement;
  }

  addRandomMarker() {
    this.map.addMarker({
      x: (Math.random() - 0.5) * 4000,
      y: (Math.random() - 0.5) * 4000,
      icon: 1,
      popup: '<b>Random marker</b>',
      group: 'Dynamic',
    });
  }

  clearAll() {
    this.map.clearMarkers();
  }
}
```

## Events

Angular binds directly to custom events using `(event-name)` syntax:

```ts
@Component({
  template: `
    <gta-v-map #mapEl
      (map-ready)="onMapReady()"
      (map-click)="onMapClick($event)"
      (marker-click)="onMarkerClick($event)"
      (marker-placed)="onMarkerPlaced($event)"
    ></gta-v-map>
  `,
  // ...
})
export class MapComponent {
  @ViewChild('mapEl') mapRef!: ElementRef<GtaVMap>;

  onMapReady() {
    console.log('Map is ready');
  }

  onMapClick(e: Event) {
    const { x, y } = (e as CustomEvent).detail;
    console.log(`Clicked at ${x}, ${y}`);
  }

  onMarkerClick(e: Event) {
    const { id } = (e as CustomEvent).detail;
    console.log(`Marker ${id} clicked`);
  }

  onMarkerPlaced(e: Event) {
    const { x, y } = (e as CustomEvent).detail;
    this.mapRef.nativeElement.addMarker({
      x, y, icon: 1,
      popup: `<b>Placed</b><br>${x.toFixed(0)}, ${y.toFixed(0)}`,
    });
  }
}
```

## Shapes

```ts
@Component({
  template: `
    <gta-v-map #mapEl [attr.shapes]="shapesJson"></gta-v-map>
    <button (click)="addZone()">Add Zone</button>
  `,
  // ...
})
export class MapComponent {
  @ViewChild('mapEl') mapRef!: ElementRef<GtaVMap>;

  shapesJson = JSON.stringify([{
    type: 'polygon',
    points: [[-200, -400], [300, -400], [300, 100], [-200, 100]],
    color: '#ff4444',
    fillOpacity: 0.15,
    group: 'Zones',
    label: { text: 'Danger Zone', color: '#ff4444' },
  }]);

  addZone() {
    const cx = (Math.random() - 0.5) * 2000;
    const cy = (Math.random() - 0.5) * 2000;
    this.mapRef.nativeElement.addShape({
      type: 'polygon',
      points: [[cx - 200, cy - 200], [cx + 200, cy - 200], [cx + 200, cy + 200], [cx - 200, cy + 200]],
      color: '#4444ff',
      fillOpacity: 0.2,
      group: 'Zones',
    });
  }
}
```

## Heatmap & Place Mode

```ts
@Component({
  template: `
    <gta-v-map #mapEl></gta-v-map>
    <button (click)="toggleHeatmap()">Toggle Heatmap</button>
    <button (click)="togglePlaceMode()">Toggle Place Mode</button>
  `,
  // ...
})
export class MapComponent {
  @ViewChild('mapEl') mapRef!: ElementRef<GtaVMap>;

  toggleHeatmap() {
    const map = this.mapRef.nativeElement;
    map.showHeatmap = !map.showHeatmap;
  }

  togglePlaceMode() {
    const map = this.mapRef.nativeElement;
    map.placeMode = !map.placeMode;
  }
}
```

## Tile Assets

Copy your tile assets to Angular's `src/assets/` or `public/` directory, and configure `angular.json`:

```json
{
  "assets": [
    { "glob": "**/*", "input": "public" }
  ]
}
```

Then use `tile-base-url="/mapStyles"` and `blips-url="/blips"`.
