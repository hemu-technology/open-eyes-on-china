# Remark42 OAuth (docker-compose)

Enable social logins on `https://comments.openeyesonchina.com` for the site `open-eyes-on-china`.

## Callback URLs (set in provider consoles)
- Google: https://comments.openeyesonchina.com/auth/google/callback
- Facebook: https://comments.openeyesonchina.com/auth/facebook/callback
- Microsoft: https://comments.openeyesonchina.com/auth/microsoft/callback
- Apple: https://comments.openeyesonchina.com/auth/apple/callback
- Telegram: no callback; use bot token

Also set JavaScript origins / site URL to https://comments.openeyesonchina.com where applicable.

Twitter / X
- Some Remark42 builds/demos show Twitter; upstream support has varied. If your binary includes it, the typical callback is:
	- https://comments.openeyesonchina.com/auth/twitter/callback
	- Env vars (if supported): AUTH_TWITTER_CID, AUTH_TWITTER_CSEC (note: usually OAuth 1.0a API Key/Secret)
	- If your binary doesn’t include Twitter, the endpoint will return 404.

### Twitter / X setup (OAuth 1.0a)
1) In X (Twitter) Developer Portal → your App → User authentication settings:
	- Enable “User authentication” and select “OAuth 1.0a”.
	- App permissions: at least “Read”.
	- Callback URL: https://comments.openeyesonchina.com/auth/twitter/callback
	- (Optional) Website URL: https://openeyesonchina.com
	- Save the settings.
2) Copy your “API Key” and “API Key Secret” (OAuth 1.0a) and set them on the server as:
	- AUTH_TWITTER_CID=<API Key>
	- AUTH_TWITTER_CSEC=<API Key Secret>
3) Restart the docker compose.

Troubleshooting:
- Error: failed to get request token (401 code 32 “Could not authenticate you”) usually means wrong credential type (OAuth 2.0 Client ID/Secret won’t work here) or app auth not enabled.

## Required env (compose)

### Providers

See docker-compose.example.yml in this folder and replace placeholders.

## Anonymous and Email login

Anonymous login
- Server: set `AUTH_ANON=true` in `/opt/remark42/.env` (or compose env) and restart.
- UI: users will see “anonymous” in the provider list and can choose a nickname (3+ chars; letters, numbers, underscores, spaces).

Email (magic link) login
- Requirements: a working SMTP server (Gmail, SES, SendGrid, Mailgun, etc.)
- Server env:
  - `SMTP_HOST`, `SMTP_PORT`, and either `SMTP_TLS=true` or `SMTP_STARTTLS=true`
  - `SMTP_USERNAME`, `SMTP_PASSWORD` (as required by your provider)
  - `AUTH_EMAIL_ENABLE=true`
  - `AUTH_EMAIL_FROM=no-reply@openeyesonchina.com` (must be a verified/authorized sender for your SMTP)
  - Optional: `NOTIFY_USERS=email` and/or `NOTIFY_ADMINS=email`; set `NOTIFY_EMAIL_FROM` and `ADMIN_SHARED_EMAIL` accordingly.

Examples
- Gmail:
  - `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_TLS=true`, `SMTP_USERNAME=<gmail>`, `SMTP_PASSWORD=<app password>`
- Amazon SES:
  - `SMTP_HOST=email-smtp.us-east-1.amazonaws.com`, `SMTP_PORT=465`, `SMTP_TLS=true`, `SMTP_USERNAME=<SES SMTP user>`, `SMTP_PASSWORD=<SES SMTP pass>`

After changing env, restart docker compose.

## Facebook setup
1) Create an app at https://developers.facebook.com/apps (type: Consumer).
2) Add the “Facebook Login” product (Platform: Web), then:
	- Valid OAuth Redirect URIs: https://comments.openeyesonchina.com/auth/facebook/callback
	- App Domains: openeyesonchina.com
	- Website URL (in Settings → Basic → Add Platform → Website): https://openeyesonchina.com
	- Client OAuth Login and Web OAuth Login: Enabled
	- Use Strict Mode for Redirect URIs: Enabled
	- Privacy Policy URL: https://openeyesonchina.com/privacy-policy/
3) In Facebook → Settings → Basic, copy:
	- App ID → AUTH_FACEBOOK_CID
	- App Secret → AUTH_FACEBOOK_CSEC
4) Switch the app to Live mode so real users can log in (not only testers/developers).

Server env required:

## Test
1) Open any article page
2) Click Sign In → choose a provider
3) Authorize and return; you should be logged in
