"use client"

import { ReactNode } from "react"
import { Navbar } from "./navbar"
import { Footer } from "./footer"

interface LayoutWrapperProps {
  children: ReactNode
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  )
}

export default LayoutWrapper
