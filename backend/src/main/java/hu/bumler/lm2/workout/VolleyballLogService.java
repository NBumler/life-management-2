package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.VolleyballLog;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Features/Röplabda napló.md — flat, user-owned volleyball-session CRUD (mirrors
 * {@code SwimLogService}). The only rule is the on-court duration range: the 240-minute cap is also
 * checked here (not just by the generated bean validation) because it is what keeps a typo from
 * inflating the daily kcal allowance.
 */
@Service
class VolleyballLogService {

	static final int MAX_DURATION_MINUTES = 240;

	private final VolleyballLogRepository repository;
	private final VolleyballLogMapper mapper;

	VolleyballLogService(VolleyballLogRepository repository, VolleyballLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<VolleyballLog> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByVolleyballDateDescCreatedAtDesc(userId).stream()
				.map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	VolleyballLog get(UUID userId, UUID id) {
		VolleyballLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such volleyball log"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	VolleyballLog create(UUID userId, VolleyballLog dto) {
		VolleyballLogEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new VolleyballLogEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	VolleyballLog update(UUID userId, UUID id, VolleyballLog dto) {
		VolleyballLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such volleyball log"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Volleyball log already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	VolleyballLog delete(UUID userId, UUID id) {
		VolleyballLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such volleyball log"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(VolleyballLogEntity entity, VolleyballLog dto) {
		int durationMinutes = dto.getDurationMinutes();
		if (durationMinutes < 1 || durationMinutes > MAX_DURATION_MINUTES) {
			throw new ValidationException("durationMinutes must be between 1 and " + MAX_DURATION_MINUTES,
					"durationMinutes");
		}
		VolleyballLog.IntensityEnum intensity = dto.getIntensity().orElse(null);

		entity.setVolleyballDate(dto.getDate());
		entity.setDurationMinutes(durationMinutes);
		entity.setIntensity(intensity == null ? null : intensity.getValue());
		entity.setSetsPlayed(dto.getSetsPlayed().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
	}

	private static VolleyballLogEntity requireOwner(VolleyballLogEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such volleyball log");
		}
		return entity;
	}
}
