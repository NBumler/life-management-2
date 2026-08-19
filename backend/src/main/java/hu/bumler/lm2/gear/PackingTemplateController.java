package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.PackingTemplatesApi;
import hu.bumler.lm2.api.model.PackingTemplate;
import hu.bumler.lm2.api.model.PackingTemplateDetail;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class PackingTemplateController implements PackingTemplatesApi {

	private final PackingTemplateService packingTemplateService;
	private final CurrentUser currentUser;

	PackingTemplateController(PackingTemplateService packingTemplateService, CurrentUser currentUser) {
		this.packingTemplateService = packingTemplateService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<PackingTemplate>> listPackingTemplates() {
		return ResponseEntity.ok(packingTemplateService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<PackingTemplateDetail> createPackingTemplate(PackingTemplateDetail packingTemplateDetail) {
		return ResponseEntity.ok(packingTemplateService.create(currentUser.id(), packingTemplateDetail));
	}

	@Override
	public ResponseEntity<PackingTemplateDetail> getPackingTemplate(UUID id) {
		return ResponseEntity.ok(packingTemplateService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<PackingTemplateDetail> updatePackingTemplate(UUID id, PackingTemplateDetail packingTemplateDetail) {
		return ResponseEntity.ok(packingTemplateService.update(currentUser.id(), id, packingTemplateDetail));
	}

	@Override
	public ResponseEntity<PackingTemplateDetail> deletePackingTemplate(UUID id) {
		return ResponseEntity.ok(packingTemplateService.delete(currentUser.id(), id));
	}
}
