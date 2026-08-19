package hu.bumler.lm2.common;

import java.util.List;

import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * The generated OpenAPI models (JsonNullable<T> etc. — org.openapitools:jackson-databind-nullable)
 * are Jackson 2 (com.fasterxml.jackson.*). Spring Boot 4 defaults to a Jackson 3
 * (tools.jackson.*) ObjectMapper/HttpMessageConverter that can't see them — this is the
 * generator-vs-framework compatibility risk documentation/Architektúra/Backend.md flags as an open
 * question. Registering a Jackson 2 converter ahead of Boot's default keeps spec-first codegen
 * working without falling back to hand-written API interfaces.
 */
@Configuration
class JacksonConfig implements WebMvcConfigurer {

	@Bean
	ObjectMapper generatedModelObjectMapper() {
		return new ObjectMapper()
				.registerModule(new JavaTimeModule())
				.registerModule(new JsonNullableModule())
				.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
	}

	@Override
	public void extendMessageConverters(List<HttpMessageConverter<?>> converters) {
		converters.add(0, new MappingJackson2HttpMessageConverter(generatedModelObjectMapper()));
	}
}
