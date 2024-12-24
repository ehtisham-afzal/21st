import { useSandpack } from "@codesandbox/sandpack-react"
import { CheckIcon, Clipboard } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { trackEvent, AMPLITUDE_EVENTS } from "../lib/amplitude"

export const CopyCodeButton = () => {
  const [codeCopied, setCodeCopied] = useState(false)
  const { sandpack } = useSandpack()

  const copyCode = (source: 'button' | 'shortcut') => {
    const activeFile = sandpack.activeFile
    const fileContent = sandpack.files[activeFile]?.code
    if (fileContent) {
      navigator?.clipboard?.writeText(fileContent)
      setCodeCopied(true)
      toast("Code copied to clipboard")
      trackEvent(AMPLITUDE_EVENTS.COPY_CODE, {
        fileName: activeFile,
        fileExtension: activeFile.split('.').pop(),
        copySource: source,
      })
      setTimeout(() => setCodeCopied(false), 2000)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.keyCode === 67) {
        e.preventDefault()
        copyCode('shortcut')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sandpack])

  return (
    <button
      onClick={() => copyCode("button")}
      className="absolute flex items-center gap-1 top-12 right-2 z-10 p-1 px-2 bg-background text-foreground border border-border rounded-md hover:bg-accent transition-colors md:flex h-8"
    >
      {codeCopied ? (
        <>
          <CheckIcon size={14} className="text-green-500" />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Clipboard size={14} className="text-muted-foreground/70" />
          Copy Code{" "}
          <kbd className="hidden md:inline-flex h-5 max-h-full items-center rounded border border-border px-1 ml-1 -mr-1 font-[inherit] text-[0.625rem] font-medium text-muted-foreground/70">
            {navigator?.platform?.toLowerCase()?.includes("mac") ? "⌘C" : "Ctrl+C"}
          </kbd>
        </>
      )}
    </button>
  )
}
