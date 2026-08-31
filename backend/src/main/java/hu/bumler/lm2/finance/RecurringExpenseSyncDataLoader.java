package hu.bumler.lm2.finance;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class RecurringExpenseSyncDataLoader implements SyncedEntityDataLoader {

	private final RecurringExpenseRepository repository;
	private final RecurringExpenseMapper mapper;

	RecurringExpenseSyncDataLoader(RecurringExpenseRepository repository, RecurringExpenseMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "RecurringExpense";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(RecurringExpenseEntity::getId, mapper::toDto));
	}
}
