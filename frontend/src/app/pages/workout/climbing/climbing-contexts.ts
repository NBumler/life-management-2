import { ClimbingDiscipline } from './grade-scale';

/**
 * documentation/Features/Mászónapló.md "Dashboard (Hub)" — the 4 dashboard entry points
 * (Indoor/Outdoor × Boulder/Kötél). The context comes from the tile the user taps, NOT from a
 * selector inside a shared form (`locationType` + `discipline` are dashboard discriminators). This
 * const is the single source those tiles, the later per-context log flows (M4–M7) and the stats
 * screen (M8) all resolve against — the climbing analogue of `WORKOUT_SECTIONS`.
 */
export type ClimbingLocationType = 'INDOOR' | 'OUTDOOR';

export type ClimbingContextKey = 'indoor-boulder' | 'indoor-rope' | 'outdoor-boulder' | 'outdoor-rope';

export interface ClimbingContextDef {
  readonly key: ClimbingContextKey;
  readonly locationType: ClimbingLocationType;
  readonly discipline: ClimbingDiscipline;
  /** Route relative to `/tabs/workout/climbing` (added per-context by M4–M7). */
  readonly route: string;
  readonly labelKey: string;
  readonly icon: string;
  /** Whether the per-context napló route exists yet — M4–M6 wire the two indoor tiles + `outdoor-boulder`; the hub shows the rest as disabled tiles. */
  readonly wired: boolean;
}

export const CLIMBING_CONTEXTS: readonly ClimbingContextDef[] = [
  {
    key: 'indoor-boulder',
    locationType: 'INDOOR',
    discipline: 'BOULDER',
    route: 'indoor-boulder',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.INDOOR_BOULDER',
    icon: 'home-outline',
    wired: true,
  },
  {
    key: 'indoor-rope',
    locationType: 'INDOOR',
    discipline: 'ROPE',
    route: 'indoor-rope',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.INDOOR_ROPE',
    icon: 'home-outline',
    wired: true,
  },
  {
    key: 'outdoor-boulder',
    locationType: 'OUTDOOR',
    discipline: 'BOULDER',
    route: 'outdoor-boulder',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.OUTDOOR_BOULDER',
    icon: 'earth-outline',
    wired: true,
  },
  {
    key: 'outdoor-rope',
    locationType: 'OUTDOOR',
    discipline: 'ROPE',
    route: 'outdoor-rope',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.OUTDOOR_ROPE',
    icon: 'earth-outline',
    wired: false,
  },
];
