import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import type { SessionStore } from "../../../platform/web/src/shared/auth/session-store";

const TOKEN_KEY = "techmedia_session";

export class NativeSessionStore implements SessionStore {
  private token: string | null = null;

  async clear() {
    this.token = null;
    try {
      const keys = await SecureStoragePlugin.keys();
      if (!keys.value.includes(TOKEN_KEY)) return;
      await SecureStoragePlugin.remove({ key: TOKEN_KEY });
    } catch {}
  }

  get() {
    return this.token;
  }

  async hydrate() {
    try {
      const keys = await SecureStoragePlugin.keys();
      if (!keys.value.includes(TOKEN_KEY)) {
        this.token = null;
        return;
      }
      const stored = await SecureStoragePlugin.get({ key: TOKEN_KEY });
      this.token = stored.value || null;
    } catch {
      this.token = null;
    }
  }

  async set(token: string) {
    this.token = token;
    await SecureStoragePlugin.set({ key: TOKEN_KEY, value: token });
  }
}
