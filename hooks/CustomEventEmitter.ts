type Listener = (...args: any[]) => void;

/**
 * The app-wide event bus, used to tell screens that data they are showing has
 * changed (a workout saved, an exercise added) without threading callbacks
 * through the navigator.
 *
 * This used to be Node's `EventEmitter` from 'events'. React Native stopped
 * resolving Node core modules implicitly, and the three methods this app
 * actually uses are small enough not to be worth a polyfill package that would
 * have to keep working across SDK upgrades.
 *
 * Semantics follow Node's: listeners fire in the order they were added, the
 * same listener may be registered more than once, and `off` removes a single
 * registration.
 */
class EventEmitter {
    private listeners = new Map<string, Listener[]>();

    on(event: string, listener: Listener): this {
        const existing = this.listeners.get(event);
        if (existing) {
            existing.push(listener);
        } else {
            this.listeners.set(event, [listener]);
        }
        return this;
    }

    off(event: string, listener: Listener): this {
        const existing = this.listeners.get(event);
        if (!existing) return this;

        const index = existing.lastIndexOf(listener);
        if (index !== -1) existing.splice(index, 1);
        if (existing.length === 0) this.listeners.delete(event);

        return this;
    }

    /** Returns whether anything was listening, as Node's does. */
    emit(event: string, ...args: any[]): boolean {
        const existing = this.listeners.get(event);
        if (!existing || existing.length === 0) return false;

        // Copied first: a listener that removes itself (or another) while it
        // runs must not shift the list being iterated.
        for (const listener of [...existing]) {
            listener(...args);
        }
        return true;
    }
}

const emitter = new EventEmitter();

export default emitter;
