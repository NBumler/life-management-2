package hu.bumler.lm2.finance;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.RecurringExpense;

@Component
class RecurringExpenseMapper {

	RecurringExpense toDto(RecurringExpenseEntity entity) {
		RecurringExpense dto = new RecurringExpense(entity.getId(), entity.getName(), entity.getAmountHuf(),
				RecurringExpense.FrequencyEnum.fromValue(entity.getFrequency()),
				RecurringExpense.CategoryEnum.fromValue(entity.getCategory()), entity.getNextBillingDate(),
				(int) entity.getBillingDayOfMonth(), entity.isActive(), entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
