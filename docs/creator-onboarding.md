# Onboarding a creator with a real store product

How a person goes from "has workouts" to "can be paid for them". Four systems
have to agree, and they are onboarded in this order because each step needs the
one before it.

The database side is in [`../migration/README.md`](../migration/README.md); the
webhook and CLI are in [`../supabase/README.md`](../supabase/README.md). This
file is the part that involves Google Play and RevenueCat.

## The mapping that makes it work

A webhook event names the payer and the product. It never names a creator. The
product is what maps back:

```
Play Store product  ──►  creator_plan.external_product_id  ──►  creator_id
```

**One store product per creator.** The obvious alternative — one shared
"Gymbro Creator Subscription" product plus a subscriber attribute saying which
creator — cannot represent subscribing to two creators at once, because
subscriber attributes are per-user, not per-purchase. There is no way to retrofit
that later without reissuing everyone's subscription, so it is worth getting
right the first time.

Pick the identifier before you start and use it everywhere:

```
com.gymbro.creator.<handle>
```

## One-time: the app needs an SDK key

Add the RevenueCat **public** Android SDK key to `.env` (which is gitignored):

```
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxxxxxxxxx
```

Find it at RevenueCat → Project settings → API keys → the Play Store app's
*public* key. It is designed to ship inside the app bundle: it can start a
purchase and read that user's own customer info, and that is all. The **secret**
key is a different value, belongs on the dashboard and in
`BILLING_WEBHOOK_SECRET`, and must never reach the client.

Without it `isPurchasesAvailable()` is false, and every paywall renders
"Subscriptions are not available in this build" instead of a buy button. That is
also what you will see in Expo Go and in any build made before
`react-native-purchases` was installed — it is a native module, so a JS reload is
not enough:

```bash
npx expo run:android
```

## 1. The creator sets up their plan (in the app)

Settings → **Creator Plan**. They set a price, a currency, a blurb, and whether
they are accepting subscribers.

The screen will tell them their plan is **not sellable yet**, which is true and
deliberate: `external_product_id` is still null. They cannot fill it in, and
that is a privilege, not a policy — the table's UPDATE grant is revoked and
re-granted column by column, and that column is not among them
(`migration/rls-step8-billing-webhook.sql`). A creator who could claim a product
identifier could point their plan at a product someone else sells and collect on
it.

The price they type here is display metadata. The amount actually charged is
whatever Play charges for the product below, and keeping the two in step is
manual. If they disagree, the store wins and the app lies.

## 2. Create the product in Google Play Console

Play Console → the app → Monetise → **Subscriptions** → Create subscription.

- **Product ID**: `com.gymbro.creator.<handle>` — immutable once created, so
  check the spelling before saving.
- **Base plan**: monthly, auto-renewing.
- **Price**: what the creator agreed to. This is the real one.

The product must be **active** before RevenueCat can see it, and the app must
have at least one release on a track (internal testing counts) before Play will
let you create subscriptions at all.

## 3. Wire it into RevenueCat

RevenueCat dashboard → your project.

1. **Products** → New → paste the same `com.gymbro.creator.<handle>`, attached to
   the Play Store app.
2. No Offering is needed. The app calls `getProducts([productId])` and
   `purchaseStoreProduct()` directly, because which product to sell is decided by
   whose profile the user is looking at, not by a curated set on the dashboard.
   See the note at the top of `services/PurchaseService.Service.ts`.
3. **Integrations → Webhooks** must already point at
   `https://gmanmdqmiymdmzqtexez.supabase.co/functions/v1/billing-webhook`
   with the `BILLING_WEBHOOK_SECRET` value in the Authorization header. That is a
   one-time setup, not per creator — see `../supabase/README.md`.

## 4. Link the product to the creator (service role)

The step nothing else can do for you. In the Supabase SQL editor, or with the
service role:

```sql
update creator_plan
set external_product_id = 'com.gymbro.creator.<handle>'
where creator_id = '<uuid>';
```

Confirm it took, and that the creator is actually open for business:

```sql
select creator_id, external_product_id, is_accepting_subscribers, price_minor, currency
from creator_plan
where external_product_id = 'com.gymbro.creator.<handle>';
```

`is_accepting_subscribers = false` means the subscribe button stays hidden no
matter what else is correct.

## 5. Verify end to end

With `BILLING_ALLOW_SANDBOX=true` **on a test project only** — sandbox purchases
cost nothing, so honouring them on production would make the paywall free to
anyone running a debug build.

1. Mark one of the creator's workouts subscriber-only: open it, tap the pencil,
   set **Who can open it** to *Subscribers*. The workout must be public first —
   the control is disabled otherwise, because a tier on an unshared workout means
   nothing.
2. From a different account, open that creator's workouts. The card should show
   a **Subscribers** badge, no exercise names, and *Subscribe to unlock*.
3. Subscribe with a Play licence tester account.
4. Watch it land:

```bash
npx supabase functions logs billing-webhook
```

```sql
select event_type, status, detail, created_at
from billing_event
order by created_at desc
limit 10;
```

A successful onboarding looks like `INITIAL_PURCHASE → active`, status
`applied`. The three failures you will actually hit:

| `detail` | What is wrong |
|---|---|
| `no creator_plan for product …` | Step 4 was skipped, or the product id differs |
| `unknown subscriber <uuid>` | RevenueCat's app_user_id is not a Supabase user id |
| `sandbox event rejected on a production project` | Testing against production |

The second one is the expensive one — the payment succeeds and the entitlement
never lands. The app ties RevenueCat's identity to the Supabase session in
`hooks/useAuth.ts` precisely so this cannot drift; if you see it, something
configured the SDK outside that path.

## Turning a creator off

Set `is_accepting_subscribers = false`. That hides the subscribe button and
nothing else — it does not cancel anyone, and existing subscribers keep the
access they paid for until `access_expires_at`. That is the correct behaviour:
they paid for it.

Do **not** clear `external_product_id` to achieve this. The mapping is how
in-flight events (a renewal, a late refund) still find their creator, and an
event whose product has no plan is recorded as `failed`.

## Still to do

- **iOS.** Only Android is wired: `android/` is a committed native project and
  there is no `ios/` here. Adding it is an App Store Connect product, a second
  RevenueCat app, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, a branch in
  `apiKeyForPlatform()` in `services/PurchaseService.Service.ts`, and a prebuild.
  No logic changes.
- **Payouts, tax and refund handling** are outside all of this. Play collects,
  and getting money to creators is not modelled anywhere yet.
