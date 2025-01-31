/* eslint-disable @next/next/no-img-element */
"use client"

import { Video, Eye, Heart } from "lucide-react"
import Link from "next/link"

import { Component, User, DemoWithComponent } from "../../../types/global"
import ComponentPreviewImage from "./card-image"
import { ComponentVideoPreview } from "./card-video"
import { CopyComponentButton } from "../../ui/copy-code-page-button"
import { UserAvatar } from "../../ui/user-avatar"

export function ComponentCardSkeleton() {
  return (
    <div className="overflow-hidden animate-pulse">
      <div className="relative aspect-[4/3] mb-3">
        <div className="absolute inset-0 rounded-lg overflow-hidden bg-muted" />
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-muted" />
        <div className="flex items-center justify-between flex-grow min-w-0">
          <div className="min-w-0 flex-1 mr-3">
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
          <div className="h-3 bg-muted rounded w-12" />
        </div>
      </div>
    </div>
  )
}

export function ComponentCard({
  component,
  isLoading,
}: {
  component?:
    | DemoWithComponent
    | (Component & { user: User } & { view_count?: number })
  isLoading?: boolean
}) {
  if (isLoading || !component) {
    return <ComponentCardSkeleton />
  }

  const isDemo = "demo_slug" in component
  const userData = component.user
  const componentOwner = isDemo ? component.component.user : component.user

  if (!userData) {
    return <ComponentCardSkeleton />
  }

  const componentUrl = isDemo
    ? `/${componentOwner.display_username || componentOwner.username}/${component.component.component_slug}/${component.demo_slug || 'default'}`
    : `/${componentOwner.display_username || componentOwner.username}/${component.component_slug}`

  const videoUrl = isDemo ? component.video_url : component.video_url

  const codeUrl = isDemo
    ? `/${userData.display_username || userData.username}/${component.component.component_slug}/${component.demo_slug}/code`
    : `/${userData.display_username || userData.username}/${component.component_slug}/code`

  const likesCount = isDemo
    ? component.component.likes_count
    : component.likes_count

  return (
    <div className="overflow-hidden">
      <Link href={componentUrl} className="block cursor-pointer">
        <div className="relative aspect-[4/3] mb-3 group">
          <CopyComponentButton codeUrl={codeUrl} component={component} />
          <div className="absolute inset-0 rounded-lg overflow-hidden">
            <div className="relative w-full h-full">
              <div className="absolute inset-0" style={{ margin: "-1px" }}>
                <ComponentPreviewImage
                  src={
                    isDemo
                      ? component.preview_url || "/placeholder.svg"
                      : component.preview_url || "/placeholder.svg"
                  }
                  alt={isDemo ? component.name || "" : component.name || ""}
                  fallbackSrc="/placeholder.svg"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-b from-foreground/0 to-foreground/5" />
            </div>
            {videoUrl && (
              <ComponentVideoPreview component={component} demo={component} />
            )}
          </div>
          {videoUrl && (
            <div
              className="absolute top-2 left-2 z-20 bg-background/90 backdrop-blur rounded-sm px-2 py-1 pointer-events-none"
              data-video-icon={`${component.id}`}
            >
              <Video size={16} className="text-foreground" />
            </div>
          )}
        </div>
      </Link>
      <div className="flex space-x-3 items-center">
        <UserAvatar
          src={
            userData.display_image_url ||
            userData.image_url ||
            "/placeholder.svg"
          }
          alt={userData.display_name || userData.name || ""}
          size={32}
          user={userData}
          isClickable
        />
        <div className="flex items-center justify-between flex-grow min-w-0">
          <Link
            href={componentUrl}
            className="block cursor-pointer min-w-0 flex-1 mr-3"
          >
            <div className="flex flex-col min-w-0">
              <h2 className="text-sm font-medium text-foreground truncate">
                {isDemo ? component.component.name : component.name}
              </h2>
              {isDemo && component.name !== "Default" && (
                <p className="text-sm text-muted-foreground truncate">
                  {component.name}
                </p>
              )}
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap shrink-0 gap-1">
              <Eye size={14} />
              <span>{component.view_count || 0}</span>
            </div>
            <div className="flex items-center text-xs text-muted-foreground whitespace-nowrap shrink-0 gap-1">
              <Heart size={14} className="text-muted-foreground" />
              <span>{likesCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
