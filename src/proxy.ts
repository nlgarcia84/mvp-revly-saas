import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define qué rutas requieren autenticación
const isProtectedRoute = createRouteMatcher(['/(dashboard)(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Si la ruta está protegida y el usuario no ha iniciado sesión,
  // redirige automáticamente a /sign-in
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  // Ejecuta el middleware en todas las rutas excepto archivos estáticos
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
