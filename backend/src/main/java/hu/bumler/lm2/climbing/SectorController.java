package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ClimbingSectorsApi;
import hu.bumler.lm2.api.model.Sector;
import hu.bumler.lm2.common.CurrentUser;

/** documentation/Subfeatures/Outdoor boulder admin.md — per-user sector master (see SectorService). */
@RestController
class SectorController implements ClimbingSectorsApi {

	private final SectorService sectorService;
	private final CurrentUser currentUser;

	SectorController(SectorService sectorService, CurrentUser currentUser) {
		this.sectorService = sectorService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<Sector>> listClimbingSectors() {
		return ResponseEntity.ok(sectorService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<Sector> createClimbingSector(Sector sector) {
		return ResponseEntity.ok(sectorService.create(currentUser.id(), sector));
	}

	@Override
	public ResponseEntity<Sector> getClimbingSector(UUID id) {
		return ResponseEntity.ok(sectorService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<Sector> updateClimbingSector(UUID id, Sector sector) {
		return ResponseEntity.ok(sectorService.update(currentUser.id(), id, sector));
	}

	@Override
	public ResponseEntity<Sector> deleteClimbingSector(UUID id) {
		return ResponseEntity.ok(sectorService.delete(currentUser.id(), id));
	}
}
