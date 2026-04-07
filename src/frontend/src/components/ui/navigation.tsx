import Link from "next/link"
import { Button } from "./button"
import { ThemeToggle } from "./theme-toggle"

export function MainNavigation() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-background border-b">
      <div className="flex items-center space-x-4">
        <Link href="/" className="text-xl font-bold">
          GJAS
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="/cases" className="text-sm font-medium hover:text-primary transition-colors">
            Cases
          </Link>
          <Link href="/rag" className="text-sm font-medium hover:text-primary transition-colors">
            RAG Search
          </Link>
          <Link href="/collaborate" className="text-sm font-medium hover:text-primary transition-colors">
            Collaborate
          </Link>
          <Link href="/visualize" className="text-sm font-medium hover:text-primary transition-colors">
            Visualize
          </Link>
          <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
            About
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <ThemeToggle />
        <Link href="/login">
          <Button variant="outline" size="sm">
            Login
          </Button>
        </Link>
      </div>
    </nav>
  )
}