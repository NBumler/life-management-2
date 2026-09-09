import { WEATHER_SEARCH_TERM, weatherSearchUrl } from './weather-search';

describe('weatherSearchUrl', () => {
  it('builds a Google web-search URL for "<destination> időjárás"', () => {
    expect(weatherSearchUrl('Magas-Tátra')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('Magas-Tátra időjárás')}`,
    );
  });

  it('trims the destination before appending the search term', () => {
    expect(weatherSearchUrl('  Bükk  ')).toBe(
      `https://www.google.com/search?q=${encodeURIComponent('Bükk időjárás')}`,
    );
  });

  it('percent-encodes spaces and accented characters so the URL is well-formed', () => {
    const url = weatherSearchUrl('Île de Ré');
    expect(url.startsWith('https://www.google.com/search?q=')).toBe(true);
    expect(url).not.toContain(' ');
    expect(decodeURIComponent(url.split('q=')[1])).toBe(`Île de Ré ${WEATHER_SEARCH_TERM}`);
  });
});
