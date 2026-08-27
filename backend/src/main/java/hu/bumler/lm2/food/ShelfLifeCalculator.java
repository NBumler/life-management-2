package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * documentation/Subfeatures/Bevásárlás teljesítve.md — server-side port of
 * frontend/src/app/pages/food/storage/shelf-life.ts, needed only for this endpoint's expiry-date
 * default-computation fallback (the client's own wizard normally already sends an explicit date,
 * computed via that same frontend file). Keep the two in sync by hand — this isn't a shared
 * fixture-tested concern like Quantity/Name normalization, just a small, rarely-hit calendar
 * calculation. Storage locations are represented as the raw `StoredFood.storageLocation` strings
 * (`ROOM`/`FRIDGE`/`FREEZER`) rather than an enum type, since callers ultimately hand them straight
 * to `StoredFoodEntity.setStorageLocation(String)` either way.
 */
final class ShelfLifeCalculator {

	private ShelfLifeCalculator() {
	}

	/**
	 * Naptári hónap/év-hozzáadás, hónap-hossz clamp-eléssel (nem roll-over) — pl. jan 31 + 1 hónap =
	 * feb 28/29. {@code perc}/{@code óra} floor down to whole days; {@code nap}/{@code hét} are flat
	 * day addition.
	 */
	static LocalDate addDurationToDate(LocalDate date, BigDecimal amount, String unit) {
		return switch (unit) {
			case "perc" -> date.plusDays(amount.longValue() / 1440);
			case "óra" -> date.plusDays(amount.longValue() / 24);
			case "nap" -> date.plusDays(amount.longValue());
			case "hét" -> date.plusDays(amount.longValue() * 7);
			case "hó" -> addCalendarMonths(date, amount.longValue());
			case "év" -> addCalendarMonths(date, amount.longValue() * 12);
			default -> throw new IllegalArgumentException("Unknown duration unit: " + unit);
		};
	}

	private static LocalDate addCalendarMonths(LocalDate date, long months) {
		YearMonth targetMonth = YearMonth.from(date).plusMonths(months);
		int clampedDay = Math.min(date.getDayOfMonth(), targetMonth.lengthOfMonth());
		return targetMonth.atDay(clampedDay);
	}

	/** documentation/Subfeatures/Élelmiszer tárolás.md "Tárolási hely": engedélyezett = katalógusban kitöltött idő; ha egyik sincs kitöltve, mindhárom választható. */
	static List<String> allowedStorageLocations(FoodEntity food) {
		List<String> allowed = new ArrayList<>();
		if (food.getShelfRoomAmount() != null) {
			allowed.add("ROOM");
		}
		if (food.getShelfFridgeAmount() != null) {
			allowed.add("FRIDGE");
		}
		if (food.getShelfFreezerAmount() != null) {
			allowed.add("FREEZER");
		}
		return allowed.isEmpty() ? List.of("ROOM", "FRIDGE", "FREEZER") : allowed;
	}

	/** Per-location catalog shelf-life duration lookup; either element is {@code null} when the catalog has no duration for that location. */
	static BigDecimal catalogDurationAmount(FoodEntity food, String location) {
		return switch (location) {
			case "ROOM" -> food.getShelfRoomAmount();
			case "FRIDGE" -> food.getShelfFridgeAmount();
			case "FREEZER" -> food.getShelfFreezerAmount();
			default -> throw new IllegalArgumentException("Unknown storage location: " + location);
		};
	}

	static String catalogDurationUnit(FoodEntity food, String location) {
		return switch (location) {
			case "ROOM" -> food.getShelfRoomUnit();
			case "FRIDGE" -> food.getShelfFridgeUnit();
			case "FREEZER" -> food.getShelfFreezerUnit();
			default -> throw new IllegalArgumentException("Unknown storage location: " + location);
		};
	}
}
