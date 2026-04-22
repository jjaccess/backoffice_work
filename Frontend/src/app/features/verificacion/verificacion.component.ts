import { Component, OnInit, OnDestroy, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BiometricoService, RespuestaJar } from '../../core/services/biometrico.service';
import { ApiService } from '../../core/services/api.service';

type Fase = 'espera' | 'buscando' | 'capturando' | 'verificando' | 'resultado';

@Component({
  selector: 'app-verificacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="verificacion-page">
      
      <div class="bg-shapes">
        <div class="shape shape-1"></div>
        <div class="shape shape-2"></div>
        <div class="shape shape-3"></div>
      </div>

      <div class="verificacion-wrapper">
        <div class="header-quiosco">
          <div class="header-info">
            <h1>Control de Acceso</h1>
            <span class="ws-badge" [ngClass]="{
              'badge-conectado': estadoWS === 'conectado',
              'badge-conectando': estadoWS === 'conectando',
              'badge-desconectado': estadoWS === 'desconectado' || estadoWS === 'error'
            }">
              {{ estadoWS === 'conectado' ? '● Lector conectado' : 
                 estadoWS === 'conectando' ? '○ Conectando...' : '○ Lector desconectado' }}
            </span>
          </div>
        </div>

        <div *ngIf="fase === 'espera'" class="card quiosco-card">
          <div class="quiosco-icon">👤</div>
          <h2>Ingresar Documento</h2>
          <div class="input-container">
            <input type="text" class="cc-input" placeholder="Número de documento"
                   [(ngModel)]="documento" (keyup.enter)="iniciar()"
                   [disabled]="estadoWS !== 'conectado'" autofocus />
            <button class="btn-primary-quiosco" (click)="iniciar()"
                    [disabled]="!documento.trim() || estadoWS !== 'conectado'">
              Continuar →
            </button>
          </div>
          <p *ngIf="estadoWS !== 'conectado'" class="aviso-ws-amarillo">
            ⚠️ El lector biométrico no está disponible. Verifique el agente.
          </p>
        </div>

        <div *ngIf="fase === 'buscando'" class="card quiosco-card status-card">
          <div class="spinner-grande"></div>
          <h2>Buscando registro...</h2>
          <p>Documento: <strong>{{ documento }}</strong></p>
        </div>

        <div *ngIf="fase === 'capturando'" class="card quiosco-card">
          <div class="persona-info-minimal" *ngIf="persona">
            <img *ngIf="persona.foto_base64"
                 [src]="'data:image/jpeg;base64,' + persona.foto_base64"
                 class="foto-perfil" alt="Foto"/>
            <div class="persona-datos">
              <h3>{{ persona.nombre_completo }}</h3>
              <p>{{ persona.departamento }}</p>
            </div>
          </div>
          <div class="huella-animada">
            <div class="huella-rings">
              <div class="ring ring1"></div><div class="ring ring2"></div><div class="ring ring3"></div>
            </div>
            <span class="huella-emoji">🖐️</span>
          </div>
          <h2>Coloque su huella</h2>
          <p class="instruccion-sub">Mantenga el dedo firme en el lector</p>
          <p class="timer-captura">Tiempo restante: {{ segundosCaptura }}s</p>
          <button class="btn-cancelar" (click)="cancelar()">Cancelar</button>
        </div>

        <div *ngIf="fase === 'verificando'" class="card quiosco-card status-card">
          <div class="spinner-grande"></div>
          <h2>Verificando identidad...</h2>
        </div>

        <div *ngIf="fase === 'resultado' && resultado" class="card quiosco-card resultado-card"
             [class.res-ok]="resultado.resultado === 'OK'"
             [class.res-fallo]="resultado.resultado !== 'OK'">
          <div class="resultado-emoji">{{ resultado.resultado === 'OK' ? '✅' : '❌' }}</div>
          <h2>{{ resultado.resultado === 'OK' ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO' }}</h2>
          <p class="resultado-msg">{{ resultado.mensaje }}</p>
          
          <div *ngIf="resultado.persona" class="resultado-persona-box">
            <img *ngIf="resultado.persona.foto_base64"
                 [src]="'data:image/jpeg;base64,' + resultado.persona.foto_base64"
                 class="foto-perfil" alt="Foto"/>
            <strong>{{ resultado.persona.nombre_completo }}</strong>
          </div>
          
          <p class="resultado-hora">{{ resultado.fecha_hora | date: 'HH:mm:ss — dd/MM/yyyy' }}</p>
          <button class="btn-primary-quiosco" (click)="reiniciar()">Nueva Verificación</button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .verificacion-page { 
      min-height: 100vh; 
      background: #f0f4f8; 
      display: flex; 
      flex-direction: column; 
      align-items: center; 
      justify-content: flex-start; 
      padding: 60px 16px;
      position: relative; 
      overflow: hidden; 
      font-family: 'Segoe UI', sans-serif;
    }

    /* Fondo con círculos oscuros sutiles */
    .bg-shapes { position: absolute; inset: 0; pointer-events: none; }
    .shape { position: absolute; border-radius: 50%; opacity: 0.07; background: #1a1a2e; }
    .shape-1 { width: 500px; height: 500px; top: -200px; right: -100px; }
    .shape-2 { width: 300px; height: 300px; bottom: -100px; left: -80px; }
    .shape-3 { width: 200px; height: 200px; bottom: 120px; right: 80px; }

    .verificacion-wrapper { position: relative; z-index: 10; width: 100%; max-width: 520px; }

    .header-quiosco { width: 100%; margin-bottom: 24px; }
    .header-info { display: flex; justify-content: space-between; align-items: center; }
    .header-info h1 { font-size: 1.3rem; color: #1a1a2e; }

    /* Badges de estado */
    .ws-badge { font-size: 0.75rem; padding: 6px 12px; border-radius: 20px; font-weight: 700; }
    .badge-conectado { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .badge-conectando { background: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
    .badge-desconectado { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }

    /* Estilo de la Card Blanca */
    .quiosco-card { 
      background: white; 
      border-radius: 24px; 
      padding: 40px 32px; 
      text-align: center; 
      box-shadow: 0 20px 50px rgba(0,0,0,0.05); 
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

    .quiosco-icon { font-size: 3.5rem; margin-bottom: 16px; }
    h2 { color: #1a1a2e; font-size: 1.4rem; margin-bottom: 20px; }

    /* Inputs y Botones */
    .cc-input { 
      width: 100%; padding: 16px; font-size: 1.3rem; font-weight: 700; border: 2px solid #e2e8f0; 
      border-radius: 14px; text-align: center; margin-bottom: 20px; outline: none; background: #f8fafc;
    }
    .cc-input:focus { border-color: #4361ee; background: white; }
    
    .btn-primary-quiosco { 
      width: 100%; padding: 16px; background: #4361ee; color: white; border: none; 
      border-radius: 14px; font-size: 1.1rem; font-weight: 700; cursor: pointer;
    }
    .btn-primary-quiosco:disabled { opacity: 0.5; cursor: not-allowed; }

    .aviso-ws-amarillo { 
      color: #856404; background: #fff3cd; padding: 12px; border-radius: 12px; 
      margin-top: 15px; font-size: 0.85rem; border: 1px solid #ffeeba;
    }

    /* Animaciones Huella */
    .huella-animada { position: relative; width: 120px; height: 120px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; }
    .huella-emoji { font-size: 3.5rem; z-index: 2; }
    .ring { position: absolute; border: 2px solid #4361ee; border-radius: 50%; opacity: 0; animation: expand 2s infinite; }
    .ring1{inset:20%; animation-delay: 0s;} .ring2{inset:10%; animation-delay: 0.6s;} .ring3{inset:0%; animation-delay: 1.2s;}
    @keyframes expand { 0%{transform:scale(0.8);opacity:0.6} 100%{transform:scale(1.4);opacity:0} }

    /* Spinner y Resultados */
    .spinner-grande { width: 60px; height: 60px; border: 5px solid #f1f5f9; border-top-color: #4361ee; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
    @keyframes spin { to{transform:rotate(360deg)} }

    .res-ok { border-top: 10px solid #10b981; }
    .res-fallo { border-top: 10px solid #ef4444; }
    .resultado-emoji { font-size: 4.5rem; margin-bottom: 15px; }
    .resultado-persona-box { display: flex; align-items: center; justify-content: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 12px; margin: 20px 0; }
    .foto-perfil { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; }
    .resultado-hora { font-size: 0.85rem; color: #64748b; margin-bottom: 20px; }
    .btn-cancelar { width: 100%; background: transparent; border: 2px solid #e2e8f0; padding: 10px; border-radius: 12px; color: #64748b; cursor: pointer; margin-top: 15px; }
    .persona-info-minimal { display: flex; align-items: center; gap: 15px; background: #f1f5f9; padding: 12px; border-radius: 15px; margin-bottom: 25px; text-align: left; }
    .persona-datos h3 { margin: 0; font-size: 1rem; color: #1a1a2e; }
    .persona-datos p { margin: 2px 0 0; color: #64748b; font-size: 0.85rem; }
  `]
})
export class VerificacionComponent implements OnInit, OnDestroy {

  fase: Fase = 'espera';
  documento = '';
  persona: any = null;
  resultado: any = null;
  estadoWS = 'desconectado';
  infoEquipo: any = null;
  segundosCaptura = 35;

  private reinicioInterval: any = null;
  private capturaInterval: any = null;
  private esperandoCaptura = false;
  private subs: Subscription[] = [];
  private ngZone = inject(NgZone);

  constructor(private bio: BiometricoService, private api: ApiService) { }

  async ngOnInit(): Promise<void> {
    this.bio.conectar();
    this.subs.push(this.bio.estadoWS$.subscribe(s => {
      this.ngZone.run(() => this.estadoWS = s);
    }));
    this.subs.push(this.bio.respuesta$.subscribe(r => {
      this.ngZone.run(() => this.procesarRespuesta(r));
    }));
    try {
      this.infoEquipo = await this.bio.obtenerInfoEquipo();
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
        this.mostrarResultado('FALLO', msg);
      }
    });
  }

  cancelar(): void {
    this.limpiarTimers();
    this.esperandoCaptura = false;
    this.bio.reconectar();
    this.reiniciar();
  }

  reiniciar(): void {
    this.limpiarTimers();
    this.fase = 'espera';
    this.documento = '';
    this.persona = null;
    this.resultado = null;
    this.esperandoCaptura = false;
    this.segundosCaptura = 10;
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
      this.fase = 'verificando';

      this.api.verificarHuella({
        documento: this.documento,
        template_capturado: resp.strIso,
        mac_equipo: this.infoEquipo?.mac || '00:00:00:00:00:00',
        ip_equipo: this.infoEquipo?.ip || '',
        hostname_equipo: this.infoEquipo?.hostname || '',
        dedo_usado: 1,
        resultado_jar: 'OK'
      }).subscribe({
        next: r => { this.resultado = r; this.fase = 'resultado'; },
        error: () => this.mostrarResultado('ERROR', 'Error comunicando con el servidor')
      });
    } else if (resp.error) {
      this.limpiarTimers();
      this.esperandoCaptura = false;
      this.mostrarResultado('ERROR', 'Error en el lector. Intente de nuevo.');
    }
  }

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
            this.mostrarResultado('ERROR', 'Tiempo agotado. No se detectó huella.');
          }
        }
      });
    }, 1000);
  }

  private mostrarResultado(resultado: 'OK' | 'FALLO' | 'ERROR', mensaje: string): void {
    this.limpiarTimers();
    this.esperandoCaptura = false;
    this.resultado = { resultado, mensaje, persona: this.persona };
    this.fase = 'resultado';
  }

  private limpiarTimers(): void {
    this.limpiarCapturaInterval();
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