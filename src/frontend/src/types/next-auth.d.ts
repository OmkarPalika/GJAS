import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    accessToken?: string
    user: {
      /** The user's role. */
      role?: string
      /** User expertise area */
      expertise?: string[]
      /** User ID */
      id?: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    expertise?: string[]
    accessToken?: string
  }
}

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    accessToken?: string
    role?: string
    expertise?: string[]
    id?: string
  }
}
