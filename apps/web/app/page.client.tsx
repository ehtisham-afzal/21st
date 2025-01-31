"use client"

import React, { useEffect, useLayoutEffect, useState } from "react"

import { useAtom } from "jotai"
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"

import { SortOption, DemoWithComponent } from "@/types/global"
import { Database } from "@/types/supabase"

import { useClerkSupabaseClient } from "@/lib/clerk"
import { setCookie } from "@/lib/cookies"
import { searchQueryAtom } from "@/components/ui/header.client"
import {
  ComponentsHeader,
  sortByAtom,
} from "@/components/features/main-page/main-page-header"
import { Loader2 } from "lucide-react"
import { useDebounce } from "@/hooks/use-debounce"
import ComponentsList from "@/components/ui/items-list"
import { transformDemoResult } from "@/lib/utils/transformData"
import { replaceSpacesWithPlus } from "@/lib/utils"

const useSetServerUserDataCookies = () => {
  useEffect(() => {
    if (!document.cookie.includes("has_onboarded")) {
      setCookie({
        name: "has_onboarded",
        value: "true",
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        httpOnly: true,
        sameSite: "lax",
      })
    }
  }, [])
}

const refetchData = async (queryClient: any, sortBy: any) => {
  await queryClient.invalidateQueries({
    queryKey: ["filtered-demos", sortBy],
  })
}

export function HomePageClient({
  initialComponents,
  initialSortBy,
}: {
  initialComponents: DemoWithComponent[]
  initialSortBy: SortOption
}) {
  const [searchQuery] = useAtom(searchQueryAtom)
  const supabase = useClerkSupabaseClient()
  const [sortBy, setSortBy] = useAtom(sortByAtom)
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const queryClient = useQueryClient()

  useLayoutEffect(() => {
    if (sortBy === undefined) {
      setSortBy(initialSortBy)
    }
  }, [])

  useSetServerUserDataCookies()

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage } =
    useInfiniteQuery<{ data: DemoWithComponent[]; total_count: number }>({
      queryKey: ["filtered-demos", sortBy, debouncedSearchQuery],
      queryFn: async ({
        pageParam = 0,
      }): Promise<{ data: DemoWithComponent[]; total_count: number }> => {
        if (!sortBy) {
          return {
            data: [],
            total_count: 0,
          }
        }

        if (!debouncedSearchQuery) {
          const { data: filteredData, error } = await supabase.rpc(
            "get_demos",
            {
              p_quick_filter: "all",
              p_sort_by: sortBy,
              p_offset: Number(pageParam) * 24,
              p_limit: 24,
            } as Database["public"]["Functions"]["get_demos"]["Args"],
          )

          if (error) throw new Error(error.message)
          console.log("RAW DATA FROM SQL:", filteredData?.[0])
          const transformedData = (filteredData || []).map(transformDemoResult)
          return {
            data: transformedData,
            total_count: (filteredData?.[0] as any)?.total_count ?? 0,
          }
        }

        const { data: searchResults, error } = await supabase.functions.invoke(
          "ai-search-oai",
          {
            body: {
              search: debouncedSearchQuery,
              match_threshold: 0.33,
            },
          },
        )

        if (error) throw new Error(error.message)
        const transformedSearchResults = (searchResults || []).map(
          transformDemoResult,
        )

        return {
          data: transformedSearchResults,
          total_count: transformedSearchResults.length,
        }
      },
      initialData: {
        pages: [
          { data: initialComponents, total_count: initialComponents.length },
        ],
        pageParams: [0],
      },
      enabled: true,
      staleTime: 0,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: false,
      initialPageParam: 0,
      refetchOnMount: true,
      getNextPageParam: (lastPage, allPages) => {
        if (!lastPage?.data || lastPage.data.length === 0) return undefined
        const loadedCount = allPages.reduce(
          (sum, page) => sum + page.data.length,
          0,
        )
        return loadedCount < lastPage.total_count ? allPages.length : undefined
      },
    })
  const allDemos = data?.pages?.flatMap((d) => d.data)

  const showSkeleton = isLoading || !data?.pages?.[0]?.data?.length
  const showSpinner = isFetching && !showSkeleton

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 1000 &&
        !isLoading &&
        hasNextPage
      ) {
        fetchNextPage()
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [isLoading, hasNextPage, fetchNextPage])

  useEffect(() => {
    if (sortBy !== undefined) {
      refetchData(queryClient, sortBy)
    }
  }, [sortBy, queryClient])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto mt-20 px-4 max-w-[1200px]"
    >
      <div className="flex flex-col">
        <ComponentsHeader filtersDisabled={!!searchQuery} />
        <ComponentsList components={allDemos} isLoading={isLoading} />
        {showSpinner && (
          <div className="col-span-full flex justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-foreground/20" />
          </div>
        )}
      </div>
    </motion.div>
  )
}
