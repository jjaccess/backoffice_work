@echo off
SET JAR=SSOReader-1.0-SNAPSHOT.jar

IF NOT EXIST %JAR% (
    echo ERROR: No se encontro %JAR%
    pause
    exit /b 1
)

echo [1/2] Compilando MatcherServer.java...
:: Añadimos el punto al cp de compilación también
javac -cp ".;%JAR%" MatcherServer.java
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo la compilacion
    pause
    exit /b 1
)

echo [2/2] Iniciando servidor en puerto 3001...
:: Ejecución con el separador de punto y coma para Windows
java -cp ".;%JAR%" MatcherServer