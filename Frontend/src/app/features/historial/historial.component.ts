// src/app/features/historial/historial.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Visita, PaginadoResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="historial-container">
      <div class="bg-shapes">
  <div class="shape shape-1"></div>
  <div class="shape shape-2"></div>
  <div class="shape shape-3"></div>
</div>

      <div class="page-header">
        <h1>Historial de Visitas</h1>
        <div class="resumen-chips" *ngIf="resumen">
          <span class="chip chip-total">Hoy: {{ resumen.total_hoy }}</span>
          <span class="chip chip-ok">✅ {{ resumen.exitosas_hoy }}</span>
          <span class="chip chip-fallo">❌ {{ resumen.fallidas_hoy }}</span>
          <span class="chip chip-personas">👥 {{ resumen.personas_distintas_hoy }}</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filtros-card">
        <div class="filtros-grid">
          <div class="filtro-field">
            <label>Documento</label>
            <input type="text" [(ngModel)]="filtros.documento" placeholder="Buscar..." />
          </div>
          <div class="filtro-field">
            <label>Desde</label>
            <input type="datetime-local" [(ngModel)]="filtros.fecha_desde" />
          </div>
          <div class="filtro-field">
            <label>Hasta</label>
            <input type="datetime-local" [(ngModel)]="filtros.fecha_hasta" />
          </div>
          <div class="filtro-field">
            <label>Resultado</label>
            <select [(ngModel)]="filtros.resultado">
              <option value="">Todos</option>
              <option value="OK">✅ OK</option>
              <option value="FALLO">❌ Fallo</option>
              <option value="ERROR">⚠️ Error</option>
            </select>
          </div>
        </div>
        <div class="filtros-acciones">
          <button class="btn-primary" (click)="buscar()">Buscar</button>
          <button class="btn-secundario" (click)="limpiarFiltros()">Limpiar</button>
          <button class="btn-download" (click)="descargarHistorial()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Descargar Excel
          </button>
        </div>
      </div>

      <!-- Tabla -->
      <div class="tabla-card">
        <div *ngIf="cargando" class="cargando">
          <div class="spinner"></div> Cargando...
        </div>

        <div class="tabla-scroll" *ngIf="!cargando && visitas.length > 0">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Documento</th>
                <th>Persona</th>
                <th>Resultado</th>
                <th>Score</th>
                <th>Punto de Venta</th>
                <th>Oficina</th>
                <th>Célula</th>
                <th>Subzona</th>
                <th>Zona</th>
                <th>Depto</th>
                <th>MAC</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let v of visitas"
                  [class.row-ok]="v.resultado === 'OK'"
                  [class.row-fallo]="v.resultado !== 'OK'">
                <td class="td-fecha">{{ v.fecha_hora | date: 'dd/MM/yy HH:mm:ss' }}</td>
                <td><strong>{{ v.documento }}</strong></td>
                <td>{{ v.nombre_completo || '—' }}</td>
                <td>
                  <span class="badge"
                        [class.badge-ok]="v.resultado === 'OK'"
                        [class.badge-fallo]="v.resultado === 'FALLO'"
                        [class.badge-error]="v.resultado === 'ERROR'">
                    {{ v.resultado }}
                  </span>
                </td>
                <td>{{ v.score_biometrico ? (v.score_biometrico | number:'1.0-0') : '—' }}</td>
                <td>{{ v.punto_venta || '—' }}</td>
                <td>{{ v.oficina || '—' }}</td>
                <td>{{ v.celula || '—' }}</td>
                <td>{{ v.subzona || '—' }}</td>
                <td>{{ v.zona || '—' }}</td>
                <td>{{ v.departamento_pdv || '—' }}</td>
                <td class="td-mac">{{ v.mac_equipo }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="!cargando && visitas.length === 0" class="sin-datos">
          No se encontraron registros.
        </div>

        <div class="paginacion" *ngIf="total > limite">
          <button class="btn-page" [disabled]="pagina <= 1" (click)="cambiarPagina(pagina - 1)">‹ Anterior</button>
          <span>Página {{ pagina }} de {{ totalPaginas }} · {{ total }} registros</span>
          <button class="btn-page" [disabled]="pagina >= totalPaginas" (click)="cambiarPagina(pagina + 1)">Siguiente ›</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
  .page-container {
  min-height: 100vh;
  background: #f0f4f8; /* Fondo azul claro */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 60px 16px;
  position: relative;
  overflow: hidden; /* Importante para que los círculos no den scroll */
}
.bg-shapes { position: absolute; inset: 0; pointer-events: none; }
.shape { position: absolute; border-radius: 50%; opacity: 0.07; background: #1a1a2e; }
.shape-1 { width: 500px; height: 500px; top: -200px; right: -100px; }
.shape-2 { width: 300px; height: 300px; bottom: -100px; left: -80px; }
.shape-3 { width: 200px; height: 200px; bottom: 120px; right: 80px; }

    .historial-container { max-width: 1400px; margin: 32px auto; padding: 0 16px; font-family: 'Segoe UI', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 1.4rem; color: #1a1a2e; margin: 0; }
    .resumen-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .chip-total { background: #e9ecef; color: #333; }
    .chip-ok { background: #d4edda; color: #155724; }
    .chip-fallo { background: #f8d7da; color: #721c24; }
    .chip-personas { background: #d1ecf1; color: #0c5460; }
    .filtros-card { background: white; border-radius: 16px; padding: 20px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 16px; }
    .filtros-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 16px; }
    .filtro-field { display: flex; flex-direction: column; gap: 4px; }
    .filtro-field label { font-size: 0.8rem; color: #555; font-weight: 600; }
    .filtro-field input, .filtro-field select { padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
    .filtro-field input:focus, .filtro-field select:focus { outline: none; border-color: #4361ee; }
    .filtros-acciones { display: flex; gap: 10px; align-items: center; }
    .btn-primary { padding: 10px 20px; background: #4361ee; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .btn-primary:hover { background: #3451d1; }
    .btn-secundario { padding: 10px 16px; background: transparent; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; }
    .btn-download {
      display: flex; align-items: center; gap: 6px;
      padding: 10px 16px; background: #f0fdf4; color: #16a34a;
      border: 1.5px solid #bbf7d0; border-radius: 8px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .btn-download:hover { background: #dcfce7; border-color: #86efac; }
    .tabla-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; }
    .tabla-scroll { overflow-x: auto; }
    .cargando { display: flex; align-items: center; gap: 12px; padding: 32px; justify-content: center; color: #666; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e0e0e0; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; white-space: nowrap; }
    thead { background: #f8f9ff; }
    th { padding: 10px 12px; text-align: left; font-size: 0.75rem; color: #555; font-weight: 700; border-bottom: 2px solid #eee; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    tr:hover { background: #fafbff; }
    tr.row-ok   td:first-child { border-left: 3px solid #28a745; }
    tr.row-fallo td:first-child { border-left: 3px solid #dc3545; }
    .td-fecha { color: #555; font-size: 0.75rem; }
    .td-mac { font-family: monospace; font-size: 0.75rem; color: #555; }
    .badge { padding: 3px 10px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; }
    .badge-ok    { background: #d4edda; color: #155724; }
    .badge-fallo { background: #f8d7da; color: #721c24; }
    .badge-error { background: #fff3cd; color: #856404; }
    .sin-datos { text-align: center; padding: 48px; color: #999; }
    .paginacion { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; border-top: 1px solid #f0f0f0; font-size: 0.85rem; color: #555; }
    .btn-page { padding: 6px 14px; border: 2px solid #ddd; border-radius: 6px; cursor: pointer; background: white; }
    .btn-page:hover:not(:disabled) { border-color: #4361ee; color: #4361ee; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
    @media (max-width: 768px) { .filtros-grid { grid-template-columns: 1fr 1fr; } }
  `]
})
export class HistorialComponent implements OnInit {

  visitas: any[] = [];
  total = 0;
  pagina = 1;
  limite = 50;
  cargando = false;
  resumen: any = null;

  filtros = { documento: '', fecha_desde: '', fecha_hasta: '', resultado: '' };

  constructor(private api: ApiService) { }

  ngOnInit(): void {
    this.buscar();
    this.api.getResumenHoy().subscribe({ next: r => this.resumen = r, error: () => { } });
  }

  buscar(): void { this.pagina = 1; this.cargar(); }

  limpiarFiltros(): void {
    this.filtros = { documento: '', fecha_desde: '', fecha_hasta: '', resultado: '' };
    this.buscar();
  }

  cambiarPagina(p: number): void { this.pagina = p; this.cargar(); }

  get totalPaginas(): number { return Math.ceil(this.total / this.limite); }

  private cargar(): void {
    this.cargando = true;
    this.api.getVisitas({ ...this.filtros, page: this.pagina, limit: this.limite }).subscribe({
      next: (res: any) => { this.visitas = res.data; this.total = res.total; this.cargando = false; },
      error: () => { this.cargando = false; }
    });
  }

  descargarHistorial(): void {
    const datos = this.visitas;
    if (datos.length === 0) return;

    const headers = ['Fecha/Hora', 'Documento', 'Persona', 'Resultado', 'Score', 'Punto de Venta', 'Oficina', 'Célula', 'Subzona', 'Zona', 'Departamento', 'MAC'];
    const filas = datos.map(v => [
      v.fecha_hora || '',
      v.documento || '',
      v.nombre_completo || '',
      v.resultado || '',
      v.score_biometrico ?? '',
      v.punto_venta || '',
      v.oficina || '',
      v.celula || '',
      v.subzona || '',
      v.zona || '',
      v.departamento_pdv || '',
      v.mac_equipo || ''
    ]);

    const BOM = '\uFEFF';
    const csv = BOM + [headers.join(';'), ...filas.map(f => f.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_visitas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}