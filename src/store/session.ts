// ============================================================
// 🪪 Сессия пользователя (после логина через Telegram initData)
// ============================================================
import { create } from "zustand";
import { Auth, tokenStore, ApiError, type MeUser } from "@/lib/api";

interface SessionState {
  user: MeUser | null;
  loading: boolean;
  error: string | null;
  banned: boolean;
  /** Авторизация по Telegram initData (вызывается из Index.tsx). */
  loginWithInitData: (initData: string) => Promise<MeUser | null>;
  /** Подгрузить /me по существующему токену. */
  refreshMe: () => Promise<void>;
  logout: () => void;
}

function isBannedError(e: unknown): boolean {
  if (e instanceof ApiError && e.status === 403) {
    const body = e.body as { error?: string } | null | undefined;
    return body?.error === "banned";
  }
  return false;
}

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  banned: false,

  loginWithInitData: async (initData) => {
    set({ loading: true, error: null, banned: false });
    try {
      const { token, user } = await Auth.loginWithTelegram(initData);
      tokenStore.set(token);
      set({ user, loading: false });
      return user;
    } catch (e: any) {
      if (isBannedError(e)) {
        tokenStore.set(null);
        set({ loading: false, banned: true, user: null, error: "banned" });
        return null;
      }
      set({ loading: false, error: e?.message ?? "login_failed" });
      return null;
    }
  },

  refreshMe: async () => {
    if (!tokenStore.get()) return;
    try {
      const user = await Auth.me();
      set({ user, banned: false });
    } catch (e) {
      if (isBannedError(e)) {
        tokenStore.set(null);
        set({ user: null, banned: true });
        return;
      }
      tokenStore.set(null);
      set({ user: null });
    }
  },

  logout: () => {
    tokenStore.set(null);
    set({ user: null, banned: false });
  },
}));

// Удобный селектор
export const selectIsAdmin = (s: SessionState) => !!s.user?.isAdmin;

// Глобальный перехват из api.ts: любой 403 banned → выставляем banned=true.
if (typeof window !== "undefined") {
  window.addEventListener("loveshop:banned", () => {
    useSession.setState({ user: null, banned: true, loading: false, error: "banned" });
  });
}
