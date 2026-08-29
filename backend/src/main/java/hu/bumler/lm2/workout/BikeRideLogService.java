package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.BikeRideLog;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Features/Biciklizés napló.md — flat, user-owned bike-ride CRUD (mirrors
 * {@code SwimLogService} without the pool-pairing rule). {@code distanceKm} and
 * {@code elevationGainMeters} are optional, independent log/statistics fields; the per-column domain
 * ({@code >= 0}, {@code durationMinutes > 0}) is guarded by the OpenAPI schema + DB checks.
 */
@Service
class BikeRideLogService {

	private final BikeRideLogRepository repository;
	private final BikeRideLogMapper mapper;

	BikeRideLogService(BikeRideLogRepository repository, BikeRideLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<BikeRideLog> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByRideDateDescCreatedAtDesc(userId).stream().map(mapper::toDto)
				.toList();
	}

	@Transactional(readOnly = true)
	BikeRideLog get(UUID userId, UUID id) {
		BikeRideLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such bike ride log"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	BikeRideLog create(UUID userId, BikeRideLog dto) {
		BikeRideLogEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new BikeRideLogEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	BikeRideLog update(UUID userId, UUID id, BikeRideLog dto) {
		BikeRideLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such bike ride log"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Bike ride log already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	BikeRideLog delete(UUID userId, UUID id) {
		BikeRideLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such bike ride log"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(BikeRideLogEntity entity, BikeRideLog dto) {
		entity.setRideDate(dto.getDate());
		entity.setDurationMinutes(dto.getDurationMinutes());
		entity.setIntensity(dto.getIntensity().getValue());
		entity.setDistanceKm(dto.getDistanceKm().orElse(null));
		entity.setElevationGainMeters(dto.getElevationGainMeters().orElse(null));
	}

	private static BikeRideLogEntity requireOwner(BikeRideLogEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such bike ride log");
		}
		return entity;
	}
}
