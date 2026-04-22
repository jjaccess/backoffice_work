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
              <span class="nav-icon">📱</span>
              <span>VisitApp</span>
              <span class="arrow" [class.rotated]="menuAbierto">{{ menuAbierto ? '▼' : '▶' }}</span>
            </div>

            <div class="dropdown-content" *ngIf="menuAbierto">
              <a routerLink="/verificacion" class="nav-item sub-item">
                <span class="nav-icon">🖐️</span><span>Registrar</span>
              </a>
              
              <a *ngIf="esAdmin" routerLink="/enrolamiento" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📝</span><span>Enrolamiento</span>
              </a>
              
              <a routerLink="/historial" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📋</span><span>Historial</span>
              </a>
              
              <a *ngIf="esAdmin" routerLink="/admin/carga-pdv" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">📤</span><span>Cargar PDV</span>
              </a>

              <a *ngIf="esAdmin" routerLink="/admin/jerarquia" routerLinkActive="active" class="nav-item sub-item">
                <span class="nav-icon">🌳</span><span>Jerarquía</span>
              </a>

            </div>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="usuario-info">
            <span class="usuario-nombre">{{ usuario?.nombre }}</span>
            <span class="usuario-rol">{{ usuario?.rol }}</span>
          </div>
          <button class="btn-logout" (click)="logout()" title="Cerrar sesión">⏻</button>
        </div>
      </aside>
      <main class="main-content"><router-outlet></router-outlet></main>
    </div>

    <ng-template #soloRouter>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styles: [`
    /* Se mantienen todos tus estilos originales */
    * { box-sizing:border-box; margin:0; padding:0; }
    .app-shell { display:flex; min-height:100vh; }
    .sidebar {
      width:220px; min-height:100vh;
      background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);
      display:flex; flex-direction:column;
      position:fixed; left:0; top:0; bottom:0; z-index:100;
    }
    .sidebar-logo { padding:24px 20px; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(255,255,255,0.08); }
    .logo-icon { font-size:1.6rem; }
    .logo-text { color:white; font-weight:700; font-size:1rem; }
    .sidebar-nav { flex:1; padding:16px 12px; display:flex; flex-direction:column; gap:4px; }
    .nav-item { display:flex; align-items:center; gap:10px; padding:12px 14px; border-radius:10px; color:rgba(255,255,255,0.6); text-decoration:none; font-size:0.9rem; transition:all 0.2s; cursor:pointer; }
    .nav-item:hover { background:rgba(255,255,255,0.08); color:white; }
    .nav-item.active { background:#4361ee; color:white; }
    .nav-icon { font-size:1.1rem; }
    
    /* Nuevos estilos para el desplegable sin romper lo anterior */
    .dropdown-header { justify-content: space-between; color: white; background: rgba(255,255,255,0.03); }
    .arrow { font-size: 0.7rem; transition: transform 0.2s; }
    .sub-item { margin-left: 10px; font-size: 0.85rem; margin-top: 2px; }
    .dropdown-content { display: flex; flex-direction: column; gap: 2px; margin-top: 4px; }

    .sidebar-footer { padding:16px; border-top:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; }
    .usuario-info { display:flex; flex-direction:column; }
    .usuario-nombre { color:white; font-size:0.8rem; font-weight:600; }
    .usuario-rol { color:rgba(255,255,255,0.5); font-size:0.7rem; }
    .btn-logout { background:transparent; border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.6); padding:6px 10px; border-radius:8px; cursor:pointer; font-size:1rem; }
    .btn-logout:hover { background:#dc3545; border-color:#dc3545; color:white; }
    .main-content { margin-left:220px; flex:1; min-height:100vh; background:#f4f6fb; }
    
    @media (max-width:768px) {
      .sidebar { width:64px; }
      .logo-text, .nav-item span:last-child, .usuario-info, .arrow { display:none; }
      .main-content { margin-left:64px; }
      .sub-item { margin-left: 0; }
    }
  `]
})
export class AppComponent implements OnInit {
  usuario: any = null;
  esQuiosco = false;
  menuAbierto = false; // Controla el desplegable

  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  get isBrowser(): boolean { return isPlatformBrowser(this.platformId); }

  get usuarioLogueado(): boolean {
    if (!this.isBrowser) return false;
    return !!localStorage.getItem('token');
  }

  get esAdmin(): boolean {
    return this.usuario?.rol === 'ADMIN';
  }

  ngOnInit(): void {
    this.cargarUsuario();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.esQuiosco = e.urlAfterRedirects?.includes('/quiosco') || e.urlAfterRedirects?.includes('/login');
        this.cargarUsuario();
      });
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

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