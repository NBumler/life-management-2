package hu.bumler.lm2.climbing;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AscentAttempt;
import hu.bumler.lm2.api.model.ClimbingSession;
import hu.bumler.lm2.api.model.PitchLog;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Features/Mászónapló.md — per-user climbing log. Nested aggregate PUT exactly like
 * {@link hu.bumler.lm2.workout.WorkoutSessionService}, three levels deep: ClimbingSession →
 * AscentAttempt → PitchLog, all committed atomically in one {@code @Transactional} method whose
 * response echoes every row (live or tombstoned). No server-side kcal / volume: those are pure client
 * calculations (documentation/Features/Tápérték kalkulátor.md), so this service only persists — the
 * per-context field rules (which discriminator needs which fields) are enforced client-side.
 */
@Service
class ClimbingSessionService {

	private final ClimbingSessionRepository repository;
	private final AscentAttemptRepository attemptRepository;
	private final PitchLogRepository pitchRepository;
	private final ClimbingSessionMapper mapper;
	private final AscentAttemptMapper attemptMapper;
	private final PitchLogMapper pitchMapper;

	ClimbingSessionService(ClimbingSessionRepository repository, AscentAttemptRepository attemptRepository,
			PitchLogRepository pitchRepository, ClimbingSessionMapper mapper, AscentAttemptMapper attemptMapper,
			PitchLogMapper pitchMapper) {
		this.repository = repository;
		this.attemptRepository = attemptRepository;
		this.pitchRepository = pitchRepository;
		this.mapper = mapper;
		this.attemptMapper = attemptMapper;
		this.pitchMapper = pitchMapper;
	}

	@Transactional(readOnly = true)
	List<ClimbingSession> list(UUID userId) {
		List<ClimbingSessionEntity> sessions = repository.findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(userId);
		Map<UUID, List<AscentAttemptEntity>> attemptsBySession = attemptRepository
				.findBySessionIdIn(sessions.stream().map(ClimbingSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(AscentAttemptEntity::getSessionId));
		Map<UUID, List<PitchLogEntity>> pitchesByAttempt = pitchesByAttemptFor(attemptsBySession.values().stream()
				.flatMap(List::stream).map(AscentAttemptEntity::getId).toList());
		return sessions.stream()
				.map(session -> toDto(session, attemptsBySession.getOrDefault(session.getId(), List.of()), pitchesByAttempt))
				.toList();
	}

	@Transactional(readOnly = true)
	ClimbingSession get(UUID userId, UUID id) {
		ClimbingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such climbing session"));
		return toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). A
	 * tombstoned row is deliberately NOT revived here — same as {@link hu.bumler.lm2.workout.WorkoutSessionService}
	 * and {@link hu.bumler.lm2.food.MealService}: a session is a point-in-time log entry, so a POST
	 * landing on a soft-deleted id re-applies the fields but the tombstone still wins (row-level
	 * last-write-wins). {@code applySessionFields} likewise never reads {@code dto.getDeleted()}.
	 * <p>
	 * Consequence (accepted, matches the two sibling services): the tombstone win does NOT cascade into
	 * the incoming {@code attempts}/{@code pitches} — a POST onto a dead session's id writes its child
	 * rows live under a dead parent. This is a rare path (outbox coalescing on a delete + re-edit race)
	 * with no independent consumer of {@code AscentAttempt}/{@code PitchLog}, and the child rows still
	 * converge by row-level LWW once a later delete cascades. If a future consumer reads attempts
	 * without joining the session's {@code deleted} flag, revisit this across all three services.
	 */
	@Transactional
	ClimbingSession create(UUID userId, ClimbingSession dto) {
		ClimbingSessionEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new ClimbingSessionEntity(dto.getId(), userId));
		return saveTree(entity, dto);
	}

	@Transactional
	ClimbingSession update(UUID userId, UUID id, ClimbingSession dto) {
		ClimbingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such climbing session"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Climbing session already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live attempt and pitch on the session. */
	@Transactional
	ClimbingSession delete(UUID userId, UUID id) {
		ClimbingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such climbing session"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (AscentAttemptEntity attempt : attemptRepository.findBySessionIdAndDeletedFalse(id)) {
				attempt.softDelete();
				attemptRepository.save(attempt);
				softDeleteLivePitches(attempt.getId());
			}
			attemptRepository.flush();
			pitchRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code attempts} list
	 * (and each attempt's {@code pitches}) is the complete desired live tree — presence/absence by id is
	 * the only signal. Rows missing from the incoming list are soft-deleted; the response always lists
	 * every row, live or tombstoned (ClimbingSession.yaml).
	 */
	private ClimbingSession saveTree(ClimbingSessionEntity entity, ClimbingSession dto) {
		applySessionFields(entity, dto);
		repository.saveAndFlush(entity);

		List<AscentAttemptEntity> existingAttempts = attemptRepository.findBySessionId(entity.getId());
		Set<UUID> incomingAttemptIds = new HashSet<>();
		for (AscentAttempt attemptDto : dto.getAttempts()) {
			if (attemptDto.getDeleted()) {
				continue;
			}
			incomingAttemptIds.add(attemptDto.getId());
			AscentAttemptEntity attemptEntity = resolveAttempt(entity.getId(), existingAttempts, attemptDto.getId());
			applyAttemptFields(attemptEntity, attemptDto);
			attemptRepository.save(attemptEntity);
			savePitches(attemptEntity.getId(), attemptDto.getPitches());
		}
		for (AscentAttemptEntity existing : existingAttempts) {
			if (!existing.isDeleted() && !incomingAttemptIds.contains(existing.getId())) {
				existing.softDelete();
				attemptRepository.save(existing);
				softDeleteLivePitches(existing.getId());
			}
		}
		attemptRepository.flush();
		pitchRepository.flush();

		return toDto(entity);
	}

	private void savePitches(UUID attemptId, List<PitchLog> pitchDtos) {
		List<PitchLogEntity> existingPitches = pitchRepository.findByAttemptId(attemptId);
		Set<UUID> incomingPitchIds = new HashSet<>();
		for (PitchLog pitchDto : pitchDtos) {
			if (pitchDto.getDeleted()) {
				continue;
			}
			incomingPitchIds.add(pitchDto.getId());
			PitchLogEntity pitchEntity = resolvePitch(attemptId, existingPitches, pitchDto.getId());
			applyPitchFields(pitchEntity, pitchDto);
			pitchRepository.save(pitchEntity);
		}
		for (PitchLogEntity existing : existingPitches) {
			if (!existing.isDeleted() && !incomingPitchIds.contains(existing.getId())) {
				existing.softDelete();
				pitchRepository.save(existing);
			}
		}
	}

	private void softDeleteLivePitches(UUID attemptId) {
		for (PitchLogEntity pitch : pitchRepository.findByAttemptId(attemptId)) {
			if (!pitch.isDeleted()) {
				pitch.softDelete();
				pitchRepository.save(pitch);
			}
		}
	}

	/** See {@link NestedChildResolver} — shared with WorkoutSessionService.resolveExercise / RecipeService.resolveIngredient. */
	private AscentAttemptEntity resolveAttempt(UUID sessionId, List<AscentAttemptEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, AscentAttemptEntity::getId, AscentAttemptEntity::isDeleted,
				AscentAttemptEntity::undelete, attemptRepository::existsById,
				() -> new AscentAttemptEntity(id, sessionId), "No such ascent attempt");
	}

	private PitchLogEntity resolvePitch(UUID attemptId, List<PitchLogEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, PitchLogEntity::getId, PitchLogEntity::isDeleted,
				PitchLogEntity::undelete, pitchRepository::existsById,
				() -> new PitchLogEntity(id, attemptId), "No such pitch log");
	}

	private void applySessionFields(ClimbingSessionEntity entity, ClimbingSession dto) {
		entity.setDate(dto.getDate());
		entity.setLocationType(dto.getLocationType().getValue());
		entity.setDiscipline(dto.getDiscipline().getValue());
		entity.setTotalSessionDurationMinutes(dto.getTotalSessionDurationMinutes().orElse(null));
		entity.setPumpRating(dto.getPumpRating().orElse(null));
		entity.setHeadspaceRating(dto.getHeadspaceRating().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setClimbingPartners(dto.getClimbingPartners().orElse(null));
		ClimbingSession.WeatherConditionsEnum weather = dto.getWeatherConditions().orElse(null);
		entity.setWeatherConditions(weather == null ? null : weather.getValue());
		entity.setGymId(dto.getGymId().orElse(null));
		entity.setGymName(dto.getGymName().orElse(null));
		entity.setCragId(dto.getCragId().orElse(null));
		entity.setCragName(dto.getCragName().orElse(null));
		entity.setSectorId(dto.getSectorId().orElse(null));
		entity.setSectorName(dto.getSectorName().orElse(null));
		entity.setRockType(dto.getRockType().orElse(null));
		entity.setAspect(dto.getAspect().orElse(null));
	}

	private void applyAttemptFields(AscentAttemptEntity entity, AscentAttempt dto) {
		entity.setSuccess(Boolean.TRUE.equals(dto.getIsSuccess()));
		entity.setUserRawInput(dto.getUserRawInput().orElse(null));
		entity.setAbsoluteDifficultyIndex(dto.getAbsoluteDifficultyIndex().orElse(null));
		AscentAttempt.AscentStyleEnum ascentStyle = dto.getAscentStyle().orElse(null);
		entity.setAscentStyle(ascentStyle == null ? null : ascentStyle.getValue());
		AscentAttempt.SafetyStyleEnum safetyStyle = dto.getSafetyStyle().orElse(null);
		entity.setSafetyStyle(safetyStyle == null ? null : safetyStyle.getValue());
		entity.setFailurePoint(dto.getFailurePoint().orElse(null));
		entity.setAttemptCount(dto.getAttemptCount().orElse(null));
		entity.setColorBandId(dto.getColorBandId().orElse(null));
		entity.setColorName(dto.getColorName().orElse(null));
		entity.setHexColor(dto.getHexColor().orElse(null));
		entity.setGradeRange(dto.getGradeRange().orElse(null));
		entity.setIndoorRouteId(dto.getIndoorRouteId().orElse(null));
		entity.setRouteId(dto.getRouteId().orElse(null));
		entity.setBoulderProblemId(dto.getBoulderProblemId().orElse(null));
		entity.setRouteName(dto.getRouteName().orElse(null));
		entity.setLengthInMeters(dto.getLengthInMeters().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setOrderIndex(dto.getOrderIndex());
	}

	private void applyPitchFields(PitchLogEntity entity, PitchLog dto) {
		entity.setPitchNumber(dto.getPitchNumber());
		entity.setLead(Boolean.TRUE.equals(dto.getIsLead()));
		entity.setRawGrade(dto.getRawGrade().orElse(null));
		entity.setAbsoluteDifficultyIndex(dto.getAbsoluteDifficultyIndex().orElse(null));
		entity.setLengthInMeters(dto.getLengthInMeters().orElse(null));
		entity.setOrderIndex(dto.getOrderIndex());
	}

	private ClimbingSession toDto(ClimbingSessionEntity entity) {
		List<AscentAttemptEntity> attempts = attemptRepository.findBySessionId(entity.getId());
		Map<UUID, List<PitchLogEntity>> pitchesByAttempt = pitchesByAttemptFor(
				attempts.stream().map(AscentAttemptEntity::getId).toList());
		return toDto(entity, attempts, pitchesByAttempt);
	}

	private ClimbingSession toDto(ClimbingSessionEntity entity, List<AscentAttemptEntity> attempts,
			Map<UUID, List<PitchLogEntity>> pitchesByAttempt) {
		List<AscentAttempt> attemptDtos = attempts.stream()
				.map(attempt -> attemptMapper.toDto(attempt, pitchesByAttempt.getOrDefault(attempt.getId(), List.of()).stream()
						.map(pitchMapper::toDto).toList()))
				.toList();
		return mapper.toDto(entity, attemptDtos);
	}

	private Map<UUID, List<PitchLogEntity>> pitchesByAttemptFor(List<UUID> attemptIds) {
		return pitchRepository.findByAttemptIdIn(attemptIds).stream()
				.collect(Collectors.groupingBy(PitchLogEntity::getAttemptId));
	}

	private static ClimbingSessionEntity requireOwner(ClimbingSessionEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such climbing session");
		}
		return entity;
	}
}
