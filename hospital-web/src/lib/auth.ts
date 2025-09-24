export const auth = {
  set(token: string) {
    if (typeof window === "undefined") return
    window.localStorage.setItem("token", token)
  },
  get() {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem("token")
  },
  clear() {
    if (typeof window === "undefined") return
    window.localStorage.removeItem("token")
  },
  isAuthed() {
    if (typeof window === "undefined") return false
    const raw = window.localStorage.getItem("token")
    if (!raw) return false
    const trimmed = raw.trim()
    return trimmed.length > 0 && trimmed !== "null" && trimmed !== "undefined"
  },
}
