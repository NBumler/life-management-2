package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PackingSessionItemRepository extends JpaRepository<PackingSessionItemEntity, UUID> {

	List<PackingSessionItemEntity> findBySessionId(UUID sessionId);

	List<PackingSessionItemEntity> findBySessionIdAndDeletedFalse(UUID sessionId);

	Optional<PackingSessionItemEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Subfeatures/Pakolás.md — same-gear-once-per-session pre-check for the "extra item" add. */
	Optional<PackingSessionItemEntity> findBySessionIdAndGearItemIdAndDeletedFalse(UUID sessionId, UUID gearItemId);

	/** documentation/Subfeatures/Eszközök.md — GearItem delete cascade. */
	List<PackingSessionItemEntity> findByGearItemIdAndUserIdAndDeletedFalse(UUID gearItemId, UUID userId);
}
