package hu.bumler.lm2.food;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

interface ShoppingListRepository extends JpaRepository<ShoppingListEntity, UUID> {

	List<ShoppingListEntity> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId);

	Optional<ShoppingListEntity> findByIdAndUserId(UUID id, UUID userId);

	/**
	 * documentation/Subfeatures/Bevásárlás teljesítve.md "Idempotencia" — {@code complete()} takes a
	 * row-level write lock on the list before it does anything else, so two concurrent completions of
	 * the same list (a double-tap, or an outbox retry racing the original) serialize: the second one
	 * blocks here until the first commits, then sees either the stored idempotency response (same key)
	 * or an already-ARCHIVED list (different key → 409), never a half-applied double completion.
	 */
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT s FROM ShoppingListEntity s WHERE s.id = :id AND s.userId = :userId")
	Optional<ShoppingListEntity> findByIdAndUserIdForUpdate(@Param("id") UUID id, @Param("userId") UUID userId);
}
