package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a ClimbingSession (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class AscentAttemptSyncDataLoader implements SyncedEntityDataLoader {

	private final AscentAttemptRepository repository;
	private final PitchLogRepository pitchRepository;
	private final AscentAttemptMapper mapper;
	private final PitchLogMapper pitchMapper;

	AscentAttemptSyncDataLoader(AscentAttemptRepository repository, PitchLogRepository pitchRepository,
			AscentAttemptMapper mapper, PitchLogMapper pitchMapper) {
		this.repository = repository;
		this.pitchRepository = pitchRepository;
		this.mapper = mapper;
		this.pitchMapper = pitchMapper;
	}

	@Override
	public String entityType() {
		return "AscentAttempt";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<AscentAttemptEntity> attempts = repository.findAllById(ids);
		Map<UUID, List<PitchLogEntity>> pitchesByAttempt = pitchRepository
				.findByAttemptIdIn(attempts.stream().map(AscentAttemptEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(PitchLogEntity::getAttemptId));
		return attempts.stream().collect(Collectors.toMap(AscentAttemptEntity::getId, attempt -> mapper.toDto(attempt,
				pitchesByAttempt.getOrDefault(attempt.getId(), List.of()).stream().map(pitchMapper::toDto).toList())));
	}
}
