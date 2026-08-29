package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface AscentAttemptRepository extends JpaRepository<AscentAttemptEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see ClimbingSession.yaml. */
	List<AscentAttemptEntity> findBySessionId(UUID sessionId);

	List<AscentAttemptEntity> findBySessionIdAndDeletedFalse(UUID sessionId);

	/** Batch form of {@link #findBySessionId} — list()/ClimbingSessionSyncDataLoader group the result by sessionId. */
	List<AscentAttemptEntity> findBySessionIdIn(Collection<UUID> sessionIds);
}
