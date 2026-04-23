// src/app/core/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Persona {
  id: number;
  documento: string;
  tipo_documento: string;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  email?: string;
  telefono?: string;
  departamento?: string;
  cargo?: string;
  activo: boolean;
  foto_base64?: string;
  total_huellas: number;
}

export interface TemplatesResponse {
  persona_id: number;
  nombre_completo: string;
  departamento?: string;
  foto_base64?: string;
  templates: {
    id: number;
    dedo: number;
    template_iso: string;
    calidad: number;
  }[];
}

export interface ResultadoVerificacion {
  resultado: 'OK' | 'FALLO' | 'ERROR';
  mensaje: string;
  visita_id?: number;
  fecha_hora?: string;
  persona?: { id: number; nombre_completo: string; foto_base64?: string; };
}

export interface Visita {
  id: number;
  documento: string;
  nombre_completo: string;
  departamento?: string;
  tipo_evento: string;
  resultado: string;
  mac_equipo: string;
  ip_equipo: string;
  fecha_hora: string;
  score_biometrico?: number;
  punto_venta?: string;
  zona?: string;
}

export interface PaginadoResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {

  private base = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ── Auth ─────────────────────────────────────────────────
  login(username: string, password: string): Observable<{ token: string; usuario: any }> {
    return this.http.post<any>(`${this.base}/auth/login`, { username, password });
  }

  // ── Personas ─────────────────────────────────────────────
  getPersonas(params: any = {}): Observable<PaginadoResponse<Persona>> {
    return this.http.get<PaginadoResponse<Persona>>(`${this.base}/personas`, { params: this.toParams(params) });
  }

  getPersonaPorDocumento(doc: string): Observable<Persona> {
    return this.http.get<Persona>(`${this.base}/personas/documento/${doc}`);
  }

  crearPersona(persona: Partial<Persona>): Observable<Persona> {
    return this.http.post<Persona>(`${this.base}/personas`, persona);
  }

  actualizarPersona(id: number, persona: Partial<Persona>): Observable<Persona> {
    return this.http.put<Persona>(`${this.base}/personas/${id}`, persona);
  }

  // ── Huellas ───────────────────────────────────────────────
  enrolarHuella(data: {
    persona_id: number; dedo: number; template_iso: string;
    imagen_wsq?: string; calidad?: number;
  }): Observable<any> {
    return this.http.post(`${this.base}/huellas/enrolar`, data);
  }

  /**
   * Paso 1 del cotejo: obtener los templates guardados del documento.
   * Ruta pública — no requiere token.
   */
  obtenerTemplates(documento: string): Observable<TemplatesResponse> {
    return this.http.post<TemplatesResponse>(
      `${this.base}/huellas/obtener-templates`,
      { documento }
    );
  }

  /**
   * Paso 3 del cotejo: registrar el resultado en BD.
   * El cotejo real lo hizo el .jar en el paso 2.
   * Ruta pública — no requiere token.
   */
  verificarHuella(data: {
    documento: string;
    mac_equipo: string;
    ip_equipo?: string;
    hostname_equipo?: string;
    dedo_usado?: number;
    score_biometrico?: number;
    resultado_jar: string;
    template_capturado?: string;
  }): Observable<ResultadoVerificacion> {
    return this.http.post<ResultadoVerificacion>(`${this.base}/huellas/verificar`, data);
  }

  getHuellasPersona(personaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/huellas/persona/${personaId}`);
  }

  // ── Visitas ───────────────────────────────────────────────
  getVisitas(params: any = {}): Observable<PaginadoResponse<Visita>> {
    return this.http.get<PaginadoResponse<Visita>>(`${this.base}/visitas`, { params: this.toParams(params) });
  }

  getResumenHoy(): Observable<any> {
    return this.http.get(`${this.base}/visitas/resumen`);
  }

  // ── Geografía / PDV ───────────────────────────────────────
  getPdvPorMac(mac: string): Observable<any> {
    return this.http.get(`${this.base}/geografia/puntosdeventa/mac/${mac}`);
  }

  getDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/departamentos`);
  }

  getZonas(departamentoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/zonas`, { params: { departamento_id: departamentoId } });
  }

  getSubzonas(zonaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/subzonas`, { params: { zona_id: zonaId } });
  }

  getCelulas(subzonaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/celulas`, { params: { subzona_id: subzonaId } });
  }

  getOficinas(celulaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/oficinas`, { params: { celula_id: celulaId } });
  }

  getPuntosDeVenta(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/geografia/puntosdeventa`);
  }

  crearPuntoDeVenta(data: any): Observable<any> {
    return this.http.post(`${this.base}/geografia/puntosdeventa`, data);
  }

  getPersonasEnroladas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/personas/enroladas`);
  }

  // ── Util ──────────────────────────────────────────────────
  private toParams(obj: Record<string, any>): HttpParams {
    let p = new HttpParams();
    Object.entries(obj).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    });
    return p;
  }
}
