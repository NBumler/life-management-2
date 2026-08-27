package hu.bumler.lm2.food;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface IdempotencyKeyRepository extends JpaRepository<IdempotencyKeyEntity, UUID> {
}
