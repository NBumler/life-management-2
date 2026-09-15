package hu.bumler.lm2.tura;

import java.util.List;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.HikeRouteDay;

/**
 * backlog/tura-utvonaltervezo/103-... 2.4/2.5 fázis — a napi bontás nem önálló entitás, hanem a
 * generált {@link HikeRouteDay} DTO-t magát tároljuk pre-szerializált JSON-ként (ld.
 * HikeRouteEntity.daysJson és CuratedRouteEntity.daysJson), ugyanazzal az ObjectMapper-rel, ami a
 * HTTP kérés/válasz testet is (de)szerializálja — a JsonNullable mezők (overnightName, a napi
 * metrikák) így ugyanúgy viselkednek oda-vissza. Közös a HikeRoute és a CuratedRoute mapperek közt.
 */
final class HikeRouteDayJson {

	private HikeRouteDayJson() {
	}

	static List<HikeRouteDay> toDays(ObjectMapper objectMapper, String json) {
		if (json == null) {
			return null;
		}
		try {
			return objectMapper.readValue(json, new TypeReference<List<HikeRouteDay>>() {
			});
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Corrupt hike route days JSON", e);
		}
	}

	/** Null bemenetre (egynapos túra) null-t ad vissza, nem üres tömböt. */
	static String flatten(ObjectMapper objectMapper, List<HikeRouteDay> days) {
		if (days == null || days.isEmpty()) {
			return null;
		}
		try {
			return objectMapper.writeValueAsString(days);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Could not serialize hike route days", e);
		}
	}
}
