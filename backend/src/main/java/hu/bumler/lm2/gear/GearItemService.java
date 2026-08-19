package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.GearItem;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class GearItemService {

	private final GearItemRepository repository;
	private final GearItemMapper mapper;
	private final PackingTemplateItemRepository templateItemRepository;
	private final PackingSessionItemRepository sessionItemRepository;

	GearItemService(GearItemRepository repository, GearItemMapper mapper, PackingTemplateItemRepository templateItemRepository,
			PackingSessionItemRepository sessionItemRepository) {
		this.repository = repository;
		this.mapper = mapper;
		this.templateItemRepository = templateItemRepository;
		this.sessionItemRepository = sessionItemRepository;
	}

	@Transactional(readOnly = true)
	List<GearItem> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	GearItem get(UUID userId, UUID id) {
		GearItemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such item"));
		return mapper.toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert").
	 * A row found by id but owned by a different user is refused (404, not silently overwritten).
	 */
	@Transactional
	GearItem create(UUID userId, GearItem dto) {
		GearItemEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new GearItemEntity(dto.getId(), userId));
		applyName(entity, userId, dto.getName());
		entity.setNotes(dto.getNotes().orElse(null));
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	GearItem update(UUID userId, UUID id, GearItem dto) {
		GearItemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such item"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Item already deleted");
		}
		applyName(entity, userId, dto.getName());
		entity.setNotes(dto.getNotes().orElse(null));
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * Soft delete, idempotent, cascading to every live PackingTemplateItem and PackingSessionItem
	 * referencing this item (documentation/Subfeatures/Eszközök.md).
	 */
	@Transactional
	GearItem delete(UUID userId, UUID id) {
		GearItemEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such item"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (PackingTemplateItemEntity templateItem : templateItemRepository.findByGearItemIdAndUserIdAndDeletedFalse(id, userId)) {
				templateItem.softDelete();
				templateItemRepository.save(templateItem);
			}
			templateItemRepository.flush();
			for (PackingSessionItemEntity sessionItem : sessionItemRepository.findByGearItemIdAndUserIdAndDeletedFalse(id, userId)) {
				sessionItem.softDelete();
				sessionItemRepository.save(sessionItem);
			}
			sessionItemRepository.flush();
		}
		return mapper.toDto(entity);
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: the client already pre-checks this against its
	 * local store before saving, so a 409 here only fires on a genuine multi-device race — but it
	 * must still fire, with the conflicting live row's id, so the client can offer "this already
	 * exists, open it?" (ApiError.conflictingId).
	 */
	private void applyName(GearItemEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static GearItemEntity requireOwner(GearItemEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such item");
		}
		return entity;
	}
}
