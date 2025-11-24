import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
 
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  //logic to protect routes
  callbacks: {
    //auth contains the user's session
    //request contains incoming request
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true;
    },
  },
  //providers list the different login options such as Google, GitHub, email, OAuth, Credentials(username and password)
  providers: [Credentials({})],
} satisfies NextAuthConfig;