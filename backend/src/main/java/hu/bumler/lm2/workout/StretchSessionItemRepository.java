package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface StretchSessionItemRepository extends JpaRepository<StretchSessionItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see StretchSession.yaml. */
	List<StretchSessionItemEntity> findBySessionId(UUID sessionId);

	List<StretchSessionItemEntity> findBySessionIdAndDeletedFalse(UUID sessionId);

	List<StretchSessionItemEntity> findBySessionIdIn(Collection<UUID> sessionIds);
}
