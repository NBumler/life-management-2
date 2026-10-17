package hu.bumler.lm2.workout;

import java.time.LocalDate;
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

import tools.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.VolleyballLog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity: idempotent
 * POST replay, 409 ENTITY_DELETED on a PUT after delete, cross-user 404, a create shows up in the
 * delta pull, plus the 240-minute duration cap (documentation/Features/Röplabda napló.md).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class VolleyballLogIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static VolleyballLog log(UUID id) {
		return new VolleyballLog(id, LocalDate.parse("2026-10-17"), 45, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("vb-idempotent");
		UUID id = UUID.randomUUID();
		VolleyballLog body = log(id);

		createVolleyballLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(45));
		createVolleyballLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(45));
	}

	@Test
	void create_keepsOptionalStatisticsFields() throws Exception {
		String token = registerAndLogin("vb-stats");
		UUID id = UUID.randomUUID();
		VolleyballLog body = log(id);
		body.intensity(VolleyballLog.IntensityEnum.HARD);
		body.setsPlayed(5);

		createVolleyballLog(token, body)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.intensity").value("HARD"))
				.andExpect(jsonPath("$.setsPlayed").value(5));
	}

	@Test
	void create_rejectsDurationAboveTheCap() throws Exception {
		String token = registerAndLogin("vb-cap");
		VolleyballLog body = new VolleyballLog(UUID.randomUUID(), LocalDate.parse("2026-10-17"), 241, false);

		createVolleyballLog(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheLogWasDeleted() throws Exception {
		String token = registerAndLogin("vb-entity-deleted");
		UUID id = UUID.randomUUID();
		createVolleyballLog(token, log(id)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/volleyball-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		VolleyballLog changed = log(id);
		changed.durationMinutes(60);
		mockMvc.perform(put("/api/volleyball-logs/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("vb-del-idempotent");
		UUID id = UUID.randomUUID();
		createVolleyballLog(token, log(id)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/volleyball-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/volleyball-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/volleyball-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenLogBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("vb-owner-a");
		String tokenB = registerAndLogin("vb-attacker-b");
		UUID id = UUID.randomUUID();
		createVolleyballLog(tokenA, log(id)).andExpect(status().isOk());

		mockMvc.perform(get("/api/volleyball-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdLog_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("vb-sync-delta");
		UUID id = UUID.randomUUID();
		createVolleyballLog(token, log(id)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"VolleyballLog\"");
	}

	private ResultActions createVolleyballLog(String token, VolleyballLog body) throws Exception {
		return mockMvc.perform(post("/api/volleyball-logs").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
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
