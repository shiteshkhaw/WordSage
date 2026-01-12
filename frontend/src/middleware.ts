export { auth as middleware } from "@/auth"

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/teams/:path*',
    '/admin/:path*',
  ],
}
