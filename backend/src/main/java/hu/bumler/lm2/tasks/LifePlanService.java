package hu.bumler.lm2.tasks;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.LifePlan;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

@Service
class LifePlanService {

	private final LifePlanRepository repository;
	private final LifePlanMapper mapper;

	LifePlanService(LifePlanRepository repository, LifePlanMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<LifePlan> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	LifePlan get(UUID userId, UUID id) {
		LifePlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such life plan"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	LifePlan create(UUID userId, LifePlan dto) {
		LifePlanEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new LifePlanEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	LifePlan update(UUID userId, UUID id, LifePlan dto) {
		LifePlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such life plan"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Life plan already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent (documentation/Subfeatures/Élet tervek.md — no undelete). */
	@Transactional
	LifePlan delete(UUID userId, UUID id) {
		LifePlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such life plan"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	/**
	 * documentation/Subfeatures/Élet tervek.md "Állapotgép" + documentation/Architektúra/Backend.md:
	 * the client computes the completedAt side effect of a status change; the server only rejects a
	 * contradicting pair with 400 instead of silently correcting it.
	 */
	private void applyFields(LifePlanEntity entity, LifePlan dto) {
		String status = dto.getStatus().getValue();
		OffsetDateTime completedAt = dto.getCompletedAt().orElse(null);
		boolean done = "DONE".equals(status);
		if (done && completedAt == null) {
			throw new ValidationException("completedAt is required when status is DONE", "completedAt");
		}
		if (!done && completedAt != null) {
			throw new ValidationException("completedAt must be empty unless status is DONE", "completedAt");
		}
		entity.setTitle(dto.getTitle());
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setTargetDate(dto.getTargetDate().orElse(null));
		entity.applyStatus(status, completedAt);
	}

	private static LifePlanEntity requireOwner(LifePlanEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such life plan");
		}
		return entity;
	}
}
