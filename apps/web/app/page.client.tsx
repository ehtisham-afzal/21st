"use client"

import React, { useEffect, useState } from "react"
import { useAtom } from "jotai"
import { useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { useSearchParams, useRouter } from "next/navigation"

import { SortOption, SORT_OPTIONS } from "@/types/global"
import { sortByAtom } from "@/components/features/main-page/main-page-header"
import { ComponentsList } from "@/components/ui/items-list"
import { SectionsList } from "@/components/features/sections/sections-list"
import { ComponentsHeader } from "@/components/features/main-page/main-page-header"
import { FilterChips } from "@/components/features/main-page/filter-chips"
import { DesignEngineersList } from "@/components/features/design-engineers/design-engineers-list"
import { ProList } from "@/components/features/pro/pro-list"

export function HomePageClient() {
  const [sortBy, setSortBy] = useAtom(sortByAtom)
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<
    "sections" | "components" | "authors" | "pro"
  >(
    (searchParams.get("tab") as
      | "sections"
      | "components"
      | "authors"
      | "pro") || "sections",
  )
  const [selectedFilter, setSelectedFilter] = useState<string>("all")

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", activeTab)
    if (activeTab === "components" && sortBy) {
      params.set("sort", sortBy)
    } else {
      params.delete("sort")
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }, [activeTab, sortBy, router, searchParams])

  useEffect(() => {
    const sortFromUrl = searchParams.get("sort") as SortOption
    if (sortFromUrl && Object.keys(SORT_OPTIONS).includes(sortFromUrl)) {
      setSortBy(sortFromUrl)
    }
  }, [])

  useEffect(() => {
    if (sortBy !== undefined) {
      queryClient.invalidateQueries({
        queryKey: ["filtered-demos", sortBy],
      })
    }
  }, [sortBy, queryClient])

  const handleTabChange = (
    newTab: "sections" | "components" | "authors" | "pro",
  ) => {
    setActiveTab(newTab)
    setSelectedFilter("all")
  }

  const renderContent = () => {
    switch (activeTab) {
      case "sections":
        return (
          <>
            <FilterChips
              activeTab={activeTab}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <SectionsList filter={selectedFilter} />
            </motion.div>
          </>
        )
      case "components":
        return (
          <>
            <FilterChips
              activeTab={activeTab}
              selectedFilter={selectedFilter}
              onFilterChange={setSelectedFilter}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: "easeOut",
              }}
            >
              <ComponentsList
                type="main"
                sortBy={sortBy}
                tagSlug={selectedFilter === "all" ? undefined : selectedFilter}
              />
            </motion.div>
          </>
        )
      case "authors":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            <DesignEngineersList />
          </motion.div>
        )
      case "pro":
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
            }}
          >
            <ProList />
          </motion.div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto mt-20 px-[var(--container-x-padding)] max-w-[3680px] [--container-x-padding:20px] min-720:[--container-x-padding:24px] min-1280:[--container-x-padding:32px] min-1536:[--container-x-padding:80px]">
      <div className="flex flex-col">
        <ComponentsHeader activeTab={activeTab} onTabChange={handleTabChange} />
        {renderContent()}
      </div>
    </div>
  )
}
