// src/app/features/admin/carga-pdv.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-carga-pdv',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="carga-container">
      <div class="bg-shapes">
  <div class="shape shape-1"></div>
  <div class="shape shape-2"></div>
  <div class="shape shape-3"></div>
</div>

      <h1>Cargar Puntos de Venta</h1>
      <p class="subtitulo">Carga masiva de la jerarquía desde Excel</p>

      <!-- Descargar plantilla -->
      <div class="card paso-card">
        <div class="paso-num">1</div>
        <div class="paso-body">
          <h3>Descargue la plantilla</h3>
          <p>Use la plantilla oficial para garantizar el formato correcto.</p>
          <a [href]="urlPlantilla" class="btn-download" download="plantilla_pdv.xlsx">
            ⬇️ Descargar plantilla Excel
          </a>
        </div>
      </div>

      <!-- Subir archivo -->
      <div class="card paso-card">
        <div class="paso-num">2</div>
        <div class="paso-body">
          <h3>Complete y suba el archivo</h3>
          <p>Llene la hoja <strong>PDV</strong> con sus datos y súbala aquí.</p>

          <div class="drop-zone"
               [class.drag-over]="arrastrando"
               (dragover)="$event.preventDefault(); arrastrando=true"
               (dragleave)="arrastrando=false"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            <div *ngIf="!archivoSeleccionado">
              <div class="drop-icon">📂</div>
              <p>Arrastra el archivo aquí o <u>haz clic para seleccionar</u></p>
              <span class="drop-hint">Solo archivos .xlsx</span>
            </div>
            <div *ngIf="archivoSeleccionado" class="archivo-info">
              <span class="archivo-icono">📊</span>
              <div>
                <strong>{{ archivoSeleccionado.name }}</strong>
                <span>{{ (archivoSeleccionado.size / 1024).toFixed(1) }} KB</span>
              </div>
              <button class="btn-quitar" (click)="$event.stopPropagation(); quitarArchivo()">×</button>
            </div>
          </div>

          <input #fileInput type="file" accept=".xlsx" style="display:none"
                 (change)="onFileSelected($event)" />

<button class="btn-cargar" (click)="cargar()"
        [disabled]="!archivoSeleccionado || cargando || cargaExitosa">
  {{ cargando ? 'Procesando...' : cargaExitosa ? '✅ Ya procesado' : '▶ Procesar archivo' }}
</button>
<div *ngIf="cargaExitosa" class="aviso-exitoso">
  ✅ Archivo procesado correctamente. Si necesita cargar otro, use "Cargar otro archivo".
</div>
        </div>
      </div>

      <!-- Resultado -->
      <div *ngIf="resultado" class="card resultado-card">
        <div class="paso-num" [class.num-ok]="resultado.errores?.length===0" [class.num-warn]="resultado.errores?.length>0">3</div>
        <div class="paso-body">
          <h3>Resultado de la carga</h3>

          <div class="stats-grid">
            <div class="stat stat-ok">
              <span class="stat-num">{{ resultado.insertados }}</span>
              <span>Nuevos PDV</span>
            </div>
            <div class="stat stat-blue">
              <span class="stat-num">{{ resultado.actualizados }}</span>
              <span>Actualizados</span>
            </div>
            <div class="stat" [class.stat-error]="resultado.errores?.length>0" [class.stat-ok]="resultado.errores?.length===0">
              <span class="stat-num">{{ resultado.errores?.length || 0 }}</span>
              <span>Errores</span>
            </div>
            <div class="stat stat-total">
              <span class="stat-num">{{ resultado.total_filas }}</span>
              <span>Total filas</span>
            </div>
          </div>

          <p class="mensaje-resultado">{{ resultado.mensaje }}</p>

          <!-- Errores detalle -->
          <div *ngIf="resultado.errores?.length > 0" class="errores-tabla">
            <h4>⚠️ Filas con errores</h4>
            <table>
              <thead>
                <tr><th>Fila Excel</th><th>Error</th><th>Datos</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let e of resultado.errores">
                  <td>{{ e.fila }}</td>
                  <td class="error-msg">{{ e.error }}</td>
                  <td class="datos-fila">{{ e.datos ? (e.datos | json) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <button class="btn-nuevo" (click)="resetear()">Cargar otro archivo</button>
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

    .carga-container { max-width: 720px; margin: 32px auto; padding: 0 16px; font-family: 'Segoe UI', sans-serif; }
    h1 { font-size: 1.4rem; color: #1a1a2e; margin-bottom: 4px; }
    .subtitulo { color: #888; font-size: 0.9rem; margin-bottom: 24px; }

    .card { background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); margin-bottom: 16px; display: flex; gap: 20px; }
    .paso-num {
      width: 36px; height: 36px; border-radius: 50%; background: #4361ee; color: white;
      font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-top: 2px;
    }
    .paso-num.num-ok   { background: #28a745; }
    .paso-num.num-warn { background: #ffc107; color: #333; }
    .paso-body { flex: 1; }
    .paso-body h3 { margin: 0 0 6px; font-size: 1rem; color: #1a1a2e; }
    .paso-body p  { color: #666; font-size: 0.9rem; margin-bottom: 14px; }

    .btn-download {
      display: inline-block; padding: 10px 20px; background: #1a1a2e; color: white;
      border-radius: 10px; text-decoration: none; font-size: 0.9rem; font-weight: 600;
    }
    .btn-download:hover { background: #4361ee; }

    .drop-zone {
      border: 2px dashed #c0c0c0; border-radius: 12px; padding: 28px 20px;
      text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 14px;
      background: #fafafa;
    }
    .drop-zone:hover, .drop-zone.drag-over { border-color: #4361ee; background: #ebf0ff; }
    .drop-icon { font-size: 2.5rem; margin-bottom: 8px; }
    .drop-zone p { color: #555; font-size: 0.9rem; margin: 0 0 4px; }
    .drop-hint { font-size: 0.75rem; color: #aaa; }

    .archivo-info { display: flex; align-items: center; gap: 12px; }
    .archivo-icono { font-size: 2rem; }
    .archivo-info div { text-align: left; }
    .archivo-info strong { display: block; font-size: 0.9rem; color: #333; }
    .archivo-info span  { display: block; font-size: 0.75rem; color: #888; }
    .btn-quitar { margin-left: auto; background: none; border: none; font-size: 1.4rem; cursor: pointer; color: #dc3545; }

    .btn-cargar {
      width: 100%; padding: 12px; background: #4361ee; color: white;
      border: none; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer;
    }
    .btn-cargar:hover:not(:disabled) { background: #3451d1; }
    .btn-cargar:disabled { opacity: 0.5; cursor: not-allowed; }

    .aviso-exitoso {
    margin-top: 12px; padding: 10px 16px;
    background: #d4edda; color: #155724;
  border-radius: 8px; font-size: 0.85rem; font-weight: 600;
    }
    
    /* Resultado */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
    .stat { text-align: center; padding: 14px 8px; border-radius: 10px; background: #f8f9fa; }
    .stat-ok    { background: #d4edda; }
    .stat-blue  { background: #d1ecf1; }
    .stat-error { background: #f8d7da; }
    .stat-total { background: #e9ecef; }
    .stat-num { display: block; font-size: 1.8rem; font-weight: 700; color: #1a1a2e; }
    .stat span:last-child { font-size: 0.75rem; color: #555; }
    .mensaje-resultado { font-size: 0.9rem; color: #333; margin-bottom: 16px; }

    .errores-tabla { background: #fff8f8; border-radius: 10px; padding: 14px; margin-bottom: 16px; }
    .errores-tabla h4 { margin-bottom: 10px; color: #721c24; }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th { background: #f8d7da; padding: 8px 10px; text-align: left; }
    td { padding: 6px 10px; border-bottom: 1px solid #f5c6cb; }
    .error-msg { color: #721c24; }
    .datos-fila { font-family: monospace; font-size: 0.75rem; color: #555; }

    .btn-nuevo { padding: 10px 20px; background: transparent; border: 2px solid #4361ee; color: #4361ee; border-radius: 10px; cursor: pointer; font-weight: 600; }
  `]
})
export class CargaPdvComponent {

  archivoSeleccionado: File | null = null;
  arrastrando = false;
  cargando = false;
  resultado: any = null;


  urlPlantilla = `${environment.apiUrl}/geografia/plantilla`;

  constructor(private http: HttpClient) { }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) this.archivoSeleccionado = file;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.arrastrando = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.name.endsWith('.xlsx')) this.archivoSeleccionado = file;
  }

  quitarArchivo(): void {
    this.archivoSeleccionado = null;
    this.resultado = null;
  }

  cargaExitosa = false;
  cargar(): void {
    if (!this.archivoSeleccionado) return;
    this.cargando = true;

    const form = new FormData();
    form.append('archivo', this.archivoSeleccionado);

    this.http.post(`${environment.apiUrl}/geografia/cargar-excel`, form).subscribe({
      next: (res) => { this.resultado = res; this.cargando = false; },
      error: (err) => {
        this.cargando = false;
        this.resultado = {
          mensaje: err.error?.error || 'Error al procesar el archivo',
          insertados: 0, actualizados: 0, errores: [], total_filas: 0
        };
      }
    });
  }

  resetear(): void {
    this.archivoSeleccionado = null;
    this.resultado = null;
    this.cargaExitosa = false;
  }
}
