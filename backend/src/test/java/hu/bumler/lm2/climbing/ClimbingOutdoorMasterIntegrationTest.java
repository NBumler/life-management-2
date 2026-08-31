package hu.bumler.lm2.climbing;

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
import hu.bumler.lm2.api.model.BoulderProblem;
import hu.bumler.lm2.api.model.Crag;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.Route;
import hu.bumler.lm2.api.model.Sector;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for the outdoor climbing
 * master resources (Crag -> Sector -> Route | BoulderProblem): idempotent POST replay, 409
 * ENTITY_DELETED on a PUT after delete, own deleted row still 200 on GET, cross-user 404, and that
 * creates show up in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class ClimbingOutdoorMasterIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void crag_createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("crag-idempotent");
		Crag crag = crag(UUID.randomUUID(), "Sziklakert");

		createCrag(token, crag).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sziklakert"));
		createCrag(token, crag).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sziklakert"));
	}

	@Test
	void crag_update_returnsEntityDeleted_afterDelete() throws Exception {
		String token = registerAndLogin("crag-entity-deleted");
		UUID id = UUID.randomUUID();
		createCrag(token, crag(id, "Bontandó")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/crags/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/crags/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(crag(id, "Bontandó"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void crag_delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("crag-delete");
		UUID id = UUID.randomUUID();
		createCrag(token, crag(id, "Törlendő")).andExpect(status().isOk());

		for (int i = 0; i < 2; i++) {
			mockMvc.perform(delete("/api/climbing/crags/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
					.andExpect(status().isOk());
		}
		mockMvc.perform(get("/api/climbing/crags/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void crag_get_returnsNotFound_whenCragBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("crag-owner");
		String tokenB = registerAndLogin("crag-attacker");
		UUID id = UUID.randomUUID();
		createCrag(tokenA, crag(id, "A helye")).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/crags/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void sector_createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("sector-idempotent");
		UUID cragId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Helyszín")).andExpect(status().isOk());
		Sector sector = sector(UUID.randomUUID(), cragId, "Főfal");

		createSector(token, sector).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Főfal"));
		createSector(token, sector).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Főfal"));
	}

	@Test
	void route_createIsIdempotent_andStoresGuidebookGradeVerbatim() throws Exception {
		String token = registerAndLogin("route-idempotent");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Kötél helyszín")).andExpect(status().isOk());
		createSector(token, sector(sectorId, cragId, "Kötél szektor")).andExpect(status().isOk());
		Route route = route(UUID.randomUUID(), sectorId, "Sárkányfészek");

		createRoute(token, route).andExpect(status().isOk()).andExpect(jsonPath("$.guidebookGrade").value("7b+"));
		createRoute(token, route).andExpect(status().isOk()).andExpect(jsonPath("$.guidebookGrade").value("7b+"));
	}

	@Test
	void boulderProblem_createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("problem-idempotent");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Boulder helyszín")).andExpect(status().isOk());
		createSector(token, sector(sectorId, cragId, "Boulder szektor")).andExpect(status().isOk());
		BoulderProblem problem = problem(UUID.randomUUID(), sectorId, "Kockakő");

		createProblem(token, problem).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kockakő"));
		createProblem(token, problem).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kockakő"));
	}

	@Test
	void outdoorTree_allowsDuplicateNames_acrossCragsSectorsRoutesAndProblems() throws Exception {
		String token = registerAndLogin("outdoor-dup-names");
		// Two crags with the exact same name — the outdoor master has no name-uniqueness rule.
		createCrag(token, crag(UUID.randomUUID(), "Sziget")).andExpect(status().isOk());
		createCrag(token, crag(UUID.randomUUID(), "Sziget")).andExpect(status().isOk());

		UUID cragId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Közös helyszín")).andExpect(status().isOk());
		createSector(token, sector(UUID.randomUUID(), cragId, "Bal fal")).andExpect(status().isOk());
		createSector(token, sector(UUID.randomUUID(), cragId, "Bal fal")).andExpect(status().isOk());

		UUID sectorId = UUID.randomUUID();
		createSector(token, sector(sectorId, cragId, "Közös szektor")).andExpect(status().isOk());
		createRoute(token, route(UUID.randomUUID(), sectorId, "Névtárs")).andExpect(status().isOk());
		createRoute(token, route(UUID.randomUUID(), sectorId, "Névtárs")).andExpect(status().isOk());
		createProblem(token, problem(UUID.randomUUID(), sectorId, "Névtárs")).andExpect(status().isOk());
		createProblem(token, problem(UUID.randomUUID(), sectorId, "Névtárs")).andExpect(status().isOk());
	}

	@Test
	void sector_update_returnsEntityDeleted_afterDelete() throws Exception {
		String token = registerAndLogin("sector-entity-deleted");
		UUID cragId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Szektor helyszín")).andExpect(status().isOk());
		UUID id = UUID.randomUUID();
		createSector(token, sector(id, cragId, "Bontandó szektor")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/sectors/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/sectors/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(sector(id, cragId, "Bontandó szektor"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void sector_get_returnsNotFound_whenSectorBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("sector-owner");
		String tokenB = registerAndLogin("sector-attacker");
		UUID cragId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		createCrag(tokenA, crag(cragId, "Privát szektor helyszín")).andExpect(status().isOk());
		createSector(tokenA, sector(id, cragId, "Privát szektor")).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/sectors/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void route_update_returnsEntityDeleted_afterDelete() throws Exception {
		String token = registerAndLogin("route-entity-deleted");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Út helyszín")).andExpect(status().isOk());
		createSector(token, sector(sectorId, cragId, "Út szektor")).andExpect(status().isOk());
		UUID id = UUID.randomUUID();
		createRoute(token, route(id, sectorId, "Bontandó út")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/routes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(route(id, sectorId, "Bontandó út"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void route_get_returnsNotFound_whenRouteBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("route-owner");
		String tokenB = registerAndLogin("route-attacker");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		createCrag(tokenA, crag(cragId, "Privát út helyszín")).andExpect(status().isOk());
		createSector(tokenA, sector(sectorId, cragId, "Privát út szektor")).andExpect(status().isOk());
		createRoute(tokenA, route(id, sectorId, "Privát út")).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void boulderProblem_update_returnsEntityDeleted_afterDelete() throws Exception {
		String token = registerAndLogin("problem-entity-deleted");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Blokk helyszín")).andExpect(status().isOk());
		createSector(token, sector(sectorId, cragId, "Blokk szektor")).andExpect(status().isOk());
		UUID id = UUID.randomUUID();
		createProblem(token, problem(id, sectorId, "Bontandó blokk")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/boulder-problems/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/boulder-problems/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(problem(id, sectorId, "Bontandó blokk"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void boulderProblem_get_returnsNotFound_whenProblemBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("problem-owner");
		String tokenB = registerAndLogin("problem-attacker");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		createCrag(tokenA, crag(cragId, "Privát blokk helyszín")).andExpect(status().isOk());
		createSector(tokenA, sector(sectorId, cragId, "Privát blokk szektor")).andExpect(status().isOk());
		createProblem(tokenA, problem(id, sectorId, "Privát blokk")).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/boulder-problems/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdOutdoorMasterRows_appearInTheDeltaPull() throws Exception {
		String token = registerAndLogin("outdoor-sync-delta");
		UUID cragId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		UUID routeId = UUID.randomUUID();
		UUID problemId = UUID.randomUUID();
		createCrag(token, crag(cragId, "Sync helyszín")).andExpect(status().isOk());
		createSector(token, sector(sectorId, cragId, "Sync szektor")).andExpect(status().isOk());
		createRoute(token, route(routeId, sectorId, "Sync út")).andExpect(status().isOk());
		createProblem(token, problem(problemId, sectorId, "Sync blokk")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains("\"entityType\":\"Crag\"").contains(cragId.toString());
		assertThat(body).contains("\"entityType\":\"Sector\"").contains(sectorId.toString());
		assertThat(body).contains("\"entityType\":\"Route\"").contains(routeId.toString());
		assertThat(body).contains("\"entityType\":\"BoulderProblem\"").contains(problemId.toString());
	}

	// --- helpers ---

	private static Crag crag(UUID id, String name) {
		Crag crag = new Crag(id, name, false);
		crag.latitude(47.9);
		crag.longitude(20.4);
		crag.defaultRockType("mészkő");
		return crag;
	}

	private static Sector sector(UUID id, UUID cragId, String name) {
		Sector sector = new Sector(id, cragId, name, false);
		sector.defaultAspect("észak");
		return sector;
	}

	private static Route route(UUID id, UUID sectorId, String name) {
		Route route = new Route(id, sectorId, name, "7b+", false);
		route.lengthInMeters(28.0);
		route.totalPitches(1);
		return route;
	}

	private static BoulderProblem problem(UUID id, UUID sectorId, String name) {
		return new BoulderProblem(id, sectorId, name, "7A", false);
	}

	private ResultActions createCrag(String token, Crag crag) throws Exception {
		return mockMvc.perform(post("/api/climbing/crags").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(crag)));
	}

	private ResultActions createSector(String token, Sector sector) throws Exception {
		return mockMvc.perform(post("/api/climbing/sectors").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(sector)));
	}

	private ResultActions createRoute(String token, Route route) throws Exception {
		return mockMvc.perform(post("/api/climbing/routes").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(route)));
	}

	private ResultActions createProblem(String token, BoulderProblem problem) throws Exception {
		return mockMvc.perform(post("/api/climbing/boulder-problems").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(problem)));
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
