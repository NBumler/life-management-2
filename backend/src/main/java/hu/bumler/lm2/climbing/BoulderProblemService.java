package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.BoulderProblem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Outdoor boulder admin.md — flat, user-owned boulder-problem master CRUD
 * (mirrors {@code IndoorRouteService}: idempotent upsert, cross-user 404, soft delete). No name
 * uniqueness; the master row is optional (the napló can log ad-hoc). The sector link is fixed at
 * create time.
 */
@Service
class BoulderProblemService {

	private final BoulderProblemRepository repository;
	private final BoulderProblemMapper mapper;

	BoulderProblemService(BoulderProblemRepository repository, BoulderProblemMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<BoulderProblem> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	BoulderProblem get(UUID userId, UUID id) {
		BoulderProblemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such boulder problem"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	BoulderProblem create(UUID userId, BoulderProblem dto) {
		BoulderProblemEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new BoulderProblemEntity(dto.getId(), userId, dto.getSectorId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	BoulderProblem update(UUID userId, UUID id, BoulderProblem dto) {
		BoulderProblemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such boulder problem"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Boulder problem already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	BoulderProblem delete(UUID userId, UUID id) {
		BoulderProblemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such boulder problem"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(BoulderProblemEntity entity, BoulderProblem dto) {
		entity.setName(dto.getName());
		entity.setGuidebookGrade(dto.getGuidebookGrade());
	}

	private static BoulderProblemEntity requireOwner(BoulderProblemEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such boulder problem");
		}
		return entity;
	}
}
