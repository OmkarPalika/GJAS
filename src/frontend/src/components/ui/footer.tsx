import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Global Judicial Assembly Simulator. All rights reserved.
          </div>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-sm hover:text-primary transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="text-sm hover:text-primary transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="text-sm hover:text-primary transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}