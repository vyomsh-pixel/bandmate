import { useEffect } from "react"

type ShortcutMap = {
  [key: string]: (e: KeyboardEvent) => void
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap, active = true) {
  useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      // Check for exact matches
      const key = e.key.toLowerCase()
      const isShift = e.shiftKey
      const isCtrl = e.ctrlKey || e.metaKey // Mac cmd = metaKey
      const isAlt = e.altKey

      let shortcutKey = ""
      if (isCtrl) shortcutKey += "ctrl+"
      if (isAlt) shortcutKey += "alt+"
      if (isShift && key !== "shift") shortcutKey += "shift+"
      
      // If the key is ' ', e.key is " ", so map it to "space" for ease of use
      const keyName = key === " " ? "space" : key
      shortcutKey += keyName

      const handler = shortcuts[shortcutKey] || shortcuts[keyName]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcuts, active])
}
