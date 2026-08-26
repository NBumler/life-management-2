package hu.bumler.lm2.common;

import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;
import java.util.function.Supplier;

import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Architektúra/Backend.md "Nested aggregate PUT": shared resolve-or-create step for a
 * tree child row addressed by a client-supplied id (RecipeService.resolveIngredient /
 * PackingTemplateService.resolveItem). An id absent from {@code existing} may still exist elsewhere
 * in the table (another parent, another owner) — since these child entities have a manually-assigned
 * {@code @Id}, {@code JpaRepository.save()} always {@code merge()}s, which would silently hijack that
 * foreign row's parent/owner if a "new" entity were blindly built around its id; reject instead, since
 * a genuinely new child's client-generated UUID never collides. A found-but-tombstoned row
 * (soft-deleted on an earlier save, now reappearing in the incoming live list) is revived rather than
 * left deleted underneath a live parent.
 */
public final class NestedChildResolver {

	private NestedChildResolver() {
	}

	public static <T> T resolve(UUID childId, List<T> existing, Function<T, UUID> idOf, Predicate<T> isDeleted, Consumer<T> undelete,
			Predicate<UUID> existsElsewhere, Supplier<T> factory, String notFoundMessage) {
		for (T candidate : existing) {
			if (idOf.apply(candidate).equals(childId)) {
				if (isDeleted.test(candidate)) {
					undelete.accept(candidate);
				}
				return candidate;
			}
		}
		if (existsElsewhere.test(childId)) {
			throw new EntityNotFoundException(notFoundMessage);
		}
		return factory.get();
	}
}
