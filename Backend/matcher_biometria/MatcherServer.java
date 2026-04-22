import com.machinezoo.sourceafis.FingerprintTemplate;
import com.machinezoo.sourceafis.FingerprintMatcher;
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class MatcherServer {

    static final int    PORT      = 3001;
    static final double THRESHOLD = 40.0;

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/match",  new MatchHandler());
        server.createContext("/health", new HealthHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("===========================================");
        System.out.println("MatcherServer SourceAFIS - Puerto " + PORT);
        System.out.println("Threshold: " + THRESHOLD);
        System.out.println("===========================================");
    }

    static class MatchHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Content-Type", "application/json");

            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, OPTIONS");
                exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");
                exchange.sendResponseHeaders(200, 0);
                exchange.close();
                return;
            }

            try {
                // Leer body completo
                String body = new String(
                    exchange.getRequestBody().readAllBytes(),
                    StandardCharsets.UTF_8
                );

                // Parsear JSON con parser propio que maneja base64 largo
                String probe64    = getJsonValue(body, "probe");
                List<String> cands = getJsonArray(body, "candidates");

                if (probe64 == null || probe64.isEmpty() || cands.isEmpty()) {
                    respond(exchange, 400, "{\"error\":\"probe y candidates requeridos\"}");
                    return;
                }

                // Limpiar templates (quitar prefijo <0| y sufijo > si vienen del .jar)
                probe64 = cleanBase64(probe64);

                // Crear template probe con SourceAFIS
		byte[] probeBytes = Base64.getDecoder().decode(probe64);
		FingerprintTemplate probeTemplate = new FingerprintTemplate()
        	.convert(probeBytes);
                FingerprintMatcher matcher = new FingerprintMatcher()
                        .index(probeTemplate);

                double bestScore = 0.0;
                int    bestIndex = -1;

                for (int i = 0; i < cands.size(); i++) {
                    try {
                        String cand64 = cleanBase64(cands.get(i));
                        byte[] candBytes = Base64.getDecoder().decode(cand64);
				FingerprintTemplate candidate = new FingerprintTemplate()
        			.convert(candBytes);
                        double score = matcher.match(candidate);
                        System.out.printf("[matcher] cand %d score=%.2f%n", i, score);
                        if (score > bestScore) {
                            bestScore = score;
                            bestIndex = i;
                        }
                    } catch (Exception e) {
                        System.err.println("[matcher] error cand " + i + ": " + e.getMessage());
                    }
                }

                boolean matched = bestScore >= THRESHOLD;
                System.out.printf("[matcher] RESULTADO match=%b score=%.2f%n", matched, bestScore);

String resp = String.format(
    java.util.Locale.US,
    "{\"match\":%b,\"score\":%.2f,\"best_index\":%d,\"threshold\":%.1f}",
    matched, bestScore, bestIndex, THRESHOLD
);
                respond(exchange, 200, resp);

            } catch (Exception e) {
                System.err.println("[matcher] ERROR: " + e.getMessage());
                e.printStackTrace();
                String msg = e.getMessage() != null
                    ? e.getMessage().replace("\"","'")
                    : e.getClass().getSimpleName();
                respond(exchange, 500, "{\"error\":\"" + msg + "\"}");
            }
        }
    }

    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            respond(exchange, 200, "{\"status\":\"ok\",\"threshold\":" + THRESHOLD + "}");
        }
    }

    // ── Limpiar template: quita prefijo <0| y sufijo > del .jar ─
    static String cleanBase64(String s) {
        if (s == null) return "";
        s = s.trim();
        // Formato del .jar: <0|BASE64> — quitar todo hasta el primer |
        if (s.startsWith("<") && s.contains("|")) {
            s = s.substring(s.indexOf("|") + 1);
        }
        // Quitar > final si existe
        if (s.endsWith(">")) {
            s = s.substring(0, s.length() - 1);
        }
        // Quitar cualquier espacio o salto de línea
        s = s.replaceAll("\\s", "");
        return s;
    }

    // ── Extraer string de JSON — maneja base64 largo con = ─────
    // Busca "key":"..." respetando que el valor puede tener = pero no "
    static String getJsonValue(String json, String key) {
        String search = "\"" + key + "\"";
        int ki = json.indexOf(search);
        if (ki < 0) return null;
        int colon = json.indexOf(":", ki + search.length());
        if (colon < 0) return null;
        // Saltar espacios
        int si = colon + 1;
        while (si < json.length() && Character.isWhitespace(json.charAt(si))) si++;
        if (si >= json.length() || json.charAt(si) != '"') return null;
        si++; // saltar comilla de apertura
        // Leer hasta comilla de cierre (no escapada)
        StringBuilder sb = new StringBuilder();
        int i = si;
        while (i < json.length()) {
            char c = json.charAt(i);
            if (c == '\\') { i += 2; continue; } // saltar escape
            if (c == '"') break;
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    // ── Extraer array de strings — maneja base64 largo ─────────
    // Problema: base64 puede contener + y / pero NO contiene "
    // Así que podemos parsear por comillas de apertura/cierre
    static List<String> getJsonArray(String json, String key) {
        List<String> result = new ArrayList<>();
        String search = "\"" + key + "\"";
        int ki = json.indexOf(search);
        if (ki < 0) return result;
        int bracket = json.indexOf("[", ki);
        if (bracket < 0) return result;

        int i = bracket + 1;
        while (i < json.length()) {
            // Saltar espacios y comas
            char c = json.charAt(i);
            if (c == ']') break;
            if (c != '"') { i++; continue; }

            // Leer string entre comillas
            i++; // saltar comilla apertura
            StringBuilder sb = new StringBuilder();
            while (i < json.length()) {
                char ch = json.charAt(i);
                if (ch == '\\') { i += 2; continue; }
                if (ch == '"') break;
                sb.append(ch);
                i++;
            }
            result.add(sb.toString());
            i++; // saltar comilla cierre
        }
        return result;
    }

    static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
        exchange.close();
    }
}