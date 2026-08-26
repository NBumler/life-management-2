# Testing

Aim: fast feedback, test behavior not implementation. Don't chase 100% coverage
on a hobby project — cover the logic that would hurt if it broke.

## The pyramid (pragmatic version)

- **Unit tests** — services with plain JUnit 5 + Mockito for collaborators.
  Fast, no Spring context. This is where most business logic is tested.
- **Slice tests** — `@WebMvcTest` for controllers (MockMvc, mocked service),
  `@DataJpaTest` for repositories/queries.
- **Integration tests** — `@SpringBootTest` + Testcontainers for the real DB,
  for the few end-to-end paths that matter.

## Testcontainers (real DB in tests)

```java
@SpringBootTest
@Testcontainers
class UserIntegrationTest {

    @Container
    static PostgreSQLContainer<?> db = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", db::getJdbcUrl);
        r.add("spring.datasource.username", db::getUsername);
        r.add("spring.datasource.password", db::getPassword);
    }

    @Test
    void createsUser() { /* ... */ }
}
```

## Conventions

- Test names describe behavior: `returnsNotFoundWhenUserMissing()`.
- Use AssertJ (`assertThat(...)`) — reads better than JUnit asserts.
- One logical assertion per test where practical.
- Arrange-Act-Assert structure, with blank lines separating the three.
