import type { map as demap } from '../de/map';

export const map: Record<keyof typeof demap, string> = {
  'map.view.aria': 'Map',
  'map.view.loadError': 'Could not load the map image.',
  'map.view.transferring': 'Transferring map … {pct}%',
  'map.view.loading': 'Loading map …',
  'map.view.noMap': 'No map',
  'map.view.measure.one': '{cells} square · {units} {unit}',
  'map.view.measure.other': '{cells} squares · {units} {unit}',
  'map.view.ghost.one': '{label} · {cells} square',
  'map.view.ghost.other': '{label} · {cells} squares',
};
