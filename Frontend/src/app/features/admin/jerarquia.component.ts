import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-jerarquia',
  standalone: true,
  imports: [CommonModule],
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
          <button class="btn-download" (click)="descargarJerarquia()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <polyline points="7 10 12 15 17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Descargar
          </button>
        </div>
      </div>

      <div class="card filtros-card">
        <input type="text" placeholder="🔍 Buscar por PDV, Oficina o MAC..." 
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
              <th>MAC / IP</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of datosFiltrados" class="fila-jerarquia">
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
            </tr>
          </tbody>
        </table>
        
        <div *ngIf="cargando" class="loading-state">
          🪄 Consultando al Mago...
        </div>
        
        <div *ngIf="!cargando && datosFiltrados.length === 0" class="empty-state">
          No se encontraron datos en la jerarquía.
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

    .jerarquia-container { max-width: 1200px; margin: 32px auto; padding: 0 24px; font-family: 'Segoe UI', sans-serif; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    h1 { font-size: 1.6rem; color: #1a1a2e; margin-bottom: 4px; }
    .subtitulo { color: #888; font-size: 0.9rem; margin-bottom: 24px; }
    .btn-download {
      display: flex; align-items: center; gap: 6px; white-space: nowrap;
      padding: 9px 16px; background: #f0fdf4; color: #16a34a;
      border: 1.5px solid #bbf7d0; border-radius: 9px; font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-download:hover { background: #dcfce7; border-color: #86efac; }

    .card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); margin-bottom: 16px; }
    
    .busqueda-input {
      width: 100%; padding: 12px 16px; border: 1px solid #e0e0e0; border-radius: 10px;
      font-size: 0.95rem; outline: none; transition: border 0.2s;
    }
    .busqueda-input:focus { border-color: #4361ee; }

    .tabla-wrapper { padding: 0; overflow-x: auto; }
    .jerarquia-table { width: 100%; border-collapse: collapse; text-align: left; min-width: 1000px; }
    
    th { background: #f8f9fa; padding: 16px; font-size: 0.8rem; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    td { padding: 16px; border-bottom: 1px solid #f1f1f1; font-size: 0.9rem; vertical-align: middle; }

    .badge { padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
    .dpto { background: #eef2ff; color: #4361ee; }
    
    .text-main { color: #1a1a2e; font-weight: 600; }
    .text-sub { color: #888; font-size: 0.8rem; }
    
    .pdv-name { color: #1a1a2e; }
    .pdv-id { font-size: 0.75rem; color: #aaa; }
    
    .mac-address { 
      background: #f1f1f1; padding: 4px 6px; border-radius: 4px; 
      font-family: monospace; color: #e63946; font-size: 0.85rem;
    }

    .loading-state, .empty-state { padding: 40px; text-align: center; color: #888; }
    .fila-jerarquia:hover { background: #fcfcff; }
  `]
})
export class JerarquiaComponent implements OnInit {
  datos: any[] = [];
  datosFiltrados: any[] = [];
  cargando = true;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.cargarJerarquia();
  }

  cargarJerarquia(): void {
    // 1. Obtener el token del storage
    const token = localStorage.getItem('token');

    if (!token) {
      console.error("No hay token disponible");
      return;
    }

    // 2. Configurar los headers
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.cargando = true;

    // 3. Pasar los headers en la petición
    this.http.get<any[]>(`${environment.apiUrl}/geografia/jerarquia-completa`, { headers }).subscribe({
      next: (res) => {
        this.datos = res;
        this.datosFiltrados = res;
        this.cargando = false;
      },
      error: (err) => {
        console.error("Error cargando jerarquía:", err);
        this.cargando = false;
      }
    });
  }

  filtrar(event: any): void {
    const term = event.target.value.toLowerCase();
    this.datosFiltrados = this.datos.filter(item =>
      item.nombre_pdv?.toLowerCase().includes(term) ||
      item.mac?.toLowerCase().includes(term) ||
      item.oficina?.toLowerCase().includes(term)
    );
  }

  descargarJerarquia(): void {
    const datos = this.datosFiltrados;
    if (datos.length === 0) return;

    const headers = ['Departamento', 'Zona', 'Subzona', 'Célula', 'Oficina', 'Punto de Venta', 'Código PDV', 'MAC'];
    const filas = datos.map(item => [
      item.departamento || '',
      item.zona || '',
      item.subzona || '',
      item.celula || '',
      item.oficina || '',
      item.nombre_pdv || '',
      item.codigo_pdv || '',
      item.mac || 'N/A'
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