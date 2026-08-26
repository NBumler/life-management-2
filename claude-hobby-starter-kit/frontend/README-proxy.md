# Frontend dev proxy

`proxy.conf.json` forwards the frontend's `/api` requests to the Spring Boot
backend during local development, so you don't hit CORS errors.

## Wire it up

In `frontend/angular.json`, under the `serve` target options, add:

```json
"options": {
  "proxyConfig": "proxy.conf.json"
}
```

Or run directly:

```bash
ng serve --proxy-config proxy.conf.json
```

Then in your Angular code call `/api/...` (relative), NOT
`http://localhost:8080/...`. In production the frontend and backend are served
together (or behind a reverse proxy), so relative URLs keep working.

Adjust the `target` port if your backend runs somewhere other than 8080.
