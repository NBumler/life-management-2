package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** Mirrors frontend/src/app/pages/food/storage/shelf-life.ts's own worked examples — keep both in sync by hand. */
class ShelfLifeCalculatorTest {

	@Test
	void addDurationToDate_clampsToMonthEnd_insteadOfRollingOver() {
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2027, 1, 31), BigDecimal.ONE, "hó")).isEqualTo(LocalDate.of(2027, 2, 28));
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2028, 1, 31), BigDecimal.ONE, "hó")).isEqualTo(LocalDate.of(2028, 2, 29));
	}

	@Test
	void addDurationToDate_flatDayAdditionFor_napAndHet() {
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2026, 1, 1), BigDecimal.valueOf(5), "nap")).isEqualTo(LocalDate.of(2026, 1, 6));
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2026, 1, 1), BigDecimal.valueOf(2), "hét")).isEqualTo(LocalDate.of(2026, 1, 15));
	}

	@Test
	void addDurationToDate_calendarYearAddition() {
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2026, 3, 10), BigDecimal.ONE, "év")).isEqualTo(LocalDate.of(2027, 3, 10));
	}

	@Test
	void addDurationToDate_flooredDaysFor_percAndOra() {
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2026, 1, 1), BigDecimal.valueOf(1500), "perc")).isEqualTo(LocalDate.of(2026, 1, 2));
		assertThat(ShelfLifeCalculator.addDurationToDate(LocalDate.of(2026, 1, 1), BigDecimal.valueOf(30), "óra")).isEqualTo(LocalDate.of(2026, 1, 2));
	}

	@Test
	void allowedStorageLocations_returnsOnlyConfiguredLocations() {
		FoodEntity food = new FoodEntity(UUID.randomUUID());
		food.setShelfFridge(BigDecimal.TEN, "nap");

		assertThat(ShelfLifeCalculator.allowedStorageLocations(food)).containsExactly("FRIDGE");
	}

	@Test
	void allowedStorageLocations_fallsBackToAllThree_whenNoneConfigured() {
		FoodEntity food = new FoodEntity(UUID.randomUUID());

		assertThat(ShelfLifeCalculator.allowedStorageLocations(food)).containsExactly("ROOM", "FRIDGE", "FREEZER");
	}

	@Test
	void catalogDurationLookup_perLocation() {
		FoodEntity food = new FoodEntity(UUID.randomUUID());
		food.setShelfFreezer(BigDecimal.valueOf(6), "hó");

		assertThat(ShelfLifeCalculator.catalogDurationAmount(food, "FREEZER")).isEqualByComparingTo(BigDecimal.valueOf(6));
		assertThat(ShelfLifeCalculator.catalogDurationUnit(food, "FREEZER")).isEqualTo("hó");
		assertThat(ShelfLifeCalculator.catalogDurationAmount(food, "ROOM")).isNull();
	}
}
