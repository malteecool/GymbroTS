# Supabase

Edge functions and CLI usage. The database side — tables, RLS, the migration run
order — is in [`../migration/README.md`](../migration/README.md).

## Running the CLI

There is no global install. `npm i -g supabase` is deliberately blocked by the
package, so every command goes through `npx`:

```bash
npx supabase --version
```

If you would rather pin the version than take whatever `npx` fetches:
`npm install --save-dev supabase`, after which `npx supabase` resolves to the
local copy.

## One-time setup

```bash
npx supabase login
```

```bash
npx supabase link --project-ref gmanmdqmiymdmzqtexez
```

`login` opens a browser; `link` asks for the database password. Both are
interactive.

The project ref is not a secret — it is part of the API URL shipped inside the
app bundle. Nothing is protected by it being obscure; everything is protected by
RLS.

## The billing webhook

`functions/billing-webhook/` is the only writer of entitlements. `subscription`
has a SELECT policy and no write policy, so a client cannot grant itself access
no matter what it sends; this function holds the service role key and is the
single door.

### Deploy

```bash
npx supabase functions deploy billing-webhook --no-verify-jwt
```

`--no-verify-jwt` is required and is not an oversight. The caller is RevenueCat,
not a signed-in user, so there is no Supabase JWT to check. That makes the
shared-secret check inside the function the only thing between the open internet
and free subscriptions.

### Secrets

The function refuses every request with a 500 until this is set. It fails closed
on purpose — a missing secret must never degrade into "accept anything".

```bash
openssl rand -base64 32
```

```bash
npx supabase secrets set BILLING_WEBHOOK_SECRET=<the value you just generated>
```

Paste the same value into RevenueCat's webhook **Authorization header** field,
and point the webhook at:

```
https://gmanmdqmiymdmzqtexez.supabase.co/functions/v1/billing-webhook
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform —
do not set them by hand, and never put the service role key anywhere the app
bundle can reach.

To confirm what is set:

```bash
npx supabase secrets list
```

### Sandbox

Sandbox purchases cost nothing, so honouring them would make the paywall free to
anyone running a debug build. They are rejected unless you opt in, which you
only ever want on a test project:

```bash
npx supabase secrets set BILLING_ALLOW_SANDBOX=true
```

### Before a creator can be paid for

A webhook event names the payer and the product, never a creator. The product is
what maps back, via `creator_plan.external_product_id` — one store product per
creator, set with the service role:

```sql
update creator_plan
set external_product_id = 'com.gymbro.creator.<handle>'
where creator_id = '<uuid>';
```

That column is not writable by creators themselves. Letting them claim a product
identifier would let them point their plan at a product someone else sells and
collect on it.

An event whose product has no matching plan is recorded as `failed` rather than
silently dropped, because it means a creator exists in the store but not here.

## Debugging an event

```bash
npx supabase functions logs billing-webhook
```

Every delivery is also recorded in `billing_event` with a `status` of `applied`,
`ignored` or `failed`, a `detail` explaining which, and the raw payload — when a
subscription looks wrong, the only trustworthy account of what happened is what
the provider actually sent. The table has RLS on and no policies, so read it with
the service role or from the SQL editor.

Three behaviours that look like bugs and are not:

- **A redelivered event returns 200 with `deduplicated: true`.** The provider's
  event id is claimed under a unique constraint before any entitlement is
  touched, so a retry loses that race and never grants twice.
- **An out-of-order event is `ignored` as stale.** Webhooks are not ordered, and
  a late CANCELLATION must not undo the RENEWAL that really came after it.
- **CANCELLATION does not revoke access.** It means "do not renew"; the
  subscriber keeps what they paid for until `access_expires_at`. REFUND and
  CHARGEBACK are the ones that cut access immediately.
