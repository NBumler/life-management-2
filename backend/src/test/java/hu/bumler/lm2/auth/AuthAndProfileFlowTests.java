package hu.bumler.lm2.auth;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.ApiError;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.RefreshRequest;
import hu.bumler.lm2.api.model.SyncChangesResponse;
import hu.bumler.lm2.api.model.UserProfile;
import hu.bumler.lm2.api.model.WeightHistoryEntry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end over MockMvc + real Postgres (Testcontainers): validates the Flyway migrations,
 * Spring Security / JWT wiring, and the auth + profile + sync request flows against each other,
 * not just in isolation — see the "Telepíthető alap-shell" plan Phase 1 checkpoint.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class AuthAndProfileFlowTests {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void adminCreatesUser_thenLoginSucceeds_thenBadPasswordFails() throws Exception {
		String username = uniqueUsername("alice");
		createUser(username, "correct-horse-battery");

		AuthTokens tokens = login(username, "correct-horse-battery");
		assertThat(tokens.getAccessToken()).isNotBlank();
		assertThat(tokens.getRefreshToken()).isNotBlank();

		MvcResult badLogin = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(json(new LoginRequest(username, "wrong-password"))))
				.andExpect(status().isUnauthorized())
				.andReturn();
		assertThat(readError(badLogin).getCode()).isEqualTo("UNAUTHORIZED");
	}

	@Test
	void duplicateUsername_isRejectedWith409() throws Exception {
		String username = uniqueUsername("dup");
		createUser(username, "correct-horse-battery");

		MvcResult conflict = mockMvc
				.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
						.header("X-Admin-Api-Key", "test-admin-api-key")
						.content(json(new AdminCreateUserRequest(username, "another-password"))))
				.andExpect(status().isConflict())
				.andReturn();
		assertThat(readError(conflict).getCode()).isEqualTo("UNIQUE_VIOLATION");
	}

	@Test
	void refreshRotatesToken_andRevokedTokenIsRejected() throws Exception {
		String username = uniqueUsername("refresh");
		createUser(username, "correct-horse-battery");
		AuthTokens firstTokens = login(username, "correct-horse-battery");

		MvcResult refreshed = mockMvc
				.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
						.content(json(new RefreshRequest(firstTokens.getRefreshToken()))))
				.andExpect(status().isOk())
				.andReturn();
		AuthTokens rotated = objectMapper.readValue(refreshed.getResponse().getContentAsString(), AuthTokens.class);
		assertThat(rotated.getRefreshToken()).isNotEqualTo(firstTokens.getRefreshToken());

		// The rotated-out token must no longer work.
		mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
				.content(json(new RefreshRequest(firstTokens.getRefreshToken()))))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void logout_revokesRefreshToken() throws Exception {
		String username = uniqueUsername("logout");
		createUser(username, "correct-horse-battery");
		AuthTokens tokens = login(username, "correct-horse-battery");

		mockMvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.getAccessToken())
				.content(json(new RefreshRequest(tokens.getRefreshToken()))))
				.andExpect(status().isNoContent());

		mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
				.content(json(new RefreshRequest(tokens.getRefreshToken()))))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void protectedEndpoint_withoutToken_is401() throws Exception {
		mockMvc.perform(get("/api/profile")).andExpect(status().isUnauthorized());
	}

	@Test
	void profileUpsert_validatesKgPerWeek_thenSaves_thenAppearsInSyncChanges() throws Exception {
		String username = uniqueUsername("profile");
		createUser(username, "correct-horse-battery");
		String accessToken = login(username, "correct-horse-battery").getAccessToken();

		mockMvc.perform(get("/api/profile").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
				.andExpect(status().isNotFound());

		UUID profileId = UUID.randomUUID();
		UserProfile invalid = new UserProfile(profileId).goal(UserProfile.GoalEnum.FAT_LOSS);
		MvcResult validationError = mockMvc
				.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).content(json(invalid)))
				.andExpect(status().isBadRequest())
				.andReturn();
		ApiError error = readError(validationError);
		assertThat(error.getCode()).isEqualTo("VALIDATION_ERROR");
		assertThat(error.getField().orElse(null)).isEqualTo("kgPerWeek");

		UserProfile toSave = new UserProfile(profileId)
				.goal(UserProfile.GoalEnum.FAT_LOSS)
				.kgPerWeek(BigDecimal.valueOf(0.5))
				.currentWeightKg(BigDecimal.valueOf(80.0))
				.heightCm(BigDecimal.valueOf(180));
		MvcResult saved = mockMvc
				.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).content(json(toSave)))
				.andExpect(status().isOk())
				.andReturn();
		UserProfile savedDto = objectMapper.readValue(saved.getResponse().getContentAsString(), UserProfile.class);
		assertThat(savedDto.getId()).isEqualTo(profileId);
		assertThat(savedDto.getUpdatedAt()).isNotNull();

		// Idempotent upsert on the same client id.
		mockMvc.perform(put("/api/profile").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
				.content(json(toSave.currentWeightKg(BigDecimal.valueOf(79.5)))))
				.andExpect(status().isOk());

		MvcResult sync = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andReturn();
		SyncChangesResponse syncResponse = objectMapper.readValue(sync.getResponse().getContentAsString(),
				SyncChangesResponse.class);
		assertThat(syncResponse.getChanges()).anySatisfy(item -> {
			assertThat(item.getEntityType()).isEqualTo("UserProfile");
			assertThat(item.getId()).isEqualTo(profileId);
			assertThat(item.getDeleted()).isFalse();
		});
	}

	@Test
	void weightHistory_isIdempotentAndSoftDeletable() throws Exception {
		String username = uniqueUsername("weight");
		createUser(username, "correct-horse-battery");
		String accessToken = login(username, "correct-horse-battery").getAccessToken();

		UUID entryId = UUID.randomUUID();
		WeightHistoryEntry entry = new WeightHistoryEntry(entryId, OffsetDateTime.now(), BigDecimal.valueOf(82.3), false);

		mockMvc.perform(post("/api/profile/weight-history").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).content(json(entry)))
				.andExpect(status().isOk());

		// Same client id again -> upsert, not a duplicate.
		mockMvc.perform(post("/api/profile/weight-history").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken).content(json(entry)))
				.andExpect(status().isOk());

		MvcResult list = mockMvc
				.perform(get("/api/profile/weight-history").header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andReturn();
		WeightHistoryEntry[] entries = objectMapper.readValue(list.getResponse().getContentAsString(),
				WeightHistoryEntry[].class);
		assertThat(entries).hasSize(1);

		MvcResult deleted = mockMvc
				.perform(delete("/api/profile/weight-history/" + entryId)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
				.andExpect(status().isOk())
				.andReturn();
		WeightHistoryEntry deletedDto = objectMapper.readValue(deleted.getResponse().getContentAsString(),
				WeightHistoryEntry.class);
		assertThat(deletedDto.getDeleted()).isTrue();

		// Idempotent: deleting again is still 200, still deleted.
		mockMvc.perform(
				delete("/api/profile/weight-history/" + entryId).header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken))
				.andExpect(status().isOk());

		MvcResult updateAfterDelete = mockMvc
				.perform(put("/api/profile/weight-history/" + entryId).contentType(MediaType.APPLICATION_JSON)
						.header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
						.content(json(entry.weightKg(BigDecimal.valueOf(70)))))
				.andExpect(status().isConflict())
				.andReturn();
		assertThat(readError(updateAfterDelete).getCode()).isEqualTo("ENTITY_DELETED");
	}

	private void createUser(String username, String password) throws Exception {
		mockMvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(json(new AdminCreateUserRequest(username, password))))
				.andExpect(status().isCreated());
	}

	private AuthTokens login(String username, String password) throws Exception {
		MvcResult result = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(json(new LoginRequest(username, password))))
				.andExpect(status().isOk())
				.andReturn();
		return objectMapper.readValue(result.getResponse().getContentAsString(), AuthTokens.class);
	}

	private ApiError readError(MvcResult result) throws Exception {
		return objectMapper.readValue(result.getResponse().getContentAsString(), ApiError.class);
	}

	private String json(Object body) throws Exception {
		return objectMapper.writeValueAsString(body);
	}

	private static String uniqueUsername(String prefix) {
		return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
	}
}
