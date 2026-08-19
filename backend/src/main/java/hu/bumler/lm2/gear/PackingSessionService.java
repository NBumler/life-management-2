package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.PackingSession;
import hu.bumler.lm2.api.model.PackingSessionDetail;
import hu.bumler.lm2.api.model.PackingSessionItem;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

@Service
class PackingSessionService {

	private final PackingSessionRepository repository;
	private final PackingSessionItemRepository itemRepository;
	private final PackingSessionMapper mapper;
	private final PackingSessionItemMapper itemMapper;

	PackingSessionService(PackingSessionRepository repository, PackingSessionItemRepository itemRepository, PackingSessionMapper mapper,
			PackingSessionItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Transactional(readOnly = true)
	List<PackingSession> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	PackingSessionDetail get(UUID userId, UUID id) {
		PackingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such session"));
		return toDetail(entity);
	}

	/**
	 * documentation/Subfeatures/Pakolás.md "Indítás": the client already computed the deduped union
	 * of the chosen templates' items, so this just persists session + that initial item set as one
	 * atomic write — idempotent upsert on the client-supplied id.
	 */
	@Transactional
	PackingSessionDetail create(UUID userId, PackingSessionDetail dto) {
		PackingSessionEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new PackingSessionEntity(dto.getId(), userId));
		entity.setDestination(dto.getDestination().orElse(null));
		entity.setSourceTemplateIds(dto.getSourceTemplateIds());
		repository.saveAndFlush(entity);

		for (PackingSessionItem itemDto : dto.getItems()) {
			PackingSessionItemEntity itemEntity = itemRepository.findById(itemDto.getId())
					.orElseGet(() -> new PackingSessionItemEntity(itemDto.getId(), userId, entity.getId(), itemDto.getGearItemId(),
							itemDto.getStatus().getValue(), itemDto.getSortOrder()));
			itemEntity.setStatus(itemDto.getStatus().getValue());
			itemEntity.setSortOrder(itemDto.getSortOrder());
			itemRepository.save(itemEntity);
		}
		itemRepository.flush();

		return toDetail(entity);
	}

	/** Session-level fields only (destination) — items are managed through PackingSessionItemService. */
	@Transactional
	PackingSession update(UUID userId, UUID id, PackingSession dto) {
		PackingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such session"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Session already deleted");
		}
		entity.setDestination(dto.getDestination().orElse(null));
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * documentation/Subfeatures/Pakolás.md "Lezárás": soft delete, idempotent, cascading to every
	 * live item on the session — no "done vs cancelled" distinction, no history screen.
	 */
	@Transactional
	PackingSession delete(UUID userId, UUID id) {
		PackingSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such session"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (PackingSessionItemEntity item : itemRepository.findBySessionIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return mapper.toDto(entity);
	}

	private PackingSessionDetail toDetail(PackingSessionEntity entity) {
		List<PackingSessionItem> items = itemRepository.findBySessionId(entity.getId()).stream().map(itemMapper::toDto).toList();
		return mapper.toDetailDto(entity, items);
	}

	private static PackingSessionEntity requireOwner(PackingSessionEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such session");
		}
		return entity;
	}
}
