package hu.bumler.lm2.climbing;

import java.time.LocalDate;
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
import hu.bumler.lm2.api.model.AscentAttempt;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.ClimbingSession;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.PitchLog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the three-level nested
 * aggregate diff from documentation/Features/Mászónapló.md: idempotent POST replay, PUT tree replace
 * (add/remove at attempt and pitch level), 409 ENTITY_DELETED, delete cascade + own-deleted GET 200,
 * cross-user 404, discriminator + outdoor fields round-trip, and that the whole tree shows up in the
 * delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class ClimbingSessionIntegrationTest {

	private static final LocalDate DATE = LocalDate.parse("2026-08-29");

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private ClimbingSession indoorBoulderSession(UUID id, List<AscentAttempt> attempts) {
		return new ClimbingSession(id, DATE, ClimbingSession.LocationTypeEnum.INDOOR, ClimbingSession.DisciplineEnum.BOULDER,
				attempts, false);
	}

	private ClimbingSession outdoorRopeSession(UUID id, List<AscentAttempt> attempts) {
		return new ClimbingSession(id, DATE, ClimbingSession.LocationTypeEnum.OUTDOOR, ClimbingSession.DisciplineEnum.ROPE,
				attempts, false);
	}

	private AscentAttempt attempt(UUID id, UUID sessionId, int orderIndex, boolean success, List<PitchLog> pitches) {
		return new AscentAttempt(id, sessionId, success, orderIndex, pitches, false);
	}

	private PitchLog pitch(UUID id, UUID attemptId, int pitchNumber, boolean lead) {
		PitchLog pitch = new PitchLog(id, attemptId, pitchNumber, lead, pitchNumber - 1, false);
		pitch.rawGrade("6a");
		pitch.lengthInMeters(30.0);
		return pitch;
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("cs-idempotent");
		UUID id = UUID.randomUUID();
		UUID attemptId = UUID.randomUUID();
		ClimbingSession dto = indoorBoulderSession(id, List.of(attempt(attemptId, id, 0, true, List.of())));

		createSession(token, dto).andExpect(status().isOk()).andExpect(jsonPath("$.attempts.length()").value(1));
		createSession(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.attempts.length()").value(1))
				.andExpect(jsonPath("$.discipline").value("BOULDER"));
	}

	@Test
	void create_storesDiscriminatorsAndOutdoorFields_verbatim() throws Exception {
		String token = registerAndLogin("cs-outdoor-fields");
		UUID id = UUID.randomUUID();
		ClimbingSession dto = outdoorRopeSession(id, List.of());
		dto.weatherConditions(ClimbingSession.WeatherConditionsEnum.COLD_DRY);
		dto.rockType("gránit");
		dto.aspect("észak");
		dto.climbingPartners(List.of("Anna", "Béla"));
		dto.totalSessionDurationMinutes(120);

		createSession(token, dto).andExpect(status().isOk())
				.andExpect(jsonPath("$.locationType").value("OUTDOOR"))
				.andExpect(jsonPath("$.discipline").value("ROPE"))
				.andExpect(jsonPath("$.weatherConditions").value("COLD_DRY"))
				.andExpect(jsonPath("$.rockType").value("gránit"))
				.andExpect(jsonPath("$.aspect").value("észak"))
				.andExpect(jsonPath("$.climbingPartners[1]").value("Béla"))
				.andExpect(jsonPath("$.totalSessionDurationMinutes").value(120));
	}

	@Test
	void update_replacesTheTree_addingAPitchAndRemovingAnAttempt() throws Exception {
		String token = registerAndLogin("cs-tree-diff");
		UUID id = UUID.randomUUID();
		UUID keptAttemptId = UUID.randomUUID();
		UUID removedAttemptId = UUID.randomUUID();
		UUID keptPitchId = UUID.randomUUID();
		createSession(token, outdoorRopeSession(id, List.of(
				attempt(keptAttemptId, id, 0, true, List.of(pitch(keptPitchId, keptAttemptId, 1, true))),
				attempt(removedAttemptId, id, 1, false, List.of(pitch(UUID.randomUUID(), removedAttemptId, 1, true))))))
				.andExpect(status().isOk());

		UUID addedPitchId = UUID.randomUUID();
		ClimbingSession updated = outdoorRopeSession(id, List.of(attempt(keptAttemptId, id, 0, true, List.of(
				pitch(keptPitchId, keptAttemptId, 1, true),
				pitch(addedPitchId, keptAttemptId, 2, false)))));

		MvcResult putResult = mockMvc.perform(put("/api/climbing/sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(updated)))
				.andExpect(status().isOk())
				.andReturn();
		ClimbingSession body = objectMapper.readValue(putResult.getResponse().getContentAsString(), ClimbingSession.class);

		assertThat(body.getAttempts()).anySatisfy(a -> {
			assertThat(a.getId()).isEqualTo(removedAttemptId);
			assertThat(a.getDeleted()).isTrue();
		});
		assertThat(body.getAttempts()).anySatisfy(a -> {
			assertThat(a.getId()).isEqualTo(keptAttemptId);
			assertThat(a.getDeleted()).isFalse();
			assertThat(a.getPitches()).filteredOn(p -> !p.getDeleted()).hasSize(2);
			assertThat(a.getPitches()).anySatisfy(p -> assertThat(p.getId()).isEqualTo(addedPitchId));
		});
	}

	@Test
	void update_returnsEntityDeleted_afterTheSessionWasDeleted() throws Exception {
		String token = registerAndLogin("cs-entity-deleted");
		UUID id = UUID.randomUUID();
		createSession(token, indoorBoulderSession(id, List.of())).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/sessions/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(indoorBoulderSession(id, List.of()))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_cascadesToTheTree_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("cs-delete-cascade");
		UUID id = UUID.randomUUID();
		UUID attemptId = UUID.randomUUID();
		createSession(token, outdoorRopeSession(id, List.of(
				attempt(attemptId, id, 0, true, List.of(pitch(UUID.randomUUID(), attemptId, 1, true))))))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/climbing/sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true))
				.andExpect(jsonPath("$.attempts[0].deleted").value(true))
				.andExpect(jsonPath("$.attempts[0].pitches[0].deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenSessionBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("cs-owner-a");
		String tokenB = registerAndLogin("cs-attacker-b");
		UUID id = UUID.randomUUID();
		createSession(tokenA, indoorBoulderSession(id, List.of())).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/sessions/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdSessionTree_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("cs-sync-delta");
		UUID id = UUID.randomUUID();
		UUID attemptId = UUID.randomUUID();
		UUID pitchId = UUID.randomUUID();
		createSession(token, outdoorRopeSession(id, List.of(
				attempt(attemptId, id, 0, true, List.of(pitch(pitchId, attemptId, 1, true))))))
				.andExpect(status().isOk());

		MvcResult result = mockMvc.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"ClimbingSession\"");
		assertThat(body).contains(attemptId.toString()).contains("\"entityType\":\"AscentAttempt\"");
		assertThat(body).contains(pitchId.toString()).contains("\"entityType\":\"PitchLog\"");
	}

	private ResultActions createSession(String token, ClimbingSession dto) throws Exception {
		return mockMvc.perform(post("/api/climbing/sessions").contentType(MediaType.APPLICATION_JSON)
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
