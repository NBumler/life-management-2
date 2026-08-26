package hu.bumler.lm2.gear;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.PackingTemplate;
import hu.bumler.lm2.api.model.PackingTemplateDetail;
import hu.bumler.lm2.api.model.PackingTemplateItem;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class PackingTemplateService {

	private final PackingTemplateRepository repository;
	private final PackingTemplateItemRepository itemRepository;
	private final GearItemRepository gearItemRepository;
	private final PackingTemplateMapper mapper;
	private final PackingTemplateItemMapper itemMapper;

	PackingTemplateService(PackingTemplateRepository repository, PackingTemplateItemRepository itemRepository,
			GearItemRepository gearItemRepository, PackingTemplateMapper mapper, PackingTemplateItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.gearItemRepository = gearItemRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Transactional(readOnly = true)
	List<PackingTemplate> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	PackingTemplateDetail get(UUID userId, UUID id) {
		PackingTemplateEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such template"));
		return toDetail(entity);
	}

	@Transactional
	PackingTemplateDetail create(UUID userId, PackingTemplateDetail dto) {
		PackingTemplateEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new PackingTemplateEntity(dto.getId(), userId));
		return saveTree(userId, entity, dto);
	}

	@Transactional
	PackingTemplateDetail update(UUID userId, UUID id, PackingTemplateDetail dto) {
		PackingTemplateEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such template"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Template already deleted");
		}
		return saveTree(userId, entity, dto);
	}

	/**
	 * Soft delete, idempotent, cascading to every live item on the template
	 * (documentation/Subfeatures/Sablonok.md "Soft delete a sablonra + összes PackingTemplateItem-re").
	 */
	@Transactional
	PackingTemplateDetail delete(UUID userId, UUID id) {
		PackingTemplateEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such template"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (PackingTemplateItemEntity item : itemRepository.findByTemplateIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDetail(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list
	 * is the complete desired live tree — an item's presence/absence by id is the only signal (the
	 * client never needs to send a {@code deleted} flag). Items missing from the incoming list are
	 * soft-deleted; the response always lists every row, live or tombstoned (PackingTemplateDetail.yaml).
	 */
	private PackingTemplateDetail saveTree(UUID userId, PackingTemplateEntity entity, PackingTemplateDetail dto) {
		applyName(entity, userId, dto.getName());
		entity.setNotes(dto.getNotes().orElse(null));
		repository.saveAndFlush(entity);

		List<PackingTemplateItemEntity> existingItems = itemRepository.findByTemplateId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		for (PackingTemplateItem itemDto : dto.getItems()) {
			incomingIds.add(itemDto.getId());
			requireOwnGearItem(userId, itemDto.getGearItemId());
			PackingTemplateItemEntity itemEntity = resolveItem(userId, entity.getId(), existingItems, itemDto.getId());
			itemEntity.setGearItemId(itemDto.getGearItemId());
			itemEntity.setSortOrder(itemDto.getSortOrder());
			itemRepository.save(itemEntity);
		}
		for (PackingTemplateItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDetail(entity);
	}

	/** See {@link NestedChildResolver} — shared with RecipeService.resolveIngredient. */
	private PackingTemplateItemEntity resolveItem(UUID userId, UUID templateId, List<PackingTemplateItemEntity> existingItems, UUID itemId) {
		return NestedChildResolver.resolve(itemId, existingItems, PackingTemplateItemEntity::getId, PackingTemplateItemEntity::isDeleted,
				PackingTemplateItemEntity::undelete, itemRepository::existsById,
				() -> new PackingTemplateItemEntity(itemId, userId, templateId, null, 0), "No such template item");
	}

	/** documentation/Subfeatures/Sablonok.md: a template may only reference the caller's own GearItem catalog. */
	private void requireOwnGearItem(UUID userId, UUID gearItemId) {
		if (gearItemRepository.findByIdAndUserId(gearItemId, userId).isEmpty()) {
			throw new EntityNotFoundException("No such gear item");
		}
	}

	private PackingTemplateDetail toDetail(PackingTemplateEntity entity) {
		List<PackingTemplateItem> items = itemRepository.findByTemplateId(entity.getId()).stream().map(itemMapper::toDto).toList();
		return mapper.toDetailDto(entity, items);
	}

	/** documentation/Architektúra/Névegyediség.md — same pre-check pattern as GearItemService. */
	private void applyName(PackingTemplateEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static PackingTemplateEntity requireOwner(PackingTemplateEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such template");
		}
		return entity;
	}
}
