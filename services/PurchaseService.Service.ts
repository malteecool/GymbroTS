import { NativeModules, Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PurchasesStoreProduct } from 'react-native-purchases';

/**
 * RevenueCat - the store side of creator subscriptions.
 *
 * The division of labour, because getting it backwards is the classic way to
 * ship a free paywall:
 *
 *   this file          asks the store to charge someone
 *   billing-webhook    hears from RevenueCat and writes the entitlement
 *   RLS                decides what that entitlement actually unlocks
 *
 * Nothing here grants access. A successful purchase returns a CustomerInfo the
 * app could happily believe, and believing it would be a mistake: the row in
 * `subscription` is what gates content, it is written only by the service role,
 * and it arrives when the webhook is delivered - usually seconds after the
 * purchase completes, but not the same instant. Callers must re-read the
 * entitlement from Postgres rather than trusting the purchase result.
 *
 * ONE STORE PRODUCT PER CREATOR
 * -----------------------------
 * `creator_plan.external_product_id` maps a product back to its creator, and
 * that mapping is the only reason the webhook knows who was subscribed to. The
 * alternative - one shared product plus a "which creator" subscriber attribute
 * - cannot represent subscribing to two creators at once, because subscriber
 * attributes are per-user, not per-purchase.
 *
 * Which is why this file reaches for getProducts()/purchaseStoreProduct() and
 * not Offerings. An Offering is a curated set chosen on the dashboard; here the
 * product is decided by whose profile the user is looking at.
 */

/**
 * The RevenueCat *public* SDK key. It is designed to ship inside the app bundle
 * - it can start a purchase and read that user's own customer info, and it is
 * not the secret key. The secret one lives on the RevenueCat dashboard and in
 * BILLING_WEBHOOK_SECRET, and must never reach the client.
 */
const ANDROID_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

/**
 * Android only, matching the repo: android/ is a committed native project and
 * there is no ios/ here. Wiring iOS is an API key plus a prebuild, not a change
 * to the logic below - see docs/creator-onboarding.md.
 */
function apiKeyForPlatform(): string {
    return Platform.OS === 'android' ? ANDROID_API_KEY : '';
}

let configured = false;
let configureFailed = false;
let identifiedUserId: string | null = null;

/**
 * True when purchases can actually run: a native module that was linked into
 * this build, and a key to configure it with.
 *
 * Both halves fail in ordinary situations rather than exotic ones - the module
 * is absent in Expo Go and in any build made before `react-native-purchases`
 * was installed, and the key is absent on a checkout that has not been given
 * one. Neither should crash a screen that merely mentions subscriptions, so
 * every entry point here checks this first and the UI renders an explanation
 * instead of a buy button.
 *
 * The native module is probed through NativeModules rather than by looking at
 * `Purchases.configure`, which is a static method and therefore present whether
 * or not anything is behind it. Testing the wrapper would report a working SDK
 * on an un-rebuilt app and then fail at the purchase with an unrelated message.
 * Importing the package is safe either way - it reads NativeModules.RNPurchases
 * at module scope and only throws once something is called.
 */
export function isPurchasesAvailable(): boolean {
    if (configureFailed) return false;
    return Boolean(apiKeyForPlatform()) && NativeModules?.RNPurchases != null;
}

/**
 * Configures the SDK against a known user id. Safe to call repeatedly.
 *
 * Deliberately takes the Supabase user id rather than configuring anonymously
 * and identifying afterwards. RevenueCat's app_user_id is what the webhook
 * looks up in `app_user`, so if the two ever diverge the webhook records
 * `failed: unknown subscriber <id>` - the payment succeeds and the entitlement
 * never lands. Configuring anonymously leaves a window where a purchase is
 * attributed to an anonymous id and then aliased, and aliased ids are exactly
 * the ones that go missing. The app has no signed-out surface that can buy
 * anything, so there is no reason to open that window.
 */
export async function configurePurchases(supabaseUserId: string): Promise<void> {
    if (!isPurchasesAvailable()) return;

    try {
        if (!configured) {
            if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.DEBUG);
            Purchases.configure({ apiKey: apiKeyForPlatform(), appUserID: supabaseUserId });
            configured = true;
            identifiedUserId = supabaseUserId;
            return;
        }

        // Already configured, for someone else: an account switch inside one
        // process. logIn moves the SDK across without tearing anything down.
        if (identifiedUserId !== supabaseUserId) {
            await Purchases.logIn(supabaseUserId);
            identifiedUserId = supabaseUserId;
        }
    } catch (error) {
        // A store that will not talk to us must not take the app down with it.
        // Latching the failure turns every paywall into "not available in this
        // build", which is the honest message - rather than a buy button that
        // will throw again for the same reason the moment it is tapped.
        console.error('Error configuring RevenueCat:', error);
        configureFailed = true;
    }
}

/**
 * Detaches the store identity at sign-out, so the next person to use the device
 * does not inherit the last one's entitlements out of the SDK cache.
 */
export async function resetPurchaser(): Promise<void> {
    if (!isPurchasesAvailable() || !configured) return;
    try {
        await Purchases.logOut();
    } catch (error) {
        console.error('Error logging out of RevenueCat:', error);
    } finally {
        identifiedUserId = null;
    }
}

/** Who the SDK currently thinks it is buying for. */
export function currentPurchaserId(): string | null {
    return identifiedUserId;
}

/**
 * The store's own listing for a creator's product - the price the user will
 * actually be charged, in their currency, formatted the way the store formats
 * it.
 *
 * Prefer this over creator_plan.price_minor anywhere a real number is shown.
 * The plan's price is metadata a creator typed in; this one is the charge.
 * Returns null when the product does not exist in the store, which in practice
 * means a creator onboarded here but not there.
 */
export async function getCreatorProduct(productId: string): Promise<PurchasesStoreProduct | null> {
    if (!isPurchasesAvailable()) return null;
    try {
        const products = await Purchases.getProducts([productId]);
        return products.find(p => p.identifier === productId) ?? products[0] ?? null;
    } catch (error) {
        console.error('Error fetching creator product:', error);
        return null;
    }
}

/** A purchase the user themselves called off. Not an error to report. */
export class PurchaseCancelledError extends Error {
    constructor() {
        super('Purchase cancelled');
        this.name = 'PurchaseCancelledError';
    }
}

/**
 * Buys a creator's subscription product.
 *
 * Resolving does NOT mean the user has access yet. It means the store took the
 * money and RevenueCat knows about it; the entitlement appears once the webhook
 * has written it. Callers should poll the database - see awaitEntitlement() in
 * hooks/useCreatorAccess.ts - rather than assuming.
 */
export async function purchaseCreatorSubscription(productId: string): Promise<void> {
    if (!isPurchasesAvailable()) {
        throw new Error('In-app purchases are not available in this build');
    }
    if (!identifiedUserId) {
        // Buying while unidentified produces a payment whose entitlement cannot
        // be attributed to anyone. Refuse rather than take the money.
        throw new Error('Not signed in to the store yet - try again in a moment');
    }

    const product = await getCreatorProduct(productId);
    if (!product) {
        throw new Error('This subscription is not available in the store right now');
    }

    try {
        await Purchases.purchaseStoreProduct(product);
    } catch (error: any) {
        if (error?.userCancelled) throw new PurchaseCancelledError();
        throw error;
    }
}

/**
 * Re-syncs purchases made on this store account - a reinstall, a new device.
 *
 * This asks RevenueCat to re-examine the account, which re-fires the webhooks
 * that write entitlements. It cannot itself grant anything, so a restore that
 * finds a genuine purchase still lands through the same single door.
 */
export async function restorePurchases(): Promise<void> {
    if (!isPurchasesAvailable()) {
        throw new Error('In-app purchases are not available in this build');
    }
    await Purchases.restorePurchases();
}
