"use client";

import Link from "next/link"
import { useAuth } from '@/context/AuthContext'
import { Button } from "./button"
import { ThemeToggle } from "./theme-toggle"
import { Scale } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function MainNavigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-8 py-6 bg-background border-b sticky top-0 z-50 backdrop-blur-sm bg-background/80">
      <div className="flex items-center space-x-12">
        <Link href="/" className="text-2xl font-serif font-bold tracking-tighter flex items-center gap-2">
          <Scale className="h-6 w-6 text-accent" />
          <span>GJAS</span>
        </Link>
        <div className="hidden md:flex items-center space-x-6">
          <Link href="/archives" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            Archives
          </Link>
          <Link href="/compare" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            Compare
          </Link>
          <Link href="/rag-search" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            RAG Search
          </Link>
          <Link href="/assembly" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            Assembly
          </Link>
          <Link href="/chamber" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            Chamber
          </Link>
          <Link href="/laboratory" className="text-xs font-bold text-muted-foreground hover:text-accent transition-colors tracking-widest uppercase">
            Laboratory
          </Link>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <ThemeToggle />
        
        {user ? (
          <div className="flex items-center gap-6 border-l pl-6 border-border">
             <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col items-end justify-center">
                   <div className="text-xs font-bold font-serif leading-tight">{user.name || 'Delegate'}</div>
                   <div className="text-[9px] uppercase tracking-widest text-accent font-black leading-tight mt-0.5">{user.role}</div>
                </div>
                <Avatar className="h-8 w-8 border border-primary/20">
                   <AvatarFallback className="bg-primary/5 text-primary text-xs font-bold font-serif">{user.name?.charAt(0).toUpperCase() || 'D'}</AvatarFallback>
                </Avatar>
             </div>
             <Button variant="outline" size="sm" onClick={logout} className="h-8 text-[9px] uppercase font-bold tracking-widest border-primary/10 text-muted-foreground">
               Sign Out
             </Button>
          </div>
        ) : (
          <div className="flex items-center space-x-6">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="font-semibold uppercase tracking-widest text-xs">
                Log In
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="px-6 font-semibold uppercase tracking-widest text-xs">
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}