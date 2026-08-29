package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.SwimLog;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Features/Úszás napló.md — flat, user-owned swim-session CRUD (mirrors
 * {@code LifePlanService}). The only non-trivial rule is the pool-field pairing
 * ("Medence mezők együtt") and the OPEN_WATER-clears-pool-fields rule; {@code distanceMeters} is
 * server-computed as {@code poolLengthMeters * lapCount} whenever both are present.
 */
@Service
class SwimLogService {

	private final SwimLogRepository repository;
	private final SwimLogMapper mapper;

	SwimLogService(SwimLogRepository repository, SwimLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<SwimLog> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderBySwimDateDescCreatedAtDesc(userId).stream().map(mapper::toDto)
				.toList();
	}

	@Transactional(readOnly = true)
	SwimLog get(UUID userId, UUID id) {
		SwimLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such swim log"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	SwimLog create(UUID userId, SwimLog dto) {
		SwimLogEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new SwimLogEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	SwimLog update(UUID userId, UUID id, SwimLog dto) {
		SwimLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such swim log"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Swim log already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	SwimLog delete(UUID userId, UUID id) {
		SwimLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such swim log"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	/**
	 * documentation/Features/Úszás napló.md "Medence mezők együtt": poolLengthMeters and lapCount are
	 * both-or-neither; for OPEN_WATER both must be absent. distanceMeters is derived
	 * (poolLengthMeters × lapCount) when the pair is present — the value sent by the client is
	 * ignored in that case; otherwise the sent value (an optional manual open-water distance) is kept.
	 */
	private void applyFields(SwimLogEntity entity, SwimLog dto) {
		String intensity = dto.getIntensity().getValue();
		Integer poolLengthMeters = dto.getPoolLengthMeters().orElse(null);
		Integer lapCount = dto.getLapCount().orElse(null);
		boolean openWater = SwimLog.IntensityEnum.OPEN_WATER.getValue().equals(intensity);

		if (openWater && (poolLengthMeters != null || lapCount != null)) {
			throw new ValidationException("Pool fields must be empty for open-water swims", "poolLengthMeters");
		}
		if ((poolLengthMeters == null) != (lapCount == null)) {
			throw new ValidationException("poolLengthMeters and lapCount must be provided together",
					poolLengthMeters == null ? "poolLengthMeters" : "lapCount");
		}

		// A ?: here would binary-numeric-promote both arms to int and NPE on a null open-water distance.
		Integer distanceMeters;
		if (poolLengthMeters != null && lapCount != null) {
			distanceMeters = poolLengthMeters * lapCount;
		} else {
			distanceMeters = dto.getDistanceMeters().orElse(null);
		}

		entity.setSwimDate(dto.getDate());
		entity.setDurationMinutes(dto.getDurationMinutes());
		entity.setIntensity(intensity);
		entity.setPoolLengthMeters(poolLengthMeters);
		entity.setLapCount(lapCount);
		entity.setDistanceMeters(distanceMeters);
	}

	private static SwimLogEntity requireOwner(SwimLogEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such swim log");
		}
		return entity;
	}
}
