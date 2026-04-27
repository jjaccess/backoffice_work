import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-jerarquia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="jerarquia-container">
      <div class="bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>

      <div class="header-section">
        <div class="header-top">
          <div>
            <h1>Estructura de Red</h1>
            <p class="subtitulo">Visualización de la jerarquía organizacional y técnica</p>
          </div>
          <div class="header-actions">
            <button class="btn-download" (click)="descargarJerarquia()">
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
              Nuevo PDV
            </button>
          </div>
        </div>
      </div>

      <div class="card filtros-card">
        <input type="text" placeholder="🔍 Buscar por PDV, Oficina, MAC o Dirección..."
               (input)="filtrar($event)" class="busqueda-input">
      </div>

      <div class="tabla-wrapper card">
        <table class="jerarquia-table">
          <thead>
            <tr>
              <th>Departamento</th>
              <th>Zona / Subzona</th>
              <th>Célula</th>
              <th>Oficina</th>
              <th>Punto de Venta</th>
              <th>MAC</th>
              <th>Lat / Lon</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of datosPaginados" class="fila-jerarquia">
              <td><span class="badge dpto">{{ item.departamento }}</span></td>
              <td>
                <div class="text-main">{{ item.zona }}</div>
                <div class="text-sub">{{ item.subzona }}</div>
              </td>
              <td>{{ item.celula }}</td>
              <td>{{ item.oficina }}</td>
              <td>
                <div class="pdv-name"><strong>{{ item.nombre_pdv }}</strong></div>
                <div class="pdv-id">ID: {{ item.codigo_pdv }}</div>
              </td>
              <td>
                <code class="mac-address">{{ item.mac || 'N/A' }}</code>
              </td>
              <td>
                <div *ngIf="item.latitud && item.longitud" class="coordenadas">
                  <span class="coord">{{ item.latitud | number:'1.4-4' }}</span>
                  <span class="coord">{{ item.longitud | number:'1.4-4' }}</span>
                </div>
                <span *ngIf="!item.latitud || !item.longitud" class="sin-coord">Sin GPS</span>
              </td>
              <td>
                <div class="acciones">
                  <button class="btn-accion" title="Editar" (click)="abrirEditar(item)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </button>
                  <button class="btn-accion btn-accion-danger" title="Eliminar" (click)="confirmarEliminar(item)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
                            stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="cargando" class="loading-state">
          <div class="spinner"></div> Cargando jerarquía...
        </div>

        <div *ngIf="!cargando && datosFiltrados.length === 0" class="empty-state">
          No se encontraron datos en la jerarquía.
        </div>

        <div class="paginacion" *ngIf="datosFiltrados.length > limite">
          <button class="btn-page" [disabled]="pagina <= 1" (click)="cambiarPagina(pagina - 1)">‹ Anterior</button>
          <div class="paginas-nums">
            <button *ngFor="let p of paginasVisibles" class="btn-page-num"
                    [class.activa]="p === pagina" (click)="cambiarPagina(p)">{{ p }}</button>
          </div>
          <button class="btn-page" [disabled]="pagina >= totalPaginas" (click)="cambiarPagina(pagina + 1)">Siguiente ›</button>
          <span class="pag-info">{{ datosFiltrados.length }} registros</span>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL CREAR PDV                               -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modalCrear" (click)="cerrarModal()">
      <div class="modal modal-lg" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Nuevo Punto de Venta</h2>
          <button class="btn-close" (click)="cerrarModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- Ubicación en cascada -->
          <p class="section-label">Ubicación</p>
          <div class="form-row">
            <div class="form-field">
              <label>Departamento *</label>
              <select [(ngModel)]="crearForm.departamento_id" (change)="onDeptoChange()">
                <option [ngValue]="null">Seleccione...</option>
                <option *ngFor="let d of listDeptos" [ngValue]="d.id">{{ d.nombre }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Zona *</label>
              <select [(ngModel)]="crearForm.zona_id" (change)="onZonaChange()" [disabled]="!crearForm.departamento_id">
                <option [ngValue]="null">Seleccione...</option>
                <option *ngFor="let z of listZonas" [ngValue]="z.id">{{ z.nombre }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Subzona *</label>
              <select [(ngModel)]="crearForm.subzona_id" (change)="onSubzonaChange()" [disabled]="!crearForm.zona_id">
                <option [ngValue]="null">Seleccione...</option>
                <option *ngFor="let s of listSubzonas" [ngValue]="s.id">{{ s.nombre }}</option>
              </select>
            </div>
            <div class="form-field">
              <label>Célula *</label>
              <select [(ngModel)]="crearForm.celula_id" (change)="onCelulaChange()" [disabled]="!crearForm.subzona_id">
                <option [ngValue]="null">Seleccione...</option>
                <option *ngFor="let c of listCelulas" [ngValue]="c.id">{{ c.nombre }}</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Oficina *</label>
              <select [(ngModel)]="crearForm.oficina_id" [disabled]="!crearForm.celula_id">
                <option [ngValue]="null">Seleccione...</option>
                <option *ngFor="let o of listOficinas" [ngValue]="o.id">{{ o.nombre }}</option>
              </select>
            </div>
            <div class="form-field"></div>
          </div>

          <hr style="border:none;border-top:1px solid #eee;margin:16px 0;">
          <p class="section-label">Datos del PDV</p>

          <div class="form-row">
            <div class="form-field">
              <label>Nombre PDV *</label>
              <input type="text" [(ngModel)]="crearForm.nombre" placeholder="Ej: Sucursal Centro" />
            </div>
            <div class="form-field">
              <label>MAC Address *</label>
              <input type="text" [(ngModel)]="crearForm.mac_address" placeholder="XX:XX:XX:XX:XX:XX" />
            </div>
          </div>
          <div class="form-field" style="margin-bottom:14px">
            <label>Dirección</label>
            <input type="text" [(ngModel)]="crearForm.direccion" placeholder="Cra 10 #20-30" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Latitud</label>
              <input type="number" step="0.0000001" [(ngModel)]="crearForm.latitud" placeholder="Ej: 4.6486" />
            </div>
            <div class="form-field">
              <label>Longitud</label>
              <input type="number" step="0.0000001" [(ngModel)]="crearForm.longitud" placeholder="Ej: -74.0633" />
            </div>
          </div>
          <div *ngIf="errorModal" class="modal-error">{{ errorModal }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
          <button class="btn-primary" (click)="guardarNuevo()" [disabled]="guardando">
            {{ guardando ? 'Creando...' : 'Crear PDV' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL EDITAR PDV                              -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modalEditar" (click)="cerrarModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Editar Punto de Venta</h2>
          <button class="btn-close" (click)="cerrarModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-field">
              <label>Nombre PDV *</label>
              <input type="text" [(ngModel)]="editForm.nombre" />
            </div>
            <div class="form-field">
              <label>MAC Address *</label>
              <input type="text" [(ngModel)]="editForm.mac_address" />
            </div>
          </div>
          <div class="form-field" style="margin-bottom:14px">
            <label>Dirección</label>
            <input type="text" [(ngModel)]="editForm.direccion" />
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>Latitud</label>
              <input type="number" step="0.0000001" [(ngModel)]="editForm.latitud" placeholder="Ej: 4.6486" />
            </div>
            <div class="form-field">
              <label>Longitud</label>
              <input type="number" step="0.0000001" [(ngModel)]="editForm.longitud" placeholder="Ej: -74.0633" />
            </div>
          </div>
          <div class="info-ubicacion">
            <span class="text-sub">{{ pdvSeleccionado?.departamento }} › {{ pdvSeleccionado?.zona }} › {{ pdvSeleccionado?.oficina }}</span>
          </div>
          <div *ngIf="errorModal" class="modal-error">{{ errorModal }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
          <button class="btn-primary" (click)="guardarEdicion()" [disabled]="guardando">
            {{ guardando ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- MODAL CONFIRMAR ELIMINAR                      -->
    <!-- ══════════════════════════════════════════════ -->
    <div class="overlay" *ngIf="modalEliminar" (click)="cerrarModal()">
      <div class="modal modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>Eliminar Punto de Venta</h2>
          <button class="btn-close" (click)="cerrarModal()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-desc">
            ¿Está seguro de eliminar el punto de venta
            <strong>{{ pdvSeleccionado?.nombre_pdv }}</strong>?
          </p>
          <p class="modal-desc" style="color:#dc2626; font-size:0.8rem;">
            Esta acción no se puede deshacer. Se eliminará el PDV con MAC
            <code>{{ pdvSeleccionado?.mac }}</code>.
          </p>
          <div *ngIf="errorModal" class="modal-error">{{ errorModal }}</div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="cerrarModal()">Cancelar</button>
          <button class="btn-danger" (click)="eliminarPdv()" [disabled]="guardando">
            {{ guardando ? 'Eliminando...' : 'Sí, eliminar' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div class="toast" [class.show]="toastMsg">{{ toastMsg }}</div>
  `,
  styles: [`
    .page-container {
      min-height: 100vh; background: #f0f4f8; display: flex; flex-direction: column;
      align-items: center; justify-content: flex-start; padding: 60px 16px;
      position: relative; overflow: hidden;
    }
    .bg-shapes { position: absolute; inset: 0; pointer-events: none; }
    .shape { position: absolute; border-radius: 50%; opacity: 0.07; background: #1a1a2e; }
    .shape-1 { width: 500px; height: 500px; top: -200px; right: -100px; }
    .shape-2 { width: 300px; height: 300px; bottom: -100px; left: -80px; }
    .shape-3 { width: 200px; height: 200px; bottom: 120px; right: 80px; }

    .jerarquia-container { max-width: 1400px; margin: 32px auto; padding: 0 24px; font-family: 'Segoe UI', sans-serif; overflow: hidden; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    h1 { font-size: 1.6rem; color: #1a1a2e; margin-bottom: 4px; }
    .subtitulo { color: #888; font-size: 0.9rem; margin-bottom: 24px; }
    .btn-download {
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
      padding: 9px 16px; background: #f0fdf4; color: #16a34a;
      border: 1.5px solid #bbf7d0; border-radius: 9px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-download:hover { background: #dcfce7; border-color: #86efac; }

    .card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); margin-bottom: 16px; overflow: hidden; }
    .busqueda-input {
      width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 10px;
      font-size: 0.95rem; outline: none; transition: border 0.2s; box-sizing: border-box;
    }
    .busqueda-input:focus { border-color: #4361ee; }

    .tabla-wrapper { padding: 0; overflow-x: auto; }
    .jerarquia-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 1100px; }
    th { background: #f8f9fa; padding: 14px 12px; font-size: 0.75rem; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    td { padding: 12px; border-bottom: 1px solid #f1f1f1; font-size: 0.85rem; vertical-align: middle; }

    .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .dpto { background: #eef2ff; color: #4361ee; }
    .text-main { color: #1a1a2e; font-weight: 600; }
    .text-sub { color: #888; font-size: 0.8rem; }
    .pdv-name { color: #1a1a2e; }
    .pdv-id { font-size: 0.75rem; color: #aaa; }
    .mac-address {
      background: #f1f1f1; padding: 4px 6px; border-radius: 4px;
      font-family: monospace; color: #e63946; font-size: 0.8rem;
    }

    .coordenadas { display: flex; flex-direction: column; gap: 1px; }
    .coord { font-size: 0.75rem; color: #555; font-family: monospace; }
    .sin-coord { font-size: 0.75rem; color: #ccc; font-style: italic; }

    .acciones { display: flex; gap: 4px; }
    .btn-accion {
      width: 28px; height: 28px; border-radius: 7px; border: 1px solid #eee;
      background: white; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #555; transition: all 0.15s;
    }
    .btn-accion:hover { background: #f0f4ff; border-color: #c0caff; color: #4361ee; }
    .btn-accion-danger:hover { background: #fff5f5; border-color: #fecaca; color: #dc2626; }

    .loading-state, .empty-state { padding: 40px; text-align: center; color: #888; }
    .spinner { width: 24px; height: 24px; border: 3px solid #e0e0e0; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .fila-jerarquia:hover { background: #fcfcff; }

    /* Modales */
    .overlay {
      position: fixed; inset: 0; background: rgba(10,15,40,0.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 20px; backdrop-filter: blur(2px);
      animation: fadeIn 0.15s ease;
    }
    @keyframes fadeIn { from{opacity:0} to{opacity:1} }
    .modal {
      background: white; border-radius: 18px; width: 100%; max-width: 520px;
      max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 60px rgba(0,0,0,0.25); animation: slideUp 0.2s ease;
    }
    .modal-sm { max-width: 420px; }
    .modal-lg { max-width: 720px; }
    @keyframes slideUp { from{transform:translateY(12px);opacity:0} to{transform:none;opacity:1} }
    .modal-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
    }
    .modal-header h2 { font-size: 1rem; font-weight: 600; color: #1a1a2e; }
    .btn-close {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: #f5f5f5; cursor: pointer; display: flex; align-items: center;
      justify-content: center; color: #666;
    }
    .btn-close:hover { background: #eee; }
    .modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .modal-desc { font-size: 0.88rem; color: #555; margin-bottom: 12px; line-height: 1.5; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
    .form-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .form-field label { font-size: 0.75rem; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
    .form-field input, .form-field select {
      padding: 9px 12px; border: 1.5px solid #e8eaf0; border-radius: 8px;
      font-size: 0.88rem; outline: none; background: #fafbfc;
      width: 100%; max-width: 100%; overflow: hidden; text-overflow: ellipsis;
    }
    .form-field input:focus, .form-field select:focus { border-color: #4361ee; background: white; }
    .form-field select:disabled { opacity: 0.5; cursor: not-allowed; }
    .section-label { font-size: 0.78rem; font-weight: 700; color: #4361ee; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .info-ubicacion { margin-top: 8px; padding: 8px 12px; background: #f8f9ff; border-radius: 8px; }
    .modal-error {
      margin-top: 10px; padding: 9px 12px; background: #fff5f5;
      border: 1px solid #feb2b2; border-radius: 8px; font-size: 0.82rem; color: #c53030;
    }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 16px 24px; border-top: 1px solid #f0f0f0;
    }
    .btn-primary {
      padding: 9px 18px; background: #4361ee; color: white;
      border: none; border-radius: 9px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #3451d1; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary {
      padding: 9px 18px; background: white; color: #555;
      border: 1.5px solid #e0e0e0; border-radius: 9px; font-size: 0.85rem; cursor: pointer;
    }
    .btn-secondary:hover { background: #f5f5f5; }
    .btn-danger {
      padding: 9px 18px; background: #dc2626; color: white;
      border: none; border-radius: 9px; font-size: 0.85rem; font-weight: 600; cursor: pointer;
    }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Paginación */
    .paginacion {
      display: flex; align-items: center; justify-content: center; gap: 8px;
      padding: 16px; border-top: 1px solid #f0f0f0; flex-wrap: wrap;
    }
    .btn-page {
      padding: 6px 14px; border: 1.5px solid #e0e0e0; border-radius: 7px;
      background: white; cursor: pointer; font-size: 0.83rem; color: #555; transition: all 0.15s;
    }
    .btn-page:hover:not(:disabled) { border-color: #4361ee; color: #4361ee; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
    .paginas-nums { display: flex; gap: 4px; }
    .btn-page-num {
      width: 32px; height: 32px; border: 1.5px solid #e0e0e0; border-radius: 7px;
      background: white; cursor: pointer; font-size: 0.83rem; color: #555; transition: all 0.15s;
    }
    .btn-page-num:hover { border-color: #4361ee; color: #4361ee; }
    .btn-page-num.activa { background: #4361ee; color: white; border-color: #4361ee; }
    .pag-info { font-size: 0.78rem; color: #999; margin-left: 8px; }

    .toast {
      position: fixed; bottom: 24px; right: 24px; padding: 12px 20px;
      background: #1a1a2e; color: white; border-radius: 10px;
      font-size: 0.85rem; font-weight: 500; z-index: 300;
      transform: translateY(80px); opacity: 0; transition: all 0.3s ease;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    }
    .toast.show { transform: translateY(0); opacity: 1; }

    @media (max-width: 768px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class JerarquiaComponent implements OnInit {
  datos: any[] = [];
  datosFiltrados: any[] = [];
  cargando = true;

  // Paginación
  pagina = 1;
  limite = 10;

  modalEditar = false;
  modalEliminar = false;
  modalCrear = false;
  pdvSeleccionado: any = null;
  editForm = { nombre: '', mac_address: '', direccion: '', latitud: null as number | null, longitud: null as number | null };
  crearForm = {
    departamento_id: null as number | null, zona_id: null as number | null,
    subzona_id: null as number | null, celula_id: null as number | null,
    oficina_id: null as number | null,
    nombre: '', mac_address: '', direccion: '',
    latitud: null as number | null, longitud: null as number | null
  };
  guardando = false;
  errorModal = '';
  toastMsg = '';
  private toastTimer: any;

  // Listas para selectores en cascada
  listDeptos: any[] = [];
  listZonas: any[] = [];
  listSubzonas: any[] = [];
  listCelulas: any[] = [];
  listOficinas: any[] = [];

  private base = environment.apiUrl;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.cargarJerarquia();
  }

  get totalPaginas(): number { return Math.ceil(this.datosFiltrados.length / this.limite); }

  get datosPaginados(): any[] {
    const inicio = (this.pagina - 1) * this.limite;
    return this.datosFiltrados.slice(inicio, inicio + this.limite);
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.pagina;
    const paginas: number[] = [];
    let inicio = Math.max(1, actual - 2);
    let fin = Math.min(total, actual + 2);
    if (actual <= 3) fin = Math.min(total, 5);
    if (actual >= total - 2) inicio = Math.max(1, total - 4);
    for (let i = inicio; i <= fin; i++) paginas.push(i);
    return paginas;
  }

  cambiarPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas) this.pagina = p;
  }

  cargarJerarquia(): void {
    const token = localStorage.getItem('token');
    if (!token) { console.error("No hay token disponible"); return; }

    const headers = new HttpHeaders({ 'Authorization': `Bearer ${token}` });
    this.cargando = true;

    this.http.get<any[]>(`${this.base}/geografia/jerarquia-completa`, { headers }).subscribe({
      next: (res) => { this.datos = res; this.datosFiltrados = res; this.cargando = false; },
      error: (err) => { console.error("Error cargando jerarquía:", err); this.cargando = false; }
    });
  }

  filtrar(event: any): void {
    const term = event.target.value.toLowerCase();
    this.datosFiltrados = this.datos.filter(item =>
      item.nombre_pdv?.toLowerCase().includes(term) ||
      item.mac?.toLowerCase().includes(term) ||
      item.oficina?.toLowerCase().includes(term) ||
      item.direccion?.toLowerCase().includes(term) ||
      item.departamento?.toLowerCase().includes(term)
    );
    this.pagina = 1;
  }

  // ── Crear PDV ─────────────────────────────────────────────────
  abrirCrear(): void {
    this.crearForm = {
      departamento_id: null, zona_id: null, subzona_id: null,
      celula_id: null, oficina_id: null,
      nombre: '', mac_address: '', direccion: '',
      latitud: null, longitud: null
    };
    this.listZonas = []; this.listSubzonas = []; this.listCelulas = []; this.listOficinas = [];
    this.errorModal = '';
    this.modalCrear = true;

    // Cargar departamentos
    if (this.listDeptos.length === 0) {
      this.http.get<any[]>(`${this.base}/geografia/departamentos`).subscribe({
        next: (res) => this.listDeptos = res, error: () => { }
      });
    }
  }

  onDeptoChange(): void {
    this.crearForm.zona_id = null; this.crearForm.subzona_id = null;
    this.crearForm.celula_id = null; this.crearForm.oficina_id = null;
    this.listZonas = []; this.listSubzonas = []; this.listCelulas = []; this.listOficinas = [];
    if (this.crearForm.departamento_id) {
      this.http.get<any[]>(`${this.base}/geografia/zonas`, { params: { departamento_id: this.crearForm.departamento_id } }).subscribe({
        next: (res) => this.listZonas = res, error: () => { }
      });
    }
  }

  onZonaChange(): void {
    this.crearForm.subzona_id = null; this.crearForm.celula_id = null; this.crearForm.oficina_id = null;
    this.listSubzonas = []; this.listCelulas = []; this.listOficinas = [];
    if (this.crearForm.zona_id) {
      this.http.get<any[]>(`${this.base}/geografia/subzonas`, { params: { zona_id: this.crearForm.zona_id } }).subscribe({
        next: (res) => this.listSubzonas = res, error: () => { }
      });
    }
  }

  onSubzonaChange(): void {
    this.crearForm.celula_id = null; this.crearForm.oficina_id = null;
    this.listCelulas = []; this.listOficinas = [];
    if (this.crearForm.subzona_id) {
      this.http.get<any[]>(`${this.base}/geografia/celulas`, { params: { subzona_id: this.crearForm.subzona_id } }).subscribe({
        next: (res) => this.listCelulas = res, error: () => { }
      });
    }
  }

  onCelulaChange(): void {
    this.crearForm.oficina_id = null;
    this.listOficinas = [];
    if (this.crearForm.celula_id) {
      this.http.get<any[]>(`${this.base}/geografia/oficinas`, { params: { celula_id: this.crearForm.celula_id } }).subscribe({
        next: (res) => this.listOficinas = res, error: () => { }
      });
    }
  }

  guardarNuevo(): void {
    const f = this.crearForm;
    if (!f.oficina_id || !f.nombre || !f.mac_address) {
      this.errorModal = 'Complete toda la ubicación, nombre y MAC';
      return;
    }
    this.guardando = true;
    this.errorModal = '';

    const body = {
      oficina_id: f.oficina_id, nombre: f.nombre,
      mac_address: f.mac_address, direccion: f.direccion,
      latitud: f.latitud, longitud: f.longitud
    };

    this.http.post(`${this.base}/geografia/puntosdeventa`, body).subscribe({
      next: () => {
        this.cerrarModal();
        this.toast('PDV creado correctamente');
        this.cargarJerarquia();
      },
      error: (err) => {
        this.guardando = false;
        this.errorModal = err.error?.error || 'Error al crear PDV';
      }
    });
  }

  // ── Editar PDV ───────────────────────────────────────────────
  abrirEditar(item: any): void {
    this.pdvSeleccionado = item;
    this.editForm = {
      nombre: item.nombre_pdv,
      mac_address: item.mac,
      direccion: item.direccion || '',
      latitud: item.latitud,
      longitud: item.longitud
    };
    this.errorModal = '';
    this.modalEditar = true;
  }

  guardarEdicion(): void {
    if (!this.editForm.nombre || !this.editForm.mac_address) {
      this.errorModal = 'Nombre y MAC son obligatorios';
      return;
    }
    this.guardando = true;
    this.errorModal = '';

    this.http.put(`${this.base}/geografia/puntosdeventa/${this.pdvSeleccionado.codigo_pdv}`, this.editForm).subscribe({
      next: () => {
        this.cerrarModal();
        this.toast('PDV actualizado correctamente');
        this.cargarJerarquia();
      },
      error: (err) => {
        this.guardando = false;
        this.errorModal = err.error?.error || 'Error al actualizar';
      }
    });
  }

  confirmarEliminar(item: any): void {
    this.pdvSeleccionado = item;
    this.errorModal = '';
    this.modalEliminar = true;
  }

  eliminarPdv(): void {
    this.guardando = true;
    this.errorModal = '';

    this.http.delete(`${this.base}/geografia/puntosdeventa/${this.pdvSeleccionado.codigo_pdv}`).subscribe({
      next: () => {
        this.cerrarModal();
        this.toast('PDV eliminado correctamente');
        this.datos = this.datos.filter(d => d.codigo_pdv !== this.pdvSeleccionado.codigo_pdv);
        this.datosFiltrados = this.datosFiltrados.filter(d => d.codigo_pdv !== this.pdvSeleccionado.codigo_pdv);
      },
      error: (err) => {
        this.guardando = false;
        this.errorModal = err.error?.error || 'Error al eliminar';
      }
    });
  }

  cerrarModal(): void {
    this.modalEditar = false;
    this.modalEliminar = false;
    this.modalCrear = false;
    this.guardando = false;
    this.errorModal = '';
  }

  toast(msg: string): void {
    clearTimeout(this.toastTimer);
    this.toastMsg = msg;
    this.toastTimer = setTimeout(() => this.toastMsg = '', 3000);
  }

  descargarJerarquia(): void {
    const datos = this.datosFiltrados;
    if (datos.length === 0) return;

    const headers = ['Departamento', 'Zona', 'Subzona', 'Célula', 'Oficina', 'Punto de Venta', 'Código PDV', 'MAC', 'Dirección', 'Latitud', 'Longitud'];
    const filas = datos.map(item => [
      item.departamento || '',
      item.zona || '',
      item.subzona || '',
      item.celula || '',
      item.oficina || '',
      item.nombre_pdv || '',
      item.codigo_pdv || '',
      item.mac || 'N/A',
      item.direccion || '',
      item.latitud || '',
      item.longitud || ''
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...filas.map(f => f.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jerarquia_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}