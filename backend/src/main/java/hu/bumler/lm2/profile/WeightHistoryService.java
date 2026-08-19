package hu.bumler.lm2.profile;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.WeightHistoryEntry;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

@Service
class WeightHistoryService {

	private final WeightHistoryEntryRepository repository;
	private final WeightHistoryEntryMapper mapper;

	WeightHistoryService(WeightHistoryEntryRepository repository, WeightHistoryEntryMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<WeightHistoryEntry> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByRecordedAtDesc(userId).stream().map(mapper::toDto).toList();
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	WeightHistoryEntry create(UUID userId, WeightHistoryEntry dto) {
		WeightHistoryEntryEntity entity = repository.findById(dto.getId())
				.orElseGet(() -> new WeightHistoryEntryEntity(dto.getId(), userId, dto.getRecordedAt(), dto.getWeightKg()));
		entity.setRecordedAt(dto.getRecordedAt());
		entity.setWeightKg(dto.getWeightKg());
		// flush, not save: see ProfileService for why.
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional(readOnly = true)
	WeightHistoryEntry get(UUID userId, UUID id) {
		WeightHistoryEntryEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such entry"));
		return mapper.toDto(entity);
	}

	@Transactional
	WeightHistoryEntry update(UUID userId, UUID id, WeightHistoryEntry dto) {
		WeightHistoryEntryEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such entry"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Entry already deleted");
		}
		entity.setRecordedAt(dto.getRecordedAt());
		entity.setWeightKg(dto.getWeightKg());
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent — deleting an already-deleted row just returns its current state. */
	@Transactional
	WeightHistoryEntry delete(UUID userId, UUID id) {
		WeightHistoryEntryEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such entry"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}
}
