"use client"

import { useLayoutEffect } from "react"
import { usePathname } from "next/navigation"
import { resolveDocumentLang } from "@/lib/i18n/document-lang"

export function DocumentLangSync() {
  const pathname = usePathname() ?? "/"

  useLayoutEffect(() => {
    document.documentElement.lang = resolveDocumentLang(pathname)
  }, [pathname])

  return null
}
