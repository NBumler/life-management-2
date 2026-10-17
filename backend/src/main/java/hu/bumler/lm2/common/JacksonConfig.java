package hu.bumler.lm2.common;

import org.openapitools.jackson.nullable.JsonNullableJackson3Module;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.DeserializationFeature;

/**
 * The generated OpenAPI models (JsonNullable<T> etc. — org.openapitools:jackson-databind-nullable)
 * are generated for Jackson 3 (`useJackson3` in build.gradle.kts), so they go through Spring Boot
 * 4's own auto-configured Jackson 3 JsonMapper / HttpMessageConverter — this class only adds what
 * the generated models and the offline contract need on top of Boot's defaults (Boot registers any
 * JacksonModule bean on that mapper). ISO-8601 dates (not timestamps) are already Boot's and
 * Jackson 3's default.
 */
@Configuration
class JacksonConfig {

	@Bean
	JsonNullableJackson3Module jsonNullableModule() {
		return new JsonNullableJackson3Module();
	}

	@Bean
	JsonMapperBuilderCustomizer offlineTolerantDeserialization() {
		// backlog/080: an offline-first API must accept request bodies built by an older app
		// version. When a spec change removes or renames a field (e.g. #77 folded
		// AscentAttempt.failurePoint into notes), a still-pending outbox payload on a phone
		// that has not app-updated yet carries the old field. Ignoring it here — rather than
		// 500-ing on FAIL_ON_UNKNOWN_PROPERTIES — lets that write drain instead of bricking.
		// jakarta @Valid still rejects a genuinely missing REQUIRED field, so a real typo in a
		// required key is still caught; only extra/stale keys are silently dropped. (Jackson 3
		// already defaults this off; pinned explicitly because the contract depends on it.)
		return builder -> builder.disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
	}
}
