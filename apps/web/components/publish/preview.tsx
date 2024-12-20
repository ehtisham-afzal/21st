import { useDebugMode } from "@/hooks/use-debug-mode"
import { useClerkSupabaseClient } from "@/lib/clerk"
import {
  extractDemoComponentNames,
  extractNPMDependencies,
} from "@/lib/parsers"
import {
  defaultGlobalCss,
  defaultTailwindConfig,
  generateSandpackFiles,
} from "@/lib/sandpack"
import {
  SandpackProvider,
  SandpackFileExplorer,
  SandpackCodeViewer,
} from "@codesandbox/sandpack-react"
import { useQuery } from "@tanstack/react-query"
import React, { useMemo, useState, useEffect } from "react"
import { LoadingSpinner } from "../LoadingSpinner"
import { resolveRegistryDependencyTree } from "@/lib/queries.server"

const SandpackPreview = React.lazy(() =>
  import("@codesandbox/sandpack-react").then((module) => ({
    default: module.SandpackPreview,
  })),
)

export function PublishComponentPreview({
  code,
  demoCode,
  slugToPublish,
  registryToPublish = "ui",
  directRegistryDependencies,
  isDarkTheme,
  customTailwindConfig,
  customGlobalCss,
}: {
  code: string
  demoCode: string
  slugToPublish: string
  registryToPublish: string
  directRegistryDependencies: string[]
  isDarkTheme: boolean
  customTailwindConfig?: string
  customGlobalCss?: string
}) {
  const isDebug = useDebugMode()
  const supabase = useClerkSupabaseClient()
  const [css, setCss] = useState<string | undefined>(undefined)

  const {
    data: registryDependencies,
    isLoading,
    error: registryDependenciesError,
  } = useQuery({
    queryKey: ["registryDependencies", directRegistryDependencies],
    queryFn: async () => {
      const { data, error } = await resolveRegistryDependencyTree({
        supabase,
        sourceDependencySlugs: directRegistryDependencies,
        withDemoDependencies: true,
      })
      if (error) {
        throw error
      }
      return data
    },
    enabled: directRegistryDependencies?.length > 0,
  })

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_COMPILE_CSS_URL}/compile-css`, {
      method: "POST",
      body: JSON.stringify({
        code,
        demoCode,
        baseTailwindConfig: defaultTailwindConfig,
        baseGlobalCss: defaultGlobalCss,
        customTailwindConfig,
        customGlobalCss,
        dependencies: Object.values(
          registryDependencies?.filesWithRegistry ?? {},
        ).map((file) => file.code),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setCss(data.css)
      })
  }, [])

  const demoComponentNames = useMemo(
    () => extractDemoComponentNames(demoCode),
    [demoCode],
  )

  const sandpackDefaultFiles = useMemo(() => {
    return generateSandpackFiles({
      demoComponentNames,
      componentSlug: slugToPublish,
      relativeImportPath: `/components/${registryToPublish}`,
      code,
      demoCode,
      theme: isDarkTheme ? "dark" : "light",
      css: css ?? "",
      customTailwindConfig,
      customGlobalCss,
    })
  }, [
    demoComponentNames,
    slugToPublish,
    code,
    demoCode,
    isDarkTheme,
    registryToPublish,
    css,
    customTailwindConfig,
    customGlobalCss,
  ])

  const files = {
    ...sandpackDefaultFiles,
    ...Object.fromEntries(
      Object.entries(registryDependencies?.filesWithRegistry ?? {}).map(
        ([key, value]) => [key, value.code],
      ),
    ),
  }

  const dependencies = useMemo(() => {
    return {
      ...extractNPMDependencies(code),
      ...extractNPMDependencies(demoCode),
      ...(registryDependencies?.npmDependencies || {}),
    }
  }, [code, demoCode, registryDependencies?.npmDependencies])

  const providerProps = {
    template: "react-ts" as const,
    files,
    customSetup: {
      dependencies: {
        react: "^18.0.0",
        "react-dom": "^18.0.0",
        "tailwind-merge": "latest",
        clsx: "latest",
        "@radix-ui/react-select": "^1.0.0",
        "lucide-react": "latest",
        ...dependencies,
      },
    },
    options: {
      externalResources: ["https://cdn.tailwindcss.com"],
    },
  }

  if (css === undefined) return <LoadingSpinner />

  return (
    <div className="w-full h-full bg-[#FAFAFA] rounded-lg">
      {registryDependenciesError && (
        <div className="text-red-500">{registryDependenciesError.message}</div>
      )}
      {isLoading && <LoadingSpinner />}
      {!registryDependenciesError && !isLoading && (
        <SandpackProvider {...providerProps}>
          <SandpackPreview
            showSandpackErrorOverlay={false}
            showOpenInCodeSandbox={true}
          />
          {isDebug && (
            <>
              <SandpackFileExplorer />
              <SandpackCodeViewer />
            </>
          )}
        </SandpackProvider>
      )}
    </div>
  )
}
