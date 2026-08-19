package hu.bumler.lm2.profile;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.ProfileApi;
import hu.bumler.lm2.api.model.UserProfile;
import hu.bumler.lm2.api.model.WeightHistoryEntry;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class ProfileController implements ProfileApi {

	private final ProfileService profileService;
	private final WeightHistoryService weightHistoryService;
	private final CurrentUser currentUser;

	ProfileController(ProfileService profileService, WeightHistoryService weightHistoryService, CurrentUser currentUser) {
		this.profileService = profileService;
		this.weightHistoryService = weightHistoryService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<UserProfile> getProfile() {
		return ResponseEntity.ok(profileService.get(currentUser.id()));
	}

	@Override
	public ResponseEntity<UserProfile> putProfile(UserProfile userProfile) {
		return ResponseEntity.ok(profileService.upsert(currentUser.id(), userProfile));
	}

	@Override
	public ResponseEntity<List<WeightHistoryEntry>> listWeightHistory() {
		return ResponseEntity.ok(weightHistoryService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<WeightHistoryEntry> createWeightHistoryEntry(WeightHistoryEntry weightHistoryEntry) {
		return ResponseEntity.ok(weightHistoryService.create(currentUser.id(), weightHistoryEntry));
	}

	@Override
	public ResponseEntity<WeightHistoryEntry> getWeightHistoryEntry(UUID id) {
		return ResponseEntity.ok(weightHistoryService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<WeightHistoryEntry> updateWeightHistoryEntry(UUID id, WeightHistoryEntry weightHistoryEntry) {
		return ResponseEntity.ok(weightHistoryService.update(currentUser.id(), id, weightHistoryEntry));
	}

	@Override
	public ResponseEntity<WeightHistoryEntry> deleteWeightHistoryEntry(UUID id) {
		return ResponseEntity.ok(weightHistoryService.delete(currentUser.id(), id));
	}
}
