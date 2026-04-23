// src/app/features/configuracion/usuarios/usuarios.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface Usuario {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  email?: string;
  rol: 'ADMIN' | 'TIC' | 'TES' | 'FIN' | 'JUR' | 'CUM' | 'GH' | 'COM' | 'ADMTVO' | 'AUD';
  activo: boolean;
  ultimo_acceso?: string;
  created_at: string;
}

type Modal = 'ninguno' | 'crear' | 'editar' | 'password' | 'confirmar';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">

      <!-- HEADER -->
      <div class="page-header">
        <div>
          <h1>Usuarios del sistema</h1>
          <p class="sub">Gestione los operadores y administradores</p>
        </div>
        <div class="header-actions">
          <button class="btn-download" (click)="descargarUsuarios()" title="Descargar usuarios">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Descargar
          </button>
          <button class="btn-primary" (click)="abrirCrear()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            Nuevo usuario
          </button>
        </div>
      </div>

      <!-- STATS -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-num">{{ usuarios.length }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-card">
          <span class="stat-num c-green">{{ activos }}</span>
          <span class="stat-label">Activos</span>
        </div>
        <div class="stat-card">
          <span class="stat-num c-gray">{{ inactivos }}</span>
          <span class="stat-label">Inactivos</span>
        </div>
        <div class="stat-card">
          <span class="stat-num c-blue">{{ admins }}</span>
          <span class="stat-label">Admins</span>
        </div>
      </div>

      <!-- TABLA -->
      <div class="tabla-card">
        <div class="tabla-toolbar">
          <div class="search-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="search-icon">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
              <path d="M16.5 16.5L21 21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input type="text" placeholder="Buscar usuario..." [(ngModel)]="busqueda" class="search-input"/>
          </div>
          <select [(ngModel)]="filtroRol" class="filtro-select">
            <option value="">Todos los roles</option>
            <option value="ADMIN">Admin Sistema</option>
            <option value="TIC">TIC</option>
            <option value="TES">Tesorería</option>
            <option value="FIN">Financiero</option>
            <option value="JUR">Jurídico</option>
            <option value="CUM">Cumplimiento</option>
            <option value="GH">Gestión Humana</option>
            <option value="COM">Comercial</option>
            <option value="ADMTVO">Administrativo</option>
            <option value="AUD">Auditoría</option>
          </select>
          <select [(ngModel)]="filtroActivo" class="filtro-select">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div *ngIf="cargando" class="loading">
          <div class="spinner"></div> Cargando usuarios...
        </div>

        <table *ngIf="!cargando">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre completo</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Último acceso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of usuariosFiltrados" [class.row-inactivo]="!u.activo">
              <td>
                <div class="avatar-row">
                  <div class="avatar" [class]="'avatar-' + u.rol.toLowerCase()">
                    {{ iniciales(u) }}
                  </div>
                  <span class="username">{{ u.username }}</span>
                </div>
              </td>
              <td>{{ u.nombres }} {{ u.apellidos }}</td>
              <td class="td-email">{{ u.email || '—' }}</td>
              <td><span class="badge-rol" [class]="'rol-' + u.rol.toLowerCase()">{{ nombreRol(u.rol) }}</span></td>
              <td class="td-fecha">
                {{ u.ultimo_acceso ? (u.ultimo_acceso | date:'dd/MM/yy HH:mm') : 'Nunca' }}
              </td>
              <td>
                <span class="badge-estado" [class.activo]="u.activo" [class.inactivo]="!u.activo">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="acciones">
                  <button class="btn-accion" title="Editar" (click)="abrirEditar(u)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </button>
                  <button class="btn-accion" title="Cambiar contraseña" (click)="abrirPassword(u)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect x="5" y="11" width="14" height="10" rx="2"
                            stroke="currentColor" stroke-width="1.8"/>
                      <path d="M8 11V7a4 4 0 018 0v4" stroke="currentColor"
                            stroke-width="1.8" stroke-linecap="round" fill="none"/>
                    </svg>
                  </button>
                  <button class="btn-accion btn-toggle-estado"
                          [title]="u.activo ? 'Desactivar' : 'Activar'"
                          (click)="confirmarToggle(u)">
                    <svg *ngIf="u.activo" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#dc2626" stroke-width="2"/>
                      <line x1="8" y1="8" x2="16" y2="16" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <svg *ngIf="!u.activo" width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="22 4 12 14.01 9 11.01" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="usuariosFiltrados.length === 0">
              <td colspan="7" class="sin-datos">No se encontraron usuarios</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL CREAR / EDITAR                          -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modal === 'crear' || modal === 'editar'" (click)="cerrar()">
      <div class="modal" (click)="$event.stopPropagation()">

        <div class="modal-header">
          <h2>{{ modal === 'crear' ? 'Nuevo usuario' : 'Editar usuario' }}</h2>
          <button class="btn-close" (click)="cerrar()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <form [formGroup]="form" (ngSubmit)="guardar()">
          <div class="modal-body">

            <div class="form-row">
              <div class="form-field">
                <label>Nombres *</label>
                <input type="text" formControlName="nombres" placeholder="Juan Carlos" />
                <span class="field-error" *ngIf="f['nombres'].invalid && f['nombres'].touched">
                  Requerido
                </span>
              </div>
              <div class="form-field">
                <label>Apellidos *</label>
                <input type="text" formControlName="apellidos" placeholder="Pérez Gómez" />
                <span class="field-error" *ngIf="f['apellidos'].invalid && f['apellidos'].touched">
                  Requerido
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Usuario *</label>
                <input type="text" formControlName="username"
                       placeholder="jperez"
                       [readonly]="modal === 'editar'" />
                <span class="field-error" *ngIf="f['username'].invalid && f['username'].touched">
                  Requerido
                </span>
              </div>
              <div class="form-field">
                <label>Email</label>
                <input type="email" formControlName="email" placeholder="usuario@empresa.com" />
                <span class="field-error" *ngIf="f['email'].invalid && f['email'].touched">
                  Email inválido
                </span>
              </div>
            </div>

            <!-- Contraseña solo en creación -->
            <div class="form-row" *ngIf="modal === 'crear'">
              <div class="form-field">
                <label>Contraseña * <span class="label-hint">(mín. 6 caracteres)</span></label>
                <input type="password" formControlName="password" placeholder="••••••••" />
                <span class="field-error" *ngIf="f['password'].invalid && f['password'].touched">
                  Mínimo 6 caracteres
                </span>
              </div>
              <div class="form-field">
                <label>Confirmar contraseña *</label>
                <input type="password" formControlName="confirmar" placeholder="••••••••" />
                <span class="field-error"
                      *ngIf="f['confirmar'].value && f['confirmar'].value !== f['password'].value">
                  Las contraseñas no coinciden
                </span>
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label>Rol *</label>
                <select formControlName="rol">
                  <option value="ADMIN">Admin Sistema</option>
                  <option value="TIC">TIC</option>
                  <option value="TES">Tesorería</option>
                  <option value="FIN">Financiero</option>
                  <option value="JUR">Jurídico</option>
                  <option value="CUM">Cumplimiento</option>
                  <option value="GH">Gestión Humana</option>
                  <option value="COM">Comercial</option>
                  <option value="ADMTVO">Administrativo</option>
                  <option value="AUD">Auditoría</option>
                </select>
              </div>
              <div class="form-field" *ngIf="modal === 'editar'">
                <label>Estado</label>
                <select formControlName="activo">
                  <option [ngValue]="true">Activo</option>
                  <option [ngValue]="false">Inactivo</option>
                </select>
              </div>
            </div>

            <!-- Info roles -->
            <div class="roles-info">
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'ADMIN'">
                <strong>Admin</strong> — Gestión completa: usuarios, enrolamiento, historial, PDV
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'TIC'">
                <strong>TIC</strong> — Tecnología: enrolamiento, historial, configuración técnica
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'TES'">
                <strong>Tesorería</strong> — Gestión de transacciones financieras
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'FIN'">
                <strong>Financiero</strong> — Reportes y análisis financieros
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'JUR'">
                <strong>Jurídico</strong> — Gestión de casos legales
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'CUM'">
                <strong>Cumplimiento</strong> — Cumplimiento normativo
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'GH'">
                <strong>Gestión Humana</strong> — Recursos humanos
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'COM'">
                <strong>Comercial</strong> — Ventas y clientes
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'ADMTVO'">
                <strong>Administrativo</strong> — Tareas administrativas
              </div>
              <div class="rol-info" [class.selected]="form.get('rol')?.value === 'AUD'">
                <strong>Auditoría</strong> — Auditorías internas
              </div>
            </div>

          </div>

          <div *ngIf="errorModal" class="modal-error">{{ errorModal }}</div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="guardando || form.invalid">
              {{ guardando ? 'Guardando...' : (modal === 'crear' ? 'Crear usuario' : 'Guardar cambios') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL CAMBIAR CONTRASEÑA                      -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modal === 'password'" (click)="cerrar()">
      <div class="modal modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Cambiar contraseña</h2>
          <button class="btn-close" (click)="cerrar()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            Cambiando contraseña de
            <strong>{{ usuarioSeleccionado?.username }}</strong>
          </p>
          <div class="form-field">
            <label>Nueva contraseña *</label>
            <input type="password" [(ngModel)]="nuevaPassword" placeholder="••••••••" />
          </div>
          <div class="form-field" style="margin-top:12px">
            <label>Confirmar contraseña *</label>
            <input type="password" [(ngModel)]="confirmarPassword" placeholder="••••••••" />
          </div>
          <div *ngIf="errorModal" class="modal-error" style="margin-top:10px">{{ errorModal }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrar()">Cancelar</button>
          <button class="btn-primary" (click)="cambiarPassword()" [disabled]="guardando">
            {{ guardando ? 'Guardando...' : 'Cambiar contraseña' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL CONFIRMAR TOGGLE                        -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modal === 'confirmar'" (click)="cerrar()">
      <div class="modal modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>{{ usuarioSeleccionado?.activo ? 'Desactivar usuario' : 'Activar usuario' }}</h2>
          <button class="btn-close" (click)="cerrar()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            {{ usuarioSeleccionado?.activo
              ? '¿Está seguro de desactivar al usuario'
              : '¿Desea activar nuevamente al usuario' }}
            <strong>{{ usuarioSeleccionado?.username }}</strong>?
            {{ usuarioSeleccionado?.activo
              ? 'No podrá iniciar sesión en el sistema.'
              : 'Podrá iniciar sesión nuevamente.' }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrar()">Cancelar</button>
          <button [class]="usuarioSeleccionado?.activo ? 'btn-danger' : 'btn-primary'"
                  (click)="toggleUsuario()" [disabled]="guardando">
            {{ guardando ? 'Procesando...' : (usuarioSeleccionado?.activo ? 'Sí, desactivar' : 'Sí, activar') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast" [class.show]="toastMsg">{{ toastMsg }}</div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .page { max-width: 1100px; margin: 32px auto; padding: 0 20px; font-family: 'Segoe UI', sans-serif; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    h1 { font-size: 1.4rem; color: #1a1a2e; font-weight: 600; }
    .sub { font-size: 0.82rem; color: #888; margin-top: 3px; }
    .btn-download {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 16px; background: #f0fdf4; color: #16a34a;
      border: 1.5px solid #bbf7d0; border-radius: 9px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-download:hover { background: #dcfce7; border-color: #86efac; }

    /* Stats */
    .stats-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
    .stat-card {
      background: white; border-radius: 12px; padding: 16px 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 4px;
    }
    .stat-num { font-size: 1.8rem; font-weight: 700; color: #1a1a2e; }
    .stat-num.c-green { color: #16a34a; }
    .stat-num.c-gray  { color: #888; }
    .stat-num.c-blue  { color: #4361ee; }
    .stat-label { font-size: 0.75rem; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Tabla */
    .tabla-card { background: white; border-radius: 16px; box-shadow: 0 1px 8px rgba(0,0,0,0.07); overflow: hidden; }
    .tabla-toolbar { display: flex; gap: 10px; padding: 16px; border-bottom: 1px solid #f0f0f0; flex-wrap: wrap; }
    .search-wrap { position: relative; flex: 1; min-width: 180px; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #aaa; }
    .search-input { width: 100%; padding: 8px 12px 8px 32px; border: 1.5px solid #e8eaf0; border-radius: 8px; font-size: 0.85rem; outline: none; }
    .search-input:focus { border-color: #4361ee; }
    .filtro-select { padding: 8px 12px; border: 1.5px solid #e8eaf0; border-radius: 8px; font-size: 0.85rem; outline: none; background: white; }
    .filtro-select:focus { border-color: #4361ee; }

    .loading { display: flex; align-items: center; gap: 12px; padding: 40px; justify-content: center; color: #666; }
    .spinner { width: 24px; height: 24px; border: 3px solid #e0e0e0; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
    thead { background: #f8f9ff; }
    th { padding: 11px 14px; text-align: left; font-size: 0.72rem; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #eee; }
    td { padding: 11px 14px; border-bottom: 1px solid #f4f4f4; color: #333; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafbff; }
    tr.row-inactivo td { opacity: 0.55; }

    /* Avatar — clases: avatar-{rol.toLowerCase()} */
    .avatar-row { display: flex; align-items: center; gap: 8px; }
    .avatar { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
    .avatar-admin  { background: #ebf0ff; color: #4361ee; }
    .avatar-tic    { background: #e6f9f0; color: #16a34a; }
    .avatar-tes    { background: #fef3c7; color: #92400e; }
    .avatar-fin    { background: #e0f2fe; color: #0369a1; }
    .avatar-jur    { background: #f3e8ff; color: #7c3aed; }
    .avatar-cum    { background: #fce7f3; color: #be185d; }
    .avatar-gh     { background: #ecfdf5; color: #059669; }
    .avatar-com    { background: #fff7ed; color: #c2410c; }
    .avatar-admtvo { background: #f1f5f9; color: #475569; }
    .avatar-aud    { background: #fef2f2; color: #b91c1c; }
    .username { font-weight: 600; color: #1a1a2e; }
    .td-email { color: #666; }
    .td-fecha { color: #888; font-size: 0.78rem; }

    /* Badge rol — clases: rol-{rol.toLowerCase()} */
    .badge-rol { padding: 3px 9px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.03em; }
    .rol-admin  { background: #ebf0ff; color: #4361ee; }
    .rol-tic    { background: #e6f9f0; color: #16a34a; }
    .rol-tes    { background: #fef3c7; color: #92400e; }
    .rol-fin    { background: #e0f2fe; color: #0369a1; }
    .rol-jur    { background: #f3e8ff; color: #7c3aed; }
    .rol-cum    { background: #fce7f3; color: #be185d; }
    .rol-gh     { background: #ecfdf5; color: #059669; }
    .rol-com    { background: #fff7ed; color: #c2410c; }
    .rol-admtvo { background: #f1f5f9; color: #475569; }
    .rol-aud    { background: #fef2f2; color: #b91c1c; }

    .badge-estado { padding: 3px 9px; border-radius: 6px; font-size: 0.72rem; font-weight: 700; }
    .badge-estado.activo   { background: #dcfce7; color: #15803d; }
    .badge-estado.inactivo { background: #f5f5f5; color: #888; }

    /* Acciones */
    .acciones { display: flex; gap: 4px; }
    .btn-accion {
      width: 28px; height: 28px; border-radius: 7px; border: 1px solid #eee;
      background: white; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #555; transition: all 0.15s;
    }
    .btn-accion:hover { background: #f0f4ff; border-color: #c0caff; color: #4361ee; }
    .btn-toggle-estado:hover { background: #fff5f5; border-color: #fecaca; }
    .sin-datos { text-align: center; padding: 40px; color: #aaa; }

    /* Botones generales */
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: #4361ee; color: white;
      border: none; border-radius: 9px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-primary:hover:not(:disabled) { background: #3451d1; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      padding: 9px 18px; background: white; color: #555;
      border: 1.5px solid #e0e0e0; border-radius: 9px; font-size: 0.85rem;
      cursor: pointer; transition: background 0.15s;
    }
    .btn-secondary:hover { background: #f5f5f5; }
    .btn-danger {
      padding: 9px 18px; background: #dc2626; color: white;
      border: none; border-radius: 9px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer;
    }
    .btn-danger:disabled { opacity: 0.5; }

    /* MODALES */
    .overlay {
      position: fixed; inset: 0; background: rgba(10,15,40,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 20px; backdrop-filter: blur(2px);
      animation: fadeOverlay 0.15s ease;
    }
    @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }

    .modal {
      background: white; border-radius: 18px; width: 100%; max-width: 580px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.25);
      animation: slideModal 0.2s ease;
    }
    .modal-sm { max-width: 420px; }
    @keyframes slideModal { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }

    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .modal-header h2 { font-size: 1rem; font-weight: 600; color: #1a1a2e; }
    .btn-close {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: #f5f5f5; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #666; transition: background 0.15s;
    }
    .btn-close:hover { background: #eee; }

    .modal-body { padding: 20px 24px; }
    .modal-desc { font-size: 0.88rem; color: #555; margin-bottom: 16px; line-height: 1.5; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; }
    .form-field label {
      font-size: 0.75rem; font-weight: 600; color: #555;
      text-transform: uppercase; letter-spacing: 0.05em;
    }
    .label-hint { font-weight: 400; text-transform: none; color: #aaa; font-size: 0.7rem; }
    .form-field input, .form-field select {
      padding: 9px 12px; border: 1.5px solid #e8eaf0; border-radius: 8px;
      font-size: 0.88rem; outline: none; background: #fafbfc; transition: border-color 0.15s;
    }
    .form-field input:focus, .form-field select:focus { border-color: #4361ee; background: white; }
    .form-field input[readonly] { background: #f5f5f5; color: #888; cursor: not-allowed; }
    .field-error { font-size: 0.72rem; color: #dc2626; }

    .roles-info { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
    .rol-info {
      padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; color: #666;
      border: 1.5px solid #eee; transition: all 0.15s;
    }
    .rol-info.selected { border-color: #4361ee; background: #f0f4ff; color: #333; }
    .rol-info strong { color: #4361ee; }

    .modal-error {
      margin: 0 24px 8px; padding: 9px 12px; background: #fff5f5;
      border: 1px solid #feb2b2; border-radius: 8px;
      font-size: 0.82rem; color: #c53030;
    }

    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 24px; border-top: 1px solid #f0f0f0;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
      background: #1a1a2e; color: white; border-radius: 10px;
      font-size: 0.85rem; font-weight: 500; z-index: 300;
      transform: translateY(80px); opacity: 0; transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .toast.show { transform: translateY(0); opacity: 1; }

    @media (max-width: 600px) {
      .stats-row { grid-template-columns: repeat(2,1fr); }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class UsuariosComponent implements OnInit {

  usuarios: Usuario[] = [];
  cargando = false;
  busqueda = '';
  filtroRol = '';
  filtroActivo = '';

  modal: Modal = 'ninguno';
  usuarioSeleccionado: Usuario | null = null;
  form!: FormGroup;
  guardando = false;
  errorModal = '';

  nuevaPassword = '';
  confirmarPassword = '';
  toastMsg = '';
  private toastTimer: any;

  private base = environment.apiUrl;

  // Mapa de siglas → nombres legibles
  private rolesMap: Record<string, string> = {
    ADMIN: 'Admin Sistema',
    TIC: 'TIC',
    TES: 'Tesorería',
    FIN: 'Financiero',
    JUR: 'Jurídico',
    CUM: 'Cumplimiento',
    GH: 'Gestión Humana',
    COM: 'Comercial',
    ADMTVO: 'Administrativo',
    AUD: 'Auditoría'
  };

  constructor(private http: HttpClient, private fb: FormBuilder) { }

  ngOnInit(): void { this.cargar(); }

  // ── Getters stats ────────────────────────────────────────────
  get activos() { return this.usuarios.filter(u => u.activo).length; }
  get inactivos() { return this.usuarios.filter(u => !u.activo).length; }
  get admins() { return this.usuarios.filter(u => u.rol === 'ADMIN').length; }

  get usuariosFiltrados(): Usuario[] {
    return this.usuarios.filter(u => {
      const txt = this.busqueda.toLowerCase();
      const matchBusq = !txt ||
        u.username.toLowerCase().includes(txt) ||
        u.nombres.toLowerCase().includes(txt) ||
        u.apellidos.toLowerCase().includes(txt) ||
        (u.email || '').toLowerCase().includes(txt);
      const matchRol = !this.filtroRol || u.rol === this.filtroRol;
      const matchActivo = !this.filtroActivo || String(u.activo) === this.filtroActivo;
      return matchBusq && matchRol && matchActivo;
    });
  }

  get f() { return this.form.controls; }

  iniciales(u: Usuario): string {
    return `${u.nombres[0]}${u.apellidos[0]}`.toUpperCase();
  }

  nombreRol(sigla: string): string {
    return this.rolesMap[sigla] || sigla;
  }

  // ── Cargar ───────────────────────────────────────────────────
  cargar(): void {
    this.cargando = true;
    this.http.get<Usuario[]>(`${this.base}/usuarios`).subscribe({
      next: u => { this.usuarios = u; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  // ── Abrir modales ────────────────────────────────────────────
  abrirCrear(): void {
    this.form = this.fb.group({
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', Validators.required],
      rol: ['TIC', Validators.required],
      activo: [true]
    });
    this.errorModal = '';
    this.modal = 'crear';
  }

  abrirEditar(u: Usuario): void {
    this.usuarioSeleccionado = u;
    this.form = this.fb.group({
      nombres: [u.nombres, Validators.required],
      apellidos: [u.apellidos, Validators.required],
      username: [{ value: u.username, disabled: true }],
      email: [u.email || '', Validators.email],
      rol: [u.rol, Validators.required],
      activo: [u.activo]
    });
    this.errorModal = '';
    this.modal = 'editar';
  }

  abrirPassword(u: Usuario): void {
    this.usuarioSeleccionado = u;
    this.nuevaPassword = '';
    this.confirmarPassword = '';
    this.errorModal = '';
    this.modal = 'password';
  }

  confirmarToggle(u: Usuario): void {
    this.usuarioSeleccionado = u;
    this.errorModal = '';
    this.modal = 'confirmar';
  }

  cerrar(): void {
    this.modal = 'ninguno';
    this.errorModal = '';
    this.guardando = false;
  }

  // ── Guardar usuario ──────────────────────────────────────────
  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.value;

    if (this.modal === 'crear' && v.password !== v.confirmar) {
      this.errorModal = 'Las contraseñas no coinciden';
      return;
    }

    this.guardando = true;
    this.errorModal = '';

    if (this.modal === 'crear') {
      const body = {
        username: v.username, password: v.password, nombres: v.nombres,
        apellidos: v.apellidos, email: v.email, rol: v.rol
      };
      this.http.post<Usuario>(`${this.base}/usuarios`, body).subscribe({
        next: (u) => { this.usuarios.unshift(u); this.cerrar(); this.toast('Usuario creado correctamente'); },
        error: (err) => { this.guardando = false; this.errorModal = err.error?.error || 'Error al crear usuario'; }
      });
    } else {
      const body = { nombres: v.nombres, apellidos: v.apellidos, email: v.email, rol: v.rol, activo: v.activo };
      this.http.put<Usuario>(`${this.base}/usuarios/${this.usuarioSeleccionado!.id}`, body).subscribe({
        next: (u) => {
          const idx = this.usuarios.findIndex(x => x.id === u.id);
          if (idx >= 0) this.usuarios[idx] = u;
          this.cerrar();
          this.toast('Usuario actualizado');
        },
        error: (err) => { this.guardando = false; this.errorModal = err.error?.error || 'Error al actualizar'; }
      });
    }
  }

  // ── Cambiar contraseña ───────────────────────────────────────
  cambiarPassword(): void {
    if (!this.nuevaPassword || this.nuevaPassword.length < 6) {
      this.errorModal = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (this.nuevaPassword !== this.confirmarPassword) {
      this.errorModal = 'Las contraseñas no coinciden';
      return;
    }
    this.guardando = true;
    this.http.patch(`${this.base}/usuarios/${this.usuarioSeleccionado!.id}/password`,
      { password: this.nuevaPassword }).subscribe({
        next: () => { this.cerrar(); this.toast('Contraseña actualizada'); },
        error: (err) => { this.guardando = false; this.errorModal = err.error?.error || 'Error'; }
      });
  }

  // ── Toggle activo/inactivo ───────────────────────────────────
  toggleUsuario(): void {
    this.guardando = true;
    this.http.patch<any>(`${this.base}/usuarios/${this.usuarioSeleccionado!.id}/toggle`, {}).subscribe({
      next: (r) => {
        const idx = this.usuarios.findIndex(u => u.id === r.id);
        if (idx >= 0) this.usuarios[idx].activo = r.activo;
        this.cerrar();
        this.toast(r.activo ? 'Usuario activado' : 'Usuario desactivado');
      },
      error: (err) => { this.guardando = false; this.errorModal = err.error?.error || 'Error'; }
    });
  }

  // ── Toast ────────────────────────────────────────────────────
  toast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg = msg;
    this.toastTimer = setTimeout(() => this.toastMsg = '', 3000);
  }

  // ── Descargar usuarios a CSV ──────────────────────────────────
  descargarUsuarios(): void {
    const datos = this.usuariosFiltrados;
    if (datos.length === 0) { this.toast('No hay usuarios para descargar'); return; }

    const headers = ['Usuario', 'Nombres', 'Apellidos', 'Email', 'Rol', 'Estado', 'Último Acceso', 'Creado'];
    const filas = datos.map(u => [
      u.username,
      u.nombres,
      u.apellidos,
      u.email || '',
      this.nombreRol(u.rol),
      u.activo ? 'Activo' : 'Inactivo',
      u.ultimo_acceso || 'Nunca',
      u.created_at
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast('Usuarios descargados correctamente');
  }
}