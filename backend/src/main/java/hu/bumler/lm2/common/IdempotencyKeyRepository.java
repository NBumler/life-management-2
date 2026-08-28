package hu.bumler.lm2.common;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * documentation/Architektúra/Backend.md "Idempotencia" — shared across features; any atomic endpoint
 * that needs replay protection depends on this from its own feature package.
 */
public interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKeyEntity, UUID> {
}
