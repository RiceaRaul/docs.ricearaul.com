# React

Web components work in React, but need a `ref` for the imperative API. We provide a `useGtaVMap` hook to make this ergonomic.

## Setup

```bash
npm install gta-v-map
```

```tsx
import 'gta-v-map';
```

JSX types for `<gta-v-map>` are included automatically.

## Basic Usage

```tsx
import 'gta-v-map';

function MapPage() {
  const markers = JSON.stringify([
    { x: 0, y: 0, icon: 1, popup: '<b>Spawn</b>', group: 'Spawns' },
  ]);

  return (
    <gta-v-map
      zoom="3"
      default-style="satellite"
      tile-base-url="/mapStyles"
      blips-url="/blips"
      show-layer-control
      markers={markers}
      style={{ display: 'block', width: '100%', height: '100vh' }}
    />
  );
}
```

::: warning
React passes `markers` and `shapes` as **string properties**, not HTML attributes. The component handles both formats automatically.
:::

## useGtaVMap Hook

For the imperative API, use a ref-based hook:

```tsx
import { useRef, useCallback } from 'react';
import type { GtaVMap, GtaMarker, GtaShape } from 'gta-v-map';
import 'gta-v-map';

function useGtaVMap() {
  const ref = useRef<GtaVMap>(null);

  const addMarker = useCallback((marker: GtaMarker) => {
    return ref.current?.addMarker(marker);
  }, []);

  const removeMarker = useCallback((id: string) => {
    return ref.current?.removeMarker(id) ?? false;
  }, []);

  const clearMarkers = useCallback(() => {
    ref.current?.clearMarkers();
  }, []);

  const getMarkers = useCallback(() => {
    return ref.current?.getMarkers() ?? [];
  }, []);

  const addShape = useCallback((shape: GtaShape) => {
    return ref.current?.addShape(shape);
  }, []);

  const removeShape = useCallback((id: string) => {
    return ref.current?.removeShape(id) ?? false;
  }, []);

  const clearShapes = useCallback(() => {
    ref.current?.clearShapes();
  }, []);

  return { ref, addMarker, removeMarker, clearMarkers, getMarkers, addShape, removeShape, clearShapes };
}
```

## useMapEvent Hook

Listen to custom events on the map element:

```tsx
import { useEffect } from 'react';
import type { GtaVMap } from 'gta-v-map';

function useMapEvent<T>(
  ref: React.RefObject<GtaVMap | null>,
  eventName: string,
  handler: (detail: T) => void,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const listener = (e: Event) => {
      handler((e as CustomEvent<T>).detail);
    };

    el.addEventListener(eventName, listener);
    return () => el.removeEventListener(eventName, listener);
  }, [ref, eventName, handler]);
}
```

## Full Example

```tsx
import { useState, useCallback } from 'react';
import type { MapClickDetail, MarkerPlacedDetail } from 'gta-v-map';

function App() {
  const { ref, addMarker, clearMarkers, addShape, clearShapes } = useGtaVMap();
  const [placeMode, setPlaceMode] = useState(false);

  // Log clicks
  useMapEvent<MapClickDetail>(ref, 'map-click', useCallback((detail) => {
    console.log(`Clicked: ${detail.x}, ${detail.y}`);
  }, []));

  // Auto-place markers
  useMapEvent<MarkerPlacedDetail>(ref, 'marker-placed', useCallback((detail) => {
    addMarker({
      ...detail,
      icon: 1,
      popup: `<b>Placed</b><br>${detail.x.toFixed(0)}, ${detail.y.toFixed(0)}`,
    });
  }, [addMarker]));

  // Sync place mode to element
  useEffect(() => {
    if (ref.current) ref.current.placeMode = placeMode;
  }, [placeMode, ref]);

  const markers = JSON.stringify([
    { x: 0, y: 0, icon: 1, popup: '<b>Spawn</b>', group: 'Spawns' },
  ]);

  return (
    <div style={{ height: '100vh' }}>
      <gta-v-map
        ref={ref}
        zoom="3"
        tile-base-url="/mapStyles"
        blips-url="/blips"
        show-layer-control
        markers={markers}
        style={{ display: 'block', width: '100%', height: '80vh' }}
      />
      <div>
        <button onClick={() => addMarker({ x: Math.random() * 2000, y: Math.random() * 2000, icon: 1 })}>
          Add Random
        </button>
        <button onClick={clearMarkers}>Clear All</button>
        <button onClick={() => setPlaceMode(p => !p)}>
          {placeMode ? 'Place Mode: ON' : 'Place Mode: OFF'}
        </button>
      </div>
    </div>
  );
}
```

## Heatmap Toggle

```tsx
const [heatmap, setHeatmap] = useState(false);

useEffect(() => {
  if (ref.current) ref.current.showHeatmap = heatmap;
}, [heatmap, ref]);

<button onClick={() => setHeatmap(h => !h)}>Toggle Heatmap</button>
```
