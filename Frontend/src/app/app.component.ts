import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="app-shell" *ngIf="usuarioLogueado && !esQuiosco; else soloRouter">
      <aside class="sidebar">
        
        <div class="sidebar-logo">
          <span class="logo-icon">🔐</span>
          <span class="logo-text">Backoffice RSOC</span>
        </div>
        
        <nav class="sidebar-nav">
          
          <div class="dropdown-container">
            <div class="nav-item dropdown-header" (click)="toggleMenu()">
              <div class="header-main">
                <span class="nav-icon">📱</span>
                <span>VisitApp</span>
              </div>
              <span class="arrow" [class.rotated]="menuAbierto">{{ menuAbierto ? '▼' : '▶' }}</span>
            </div>

            <div class="dropdown-content" *ngIf="menuAbierto">
              <!-- Registrar: TODOS los roles -->
              <a routerLink="/verificacion" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">🖐️</span><span>Registrar</span>
              </a>
              
              <!-- Enrolamiento: ADMIN y TIC -->
              <a *ngIf="tieneRol('ADMIN','TIC')" routerLink="/enrolamiento" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📝</span><span>Enrolamiento</span>
              </a>
              
              <!-- Historial: ADMIN, TIC, AUD, GH -->
              <a *ngIf="tieneRol('ADMIN','TIC','AUD','GH')" routerLink="/historial" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📋</span><span>Historial</span>
              </a>

              <a *ngIf="tieneRol('ADMIN','TIC')" routerLink="/mapa" routerLinkActive="active" class="nav-item sub-item">
  <span class="nav-icon">🗺️</span><span>Mapa</span>
</a>
              
              <!-- Cargar PDV: ADMIN y TIC -->
              <a *ngIf="tieneRol('ADMIN','TIC')" routerLink="/admin/carga-pdv" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📤</span><span>Cargar PDV</span>
              </a>

              <!-- Jerarquía: ADMIN y TIC -->
              <a *ngIf="tieneRol('ADMIN','TIC')" routerLink="/admin/jerarquia" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">🌳</span><span>Jerarquía</span>
              </a>
            </div>
          </div>

          <!-- Configuración: ADMIN y TIC -->
          <div *ngIf="tieneRol('ADMIN','TIC')" class="dropdown-container">
            <div class="nav-item dropdown-header" (click)="toggleMenu2()">
              <div class="header-main">
                <span class="nav-icon">⚙️</span>
                <span>Configuración</span>
              </div>
              <span class="arrow" [class.rotated]="menuAbierto2">{{ menuAbierto2 ? '▼' : '▶' }}</span>
            </div>

            <div class="dropdown-content" *ngIf="menuAbierto2">
              <a routerLink="/configuracion/usuarios" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">👥</span><span>Usuarios</span>
              </a>
            </div>
          </div>
        </nav>

        <div class="spacer"></div>

        <div class="sidebar-footer">
          <div class="usuario-info">
            <span class="usuario-nombre">{{ usuario?.nombre }}</span>
            <span class="usuario-rol">{{ usuario?.rol }}</span>
          </div>
          <button class="btn-logout" (click)="logout()" title="Cerrar sesión">⏻</button>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>

    <ng-template #soloRouter>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .app-shell { display: flex; min-height: 100vh; }

    .sidebar {
      width: 240px; 
      min-height: 100vh;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
      display: flex; 
      flex-direction: column;
      position: fixed; 
      left: 0; top: 0; bottom: 0; 
      z-index: 100;
      box-shadow: 4px 0 15px rgba(0,0,0,0.1);
    }

    .sidebar-logo { 
      padding: 24px 20px; 
      display: flex; 
      align-items: center; 
      gap: 12px; 
      border-bottom: 1px solid rgba(255,255,255,0.08); 
    }
    .logo-icon { font-size: 1.6rem; }
    .logo-text { color: white; font-weight: 700; font-size: 1.1rem; letter-spacing: 0.5px; }

    .sidebar-nav { 
      padding: 16px 12px; 
      display: flex; 
      flex-direction: column; 
      gap: 8px; 
    }

    .dropdown-container { margin-bottom: 4px; }
    
    .nav-item { 
      display: flex; 
      align-items: center; 
      gap: 10px; 
      padding: 12px 14px; 
      border-radius: 10px; 
      color: rgba(255,255,255,0.6); 
      text-decoration: none; 
      font-size: 0.9rem; 
      transition: all 0.2s; 
      cursor: pointer; 
    }
    .nav-item:hover { background: rgba(255,255,255,0.08); color: white; }
    .nav-item.active { background: #4361ee; color: white; box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3); }
    
    .dropdown-header { justify-content: space-between; color: white; }
    .header-main { display: flex; align-items: center; gap: 10px; }
    .arrow { font-size: 0.7rem; opacity: 0.5; transition: transform 0.2s; }
    .sub-item { margin-left: 12px; font-size: 0.85rem; padding: 10px 14px; }
    .dropdown-content { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }

    .spacer { flex: 1; }

    .sidebar-footer { 
      padding: 20px; 
      border-top: 1px solid rgba(255,255,255,0.08); 
      display: flex; 
      align-items: center; 
      justify-content: space-between;
      background: rgba(0,0,0,0.1);
    }
    .usuario-info { display: flex; flex-direction: column; overflow: hidden; }
    .usuario-nombre { color: white; font-size: 0.85rem; font-weight: 600; white-space: nowrap; text-overflow: ellipsis; }
    .usuario-rol { color: rgba(255,255,255,0.4); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px; }

    .btn-logout { 
      background: rgba(255,255,255,0.05); 
      border: 1px solid rgba(255,255,255,0.1); 
      color: rgba(255,255,255,0.6); 
      padding: 8px 12px; 
      border-radius: 8px; 
      cursor: pointer; 
      transition: all 0.2s;
    }
    .btn-logout:hover { background: #ef4444; border-color: #ef4444; color: white; }

    .main-content { margin-left: 240px; flex: 1; min-height: 100vh; background: #f8fafc; }

    @media (max-width: 768px) {
      .sidebar { width: 70px; }
      .logo-text, .nav-item span:last-child, .usuario-info, .arrow { display: none; }
      .main-content { margin-left: 70px; }
      .sub-item { margin-left: 0; }
      .nav-item { justify-content: center; padding: 15px 0; }
    }
  `]
})
export class AppComponent implements OnInit {
  usuario: any = null;
  esQuiosco = false;
  menuAbierto = true;
  menuAbierto2 = false;

  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  get usuarioLogueado(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('token');
  }

  // Ya no se necesita esAdmin como getter independiente,
  // pero lo dejamos por si se usa en otro lado
  get esAdmin(): boolean {
    return this.usuario?.rol === 'ADMIN';
  }

  /**
   * Verifica si el usuario tiene alguno de los roles indicados.
   * Uso en template: *ngIf="tieneRol('ADMIN','TIC')"
   */
  tieneRol(...roles: string[]): boolean {
    return roles.includes(this.usuario?.rol);
  }

  ngOnInit(): void {
    this.cargarUsuario();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;
        this.esQuiosco = url.includes('/quiosco') || url.includes('/login');
        this.cargarUsuario();
      });
  }

  toggleMenu() { this.menuAbierto = !this.menuAbierto; }
  toggleMenu2() { this.menuAbierto2 = !this.menuAbierto2; }

  cargarUsuario(): void {
    if (!this.isBrowser) return;
    const u = localStorage.getItem('usuario');
    this.usuario = u ? JSON.parse(u) : null;
  }

  logout(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.router.navigate(['/login']);
  }
}