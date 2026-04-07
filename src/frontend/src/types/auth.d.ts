export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'expert' | 'admin';
  expertise: string[];
  accessToken: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (requiredRoles: string[]) => boolean;
  hasExpertise: (requiredExpertise: string[]) => boolean;
}

export interface Session extends NextAuth.Session {
  user: User;
  accessToken: string;
}

export interface JWT extends NextAuth.JWT {
  id: string;
  role: string;
  expertise: string[];
  accessToken: string;
}