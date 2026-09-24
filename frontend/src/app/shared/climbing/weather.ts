import { ClimbingSession } from '../../api/model/climbingSession';

export type WeatherTag = ClimbingSession.WeatherConditionsEnum;

/**
 * backlog/119 — the atomic outdoor weather tags in their canonical (display + storage) order:
 * temperature, humidity, wind / rain, rock, sun. Any combination is valid — conditions change during a
 * long multi-pitch day, so contradicting tags (HOT + COLD) are allowed on purpose.
 */
export const WEATHER_TAGS: readonly WeatherTag[] = [
  ClimbingSession.WeatherConditionsEnum.Hot,
  ClimbingSession.WeatherConditionsEnum.Mild,
  ClimbingSession.WeatherConditionsEnum.Cold,
  ClimbingSession.WeatherConditionsEnum.Dry,
  ClimbingSession.WeatherConditionsEnum.Humid,
  ClimbingSession.WeatherConditionsEnum.Windy,
  ClimbingSession.WeatherConditionsEnum.Rain,
  ClimbingSession.WeatherConditionsEnum.WetRock,
  ClimbingSession.WeatherConditionsEnum.Sunny,
  ClimbingSession.WeatherConditionsEnum.Shade,
];

/** De-duplicated, unknown values dropped, in canonical order — mirrors the server's `canonicalWeather`. */
export function canonicalWeather(tags: readonly string[] | null | undefined): WeatherTag[] {
  const set = new Set<string>(tags ?? []);
  return WEATHER_TAGS.filter((tag) => set.has(tag));
}

/** Adds the tag when absent, removes it when present; the result is canonical. */
export function toggleWeather(tags: readonly WeatherTag[], tag: WeatherTag): WeatherTag[] {
  return tags.includes(tag) ? canonicalWeather(tags.filter((t) => t !== tag)) : canonicalWeather([...tags, tag]);
}

/**
 * The pre-backlog/119 single combined value → its atomic tags (same mapping as the backend's
 * `V45__climbing_session_weather_multi.sql` and the on-device `SCHEMA_V42`): WET became RAIN, not WET_ROCK.
 */
export function legacyWeatherToTags(legacy: unknown): WeatherTag[] {
  switch (legacy) {
    case 'COLD_DRY':
      return [ClimbingSession.WeatherConditionsEnum.Cold, ClimbingSession.WeatherConditionsEnum.Dry];
    case 'HOT_HUMID':
      return [ClimbingSession.WeatherConditionsEnum.Hot, ClimbingSession.WeatherConditionsEnum.Humid];
    case 'WINDY':
      return [ClimbingSession.WeatherConditionsEnum.Windy];
    case 'WET':
      return [ClimbingSession.WeatherConditionsEnum.Rain];
    default:
      return [];
  }
}
