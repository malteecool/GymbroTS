-- =============================================================================
-- Billing webhook support
-- =============================================================================
-- Three things the webhook needs that the step 4 schema did not have:
--
--   1. A way to know WHICH creator a purchase was for.
--   2. A way to ignore a replayed event.
--   3. A way to ignore an event that arrives out of order.
--
-- All three are correctness problems that only show up in production, under
-- retries and races, which is exactly when you least want to be debugging them.
--
-- Idempotent and re-runnable. Rollback block at the bottom.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Which creator was this purchase for?
-- -----------------------------------------------------------------------------
-- A webhook event carries the payer and the product, never "creator #7". So the
-- store product has to map back to a creator, and that mapping lives here: one
-- store product per creator, recorded when the creator is onboarded.
--
-- The alternative — one shared product, with the creator carried as a subscriber
-- attribute — cannot represent subscribing to two creators at once, because
-- subscriber attributes are per-user rather than per-purchase. This mapping has
-- no such ambiguity, at the cost of a product per creator in App Store Connect
-- and Play Console.
--
-- Deliberately NOT writable by the creator. A creator can edit their price and
-- blurb; letting them also claim a product identifier would let them point their
-- plan at a product someone else sells, and collect on it. RLS works at row
-- granularity and cannot express "this row, but not this column", so this is a
-- column privilege rather than a policy.
--
-- Note the shape carefully. A column-level REVOKE does NOTHING while a
-- table-level grant stands -- the table grant covers every column, including
-- ones added later, and `REVOKE UPDATE (col)` against it silently changes
-- nothing. Verified the hard way: the first attempt used exactly that and a
-- non-creator could still claim any unused product id.
--
-- The only shape that works is to revoke the whole privilege and grant back the
-- columns that are allowed. Which also means: ANY COLUMN ADDED TO THIS TABLE
-- LATER IS UNWRITABLE BY CLIENTS until it is added to the GRANT below. That is
-- the safe default, but it will look like a mystery bug if you forget.

ALTER TABLE public.creator_plan ADD COLUMN IF NOT EXISTS external_product_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_plan_external_product
    ON public.creator_plan (external_product_id)
    WHERE external_product_id IS NOT NULL;

REVOKE INSERT, UPDATE ON public.creator_plan FROM authenticated, anon;

GRANT INSERT (creator_id, price_minor, currency, is_accepting_subscribers, blurb, created_at, updated_at)
    ON public.creator_plan TO authenticated;

-- creator_id is deliberately absent from UPDATE: a plan must not change hands.
GRANT UPDATE (price_minor, currency, is_accepting_subscribers, blurb, updated_at)
    ON public.creator_plan TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Replay protection + an audit trail
-- -----------------------------------------------------------------------------
-- Every provider retries on a non-2xx, and some retry on a timeout even after
-- the work succeeded. Recording the provider's event id under a unique
-- constraint makes the second delivery a no-op instead of a second grant.
--
-- The raw payload is kept because when a subscription is wrong, the only
-- trustworthy account of what the provider actually said is what it actually
-- said. No RLS policies at all: the service role bypasses RLS, and nobody else
-- has any business reading billing payloads.

CREATE TABLE IF NOT EXISTS public.billing_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    external_event_id TEXT NOT NULL,
    event_type TEXT,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'applied', 'ignored', 'failed')),
    detail TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, external_event_id)
);

CREATE INDEX IF NOT EXISTS idx_billing_event_received_at
    ON public.billing_event (received_at DESC);

ALTER TABLE public.billing_event ENABLE ROW LEVEL SECURITY;
-- No policies, intentionally. Service role only.

-- -----------------------------------------------------------------------------
-- 3. Out-of-order delivery
-- -----------------------------------------------------------------------------
-- Webhooks are not ordered. A RENEWAL and the CANCELLATION that follows it can
-- arrive the other way round, and applying them in arrival order would leave the
-- subscription cancelled when it is actually paid, or paid when it is actually
-- refunded.
--
-- So every event carries its own timestamp, and an event older than the last one
-- applied is discarded. This is the guard that makes replay safe even when the
-- event id check is somehow bypassed.

ALTER TABLE public.subscription ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ;

-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- DROP TABLE IF EXISTS public.billing_event;
-- ALTER TABLE public.subscription DROP COLUMN IF EXISTS last_event_at;
-- DROP INDEX IF EXISTS public.idx_creator_plan_external_product;
-- ALTER TABLE public.creator_plan DROP COLUMN IF EXISTS external_product_id;
