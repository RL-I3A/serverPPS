# serverPPS

Payment and access server for the PersonalizedDex generator on [PokeBinderDex](https://pokebinderdex.com).

It creates Stripe Checkout sessions, emails buyers their access link and tells the website whether an access token belongs to a paid session.

## How it works

1. The website asks the server for a Checkout session, sending the buyer's email.
2. The buyer pays on Stripe and is redirected to PersonalizedDex with the Checkout Session ID as `access_token`.
3. Stripe notifies the server through a webhook, and the server emails the same link to the buyer in case the tab is closed.
4. When PersonalizedDex loads, it calls the server to validate the token. The generator is unlocked only if the session is paid.

The server is stateless: there is no database, and Stripe is the source of truth for payment status.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/create-checkout-session` | Takes `{ "email": "..." }`, creates a one-time card payment session and returns its ID. On success the buyer is sent to PersonalizedDex, on cancellation to `payment-cancel.html`. |
| `POST` | `/webhook` | Stripe webhook, signature verified. On `checkout.session.completed`, emails the buyer their access link. |
| `GET` | `/validate-token?token=...` | Returns `{ "valid": true }` if the Checkout Session exists and is paid, `{ "valid": false }` otherwise. |

## Configuration

Settings are read from environment variables, loaded from a `.env` file that is not committed.

| Variable | Description |
| --- | --- |
| `STRIPE_SECRET_KEY` | Stripe secret API key. |
| `STRIPE_WEBHOOK_SECRET` | Signing secret of the Stripe webhook endpoint. |
| `STATIC_SITE` | Origin of the website. Used for CORS and for the redirect URLs. |
| `EMAIL_USER` | Gmail account used to send access emails. |
| `EMAIL_PASS` | Password (or app password) of that account. |
| `PORT` | Port the server listens on. |

## Tech

Node.js with Express 5, the Stripe SDK, Nodemailer (Gmail), dotenv and cors. Deployed as a web service on Render.

## Related

- [PokeBinderDex.github.io](https://github.com/RL-I3A/PokeBinderDex.github.io): the website and the PersonalizedDex front end that call this server.
