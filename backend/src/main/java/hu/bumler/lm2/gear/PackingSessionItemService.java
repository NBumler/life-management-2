package hu.bumler.lm2.gear;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.PackingSessionItem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/**
 * documentation/Subfeatures/Pakolás.md: item status/sortOrder changes and the "extra item" add are
 * their own outbox operations, not a nested session save — see PackingSessionItem.yaml's comment.
 */
@Service
class PackingSessionItemService {

	private final PackingSessionItemRepository repository;
	private final PackingSessionRepository sessionRepository;
	private final GearItemRepository gearItemRepository;
	private final PackingSessionItemMapper mapper;

	PackingSessionItemService(PackingSessionItemRepository repository, PackingSessionRepository sessionRepository,
			GearItemRepository gearItemRepository, PackingSessionItemMapper mapper) {
		this.repository = repository;
		this.sessionRepository = sessionRepository;
		this.gearItemRepository = gearItemRepository;
		this.mapper = mapper;
	}

	/** Idempotent upsert on the client-supplied id — "extra eszköz" add to an already-running session. */
	@Transactional
	PackingSessionItem create(UUID userId, PackingSessionItem dto) {
		PackingSessionItemEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> newItem(userId, dto));
		entity.setStatus(dto.getStatus().getValue());
		entity.setSortOrder(dto.getSortOrder());
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional(readOnly = true)
	PackingSessionItem get(UUID userId, UUID id) {
		PackingSessionItemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such item"));
		return mapper.toDto(entity);
	}

	@Transactional
	PackingSessionItem update(UUID userId, UUID id, PackingSessionItem dto) {
		PackingSessionItemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such item"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Item already deleted");
		}
		entity.setStatus(dto.getStatus().getValue());
		entity.setSortOrder(dto.getSortOrder());
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	private PackingSessionItemEntity newItem(UUID userId, PackingSessionItem dto) {
		PackingSessionEntity session = sessionRepository.findByIdAndUserId(dto.getSessionId(), userId)
				.orElseThrow(() -> new EntityNotFoundException("No such session"));
		if (session.isDeleted()) {
			throw new EntityDeletedException("Session already deleted");
		}
		if (gearItemRepository.findByIdAndUserId(dto.getGearItemId(), userId).isEmpty()) {
			throw new EntityNotFoundException("No such gear item");
		}
		repository.findBySessionIdAndGearItemIdAndDeletedFalse(dto.getSessionId(), dto.getGearItemId())
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Gear item already on this session", "gearItemId", conflict.getId());
				});
		return new PackingSessionItemEntity(dto.getId(), userId, dto.getSessionId(), dto.getGearItemId(), dto.getStatus().getValue(),
				dto.getSortOrder());
	}

	private static PackingSessionItemEntity requireOwner(PackingSessionItemEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such item");
		}
		return entity;
	}
}
