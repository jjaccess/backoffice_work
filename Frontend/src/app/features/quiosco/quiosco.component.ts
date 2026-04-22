// src/app/features/quiosco/quiosco.component.ts
import { Component, OnInit, OnDestroy, NgZone, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BiometricoService, RespuestaJar } from '../../core/services/biometrico.service';
import { ApiService } from '../../core/services/api.service';

type Fase = 'inicio' | 'buscando' | 'capturando' | 'verificando' | 'resultado';

@Component({
  selector: 'app-quiosco',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quiosco-page">
      
      <div class="bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>

      <div class="quiosco-wrapper">
        <div class="quiosco-header">
          <span class="header-logo">🔐</span>
          <div>
            <h1>Control de Acceso</h1>
            <p>{{ pdvInfo ? pdvInfo.punto_venta : (infoEquipo ? 'PDV no registrado' : 'Cargando...') }}</p>
          </div>
          <span class="ws-dot" [class.dot-ok]="estadoWS==='conectado'"></span>
        </div>

      <!-- INICIO -->
      <div *ngIf="fase==='inicio'" class="quiosco-card">
        <div class="quiosco-icon">👤</div>
        <h2>Ingrese su número de documento</h2>
        <input class="cc-input" type="text" inputmode="numeric"
               placeholder="Ej: 1020304050"
               [(ngModel)]="documento"
               (keyup.enter)="iniciar()"
               [disabled]="estadoWS !== 'conectado'" />
        <button class="btn-iniciar" (click)="iniciar()"
                [disabled]="!documento.trim() || estadoWS !== 'conectado'">
          Continuar →
        </button>
        <p *ngIf="estadoWS !== 'conectado'" class="aviso-lector">⚠️ Lector biométrico no conectado</p>
      </div>

      <!-- BUSCANDO -->
      <div *ngIf="fase==='buscando'" class="quiosco-card center-card">
        <div class="spinner-grande"></div>
        <h2>Buscando documento...</h2>
      </div>

      <!-- CAPTURANDO -->
      <div *ngIf="fase==='capturando'" class="quiosco-card">
        <div *ngIf="persona" class="persona-saludo">
          <img *ngIf="persona.foto_base64" [src]="'data:image/jpeg;base64,' + persona.foto_base64" class="foto-persona" alt="Foto" />
          <div>
            <h3>Hola, {{ persona.nombre_completo }}</h3>
            <p>{{ persona.departamento }}</p>
          </div>
        </div>
        <div class="huella-animada">
          <div class="huella-rings">
            <div class="ring ring1"></div><div class="ring ring2"></div><div class="ring ring3"></div>
          </div>
          <span class="huella-emoji">🖐️</span>
        </div>
        <h2>Coloque su huella en el lector</h2>
        <p class="instruccion-sub">Mantenga el dedo firme hasta escuchar el beep</p>
        <p class="timer-captura">Tiempo restante: {{ segundosCaptura }}s</p>
        <button class="btn-cancelar" (click)="cancelar()">Cancelar</button>
      </div>

      <!-- VERIFICANDO -->
      <div *ngIf="fase==='verificando'" class="quiosco-card center-card">
        <div class="spinner-grande"></div>
        <h2>Verificando identidad...</h2>
        <p class="instruccion-sub">Comparando huella con registros</p>
      </div>

      <!-- RESULTADO -->
      <div *ngIf="fase==='resultado'" class="quiosco-card resultado-card"
           [class.res-ok]="resultado?.resultado === 'OK'"
           [class.res-fallo]="resultado?.resultado !== 'OK'">
        <div class="resultado-emoji">{{ resultado?.resultado === 'OK' ? '✅' : '❌' }}</div>
        <h2>{{ resultado?.resultado === 'OK' ? 'ACCESO REGISTRADO' : 'ACCESO DENEGADO' }}</h2>
        <p class="resultado-msg">{{ resultado?.mensaje }}</p>
        <div *ngIf="resultado?.persona" class="resultado-persona">
          <img *ngIf="resultado?.persona?.foto_base64"
               [src]="'data:image/jpeg;base64,' + resultado?.persona?.foto_base64"
               class="foto-resultado" alt="Foto" />
          <strong>{{ resultado?.persona?.nombre_completo }}</strong>
        </div>
        <div class="pdv-info" *ngIf="pdvInfo">
          <span>📍 {{ pdvInfo.punto_venta }}</span>
          <span>{{ resultado?.fecha_hora | date:'HH:mm:ss — dd/MM/yyyy' }}</span>
        </div>
        <div class="reinicio-bar">
          <div class="reinicio-progreso" [style.width.%]="progresoReinicio"></div>
        </div>
        <p class="reinicio-texto">Reiniciando en {{ segundosReinicio }}s...</p>
      </div>
    </div>
  `,
  styles: [`
    /* 1. Reset General */
    * { 
      box-sizing: border-box; 
      margin: 0; 
      padding: 0; 
    }

    /* 2. Contenedor Principal (El Canvas) */
.quiosco-page { 
      min-height: 100vh; 
      background: linear-gradient(135deg, #0d0d1a 0%, #131d35 50%, #0a2040 100%); 
      display: flex; 
      flex-direction: column; /* Asegura el flujo vertical */
      align-items: center;      /* Centrado horizontal */
      justify-content: flex-start; /* Alineado a la parte superior */
      font-family: 'Segoe UI', system-ui, sans-serif; 
      padding: 60px 16px;       /* Un poco más de espacio arriba para que no pegue al borde */
      position: relative; 
      overflow: hidden; 
    }

    /* 3. Formas Decorativas (Los Círculos Azules) */
    .bg-shapes { position: absolute; inset: 0; pointer-events: none; }
    .shape { position: absolute; border-radius: 50%; opacity: 0.06; }
    .shape-1 { width: 500px; height: 500px; background: #4361ee; top: -200px; right: -100px; }
    .shape-2 { width: 300px; height: 300px; background: #7b8cde; bottom: -100px; left: -80px; }
    .shape-3 { width: 200px; height: 200px; background: #4361ee; bottom: 120px; right: 80px; }

    /* 4. Wrapper del Contenido (Z-index alto para estar sobre el fondo) */
    .quiosco-wrapper {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* 5. Header del Quiosco */
    .quiosco-header { 
      width: 100%; 
      display: flex; 
      align-items: center; 
      gap: 14px; 
      margin-bottom: 32px; 
    }
    .header-logo { font-size: 2rem; }
    .quiosco-header h1 { color: white; font-size: 1.3rem; margin-bottom: 2px; }
    .quiosco-header p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    .ws-dot { margin-left: auto; width: 14px; height: 14px; border-radius: 50%; background: #dc3545; }
    .ws-dot.dot-ok { background: #28a745; box-shadow: 0 0 10px #28a745; }

    /* 6. Card Blanca (Estilo Login) */
    .quiosco-card { 
      width: 100%; 
      background: rgba(255, 255, 255, 0.97); 
      border-radius: 24px; 
      padding: 40px 36px; 
      text-align: center; 
      box-shadow: 0 24px 80px rgba(0,0,0,0.4); 
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

    /* 7. Elementos Internos de la Card */
    .quiosco-icon { font-size: 3.5rem; margin-bottom: 16px; }
    h2 { color: #1a1a2e; font-size: 1.4rem; margin-bottom: 20px; }
    
    .cc-input { 
      width: 100%; 
      padding: 16px 20px; 
      font-size: 1.4rem; 
      font-weight: 700; 
      border: 3px solid #e8eaf0; 
      border-radius: 14px; 
      text-align: center; 
      letter-spacing: 4px; 
      margin-bottom: 20px; 
      outline: none; 
      background: #f8f9fc;
    }
    .cc-input:focus { border-color: #4361ee; background: white; }

    .btn-iniciar { 
      width: 100%; 
      padding: 16px; 
      background: linear-gradient(135deg, #4361ee, #3451d1); 
      color: white; 
      border: none; 
      border-radius: 14px; 
      font-size: 1.1rem; 
      font-weight: 700; 
      cursor: pointer; 
      box-shadow: 0 4px 16px rgba(67,97,238,0.3);
    }
    .btn-iniciar:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(67,97,238,0.4); }
    .btn-iniciar:disabled { opacity: 0.4; cursor: not-allowed; }

    /* 8. Estados Especiales (Buscando/Capturando/Resultado) */
    .center-card { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .spinner-grande { width: 72px; height: 72px; border: 6px solid #e0e0e0; border-top-color: #4361ee; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }

    .huella-animada { position: relative; width: 140px; height: 140px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
    .ring { position: absolute; border-radius: 50%; border: 2px solid #4361ee; opacity: 0; animation: expand 2s ease-out infinite; }
    .ring1{inset:30%;animation-delay:0s} .ring2{inset:15%;animation-delay:0.6s} .ring3{inset:0;animation-delay:1.2s}
    @keyframes expand { 0%{transform:scale(0.8);opacity:0.7} 100%{transform:scale(1.3);opacity:0} }

    /* 9. Resultados Acceso */
    .res-ok { border-top: 8px solid #28a745; }
    .res-fallo { border-top: 8px solid #dc3545; }
    .pdv-info { display: flex; justify-content: space-between; background: #f8f9fa; border-radius: 10px; padding: 10px 16px; font-size: 0.8rem; color: #555; margin-top: 20px; }
  `]
})
export class QuioscoComponent implements OnInit, OnDestroy {

  fase: Fase = 'inicio';
  documento = '';
  persona: any = null;
  resultado: any = null;
  estadoWS = 'desconectado';
  pdvInfo: any = null;
  infoEquipo: any = null;

  segundosReinicio = 5;
  progresoReinicio = 100;
  segundosCaptura = 35;

  private reinicioInterval: any = null;
  private capturaInterval: any = null;
  private subs: Subscription[] = [];
  private esperandoCaptura = false;

  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  constructor(private bio: BiometricoService, private api: ApiService) { }

  async ngOnInit(): Promise<void> {
    this.bio.conectar();

    // FIX #1 — usar NgZone para que Angular detecte cambios de los timers
    this.subs.push(this.bio.estadoWS$.subscribe(s => {
      this.ngZone.run(() => this.estadoWS = s);
    }));
    this.subs.push(this.bio.respuesta$.subscribe(r => {
      this.ngZone.run(() => this.procesarRespuesta(r));
    }));

    try {
      this.infoEquipo = await this.bio.obtenerInfoEquipo();
      if (this.infoEquipo?.mac) {
        this.api.getPdvPorMac(this.infoEquipo.mac).subscribe({
          next: p => this.pdvInfo = p, error: () => this.pdvInfo = null
        });
      }
    } catch { this.infoEquipo = null; }
  }

  iniciar(): void {
    if (!this.documento.trim()) return;
    this.fase = 'buscando';

    this.api.obtenerTemplates(this.documento).subscribe({
      next: (datos) => {
        this.persona = {
          nombre_completo: datos.nombre_completo,
          departamento: datos.departamento,
          foto_base64: datos.foto_base64
        };
        this.fase = 'capturando';
        this.esperandoCaptura = true;
        this.bio.capturar(1, 30000);
        this.iniciarTimeoutCaptura();
      },
      error: (err) => {
        const msg = err.error?.error || 'Documento no registrado en el sistema';
        this.mostrarResultadoDirecto('FALLO', msg);
      }
    });
  }

  cancelar(): void {
    this.limpiarTimers();
    this.esperandoCaptura = false;
    this.bio.cancelar();
    this.reiniciar();
  }

  private procesarRespuesta(resp: RespuestaJar): void {
    if (!this.esperandoCaptura) return;

    if (resp.strRespuesta === 'CANCELAR') {
      this.limpiarTimers();
      this.esperandoCaptura = false;
      this.reiniciar();
      return;
    }

    if (resp.strRespuesta === 'OK' && resp.strIso) {
      this.limpiarTimers();
      this.esperandoCaptura = false;

      // FIX #3 — MAC es obligatoria para registrar
      if (!this.infoEquipo?.mac) {
        this.mostrarResultadoDirecto('ERROR', 'No se pudo identificar el equipo. Inicie el agente MAC.');
        return;
      }

      this.fase = 'verificando';
      this.api.verificarHuella({
        documento: this.documento,
        mac_equipo: this.infoEquipo.mac,
        ip_equipo: this.infoEquipo.ip || '',
        hostname_equipo: this.infoEquipo.hostname || '',
        dedo_usado: 1,
        template_capturado: resp.strIso,
        resultado_jar: 'OK'
      }).subscribe({
        next: r => { this.resultado = r; this.fase = 'resultado'; this.iniciarReinicio(); },
        error: () => this.mostrarResultadoDirecto('ERROR', 'Error de comunicación con el servidor')
      });
    } else if (resp.error) {
      this.limpiarTimers();
      this.esperandoCaptura = false;
      this.mostrarResultadoDirecto('ERROR', 'Error en el lector. Intente de nuevo.');
    }
  }

  // FIX #6 — cuenta regresiva visible durante captura
  private iniciarTimeoutCaptura(): void {
    this.segundosCaptura = 10;
    this.limpiarCapturaInterval();
    this.capturaInterval = window.setInterval(() => {
      this.ngZone.run(() => {
        this.segundosCaptura--;
        if (this.segundosCaptura <= 0) {
          this.limpiarCapturaInterval();
          if (this.esperandoCaptura) {
            this.esperandoCaptura = false;
            this.bio.reconectar();
            this.mostrarResultadoDirecto('ERROR', 'Tiempo agotado. No se detectó huella.');
          }
        }
      });
    }, 1000);
  }

  // FIX #1 — reinicio con NgZone
  private iniciarReinicio(): void {
    this.segundosReinicio = 5;
    this.progresoReinicio = 100;
    this.limpiarReinicioInterval();
    this.reinicioInterval = window.setInterval(() => {
      this.ngZone.run(() => {
        this.segundosReinicio--;
        this.progresoReinicio = Math.max(0, (this.segundosReinicio / 5) * 100);
        if (this.segundosReinicio <= 0) {
          this.limpiarReinicioInterval();
          this.reiniciar();
        }
      });
    }, 1000);
  }

  private mostrarResultadoDirecto(resultado: 'FALLO' | 'ERROR', mensaje: string): void {
    this.limpiarTimers();
    this.esperandoCaptura = false;
    this.resultado = { resultado, mensaje, persona: this.persona };
    this.fase = 'resultado';
    this.iniciarReinicio();
  }

  reiniciar(): void {
    this.limpiarTimers();
    this.fase = 'inicio';
    this.documento = '';
    this.persona = null;
    this.resultado = null;
    this.esperandoCaptura = false;
    this.segundosCaptura = 10;
  }

  private limpiarTimers(): void {
    this.limpiarReinicioInterval();
    this.limpiarCapturaInterval();
  }

  private limpiarReinicioInterval(): void {
    if (this.reinicioInterval !== null) { window.clearInterval(this.reinicioInterval); this.reinicioInterval = null; }
  }

  private limpiarCapturaInterval(): void {
    if (this.capturaInterval !== null) { window.clearInterval(this.capturaInterval); this.capturaInterval = null; }
  }

  ngOnDestroy(): void {
    this.limpiarTimers();
    this.subs.forEach(s => s.unsubscribe());
  }
}