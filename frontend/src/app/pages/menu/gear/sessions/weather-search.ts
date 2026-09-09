/**
 * documentation/Subfeatures/Pakolás.md — GearCheck weather entry (backlog/086).
 * Builds a plain Google web-search URL for the packing session's destination. No API, no key.
 * The search term is a fixed Hungarian "időjárás" for now (see the ticket's decision log).
 */
export const WEATHER_SEARCH_TERM = 'időjárás';

export function weatherSearchUrl(destination: string): string {
  const query = `${destination.trim()} ${WEATHER_SEARCH_TERM}`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
