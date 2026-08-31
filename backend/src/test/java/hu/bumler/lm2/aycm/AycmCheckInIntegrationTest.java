package hu.bumler.lm2.aycm;

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

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.AycmCheckIn;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity, plus the
 * AYCM Check-In rule: one live Check-In per calendar day — a second create, or a PUT that rewrites
 * checkInDate onto a taken day, returns 409 UNIQUE_VIOLATION; a delete frees the day again.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class AycmCheckInIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static AycmCheckIn checkIn(UUID id, String date) {
		return new AycmCheckIn(id, LocalDate.parse(date), "18:30", UUID.randomUUID(), "Life1", "08:00–20:00", 3200, 0,
				3200, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("aci-idem");
		AycmCheckIn body = checkIn(UUID.randomUUID(), "2026-08-31");

		createCheckIn(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.visitValueHuf").value(3200));
		createCheckIn(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.visitValueHuf").value(3200));
	}

	@Test
	void create_rejectsSecondLiveCheckInForSameDay_with409AndConflictingId() throws Exception {
		String token = registerAndLogin("aci-dup");
		UUID firstId = UUID.randomUUID();
		createCheckIn(token, checkIn(firstId, "2026-08-31")).andExpect(status().isOk());

		createCheckIn(token, checkIn(UUID.randomUUID(), "2026-08-31"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("checkInDate"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void put_rewritingDateOntoTakenDay_returns409() throws Exception {
		String token = registerAndLogin("aci-move");
		UUID aug30 = UUID.randomUUID();
		UUID aug31 = UUID.randomUUID();
		createCheckIn(token, checkIn(aug30, "2026-08-30")).andExpect(status().isOk());
		createCheckIn(token, checkIn(aug31, "2026-08-31")).andExpect(status().isOk());

		AycmCheckIn moved = checkIn(aug31, "2026-08-30");
		mockMvc.perform(put("/api/aycm-check-ins/" + aug31).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(moved)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"));
	}

	@Test
	void delete_freesTheDay_soANewCheckInForItSucceeds() throws Exception {
		String token = registerAndLogin("aci-free");
		UUID first = UUID.randomUUID();
		createCheckIn(token, checkIn(first, "2026-08-31")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/aycm-check-ins/" + first).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		createCheckIn(token, checkIn(UUID.randomUUID(), "2026-08-31")).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheCheckInWasDeleted() throws Exception {
		String token = registerAndLogin("aci-del");
		UUID id = UUID.randomUUID();
		createCheckIn(token, checkIn(id, "2026-08-31")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/aycm-check-ins/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/aycm-check-ins/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(checkIn(id, "2026-08-31"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void get_returnsNotFound_forAnotherUsersRow_andOwnDeletedRowStill200_andAppearsInDeltaPull() throws Exception {
		String tokenA = registerAndLogin("aci-owner");
		String tokenB = registerAndLogin("aci-attacker");
		UUID id = UUID.randomUUID();
		createCheckIn(tokenA, checkIn(id, "2026-08-31")).andExpect(status().isOk());

		mockMvc.perform(get("/api/aycm-check-ins/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());

		mockMvc.perform(delete("/api/aycm-check-ins/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
				.andExpect(status().isOk());
		mockMvc.perform(get("/api/aycm-check-ins/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
				.andExpect(status().isOk()).andReturn();
		assertThat(result.getResponse().getContentAsString())
				.contains(id.toString()).contains("\"entityType\":\"AycmCheckIn\"");
	}

	private ResultActions createCheckIn(String token, AycmCheckIn body) throws Exception {
		return mockMvc.perform(post("/api/aycm-check-ins").contentType(MediaType.APPLICATION_JSON)
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
