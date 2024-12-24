import React, { useState, useRef, Suspense, useMemo } from "react"
import {
  SandpackProvider,
  SandpackLayout,
  SandpackCodeViewer,
  SandpackFileExplorer,
} from "@codesandbox/sandpack-react"
import { ComponentPageInfo } from "./ComponentPageInfo"
import { SandpackProvider as SandpackProviderUnstyled } from "@codesandbox/sandpack-react/unstyled"
import { CheckIcon, CopyIcon, Terminal } from "lucide-react"
import styles from "./ComponentPreview.module.css"
import { LoadingSpinner } from "./LoadingSpinner"
import { SandpackProviderProps } from "@codesandbox/sandpack-react"
import { motion } from "framer-motion"
import { useDebugMode } from "@/hooks/use-debug-mode"
import { Component, Tag, User } from "@/types/global"
import { isShowCodeAtom } from "./ComponentPage"
import { useAtom } from "jotai"
import { useTheme } from "next-themes"
import { CopyCodeButton } from "./CopyCodeButton"
import { generateSandpackFiles } from "@/lib/sandpack"
import { toast } from "sonner"
import { getPackageRunner } from "@/lib/utils"
import { trackEvent, AMPLITUDE_EVENTS } from "@/lib/amplitude"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCompileCss } from "@/hooks/use-compile-css"
import { useIsMobile } from "@/hooks/use-media-query"
import {
  Pencil,
  CodeXml,
  Info,
} from "lucide-react"

const SandpackPreview = React.lazy(() =>
  import("@codesandbox/sandpack-react/unstyled").then((module) => ({
    default: module.SandpackPreview,
  })),
)

export function ComponentPagePreview({
  component,
  code,
  demoCode,
  dependencies,
  demoDependencies,
  demoComponentNames,
  registryDependencies,
  npmDependenciesOfRegistryDependencies,
  tailwindConfig,
  globalCss,
  compiledCss,
  canEdit,
  setIsEditDialogOpen,
}: {
  component: Component & { user: User } & { tags: Tag[] }
  code: string
  demoCode: string
  dependencies: Record<string, string>
  demoDependencies: Record<string, string>
  demoComponentNames: string[]
  registryDependencies: Record<string, string>
  npmDependenciesOfRegistryDependencies: Record<string, string>
  tailwindConfig?: string
  globalCss?: string
  compiledCss?: string
  canEdit: boolean
  setIsEditDialogOpen: (value: boolean) => void
}) {
  const sandpackRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"
  const [isShowCode, setIsShowCode] = useAtom(isShowCodeAtom)
  const isDebug = useDebugMode()

  const dumySandpackFiles = generateSandpackFiles({
    demoComponentNames,
    componentSlug: component.component_slug,
    relativeImportPath: `/components/${component.registry}`,
    code,
    demoCode,
    theme: isDarkTheme ? "dark" : "light",
    css: "",
  })

  const shellCode = Object.entries(dumySandpackFiles)
    .filter(
      ([key]) =>
        key.endsWith(".tsx") ||
        key.endsWith(".jsx") ||
        key.endsWith(".ts") ||
        key.endsWith(".js"),
    )
    .map(([, file]) => file)

  const css = useCompileCss(
    code,
    demoCode,
    registryDependencies,
    component,
    shellCode,
    tailwindConfig,
    globalCss,
    compiledCss,
  )

  if (!css) return <LoadingSpinner />

  const files = {
    ...generateSandpackFiles({
      demoComponentNames,
      componentSlug: component.component_slug,
      relativeImportPath: `/components/${component.registry}`,
      code,
      demoCode,
      theme: isDarkTheme ? "dark" : "light",
      css,
      customTailwindConfig: tailwindConfig,
      customGlobalCss: globalCss,
    }),
    ...registryDependencies,
  }

  const mainComponentFile = Object.keys(files).find((file) =>
    file.endsWith(`${component.component_slug}.tsx`),
  )

  const demoComponentFile = Object.keys(files).find((file) =>
    file.endsWith(`demo.tsx`),
  )

  const visibleFiles = [
    demoComponentFile,
    mainComponentFile,
    ...(tailwindConfig ? ['tailwind.config.js'] : []),
    ...(globalCss ? ['globals.css'] : []),
    ...Object.keys(registryDependencies).filter(
      (file) => file !== mainComponentFile,
    ),
  ].filter((file): file is string => file !== undefined)

  const customFileLabels = Object.fromEntries(
    Object.keys(registryDependencies).map((path) => {
      const parts = path.split("/")
      const fileName = parts[parts.length - 1]
      return [path, `${fileName} (dependency)`]
    }),
  )

  const providerProps: SandpackProviderProps = {
    theme: isDarkTheme ? "dark" : "light",
    template: "react-ts" as const,
    files: files,
    customSetup: {
      entry: "/index.tsx",
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        "@radix-ui/react-select": "^1.0.0",
        "lucide-react": "latest",
        "tailwind-merge": "latest",
        clsx: "latest",
        ...dependencies,
        ...demoDependencies,
        ...npmDependenciesOfRegistryDependencies,
      },
    },
    options: {
      activeFile: demoComponentFile ?? mainComponentFile,
      visibleFiles,
    },
    ...({ fileLabels: customFileLabels } as any),
  }

  return (
    <div className="h-full w-full flex gap-2 rounded-lg min-h-90vh md:flex-row flex-col">
      <SandpackProviderUnstyled {...providerProps}>
        <motion.div
          layout
          className="flex-grow h-full relative"
          transition={{ duration: 0.3 }}
        >
          <Suspense fallback={<LoadingSpinner />}>
            <SandpackPreview
              showSandpackErrorOverlay={false}
              showOpenInCodeSandbox={false}
              showRefreshButton={false}
            />
          </Suspense>
        </motion.div>
      </SandpackProviderUnstyled>
      <div className="h-full w-full md:max-w-[30%] min-h-90vh overflow-hidden rounded-lg border border-border">
        <SandpackProvider {...providerProps}>
          <div ref={sandpackRef} className="h-full w-full flex relative">
            <SandpackLayout className="flex w-full flex-row gap-4">
              <div className={`flex flex-col w-full ${styles.customScroller}`}>
                <MobileControls
                  isShowCode={isShowCode}
                  setIsShowCode={setIsShowCode}
                  canEdit={canEdit}
                  setIsEditDialogOpen={setIsEditDialogOpen}
                />
                <div className="flex w-full flex-col">
                  {isShowCode ? (
                    <>
                      <CopyCommandSection component={component} />
                      {isDebug && <SandpackFileExplorer />}
                      <div
                        className={`overflow-auto ${styles.codeViewerWrapper} relative`}
                      >
                        <CopyCodeButton />
                        <SandpackCodeViewer
                          showLineNumbers={true}
                          wrapContent={true}
                        />
                      </div>
                    </>
                  ) : (
                    <ComponentPageInfo component={component} />
                  )}
                </div>
              </div>
            </SandpackLayout>
          </div>
        </SandpackProvider>
      </div>
      {isDebug && (
        <div className="absolute top-0 left-0 bg-background text-foreground p-2 z-50">
          Debug Mode
        </div>
      )}
    </div>
  )
}

function CopyCommandSection({
  component,
}: {
  component: Component & { user: User }
}) {
  const installUrl = `${process.env.NEXT_PUBLIC_APP_URL}/r/${component.user.username}/${component.component_slug}`
  const [copied, setCopied] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const copyCommand = (packageManager: string) => {
    const command = `${getPackageRunner(packageManager)} shadcn@latest add "${installUrl}"`
    navigator?.clipboard?.writeText(command)
    setCopied(true)
    trackEvent(AMPLITUDE_EVENTS.COPY_INSTALL_COMMAND, {
      componentId: component.id,
      componentName: component.name,
      packageManager,
      installUrl
    })
    setTimeout(() => setCopied(false), 1000)
    toast("Command copied to clipboard")
    setIsDropdownOpen(false)
  }

  return (
    <div className="p-4">
      <p className="text-[14px] font-medium text-foreground mb-2 whitespace-nowrap overflow-hidden text-ellipsis">
        Install component
      </p>
      <div className="mb-2 mt-4 p-4 h-14 rounded-lg border bg-zinc-950 dark:bg-zinc-900 flex items-center">
        <div className="flex items-center justify-center text-white w-5 h-5 mr-3">
          <Terminal size={20} />
        </div>
        <div className="flex-grow overflow-scroll scrollbar-hide">
          <code className="flex items-center whitespace-nowrap font-mono text-sm">
            <span className="mr-2 text-white">npx</span>
            <span className="text-muted-foreground">
              shadcn@latest add "{installUrl}"
            </span>
          </code>
        </div>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex-shrink-0 ml-3 flex items-center justify-center p-1 hover:bg-zinc-800 text-white w-8 h-8 rounded-md">
              {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="end">
            <DropdownMenuItem onClick={() => copyCommand("npm")}>
              npm
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyCommand("yarn")}>
              yarn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyCommand("pnpm")}>
              pnpm
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copyCommand("bun")}>
              bun
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

const MobileControls = ({
  isShowCode,
  setIsShowCode,
  canEdit,
  setIsEditDialogOpen,
}: {
  isShowCode: boolean
  setIsShowCode: (value: boolean) => void
  canEdit: boolean
  setIsEditDialogOpen: (value: boolean) => void
}) => {
  const isMobile = useIsMobile()
  
  if (!isMobile) return null

  return (
    <div className="flex items-center gap-2 p-4 md:hidden">
      <div className="relative bg-muted rounded-lg h-8 p-0.5 flex flex-1">
        <div
          className="absolute inset-y-0.5 rounded-md bg-background shadow transition-all duration-200 ease-in-out"
          style={{
            width: "calc(50% - 2px)",
            left: isShowCode ? "2px" : "calc(50%)",
          }}
        />
        <button
          onClick={() => setIsShowCode(true)}
          className={`relative z-2 px-2 flex-1 flex items-center justify-center transition-colors duration-200 ${
            isShowCode ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <CodeXml size={18} />
          <span className="text-[14px] pl-1">Code</span>
        </button>
        <button
          onClick={() => setIsShowCode(false)}
          className={`relative z-2 px-2 flex-1 flex items-center justify-center transition-colors duration-200 ${
            !isShowCode ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Info size={18} />
          <span className="pl-1 text-[14px]">Info</span>
        </button>
      </div>
      {canEdit && (
        <button
          onClick={() => setIsEditDialogOpen(true)}
          className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-md relative"
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Pencil size={16} />
          </div>
        </button>
      )}
    </div>
  )
}

export default ComponentPagePreview
