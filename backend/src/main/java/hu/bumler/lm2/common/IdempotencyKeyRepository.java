package hu.bumler.lm2.common;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * documentation/Architektúra/Backend.md "Idempotencia" — shared across features; any atomic endpoint
 * that needs replay protection depends on this from its own feature package.
 */
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKeyEntity, UUID> {

	/**
	 * Bulk-deletes rows past the 30-day retention window ({@link IdempotencyKeyPruneJob}). A single
	 * JPQL {@code DELETE} rather than a derived {@code deleteBy…} (which would load each entity first);
	 * the caller supplies the transaction.
	 */
	@Modifying
	@Query("DELETE FROM IdempotencyKeyEntity k WHERE k.createdAt < :cutoff")
	int deleteByCreatedAtBefore(@Param("cutoff") OffsetDateTime cutoff);
}
