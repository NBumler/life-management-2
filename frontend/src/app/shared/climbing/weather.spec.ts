import { ClimbingSession } from '../../api/model/climbingSession';
import { WEATHER_TAGS, canonicalWeather, legacyWeatherToTags, toggleWeather } from './weather';

const W = ClimbingSession.WeatherConditionsEnum;

describe('climbing weather tags (backlog/119)', () => {
  it('canonicalWeather de-duplicates, drops unknown values and sorts into canonical order', () => {
    expect(canonicalWeather(['RAIN', 'HOT', 'COLD', 'HOT', 'COLD_DRY'])).toEqual([W.Hot, W.Cold, W.Rain]);
    expect(canonicalWeather(null)).toEqual([]);
  });

  it('toggleWeather adds and removes, allowing contradicting tags together', () => {
    let tags = toggleWeather([], W.Cold);
    tags = toggleWeather(tags, W.Hot);
    expect(tags).toEqual([W.Hot, W.Cold]);
    expect(toggleWeather(tags, W.Hot)).toEqual([W.Cold]);
  });

  it('maps the legacy combined values (WET → RAIN, not WET_ROCK)', () => {
    expect(legacyWeatherToTags('COLD_DRY')).toEqual([W.Cold, W.Dry]);
    expect(legacyWeatherToTags('HOT_HUMID')).toEqual([W.Hot, W.Humid]);
    expect(legacyWeatherToTags('WINDY')).toEqual([W.Windy]);
    expect(legacyWeatherToTags('WET')).toEqual([W.Rain]);
    expect(legacyWeatherToTags(null)).toEqual([]);
  });

  it('lists all 10 tags', () => {
    expect(WEATHER_TAGS.length).toBe(10);
  });
});
