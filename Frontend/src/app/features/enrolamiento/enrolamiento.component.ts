// src/app/features/enrolamiento/enrolamiento.component.ts
// Cambios v2: máx 2 huellas, empresa→departamento
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BiometricoService, RespuestaJar } from '../../core/services/biometrico.service';
import { ApiService, Persona } from '../../core/services/api.service';

type Paso = 'buscar' | 'datos' | 'huellas' | 'completo';

interface HuellaCapturada {
  slot: number;        // 1 o 2
  dedo: number;        // id del dedo elegido
  nombre: string;
  template_iso: string;
  calidad: number;
  imagen: string;
  guardada: boolean;
}

@Component({
  selector: 'app-enrolamiento',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="enrol-container">
            <div class="bg-shapes">
  <div class="shape shape-1"></div>
  <div class="shape shape-2"></div>
  <div class="shape shape-3"></div>
</div>

      <div class="page-header">
        <h1>Enrolamiento Biométrico</h1>
        <div class="pasos-bar">
          <div class="paso" [class.activo]="paso==='buscar'"  [class.completo]="pasoCumplido('buscar')"><span>1</span> Buscar</div>
          <div class="paso" [class.activo]="paso==='datos'"   [class.completo]="pasoCumplido('datos')"><span>2</span> Datos</div>
          <div class="paso" [class.activo]="paso==='huellas'" [class.completo]="pasoCumplido('huellas')"><span>3</span> Huellas</div>
          <div class="paso" [class.activo]="paso==='completo'"><span>4</span> Listo</div>
        </div>
      </div>

      <!-- PASO 1: BUSCAR -->
      <div *ngIf="paso==='buscar'" class="card">
        <h2>Buscar persona por documento</h2>
        <div class="input-group">
          <input type="text" placeholder="Número de documento" [(ngModel)]="docBuscar"
                 (keyup.enter)="buscarPersona()" />
          <button class="btn-primary" (click)="buscarPersona()" [disabled]="!docBuscar||buscando">
            {{ buscando ? 'Buscando...' : 'Buscar' }}
          </button>
        </div>
        <div *ngIf="mensajeBuscar" class="mensaje-info">{{ mensajeBuscar }}</div>
        <div *ngIf="personaEncontrada" class="persona-found">
          <strong>{{ personaEncontrada.nombre_completo }}</strong>
          <span>{{ personaEncontrada.departamento }}</span>
          <span class="badge-huellas">{{ personaEncontrada.total_huellas }} huella(s)</span>
          <div class="acciones">
            <button class="btn-primary" (click)="irAHuellas(personaEncontrada)">
              {{ personaEncontrada.total_huellas > 0 ? 'Actualizar huellas' : 'Registrar huellas' }}
            </button>
            <button class="btn-secundario" (click)="irADatos(personaEncontrada)">Editar datos</button>
          </div>
        </div>
        <div *ngIf="mostrarCrear" class="crear-nuevo">
          <p>Persona no encontrada. ¿Desea registrarla?</p>
          <button class="btn-primary" (click)="irADatosNuevo()">+ Crear nueva persona</button>
        </div>
      </div>

      <!-- PASO 2: FORMULARIO DATOS -->
      <div *ngIf="paso==='datos'" class="card">
        <h2>{{ persona ? 'Editar persona' : 'Nueva persona' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardarPersona()">
          <div class="form-grid">
            <div class="form-field">
              <label>Tipo Documento *</label>
              <select formControlName="tipo_documento">
                <option value="CC">Cédula de Ciudadanía</option>
                <option value="CE">Cédula de Extranjería</option>
                <option value="PAS">Pasaporte</option>
                <option value="TI">Tarjeta de Identidad</option>
              </select>
            </div>
            <div class="form-field">
              <label>Número de Documento *</label>
              <input type="text" formControlName="documento" />
            </div>
            <div class="form-field">
              <label>Nombres *</label>
              <input type="text" formControlName="nombres" />
            </div>
            <div class="form-field">
              <label>Apellidos *</label>
              <input type="text" formControlName="apellidos" />
            </div>
            <div class="form-field">
              <label>Email</label>
              <input type="email" formControlName="email" />
            </div>
            <div class="form-field">
              <label>Teléfono</label>
              <input type="text" formControlName="telefono" />
            </div>
            <!-- DEPARTAMENTO en lugar de empresa -->
            <div class="form-field">
              <label>Departamento</label>
              <input type="text" formControlName="departamento" placeholder="Ej: Ventas, RRHH..." />
            </div>
            <div class="form-field">
              <label>Cargo</label>
              <input type="text" formControlName="cargo" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" class="btn-secundario" (click)="paso='buscar'">← Atrás</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid||guardando">
              {{ guardando ? 'Guardando...' : 'Guardar y continuar →' }}
            </button>
          </div>
        </form>
      </div>

      <!-- PASO 3: CAPTURA HUELLAS (máx 2) -->
      <div *ngIf="paso==='huellas'" class="card">
        <h2>Captura de Huellas — {{ persona?.nombre_completo }}</h2>
        <p class="instruccion-huellas">Registre entre 1 y 2 huellas (cualquier dedo)</p>

        <!-- SLOTS -->
        <div class="slots-grid">
          <div *ngFor="let slot of [1,2]" class="slot-card"
               [class.slot-capturado]="huellaEnSlot(slot)"
               [class.slot-activo]="slotActivo===slot">

            <div class="slot-numero">Huella {{ slot }}</div>

            <!-- Slot vacío -->
            <ng-container *ngIf="!huellaEnSlot(slot)">
              <div class="slot-vacio-icon">
                {{ slotActivo === slot ? '🖐️' : '◯' }}
              </div>
              <p *ngIf="slotActivo !== slot">Sin registrar</p>
              <p *ngIf="slotActivo === slot" class="capturando-txt">Coloque el dedo...</p>

              <div class="dedo-selector" *ngIf="slotActivo !== slot && !capturando">
                <label>Seleccionar dedo:</label>
                <select [(ngModel)]="dedoSeleccionado[slot]">
                  <option *ngFor="let d of dedosDisponibles(slot)" [value]="d.id">{{ d.nombre }}</option>
                </select>
                <button class="btn-dedo" (click)="iniciarCapturaSlot(slot)" [disabled]="capturando">
                  Capturar
                </button>
              </div>
            </ng-container>

            <!-- Slot con huella -->
            <ng-container *ngIf="huellaEnSlot(slot) as h">
              <img *ngIf="h.imagen" [src]="'data:image/jpeg;base64,'+h.imagen"
                   class="huella-preview" alt="Huella" />
              <p class="slot-info">{{ h.nombre }}</p>
              <p class="slot-calidad" [class.ok]="h.calidad>=60" [class.baja]="h.calidad<60">
                Calidad: {{ h.calidad }}%
              </p>
              <button class="btn-link" (click)="eliminarHuella(slot)">× Repetir</button>
            </ng-container>
          </div>
        </div>

        <div class="huellas-resumen">
          <strong>{{ huellasGuardadas }} / 2 huellas registradas</strong>
          <span *ngIf="huellasGuardadas===0" class="aviso">Se requiere al menos 1</span>
        </div>

        <div class="form-actions">
          <button class="btn-secundario" (click)="paso='datos'">← Atrás</button>
          <button class="btn-primary" [disabled]="huellasGuardadas===0" (click)="finalizar()">
            Finalizar ✓
          </button>
        </div>
      </div>

      <!-- PASO 4: COMPLETO -->
      <div *ngIf="paso==='completo'" class="card completo-card">
        <div class="completo-icono">🎉</div>
        <h2>Enrolamiento completado</h2>
        <p><strong>{{ persona?.nombre_completo }}</strong> registrada exitosamente.</p>
        <p>Huellas registradas: <strong>{{ huellasGuardadas }}</strong></p>
        <button class="btn-primary" (click)="nuevoEnrolamiento()">Nuevo enrolamiento</button>
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

    .enrol-container { max-width: 680px; margin: 32px auto; padding: 0 16px; font-family: 'Segoe UI', sans-serif; }
    .page-header { margin-bottom: 24px; }
    h1 { font-size: 1.4rem; color: #1a1a2e; margin-bottom: 16px; }
    .pasos-bar { display: flex; gap: 4px; }
    .paso { flex:1; text-align:center; padding:8px 4px; background:#f0f0f0; border-radius:8px; font-size:0.8rem; color:#999; }
    .paso span { display:inline-block; width:20px; height:20px; border-radius:50%; background:#ccc; color:white; font-weight:bold; margin-right:4px; line-height:20px; font-size:0.75rem; }
    .paso.activo { background:#ebf0ff; color:#4361ee; } .paso.activo span { background:#4361ee; }
    .paso.completo { background:#d4edda; color:#155724; } .paso.completo span { background:#28a745; }

    .card { background:white; border-radius:16px; padding:32px; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    h2 { color:#1a1a2e; margin-bottom:20px; }
    .instruccion-huellas { color:#666; font-size:0.9rem; margin-top:-12px; margin-bottom:24px; }

    .input-group { display:flex; gap:12px; margin-bottom:16px; }
    .input-group input { flex:1; padding:12px 16px; border:2px solid #e0e0e0; border-radius:10px; font-size:1rem; }
    .input-group input:focus { outline:none; border-color:#4361ee; }
    .btn-primary { padding:12px 24px; background:#4361ee; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:600; }
    .btn-primary:hover:not(:disabled) { background:#3451d1; }
    .btn-primary:disabled { opacity:0.5; cursor:not-allowed; }
    .btn-secundario { padding:12px 20px; background:transparent; border:2px solid #ddd; border-radius:10px; cursor:pointer; }

    .mensaje-info { padding:12px; background:#fff3cd; border-radius:8px; margin-bottom:12px; font-size:0.9rem; }
    .persona-found { border:2px solid #4361ee; border-radius:12px; padding:20px; }
    .persona-found strong { display:block; font-size:1.1rem; }
    .persona-found span { display:block; color:#666; font-size:0.9rem; }
    .badge-huellas { display:inline-block !important; background:#ebf0ff; color:#4361ee; padding:2px 10px; border-radius:20px; font-size:0.8rem; margin:8px 0; }
    .acciones { display:flex; gap:12px; margin-top:12px; }
    .crear-nuevo { margin-top:16px; padding:16px; background:#f8f9fa; border-radius:12px; text-align:center; }

    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; }
    .form-field { display:flex; flex-direction:column; gap:6px; }
    .form-field label { font-size:0.85rem; color:#555; font-weight:600; }
    .form-field input, .form-field select { padding:10px 14px; border:2px solid #e0e0e0; border-radius:8px; font-size:0.95rem; }
    .form-field input:focus, .form-field select:focus { outline:none; border-color:#4361ee; }
    .form-actions { display:flex; justify-content:space-between; margin-top:24px; }

    /* Slots de huellas */
    .slots-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px; }
    .slot-card {
      border:2px solid #e0e0e0; border-radius:16px; padding:20px;
      text-align:center; transition:all 0.2s; min-height:200px;
    }
    .slot-card.slot-capturado { border-color:#28a745; background:#f0fff4; }
    .slot-card.slot-activo    { border-color:#4361ee; background:#ebf0ff; animation:parpadeo 1s infinite; }
    @keyframes parpadeo { 50% { opacity:0.7; } }
    .slot-numero { font-size:0.75rem; font-weight:700; color:#999; text-transform:uppercase; margin-bottom:12px; }
    .slot-vacio-icon { font-size:2.5rem; margin-bottom:8px; }
    .capturando-txt { color:#4361ee; font-weight:600; font-size:0.9rem; }
    .dedo-selector { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
    .dedo-selector label { font-size:0.75rem; color:#666; }
    .dedo-selector select { padding:6px 10px; border:2px solid #ddd; border-radius:8px; font-size:0.85rem; }
    .btn-dedo { padding:8px 16px; background:#4361ee; color:white; border:none; border-radius:8px; cursor:pointer; font-size:0.85rem; }
    .btn-dedo:disabled { opacity:0.4; }
    .huella-preview { width:80px; height:80px; object-fit:cover; border-radius:10px; border:2px solid #28a745; margin-bottom:8px; }
    .slot-info { font-size:0.8rem; color:#333; font-weight:600; }
    .slot-calidad { font-size:0.75rem; font-weight:700; margin-top:4px; }
    .slot-calidad.ok { color:#155724; } .slot-calidad.baja { color:#856404; }
    .btn-link { margin-top:8px; background:none; border:none; color:#dc3545; cursor:pointer; font-size:0.8rem; text-decoration:underline; }

    .huellas-resumen { text-align:center; padding:12px; color:#555; margin-bottom:8px; }
    .aviso { display:block; color:#856404; font-size:0.8rem; margin-top:4px; }

    .completo-card { text-align:center; padding:48px; }
    .completo-icono { font-size:4rem; margin-bottom:16px; }
    .completo-card h2 { color:#155724; margin-bottom:12px; }
    .completo-card p { margin-bottom:8px; color:#555; }
    .completo-card .btn-primary { margin-top:20px; }
  `]
})
export class EnrolamientoComponent implements OnInit, OnDestroy {

  paso: Paso = 'buscar';
  docBuscar = '';
  buscando = false;
  mensajeBuscar = '';
  mostrarCrear = false;
  personaEncontrada: Persona | null = null;
  persona: Persona | null = null;
  guardando = false;
  capturando = false;
  slotActivo: number | null = null;

  // Dedos disponibles por slot
  dedosSeleccion = [
    { id: 1, nombre: 'Pulgar Derecho' },
    { id: 2, nombre: 'Índice Derecho' },
    { id: 3, nombre: 'Medio Derecho' },
    { id: 6, nombre: 'Pulgar Izquierdo' },
    { id: 7, nombre: 'Índice Izquierdo' },
  ];
  dedoSeleccionado: Record<number, number> = { 1: 1, 2: 2 };

  huellasCapturas: HuellaCapturada[] = [];
  form: FormGroup;
  private subs: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private bio: BiometricoService,
    private api: ApiService
  ) {
    this.form = this.fb.group({
      tipo_documento: ['CC', Validators.required],
      documento: ['', Validators.required],
      nombres: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', Validators.email],
      telefono: [''],
      departamento: [''],   // ← departamento
      cargo: ['']
    });
  }

  ngOnInit(): void {
    this.bio.conectar();
    this.subs.push(this.bio.respuesta$.subscribe(r => this.procesarRespuesta(r)));
  }

  buscarPersona(): void {
    if (!this.docBuscar.trim()) return;
    this.buscando = true; this.mensajeBuscar = ''; this.mostrarCrear = false; this.personaEncontrada = null;
    this.api.getPersonaPorDocumento(this.docBuscar).subscribe({
      next: p => { this.buscando = false; this.personaEncontrada = p; },
      error: err => {
        this.buscando = false;
        if (err.status === 404) { this.mostrarCrear = true; this.mensajeBuscar = `Documento ${this.docBuscar} no encontrado.`; }
        else this.mensajeBuscar = 'Error al buscar. Verifique la conexión.';
      }
    });
  }

  irAHuellas(p: Persona): void { this.persona = p; this.paso = 'huellas'; }
  irADatos(p: Persona): void { this.persona = p; this.form.patchValue(p); this.paso = 'datos'; }
  irADatosNuevo(): void { this.persona = null; this.form.reset({ tipo_documento: 'CC', documento: this.docBuscar }); this.paso = 'datos'; }

  guardarPersona(): void {
    if (this.form.invalid) return;
    this.guardando = true;
    const obs = this.persona
      ? this.api.actualizarPersona(this.persona.id, this.form.value)
      : this.api.crearPersona(this.form.value);
    obs.subscribe({
      next: (p: any) => { this.guardando = false; this.persona = p; this.paso = 'huellas'; },
      error: err => { this.guardando = false; alert(err.error?.error || 'Error guardando'); }
    });
  }

  // Dedos disponibles para un slot (excluye el dedo ya usado en el otro slot)
  dedosDisponibles(slot: number): { id: number; nombre: string }[] {
    const otroSlot = slot === 1 ? 2 : 1;
    const otraHuella = this.huellasCapturas.find(h => h.slot === otroSlot);
    return this.dedosSeleccion.filter(d => !otraHuella || d.id !== otraHuella.dedo);
  }

  iniciarCapturaSlot(slot: number): void {
    this.slotActivo = slot;
    this.capturando = true;
    this.bio.capturar(this.dedoSeleccionado[slot] || 1, 30000);
  }

  cancelarCaptura(): void {
    this.bio.cancelar();
    this.capturando = false;
    this.slotActivo = null;
  }

  private procesarRespuesta(resp: RespuestaJar): void {
    if (!this.capturando || !this.slotActivo) return;

    if (resp.strRespuesta === 'CANCELAR') { this.capturando = false; this.slotActivo = null; return; }

    if (resp.strRespuesta === 'OK' && resp.strIso) {
      const desoId = this.dedoSeleccionado[this.slotActivo] || 1;
      const dedo = this.dedosSeleccion.find(d => d.id === desoId) || { id: desoId, nombre: `Dedo ${desoId}` };
      const calidad = parseInt(resp.strCalidad || '0');
      const slot = this.slotActivo;

      this.api.enrolarHuella({
        persona_id: this.persona!.id,
        dedo: dedo.id,
        template_iso: resp.strIso,
        imagen_wsq: resp.strImage,
        calidad
      }).subscribe({
        next: () => {
          const idx = this.huellasCapturas.findIndex(h => h.slot === slot);
          const nueva: HuellaCapturada = { slot, dedo: dedo.id, nombre: dedo.nombre, template_iso: resp.strIso!, calidad, imagen: resp.strImage || '', guardada: true };
          if (idx >= 0) this.huellasCapturas[idx] = nueva;
          else this.huellasCapturas.push(nueva);
        },
        error: () => alert('Error guardando huella. Intente de nuevo.')
      });
      this.capturando = false;
      this.slotActivo = null;
    } else {
      alert('No se pudo capturar. Intente de nuevo.');
      this.capturando = false;
      this.slotActivo = null;
    }
  }

  huellaEnSlot(slot: number): HuellaCapturada | null {
    return this.huellasCapturas.find(h => h.slot === slot && h.guardada) || null;
  }

  eliminarHuella(slot: number): void {
    this.huellasCapturas = this.huellasCapturas.filter(h => h.slot !== slot);
  }

  get huellasGuardadas(): number { return this.huellasCapturas.filter(h => h.guardada).length; }

  pasoCumplido(p: Paso): boolean {
    const orden: Paso[] = ['buscar', 'datos', 'huellas', 'completo'];
    return orden.indexOf(p) < orden.indexOf(this.paso);
  }

  finalizar(): void { if (this.huellasGuardadas > 0) this.paso = 'completo'; }

  nuevoEnrolamiento(): void {
    this.paso = 'buscar'; this.docBuscar = ''; this.persona = null;
    this.personaEncontrada = null; this.huellasCapturas = [];
    this.mostrarCrear = false; this.form.reset({ tipo_documento: 'CC' });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
