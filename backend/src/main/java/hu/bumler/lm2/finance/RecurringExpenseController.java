package hu.bumler.lm2.finance;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.RecurringExpensesApi;
import hu.bumler.lm2.api.model.RecurringExpense;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Rendszeres kiadások.md — per-user recurring expenses (see RecurringExpenseService). */
@RestController
class RecurringExpenseController implements RecurringExpensesApi {

	private final RecurringExpenseService recurringExpenseService;
	private final CurrentUser currentUser;

	RecurringExpenseController(RecurringExpenseService recurringExpenseService, CurrentUser currentUser) {
		this.recurringExpenseService = recurringExpenseService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<RecurringExpense>> listRecurringExpenses() {
		return ResponseEntity.ok(recurringExpenseService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<RecurringExpense> createRecurringExpense(RecurringExpense recurringExpense) {
		return ResponseEntity.ok(recurringExpenseService.create(currentUser.id(), recurringExpense));
	}

	@Override
	public ResponseEntity<RecurringExpense> getRecurringExpense(UUID id) {
		return ResponseEntity.ok(recurringExpenseService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<RecurringExpense> updateRecurringExpense(UUID id, RecurringExpense recurringExpense) {
		return ResponseEntity.ok(recurringExpenseService.update(currentUser.id(), id, recurringExpense));
	}

	@Override
	public ResponseEntity<RecurringExpense> deleteRecurringExpense(UUID id) {
		return ResponseEntity.ok(recurringExpenseService.delete(currentUser.id(), id));
	}
}
