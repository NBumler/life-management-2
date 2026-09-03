package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * documentation/Subfeatures/Élelmiszer tárolás.md "Létrehozás — bevásárlásból" — the shopping-list
 * item → storage row split count. Plain JUnit, kept in lockstep with the client's own
 * {@code splitCountFor} spec (shopping-list-complete.spec.ts) so the two stay bit-identical.
 */
class ShoppingListSplitCountTest {

	private static ShoppingListItemEntity foodItem(BigDecimal amount, String unit) {
		ShoppingListItemEntity item = new ShoppingListItemEntity(UUID.randomUUID(), UUID.randomUUID(), "FOOD", 0);
		item.setQuantity(amount, unit);
		return item;
	}

	@Test
	void wholeCsAmountSplitsIntoThatManyRows() {
		assertThat(ShoppingListService.splitCountFor(foodItem(BigDecimal.valueOf(3), "cs"))).isEqualTo(3);
	}

	@Test
	void fractionalCsAmountIsASingleRow() {
		assertThat(ShoppingListService.splitCountFor(foodItem(new BigDecimal("2.5"), "cs"))).isEqualTo(1);
	}

	@Test
	void legacyDbAmountRoundsUpToWholePackages() {
		assertThat(ShoppingListService.splitCountFor(foodItem(BigDecimal.valueOf(2), "db"))).isEqualTo(2);
		assertThat(ShoppingListService.splitCountFor(foodItem(new BigDecimal("2.1"), "db"))).isEqualTo(3);
	}

	@Test
	void anyOtherUnitIsASingleRow() {
		assertThat(ShoppingListService.splitCountFor(foodItem(BigDecimal.valueOf(5), "kg"))).isEqualTo(1);
	}

	@Test
	void nullAmountIsASingleRow() {
		assertThat(ShoppingListService.splitCountFor(foodItem(null, "cs"))).isEqualTo(1);
	}

	@Test
	void absurdAmountIsClampedToMaxSplitRows_notAnArithmeticException() {
		assertThat(ShoppingListService.splitCountFor(foodItem(new BigDecimal("5000000"), "cs")))
				.isEqualTo(ShoppingListService.MAX_SPLIT_ROWS);
		assertThat(ShoppingListService.splitCountFor(foodItem(new BigDecimal("5000000.4"), "db")))
				.isEqualTo(ShoppingListService.MAX_SPLIT_ROWS);
		// Beyond int range entirely — intValueExact() would have thrown here.
		assertThat(ShoppingListService.splitCountFor(foodItem(new BigDecimal("9999999999"), "cs")))
				.isEqualTo(ShoppingListService.MAX_SPLIT_ROWS);
	}
}
