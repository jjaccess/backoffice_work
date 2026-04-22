#!/bin/bash
export JAVA_HOME=/usr/lib/jvm/temurin-17-jdk-amd64 export PATH=$JAVA_HOME/bin:$PATH cd /opt/backend/matcher-biometria
exec java -cp "SSOReader-1.0-SNAPSHOT.jar:." MatcherServer
