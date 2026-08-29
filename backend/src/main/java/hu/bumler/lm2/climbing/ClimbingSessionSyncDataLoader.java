package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class ClimbingSessionSyncDataLoader implements SyncedEntityDataLoader {

	private final ClimbingSessionRepository repository;
	private final AscentAttemptRepository attemptRepository;
	private final PitchLogRepository pitchRepository;
	private final ClimbingSessionMapper mapper;
	private final AscentAttemptMapper attemptMapper;
	private final PitchLogMapper pitchMapper;

	ClimbingSessionSyncDataLoader(ClimbingSessionRepository repository, AscentAttemptRepository attemptRepository,
			PitchLogRepository pitchRepository, ClimbingSessionMapper mapper, AscentAttemptMapper attemptMapper,
			PitchLogMapper pitchMapper) {
		this.repository = repository;
		this.attemptRepository = attemptRepository;
		this.pitchRepository = pitchRepository;
		this.mapper = mapper;
		this.attemptMapper = attemptMapper;
		this.pitchMapper = pitchMapper;
	}

	@Override
	public String entityType() {
		return "ClimbingSession";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<ClimbingSessionEntity> sessions = repository.findAllById(ids);
		Map<UUID, List<AscentAttemptEntity>> attemptsBySession = attemptRepository
				.findBySessionIdIn(sessions.stream().map(ClimbingSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(AscentAttemptEntity::getSessionId));
		Map<UUID, List<PitchLogEntity>> pitchesByAttempt = pitchRepository
				.findByAttemptIdIn(attemptsBySession.values().stream().flatMap(List::stream)
						.map(AscentAttemptEntity::getId).toList())
				.stream().collect(Collectors.groupingBy(PitchLogEntity::getAttemptId));
		return sessions.stream().collect(Collectors.toMap(ClimbingSessionEntity::getId, session -> mapper.toDto(session,
				attemptsBySession.getOrDefault(session.getId(), List.of()).stream()
						.map(attempt -> attemptMapper.toDto(attempt, pitchesByAttempt.getOrDefault(attempt.getId(), List.of())
								.stream().map(pitchMapper::toDto).toList()))
						.toList())));
	}
}
