package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PitchLogRepository extends JpaRepository<PitchLogEntity, UUID> {

	/** All rows (live and tombstoned) for one attempt — the nested response needs both. */
	List<PitchLogEntity> findByAttemptId(UUID attemptId);

	/** Batch form of {@link #findByAttemptId} — grouped by attemptId by the caller. */
	List<PitchLogEntity> findByAttemptIdIn(Collection<UUID> attemptIds);
}
