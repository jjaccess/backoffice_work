// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

function authGuard() {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) return true;
  if (!localStorage.getItem('token')) {
    router.navigate(['/login']);
    return false;
  }
  return true;
}

export const routes: Routes = [
  // Ruta raíz → quiosco (SIN authGuard)
  { path: '', redirectTo: 'quiosco', pathMatch: 'full' },

  // ── RUTA PÚBLICA — sin login ──────────────────────────────
  {
    path: 'quiosco',
    loadComponent: () =>
      import('./features/quiosco/quiosco.component').then(m => m.QuioscoComponent)
  },

  // ── RUTAS PROTEGIDAS ──────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'verificacion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/verificacion/verificacion.component').then(m => m.VerificacionComponent)
  },
  {
    path: 'enrolamiento',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/enrolamiento/enrolamiento.component').then(m => m.EnrolamientoComponent)
  },
  {
    path: 'historial',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/historial/historial.component').then(m => m.HistorialComponent)
  },
  {
    path: 'admin/carga-pdv',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/carga-pdv.component').then(m => m.CargaPdvComponent)
  },
  {
    path: 'admin/jerarquia',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/jerarquia.component').then(m => m.JerarquiaComponent)
  },
  { path: '**', redirectTo: 'quiosco' }
];
