package hu.bumler.lm2.common;

import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

import org.junit.jupiter.api.Test;

import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NestedChildResolverTest {

	private static final class Child {
		private final UUID id;
		private boolean deleted;

		Child(UUID id, boolean deleted) {
			this.id = id;
			this.deleted = deleted;
		}
	}

	private static final Function<Child, UUID> ID_OF = child -> child.id;
	private static final Predicate<Child> IS_DELETED = child -> child.deleted;
	private static final Consumer<Child> UNDELETE = child -> child.deleted = false;

	@Test
	void returnsExistingLiveChild_unchanged() {
		UUID id = UUID.randomUUID();
		Child existing = new Child(id, false);

		Child resolved = NestedChildResolver.resolve(id, List.of(existing), ID_OF, IS_DELETED, UNDELETE, unused -> false,
				() -> new Child(id, false), "not found");

		assertThat(resolved).isSameAs(existing);
		assertThat(resolved.deleted).isFalse();
	}

	@Test
	void revivesExistingTombstonedChild_insteadOfLeavingItDeleted() {
		UUID id = UUID.randomUUID();
		Child tombstoned = new Child(id, true);

		Child resolved = NestedChildResolver.resolve(id, List.of(tombstoned), ID_OF, IS_DELETED, UNDELETE, unused -> false,
				() -> new Child(id, false), "not found");

		assertThat(resolved).isSameAs(tombstoned);
		assertThat(resolved.deleted).isFalse();
	}

	@Test
	void createsNewChild_whenIdIsUnknownEverywhere() {
		UUID id = UUID.randomUUID();
		Supplier<Child> factory = () -> new Child(id, false);

		Child resolved = NestedChildResolver.resolve(id, List.of(), ID_OF, IS_DELETED, UNDELETE, unused -> false, factory, "not found");

		assertThat(resolved.id).isEqualTo(id);
	}

	@Test
	void rejectsId_thatExistsElsewhere_insteadOfHijackingItViaFactory() {
		UUID id = UUID.randomUUID();

		assertThatThrownBy(() -> NestedChildResolver.resolve(id, List.of(), ID_OF, IS_DELETED, UNDELETE, unused -> true,
				() -> new Child(id, false), "no such child")).isInstanceOf(EntityNotFoundException.class).hasMessage("no such child");
	}
}
