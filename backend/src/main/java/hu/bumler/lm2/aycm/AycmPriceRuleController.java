package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AycmPriceRulesApi;
import hu.bumler.lm2.api.model.AycmPriceRule;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — price rules scoped to a partner (see AycmPriceRuleService). */
@RestController
class AycmPriceRuleController implements AycmPriceRulesApi {

	private final AycmPriceRuleService service;
	private final CurrentUser currentUser;

	AycmPriceRuleController(AycmPriceRuleService service, CurrentUser currentUser) {
		this.service = service;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<AycmPriceRule>> listAycmPriceRules(UUID id) {
		return ResponseEntity.ok(service.list(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<AycmPriceRule> createAycmPriceRule(UUID id, AycmPriceRule aycmPriceRule) {
		return ResponseEntity.ok(service.create(currentUser.id(), id, aycmPriceRule));
	}

	@Override
	public ResponseEntity<AycmPriceRule> getAycmPriceRule(UUID id, UUID ruleId) {
		return ResponseEntity.ok(service.get(currentUser.id(), id, ruleId));
	}

	@Override
	public ResponseEntity<AycmPriceRule> updateAycmPriceRule(UUID id, UUID ruleId, AycmPriceRule aycmPriceRule) {
		return ResponseEntity.ok(service.update(currentUser.id(), id, ruleId, aycmPriceRule));
	}

	@Override
	public ResponseEntity<AycmPriceRule> deleteAycmPriceRule(UUID id, UUID ruleId) {
		return ResponseEntity.ok(service.delete(currentUser.id(), id, ruleId));
	}
}
