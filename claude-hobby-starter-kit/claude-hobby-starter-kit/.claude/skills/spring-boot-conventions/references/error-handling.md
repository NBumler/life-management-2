# Error Handling

Use ONE global handler instead of try/catch scattered in controllers.

## Global handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiError> handleNotFound(EntityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ApiError("NOT_FOUND", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        var msg = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> e.getField() + ": " + e.getDefaultMessage())
            .collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR", msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex) {
        // log the full stack trace server-side, return a generic message to the client
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ApiError("INTERNAL_ERROR", "Unexpected error"));
    }
}
```

## Error response shape

Keep it stable and simple — the frontend depends on it:

```java
public record ApiError(String code, String message) {}
```

## Rules

- Throw domain exceptions from services (e.g. `EntityNotFoundException`,
  a custom `BusinessRuleException`); let the handler map them to HTTP.
- Do NOT leak stack traces or internal messages to the client on 500.
- Use a machine-readable `code` (`NOT_FOUND`, `VALIDATION_ERROR`) so the
  frontend can react without parsing prose.
- Keep user-facing text out of hardcoded strings if you localize — return a
  code and let the frontend translate it (ties in with ngx-translate).
