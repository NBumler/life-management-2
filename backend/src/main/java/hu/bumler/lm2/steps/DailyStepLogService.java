package hu.bumler.lm2.steps;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.DailyStepLog;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Features/Lépésszám követés.md — flat, user-owned daily step-count CRUD (mirrors
 * {@code SwimLogService}). The {@code id} is a deterministic client UUID v5 of
 * "DailyStepLog:&lt;userId&gt;:&lt;date&gt;", so — like {@code WeeklyPlanService} — a POST for an
 * already-existing (or soft-deleted) day resolves to / revives that day's row instead of minting a
 * fresh one. The overwrite policy (manual save always wins; a Health Connect sync only bumps the
 * value when strictly greater) is applied entirely on the client: the server does a plain
 * last-write-wins upsert.
 */
@Service
class DailyStepLogService {

	private final DailyStepLogRepository repository;
	private final DailyStepLogMapper mapper;

	DailyStepLogService(DailyStepLogRepository repository, DailyStepLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<DailyStepLog> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByLogDateDesc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	DailyStepLog get(UUID userId, UUID id) {
		DailyStepLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such daily step log"));
		return mapper.toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id; a tombstoned row for the same day is revived —
	 * required, not just convenient, because the id is a deterministic v5 of (userId, date) and so
	 * cannot be re-minted for a fresh row.
	 */
	@Transactional
	DailyStepLog create(UUID userId, DailyStepLog dto) {
		DailyStepLogEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new DailyStepLogEntity(dto.getId(), userId));
		if (entity.isDeleted()) {
			entity.undelete();
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	DailyStepLog update(UUID userId, UUID id, DailyStepLog dto) {
		DailyStepLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such daily step log"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Daily step log already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	DailyStepLog delete(UUID userId, UUID id) {
		DailyStepLogEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such daily step log"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(DailyStepLogEntity entity, DailyStepLog dto) {
		entity.setLogDate(dto.getDate());
		entity.setStepCount(dto.getStepCount());
	}

	private static DailyStepLogEntity requireOwner(DailyStepLogEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such daily step log");
		}
		return entity;
	}
}
