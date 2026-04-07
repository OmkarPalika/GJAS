import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

interface User {
  id: string;
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  expertise: string[];
  legalExpertise: string[];
  accessToken: string;
}

interface AuthResponse {
  user?: User;
  token?: string;
  error?: string;
}





const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<User | null> {
        try {
          // Call backend auth endpoint
          const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
          const res = await fetch(`${backendUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000)
          });
          
          if (!res.ok) {
            try {
              const error = await res.json() as { error?: string };
              throw new Error(error.error || 'Login failed');
            } catch (jsonError) {
              // If response is not JSON (e.g., HTML error page)
              const text = await res.text();
              throw new Error(text || 'Login failed - invalid server response');
            }
          }
          
          const data = await res.json() as AuthResponse;
          
          if (data.user && data.token) {
            return {
              id: data.user._id,
              _id: data.user._id,
              name: data.user.username,
              username: data.user.username,
              email: data.user.email,
              role: data.user.role,
              expertise: data.user.legalExpertise,
              legalExpertise: data.user.legalExpertise,
              accessToken: data.token
            };
          }
          
          return null;
        } catch (error) {
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              console.error('Backend request timed out:', error.message);
              throw new Error('Backend server is not responding. Please try again later.');
            } else if (error.message.includes('failed to fetch')) {
              console.error('Network error:', error.message);
              throw new Error('Unable to connect to the authentication server. Please check your network connection.');
            } else {
              console.error('Authorization error:', error.message);
            }
          } else {
            console.error('Unexpected authorization error:', error);
          }
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        // Only set properties if they exist on the user object
        if (user.id) token.id = user.id;
        if (user.role) token.role = user.role;
        if (user.expertise) token.expertise = user.expertise;
        if (user.accessToken) token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // Ensure session.user exists and only set properties if they exist on the token
      if (!session.user) {
        session.user = { name: '', email: '', image: '' };
      }
      if (token.id) session.user.id = token.id;
      if (token.role) session.user.role = token.role;
      if (token.expertise) session.user.expertise = token.expertise;
      if (token.accessToken) session.accessToken = token.accessToken;
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/logout',
    error: '/auth/error'
  },
  secret: process.env.NEXTAUTH_SECRET || 'gjas-secret-key',
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60 // 7 days
  }
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };