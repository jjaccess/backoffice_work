// src/app/core/services/biometrico.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface RespuestaJar {
  strRespuesta?: string;   // "OK", "FALLO", "CANCELAR", "ERROR"
  strIso?: string;   // template ISO capturado (base64)
  strImage?: string;   // imagen JPG base64
  strCalidad?: string;   // calidad 0-100
  raw?: string;
  error?: string;
}

export type EstadoWS = 'desconectado' | 'conectando' | 'conectado' | 'error';

@Injectable({ providedIn: 'root' })
export class BiometricoService implements OnDestroy {

  private readonly URL_JAR = 'ws://localhost:1987';
  private readonly URL_AGENTE = 'ws://localhost:2021';

  private ws: WebSocket | null = null;
  private destroy$ = new Subject<void>();

  estadoWS$ = new BehaviorSubject<EstadoWS>('desconectado');
  respuesta$ = new Subject<RespuestaJar>();

  // ── Conectar al .jar ────────────────────────────────────────
  conectar(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.estadoWS$.next('conectando');
    this.ws = new WebSocket(this.URL_JAR);

    this.ws.onopen = () => {
      this.estadoWS$.next('conectado');
      console.log('[Biométrico] Conectado al .jar en', this.URL_JAR);
    };

    this.ws.onmessage = (event) => {
      console.log('[JAR RAW]', event.data?.substring(0, 120));
      const resp = this.parsearRespuesta(event.data);
      this.respuesta$.next(resp);
    };

    this.ws.onerror = () => {
      this.estadoWS$.next('error');
      console.error('[Biométrico] Error en WebSocket del .jar');
    };

    this.ws.onclose = () => {
      this.estadoWS$.next('desconectado');
      timer(3000).pipe(takeUntil(this.destroy$)).subscribe(() => this.conectar());
    };
  }

  desconectar(): void {
    this.ws?.close();
    this.ws = null;
  }

  // ── Parsear respuesta del .jar ──────────────────────────────
  // Formato real: <codigo|datos>
  // codigo 0 = OK/éxito, 1 = ERROR/FALLO
  private parsearRespuesta(data: string): RespuestaJar {
    if (!data) return { error: 'Respuesta vacía', raw: data };

    // Formato <codigo|contenido>
    if (data.startsWith('<') && data.includes('|')) {
      const contenido = data.substring(1, data.lastIndexOf('>'));
      const pipe = contenido.indexOf('|');
      const codigo = contenido.substring(0, pipe).trim();
      const resto = contenido.substring(pipe + 1);

      if (codigo === '0') {
        // Éxito — resto puede ser: isoBase64 | isoBase64|imagen|calidad
        const partes = resto.split('|');
        return {
          strRespuesta: 'OK',
          strIso: partes[0] || undefined,
          strImage: partes[1] || undefined,
          strCalidad: partes[2] || undefined,
          raw: data
        };
      }

      if (codigo === '1') {
        // Error o fallo de cotejo
        const esCancelar = resto.includes('CANCELAR');
        return {
          strRespuesta: esCancelar ? 'CANCELAR' : 'FALLO',
          error: resto,
          raw: data
        };
      }

      return { strRespuesta: codigo, raw: data };
    }

    // Formato sin pipe — texto simple
    if (data.startsWith('<')) {
      const contenido = data.substring(1, data.lastIndexOf('>'));
      if (contenido === 'CANCELAR') return { strRespuesta: 'CANCELAR', raw: data };
      return { strRespuesta: contenido, raw: data };
    }

    // Fallback JSON (por si acaso)
    if (data.trim().startsWith('{')) {
      try {
        const p = JSON.parse(data);
        return {
          strRespuesta: p.strRespuesta,
          strIso: p.strIso,
          strImage: p.strImage,
          strCalidad: p.strCalidad?.toString(),
          raw: data
        };
      } catch { /* continuar */ }
    }

    return { strRespuesta: data.trim(), raw: data };
  }

  // ── Enviar al .jar ──────────────────────────────────────────
  private enviar(mensaje: string): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('[Biométrico] WebSocket no conectado');
      this.respuesta$.next({ error: 'No conectado al lector biométrico' });
      return;
    }
    console.log('[JAR SEND]', mensaje.substring(0, 80));
    this.ws.send(mensaje);
  }

  // ── Capturar huella nueva (enrolamiento y paso 1 del cotejo) ─
  // Comando: <RETORNE_ISO>timeout><calidad>
  capturar(dedo = 1, timeoutMs = 15000): void {
    this.enviar(`<RETORNE_ISO>${timeoutMs}><60>`);
  }

  // ── Cotejar huella capturada contra template guardado ────────
  // Comando: <VERIFIQUE_ISO_HUELLA>calidad|templateGuardado>
  // El .jar compara la huella en el lector contra el template ISO
  // y responde <0|...> si coincide o <1|ERROR...> si no
  cotejar(templateGuardado: string, calidad = 60, timeoutMs = 30000): void {
    // Cerrar conexión actual y reconectar antes de cotejar
    // para reiniciar el estado del lector en el .jar
    if (this.ws) {
      this.ws.onclose = null; // evitar reconexión automática
      this.ws.close();
      this.ws = null;
    }

    setTimeout(() => {
      // Reconectar y enviar cotejo
      this.ws = new WebSocket(this.URL_JAR);
      this.ws.onopen = () => {
        console.log('[Biométrico] Reconectado para cotejo');
        this.ws!.send(`<VERIFIQUE_ISO_HUELLA>${calidad}|${templateGuardado}><${timeoutMs}>`);
        console.log('[JAR SEND] cotejo enviado');
      };
      this.ws.onmessage = (event) => {
        console.log('[JAR RAW cotejo]', event.data?.substring(0, 80));
        const resp = this.parsearRespuesta(event.data);
        this.respuesta$.next(resp);
        // Reconectar el handler normal después del cotejo
        this.ws!.onclose = () => {
          this.estadoWS$.next('desconectado');
          timer(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.conectar());
        };
      };
      this.ws.onerror = () => {
        this.estadoWS$.next('error');
        this.respuesta$.next({ error: 'Error en cotejo biométrico' });
      };
      this.ws.onclose = () => {
        this.estadoWS$.next('desconectado');
        timer(1000).pipe(takeUntil(this.destroy$)).subscribe(() => this.conectar());
      };
    }, 1500); // esperar 1.5s para que el .jar libere el lector
  }

  cancelar(): void {
    // Abrir conexión separada para enviar CANCELAR
    // (el WebSocket principal puede estar en cualquier estado)
    try {
      const wsCancel = new WebSocket(this.URL_JAR);
      wsCancel.onopen = () => {
        wsCancel.send('<CANCELAR>');
        console.log('[Biométrico] CANCELAR enviado');
        setTimeout(() => wsCancel.close(), 500);
      };
    } catch (e) {
      console.warn('[Biométrico] No se pudo enviar CANCELAR:', e);
    }
  }

  // ── Obtener MAC del equipo (agente Python) ──────────────────
  obtenerInfoEquipo(): Promise<{ mac: string; hostname: string; ip: string }> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.URL_AGENTE);
      const timeout = setTimeout(() => { ws.close(); reject(new Error('Timeout')); }, 5000);
      ws.onopen = () => ws.send(JSON.stringify({ accion: 'obtener_mac' }));
      ws.onmessage = (ev) => {
        clearTimeout(timeout); ws.close();
        try { resolve(JSON.parse(ev.data)); }
        catch { reject(new Error('Respuesta inválida del Agente MAC')); }
      };
      ws.onerror = () => { clearTimeout(timeout); reject(new Error('Error Agente MAC')); };
    });
  }

  reconectar(): void {
    console.log('[Biométrico] Reconectando...');
    this.cancelar();  // ← enviar CANCELAR por conexión separada

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close();
      this.ws = null;
    }
    // Esperar 1.5s para que el .jar procese el CANCELAR antes de reconectar
    timer(1500).pipe(takeUntil(this.destroy$)).subscribe(() => this.conectar());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.desconectar();
  }
}
