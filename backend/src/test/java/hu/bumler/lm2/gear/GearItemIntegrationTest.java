package hu.bumler.lm2.gear;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.GearItem;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" that apply to a
 * fresh entity: idempotent POST replay, 409 UNIQUE_VIOLATION with field + conflictingId, 409
 * ENTITY_DELETED on a PUT after delete, cross-user 404, and that a create shows up in the delta
 * pull (GET /api/sync/changes).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class GearItemIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("gear-idempotent");
		UUID id = UUID.randomUUID();
		GearItem item = new GearItem(id, "Kötél", false);

		createGearItem(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kötél"));
		// Replaying the exact same create (e.g. an outbox retry after a dropped response) must not 409.
		createGearItem(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kötél"));
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("gear-unique");
		UUID firstId = UUID.randomUUID();
		createGearItem(token, new GearItem(firstId, "Bundazsák", false)).andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createGearItem(token, new GearItem(secondId, "Bundazsák", false))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_allowsTheNameAgain_afterTheOriginalItemWasDeleted() throws Exception {
		// documentation/Subfeatures/Eszközök.md: "Törölt név újra felvehető".
		String token = registerAndLogin("gear-reuse-name");
		UUID firstId = UUID.randomUUID();
		createGearItem(token, new GearItem(firstId, "Sátor", false)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/gear-items/" + firstId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createGearItem(token, new GearItem(secondId, "Sátor", false)).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheItemWasDeleted() throws Exception {
		String token = registerAndLogin("gear-entity-deleted");
		UUID id = UUID.randomUUID();
		createGearItem(token, new GearItem(id, "Hálózsák", false)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/gear-items/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/gear-items/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new GearItem(id, "Hálózsák (átírva)", false))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("gear-delete-idempotent");
		UUID id = UUID.randomUUID();
		createGearItem(token, new GearItem(id, "Törpe gáztűzhely", false)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/gear-items/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/gear-items/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/gear-items/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenItemBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("gear-owner-a");
		String tokenB = registerAndLogin("gear-attacker-b");
		UUID id = UUID.randomUUID();
		createGearItem(tokenA, new GearItem(id, "Mászóhám", false)).andExpect(status().isOk());

		mockMvc.perform(get("/api/gear-items/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdItem_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("gear-sync-delta");
		UUID id = UUID.randomUUID();
		createGearItem(token, new GearItem(id, "Ereszkedő eszköz", false)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"GearItem\"");
	}

	private ResultActions createGearItem(String token, GearItem item) throws Exception {
		return mockMvc.perform(post("/api/gear-items").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(item)));
	}

	private String registerAndLogin(String usernamePrefix) throws Exception {
		String username = usernamePrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
		String password = "correct-horse-battery";
		mockMvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(json(new AdminCreateUserRequest(username, password))))
				.andExpect(status().isCreated());

		MvcResult login = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(json(new LoginRequest(username, password))))
				.andExpect(status().isOk()).andReturn();
		return objectMapper.readValue(login.getResponse().getContentAsString(), AuthTokens.class).getAccessToken();
	}

	private String json(Object body) throws Exception {
		return objectMapper.writeValueAsString(body);
	}
}
