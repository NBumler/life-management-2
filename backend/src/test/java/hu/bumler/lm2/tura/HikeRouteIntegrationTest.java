package hu.bumler.lm2.tura;

import java.math.BigDecimal;
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
import hu.bumler.lm2.api.model.HikeRoute;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis. Mirrors RecurringExpenseIntegrationTest's coverage
 * for a fresh flat, user-owned, synced entity, plus the two hike-route-specific validations (blank
 * name, fewer than 2 waypoints).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class HikeRouteIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static HikeRoute route(UUID id) {
		return new HikeRoute(id, "Kilátó túra",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)),
						List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1))),
				false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("hr-idempotent");
		HikeRoute body = route(UUID.randomUUID());

		createRoute(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kilátó túra"));
		createRoute(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kilátó túra"));
	}

	@Test
	void create_rejectsBlankName() throws Exception {
		String token = registerAndLogin("hr-blank-name");
		HikeRoute body = route(UUID.randomUUID());
		body.setName("   ");

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void create_rejectsFewerThanTwoWaypoints() throws Exception {
		String token = registerAndLogin("hr-one-point");
		HikeRoute body = route(UUID.randomUUID());
		body.setCoordinates(List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0))));

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("coordinates"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheRouteWasDeleted() throws Exception {
		String token = registerAndLogin("hr-entity-deleted");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		HikeRoute changed = route(id);
		changed.setName("Kilátó túra 2");
		mockMvc.perform(put("/api/hike-routes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("hr-del-idempotent");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenRouteBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("hr-owner-a");
		String tokenB = registerAndLogin("hr-attacker-b");
		UUID id = UUID.randomUUID();
		createRoute(tokenA, route(id)).andExpect(status().isOk());

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdRoute_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("hr-sync-delta");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"HikeRoute\"");
	}

	private ResultActions createRoute(String token, HikeRoute body) throws Exception {
		return mockMvc.perform(post("/api/hike-routes").contentType(MediaType.APPLICATION_JSON)
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
