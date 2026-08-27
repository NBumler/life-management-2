package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.ShoppingList;
import hu.bumler.lm2.api.model.ShoppingListItem;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/Bevásárlólista írás.md — per-user active shopping list: nested
 * aggregate PUT like MealService/RecipeService/PackingTemplateService. Unlike Meal, an empty item
 * list is valid (the spec's own "Üres aktív lista" flow deletes it manually instead of forbidding
 * it), so — unlike MealService.saveTree — there is no "at least one live item" check here.
 * Archiving (status → ARCHIVED) is out of this slice's scope; see documentation/Subfeatures/
 * Bevásárlás teljesítve.md for the future atomic complete endpoint that owns that transition.
 */
@Service
class ShoppingListService {

	private final ShoppingListRepository repository;
	private final ShoppingListItemRepository itemRepository;
	private final FoodRepository foodRepository;
	private final ShoppingListMapper mapper;
	private final ShoppingListItemMapper itemMapper;

	ShoppingListService(ShoppingListRepository repository, ShoppingListItemRepository itemRepository, FoodRepository foodRepository,
			ShoppingListMapper mapper, ShoppingListItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.foodRepository = foodRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Transactional(readOnly = true)
	List<ShoppingList> list(UUID userId) {
		List<ShoppingListEntity> lists = repository.findByUserIdAndDeletedFalseOrderByCreatedAtDesc(userId);
		var itemsByList = groupByShoppingListId(itemRepository.findByShoppingListIdIn(lists.stream().map(ShoppingListEntity::getId).toList()));
		return lists.stream().map(list -> toDto(list, itemsByList.getOrDefault(list.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	ShoppingList get(UUID userId, UUID id) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	ShoppingList create(UUID userId, ShoppingList dto) {
		ShoppingListEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new ShoppingListEntity(dto.getId(), userId));
		return saveTree(entity, dto);
	}

	@Transactional
	ShoppingList update(UUID userId, UUID id, ShoppingList dto) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Shopping list already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live item on the list. */
	@Transactional
	ShoppingList delete(UUID userId, UUID id) {
		ShoppingListEntity entity = repository.findByIdAndUserId(id, userId).orElseThrow(() -> new EntityNotFoundException("No such shopping list"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (ShoppingListItemEntity item : itemRepository.findByShoppingListIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list
	 * is the complete desired live tree — an item's presence/absence by id is the only signal.
	 * Items missing from the incoming list are soft-deleted; the response always lists every row,
	 * live or tombstoned (ShoppingList.yaml). {@code status}/{@code completedAt} are read-only here
	 * (see class javadoc) — only {@code name} is ever written from this endpoint.
	 */
	private ShoppingList saveTree(ShoppingListEntity entity, ShoppingList dto) {
		entity.setName(dto.getName().orElse(null));
		repository.saveAndFlush(entity);

		List<ShoppingListItemEntity> existingItems = itemRepository.findByShoppingListId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		List<ShoppingListItemEntity> incomingLive = new ArrayList<>();
		for (ShoppingListItem itemDto : dto.getItems()) {
			if (itemDto.getDeleted()) {
				continue;
			}
			incomingIds.add(itemDto.getId());
			ShoppingListItemEntity itemEntity = resolveItem(entity.getId(), existingItems, itemDto.getId());
			applyItem(itemEntity, itemDto);
			incomingLive.add(itemEntity);
		}

		for (ShoppingListItemEntity itemEntity : incomingLive) {
			itemRepository.save(itemEntity);
		}
		for (ShoppingListItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with MealService.resolveItem / RecipeService.resolveIngredient / PackingTemplateService.resolveItem. */
	private ShoppingListItemEntity resolveItem(UUID shoppingListId, List<ShoppingListItemEntity> existingItems, UUID itemId) {
		return NestedChildResolver.resolve(itemId, existingItems, ShoppingListItemEntity::getId, ShoppingListItemEntity::isDeleted,
				ShoppingListItemEntity::undelete, itemRepository::existsById,
				() -> new ShoppingListItemEntity(itemId, shoppingListId, ShoppingListItem.TypeEnum.NON_FOOD.getValue(), 0), "No such shopping list item");
	}

	/** documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása": per-type required fields; unused fields on the entity are cleared. */
	private void applyItem(ShoppingListItemEntity entity, ShoppingListItem dto) {
		ShoppingListItem.TypeEnum type = dto.getType();
		entity.setType(type.getValue());
		entity.setFoodId(null);
		entity.setName(null);
		entity.setNote(null);
		entity.setQuantity(null, null);

		switch (type) {
			case FOOD -> {
				UUID foodId = dto.getFoodId().orElseThrow(() -> new ValidationException("foodId is required for FOOD items", "foodId"));
				requireLiveFood(foodId);
				BigDecimal amount = dto.getQuantityAmount()
						.orElseThrow(() -> new ValidationException("quantityAmount is required for FOOD items", "quantityAmount"));
				String unit = dto.getQuantityUnit().orElseThrow(() -> new ValidationException("quantityUnit is required for FOOD items", "quantityUnit"));
				entity.setFoodId(foodId);
				entity.setQuantity(amount, unit);
			}
			case NON_FOOD -> {
				String name = dto.getName().orElseThrow(() -> new ValidationException("name is required for NON_FOOD items", "name"));
				entity.setName(name);
				entity.setNote(dto.getNote().orElse(null));
				entity.setQuantity(dto.getQuantityAmount().orElse(null), dto.getQuantityUnit().orElse(null));
			}
		}

		entity.setChecked(dto.getChecked());
		entity.setSortOrder(dto.getSortOrder());
	}

	/** documentation/Subfeatures/Bevásárlólista írás.md: a FOOD item may only reference a live Food. */
	private void requireLiveFood(UUID foodId) {
		FoodEntity food = foodRepository.findById(foodId).orElseThrow(() -> new EntityNotFoundException("No such food"));
		if (food.isDeleted()) {
			throw new EntityNotFoundException("No such food");
		}
	}

	private ShoppingList toDto(ShoppingListEntity entity) {
		return toDto(entity, itemRepository.findByShoppingListId(entity.getId()));
	}

	private ShoppingList toDto(ShoppingListEntity entity, List<ShoppingListItemEntity> items) {
		return mapper.toDto(entity, items.stream().map(itemMapper::toDto).toList());
	}

	private static Map<UUID, List<ShoppingListItemEntity>> groupByShoppingListId(List<ShoppingListItemEntity> items) {
		return items.stream().collect(Collectors.groupingBy(ShoppingListItemEntity::getShoppingListId));
	}

	private static ShoppingListEntity requireOwner(ShoppingListEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such shopping list");
		}
		return entity;
	}
}
