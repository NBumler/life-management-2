package hu.bumler.lm2.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.AuthApi;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.RefreshRequest;

@RestController
class AuthController implements AuthApi {

	private final AuthService authService;

	AuthController(AuthService authService) {
		this.authService = authService;
	}

	@Override
	public ResponseEntity<AuthTokens> login(LoginRequest loginRequest) {
		return ResponseEntity.ok(authService.login(loginRequest.getUsername(), loginRequest.getPassword()));
	}

	@Override
	public ResponseEntity<AuthTokens> refresh(RefreshRequest refreshRequest) {
		return ResponseEntity.ok(authService.refresh(refreshRequest.getRefreshToken()));
	}

	@Override
	public ResponseEntity<Void> logout(RefreshRequest refreshRequest) {
		authService.logout(refreshRequest.getRefreshToken());
		return ResponseEntity.noContent().build();
	}
}
