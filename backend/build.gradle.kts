plugins {
	java
	id("org.springframework.boot") version "4.1.0"
	id("io.spring.dependency-management") version "1.1.7"
	id("org.openapi.generator") version "7.24.0"
}

group = "hu.bumler.lm2"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(25)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.openapitools:jackson-databind-nullable:0.2.11")
	implementation("org.springframework.boot:spring-boot-starter-jackson")
	// Jackson 2 (com.fasterxml.jackson.*), not Boot 4's default Jackson 3 (tools.jackson.*) —
	// see JacksonConfig for why. Version pinned to what jackson-databind-nullable resolves to.
	implementation("com.fasterxml.jackson.core:jackson-databind:2.21.4")
	implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.21.4")
	implementation("io.jsonwebtoken:jjwt-api:0.13.0")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.13.0")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.13.0")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.boot:spring-boot-starter-jackson-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

// OpenAPI spec-first: backend/src/main/resources/openapi.yaml is the hand-written SSOT
// (see documentation/Architektúra/Backend.md). Only interfaces + DTOs are generated;
// controllers implement the generated interfaces.
openApiGenerate {
	generatorName.set("spring")
	inputSpec.set(layout.projectDirectory.file("src/main/resources/openapi.yaml").asFile.path)
	outputDir.set(layout.buildDirectory.dir("generated/openapi").get().asFile.path)
	apiPackage.set("hu.bumler.lm2.api")
	modelPackage.set("hu.bumler.lm2.api.model")
	configOptions.set(
		mapOf(
			"interfaceOnly" to "true",
			"useTags" to "true",
			"documentationProvider" to "none",
		)
	)
}

sourceSets {
	main {
		java {
			srcDir(layout.buildDirectory.dir("generated/openapi/src/main/java"))
		}
	}
}

tasks.named("compileJava") {
	dependsOn("openApiGenerate")
}
