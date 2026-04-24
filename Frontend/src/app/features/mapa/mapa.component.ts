// src/app/features/mapa/mapa.component.ts
import { Component, OnInit, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-mapa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mapa-container">
      <div class="page-header">
        <div>
          <h1>Mapa de Visitas</h1>
          <p class="sub">Visualiza los puntos de venta visitados y no visitados</p>
        </div>
        <div class="leyenda">
          <span class="leyenda-item"><span class="dot dot-green"></span> Visitado</span>
          <span class="leyenda-item"><span class="dot dot-red"></span> No visitado</span>
          <span class="leyenda-item"><span class="dot dot-gray"></span> Sin filtro</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="filtros-card">
        <div class="filtros-grid">
          <div class="filtro-field">
            <label>Fecha</label>
            <input type="date" [(ngModel)]="filtros.fecha" />
          </div>
          <div class="filtro-field">
            <label>Documento persona</label>
            <input type="text" [(ngModel)]="filtros.documento" placeholder="Ej: 1234567890" />
          </div>
          <div class="filtro-field">
            <label>Departamento</label>
            <select [(ngModel)]="filtros.departamento">
              <option value="">Todos</option>
              <option *ngFor="let d of departamentos" [value]="d">{{ d }}</option>
            </select>
          </div>
          <div class="filtro-field filtro-acciones">
            <label>&nbsp;</label>
            <div class="btns-row">
              <button class="btn-primary" (click)="buscar()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" stroke-width="2"/>
                  <path d="M16.5 16.5L21 21" stroke="white" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Buscar
              </button>
              <button class="btn-secundario" (click)="limpiar()">Limpiar</button>
            </div>
          </div>
        </div>

        <!-- Resumen -->
        <div class="resumen-chips" *ngIf="datosCargados">
          <span class="chip chip-total">Total PDV: {{ totalPdv }}</span>
          <span class="chip chip-ok">Visitados: {{ visitados }}</span>
          <span class="chip chip-fallo">No visitados: {{ noVisitados }}</span>
          <span class="chip chip-warn">Sin coordenadas: {{ sinCoordenadas }}</span>
        </div>
      </div>

      <!-- Mapa -->
      <div class="mapa-card">
        <div *ngIf="cargando" class="loading">
          <div class="spinner"></div> Cargando mapa...
        </div>
        <div id="mapa-leaflet" class="mapa-render"></div>
      </div>
    </div>
  `,
  styles: [`
    .mapa-container { max-width: 1400px; margin: 32px auto; padding: 0 16px; font-family: 'Segoe UI', sans-serif; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
    h1 { font-size: 1.4rem; color: #1a1a2e; margin: 0; }
    .sub { font-size: 0.82rem; color: #888; margin-top: 3px; }

    .leyenda { display: flex; gap: 16px; align-items: center; }
    .leyenda-item { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: #555; }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot-green { background: #16a34a; }
    .dot-red { background: #dc2626; }
    .dot-gray { background: #9ca3af; }

    .filtros-card { background: white; border-radius: 16px; padding: 20px 24px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-bottom: 16px; }
    .filtros-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 16px; margin-bottom: 12px; }
    .filtro-field { display: flex; flex-direction: column; gap: 4px; }
    .filtro-field label { font-size: 0.8rem; color: #555; font-weight: 600; }
    .filtro-field input, .filtro-field select { padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 0.9rem; }
    .filtro-field input:focus, .filtro-field select:focus { outline: none; border-color: #4361ee; }
    .filtro-acciones { justify-content: flex-end; }
    .btns-row { display: flex; gap: 8px; }

    .btn-primary { display: flex; align-items: center; gap: 6px; padding: 9px 16px; background: #4361ee; color: white; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
    .btn-primary:hover { background: #3451d1; }
    .btn-secundario { padding: 9px 14px; background: transparent; border: 2px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 0.85rem; }

    .resumen-chips { display: flex; gap: 8px; flex-wrap: wrap; }
    .chip { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
    .chip-total { background: #e9ecef; color: #333; }
    .chip-ok { background: #d4edda; color: #155724; }
    .chip-fallo { background: #f8d7da; color: #721c24; }
    .chip-warn { background: #fff3cd; color: #856404; }

    .mapa-card { background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); overflow: hidden; position: relative; }
    .mapa-render { height: 600px; width: 100%; z-index: 1; }
    .loading { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 12px; background: rgba(255,255,255,0.9); z-index: 10; color: #666; }
    .spinner { width: 28px; height: 28px; border: 3px solid #e0e0e0; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 768px) { .filtros-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 480px) { .filtros-grid { grid-template-columns: 1fr; } .mapa-render { height: 400px; } }
  `]
})
export class MapaComponent implements OnInit, AfterViewInit {
  private base = environment.apiUrl;
  private platformId = inject(PLATFORM_ID);
  private map: any = null;
  private L: any = null;
  private markersLayer: any = null;

  filtros = { fecha: '', documento: '', departamento: '' };
  departamentos: string[] = [];
  datos: any[] = [];
  cargando = false;
  datosCargados = false;
  sinCoordenadas = 0;

  get totalPdv() { return this.datos.length; }
  get visitados() { return this.datos.filter(d => d.visitado).length; }
  get noVisitados() { return this.datos.filter(d => !d.visitado).length; }

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    // Establecer fecha de hoy por defecto
    this.filtros.fecha = new Date().toISOString().slice(0, 10);
    this.cargarDepartamentos();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.cargarLeaflet();
    }
  }

  private async cargarLeaflet(): Promise<void> {
    // Cargar CSS de Leaflet
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Cargar JS de Leaflet
    if (!(window as any).L) {
      await new Promise<void>((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    }

    this.L = (window as any).L;
    this.initMapa();
    this.buscar();
  }

  private initMapa(): void {
    // Centro de Colombia
    this.map = this.L.map('mapa-leaflet').setView([4.6, -74.08], 6);

    this.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.markersLayer = this.L.layerGroup().addTo(this.map);
  }

  cargarDepartamentos(): void {
    this.http.get<any[]>(`${this.base}/geografia/departamentos`).subscribe({
      next: (deps) => this.departamentos = deps.map(d => d.nombre),
      error: () => { }
    });
  }

  buscar(): void {
    this.cargando = true;
    let params = new HttpParams();
    if (this.filtros.fecha) params = params.set('fecha', this.filtros.fecha);
    if (this.filtros.documento) params = params.set('documento', this.filtros.documento);
    if (this.filtros.departamento) params = params.set('departamento', this.filtros.departamento);

    this.http.get<any[]>(`${this.base}/geografia/mapa/visitas`, { params }).subscribe({
      next: (data) => {
        this.datos = data;
        this.datosCargados = true;
        this.cargando = false;
        this.renderMarkers();
      },
      error: () => { this.cargando = false; }
    });
  }

  limpiar(): void {
    this.filtros = { fecha: new Date().toISOString().slice(0, 10), documento: '', departamento: '' };
    this.buscar();
  }

  private renderMarkers(): void {
    if (!this.L || !this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.sinCoordenadas = 0;

    const bounds: any[] = [];
    const tieneFiltroFecha = !!this.filtros.fecha;

    for (const pdv of this.datos) {
      if (!pdv.latitud || !pdv.longitud) { this.sinCoordenadas++; continue; }

      let color: string;
      if (!tieneFiltroFecha) {
        color = '#9ca3af'; // gris si no hay filtro de fecha
      } else {
        color = pdv.visitado ? '#16a34a' : '#dc2626'; // verde o rojo
      }

      const icon = this.L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          width:14px; height:14px; border-radius:50%;
          background:${color}; border:2px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,0.3);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      // Popup
      let popupHtml = `
        <div style="font-family:'Segoe UI',sans-serif; min-width:200px;">
          <strong style="font-size:0.9rem;">${pdv.punto_venta}</strong>
          <div style="color:#666; font-size:0.78rem; margin:4px 0;">
            ${pdv.departamento} › ${pdv.zona} › ${pdv.oficina}
          </div>
          <div style="font-size:0.78rem; color:#888;">MAC: ${pdv.mac_address}</div>
          ${pdv.direccion ? `<div style="font-size:0.78rem; color:#888;">📍 ${pdv.direccion}</div>` : ''}
          <hr style="border:none;border-top:1px solid #eee;margin:6px 0;">
      `;

      if (tieneFiltroFecha) {
        if (pdv.visitado) {
          popupHtml += `<div style="color:#16a34a;font-weight:600;font-size:0.8rem;">✅ Visitado (${pdv.visitas.length} registro${pdv.visitas.length > 1 ? 's' : ''})</div>`;

          // Agrupar por persona + resultado
          const resumen: Record<string, Record<string, number>> = {};
          for (const v of pdv.visitas) {
            const nombre = v.nombre || v.documento;
            if (!resumen[nombre]) resumen[nombre] = {};
            resumen[nombre][v.resultado] = (resumen[nombre][v.resultado] || 0) + 1;
          }
          for (const [nombre, resultados] of Object.entries(resumen)) {
            const partes = Object.entries(resultados as Record<string, number>)
              .map(([res, count]) => {
                const color = res === 'OK' ? '#16a34a' : '#dc2626';
                return `<span style="color:${color};font-weight:600;">${res}</span> (${count})`;
              }).join(' · ');
            popupHtml += `<div style="font-size:0.75rem;color:#555;margin-top:3px;">
              ${nombre} — ${partes}
            </div>`;
          }
        } else {
          popupHtml += `<div style="color:#dc2626;font-weight:600;font-size:0.8rem;">❌ No visitado</div>`;
        }
      } else {
        popupHtml += `<div style="color:#9ca3af;font-size:0.8rem;">Seleccione una fecha para ver el estado</div>`;
      }

      popupHtml += '</div>';

      const marker = this.L.marker([pdv.latitud, pdv.longitud], { icon })
        .bindPopup(popupHtml);

      this.markersLayer.addLayer(marker);
      bounds.push([pdv.latitud, pdv.longitud]);
    }

    // Ajustar vista al contenido
    if (bounds.length > 0) {
      this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }
}