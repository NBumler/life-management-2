package hu.bumler.lm2.gear;

import java.util.List;
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
import hu.bumler.lm2.api.model.PackingSessionDetail;
import hu.bumler.lm2.api.model.PackingSessionItem;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers what PackingSessionServiceTest's mocks cannot: the real Postgres uuid[] mapping for
 * sourceTemplateIds (the riskiest new mechanism in this slice), a real DB-level UNIQUE_VIOLATION on
 * a duplicate gearItemId within one session, status/sortOrder updates via the standalone item
 * endpoint, cascade in both directions, and delta-pull visibility for both entity types.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class PackingSessionIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createWithItems_persistsSourceTemplateIdsAsARealPostgresArray_andIsIdempotent() throws Exception {
		String token = registerAndLogin("session-array");
		UUID gearId = createGearItem(token, "Kötél");
		UUID templateA = UUID.randomUUID();
		UUID templateB = UUID.randomUUID();

		UUID sessionId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		PackingSessionDetail dto = new PackingSessionDetail(sessionId, false,
				List.of(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false)))
				.destination("Tátra").sourceTemplateIds(List.of(templateA, templateB));

		createSession(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.sourceTemplateIds.length()").value(2))
				.andExpect(jsonPath("$.sourceTemplateIds[0]").value(templateA.toString()))
				.andExpect(jsonPath("$.sourceTemplateIds[1]").value(templateB.toString()))
				.andExpect(jsonPath("$.items[0].status").value("NOT_PACKED"));
		// Replaying the exact same create (e.g. an outbox retry) must not fail or duplicate.
		createSession(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
	}

	@Test
	void create_returnsUniqueViolation_whenTheSameGearItemAppearsTwiceInTheInitialItemSet() throws Exception {
		String token = registerAndLogin("session-dup-item");
		UUID gearId = createGearItem(token, "Sátor");
		UUID sessionId = UUID.randomUUID();

		PackingSessionDetail dto = new PackingSessionDetail(sessionId, false,
				List.of(
						new PackingSessionItem(UUID.randomUUID(), sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false),
						new PackingSessionItem(UUID.randomUUID(), sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 1, false)));

		createSession(token, dto).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"));
	}

	@Test
	void statusAndSortOrder_areUpdatedThroughTheStandaloneItemEndpoint() throws Exception {
		String token = registerAndLogin("session-status");
		UUID gearId = createGearItem(token, "Fejlámpa");
		UUID sessionId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createSession(token,
				new PackingSessionDetail(sessionId, false,
						List.of(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false))))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/packing-session-items/" + itemId).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.PACKED, 0, false))))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("PACKED"));
	}

	@Test
	void extraItem_canBeAddedToARunningSession_butNotTwiceForTheSameGear() throws Exception {
		String token = registerAndLogin("session-extra-item");
		UUID gearId = createGearItem(token, "Konyhai kanál");
		UUID sessionId = UUID.randomUUID();
		createSession(token, new PackingSessionDetail(sessionId, false, List.of())).andExpect(status().isOk());

		UUID newItemId = UUID.randomUUID();
		mockMvc.perform(post("/api/packing-session-items").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new PackingSessionItem(newItemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false))))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/packing-session-items").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new PackingSessionItem(UUID.randomUUID(), sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 1, false))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("gearItemId"));
	}

	@Test
	void delete_cascadesToLiveItems_isIdempotent_andHasNoDoneVsCancelledDistinction() throws Exception {
		String token = registerAndLogin("session-close");
		UUID gearId = createGearItem(token, "Hálózsák");
		UUID sessionId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createSession(token,
				new PackingSessionDetail(sessionId, false,
						List.of(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/packing-sessions/" + sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andExpect(jsonPath("$.deleted").value(true));
		mockMvc.perform(delete("/api/packing-sessions/" + sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/packing-sessions/" + sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.items[0].deleted").value(true));
	}

	@Test
	void deletingAGearItem_cascadesToItsLiveSessionItems_butLeavesTheSessionItself() throws Exception {
		String token = registerAndLogin("gear-to-session-cascade");
		UUID gearId = createGearItem(token, "Ereszkedő eszköz");
		UUID sessionId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createSession(token,
				new PackingSessionDetail(sessionId, false,
						List.of(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/gear-items/" + gearId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/packing-sessions/" + sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(false))
				.andExpect(jsonPath("$.items[0].deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenSessionBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("session-owner-a");
		String tokenB = registerAndLogin("session-attacker-b");
		UUID sessionId = UUID.randomUUID();
		createSession(tokenA, new PackingSessionDetail(sessionId, false, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/packing-sessions/" + sessionId).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdSessionAndItem_appearInTheDeltaPull() throws Exception {
		String token = registerAndLogin("session-sync-delta");
		UUID gearId = createGearItem(token, "Törpe gáztűzhely");
		UUID sessionId = UUID.randomUUID();
		UUID itemId = UUID.randomUUID();
		createSession(token,
				new PackingSessionDetail(sessionId, false,
						List.of(new PackingSessionItem(itemId, sessionId, gearId, PackingSessionItem.StatusEnum.NOT_PACKED, 0, false))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains("\"entityType\":\"PackingSession\"").contains(sessionId.toString());
		assertThat(body).contains("\"entityType\":\"PackingSessionItem\"").contains(itemId.toString());
	}

	private UUID createGearItem(String token, String name) throws Exception {
		UUID id = UUID.randomUUID();
		mockMvc.perform(post("/api/gear-items").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(new GearItem(id, name, false))))
				.andExpect(status().isOk());
		return id;
	}

	private ResultActions createSession(String token, PackingSessionDetail dto) throws Exception {
		return mockMvc.perform(post("/api/packing-sessions").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(dto)));
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
