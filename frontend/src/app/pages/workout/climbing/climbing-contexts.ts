import { ClimbingDiscipline } from '../../../shared/climbing/grade-scale';

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
  /** Route relative to `/tabs/workout/climbing` (all four wired: M4 indoor boulder, M5 indoor rope, M6 outdoor boulder, M7 outdoor rope). */
  readonly route: string;
  readonly labelKey: string;
  readonly icon: string;
}

export const CLIMBING_CONTEXTS: readonly ClimbingContextDef[] = [
  {
    key: 'indoor-boulder',
    locationType: 'INDOOR',
    discipline: 'BOULDER',
    route: 'indoor-boulder',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.INDOOR_BOULDER',
    icon: 'home-outline',
  },
  {
    key: 'indoor-rope',
    locationType: 'INDOOR',
    discipline: 'ROPE',
    route: 'indoor-rope',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.INDOOR_ROPE',
    icon: 'home-outline',
  },
  {
    key: 'outdoor-boulder',
    locationType: 'OUTDOOR',
    discipline: 'BOULDER',
    route: 'outdoor-boulder',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.OUTDOOR_BOULDER',
    icon: 'earth-outline',
  },
  {
    key: 'outdoor-rope',
    locationType: 'OUTDOOR',
    discipline: 'ROPE',
    route: 'outdoor-rope',
    labelKey: 'WORKOUT.CLIMBING.CONTEXT.OUTDOOR_ROPE',
    icon: 'earth-outline',
  },
];
