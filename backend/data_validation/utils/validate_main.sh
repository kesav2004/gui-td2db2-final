#!/bin/bash

set -e
set -x

# Directory resolution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
CURR_DIR=$(pwd)

echo "Script directory: $SCRIPT_DIR"
echo "Backend directory: $BACKEND_DIR"
echo "Project root: $PROJECT_ROOT"
echo "Current directory: $CURR_DIR"

# Virtual Environment Discovery
VENV_LOCATIONS=(
    "${BACKEND_DIR}/venv"
    "${PROJECT_ROOT}/backend/venv"
    "${PROJECT_ROOT}/venv"
    "/Users/kesavapraadeep/Desktop/gui-tdc-final/backend/venv"
    "/Users/kesavapraadeep/Desktop/gui-tdc-final/venv"
    "/Users/kesavapraadeep/Desktop/gui-tdc/final1/backend/venv"
    "/Users/kesavapraadeep/Desktop/gui-tdc/final1/venv"
)

VENV_PATH=""
for venv in "${VENV_LOCATIONS[@]}"; do
    if [ -d "$venv" ]; then
        VENV_PATH="$venv"
        echo "Found virtual environment at: $VENV_PATH"
        break
    fi
done

if [ -z "$VENV_PATH" ]; then
    echo "❌ Error: Virtual environment not found."
    printf '%s\n' "${VENV_LOCATIONS[@]}"
    exit 1
fi

source "${VENV_PATH}/bin/activate"

# Python Version Check
PYTHON_VERSION=$($VENV_PATH/bin/python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
PYTHON_MAJOR=$(echo "$PYTHON_VERSION" | cut -d. -f1)
PYTHON_MINOR=$(echo "$PYTHON_VERSION" | cut -d. -f2)

if (( PYTHON_MAJOR < 3 || (PYTHON_MAJOR == 3 && PYTHON_MINOR < 11) )); then
    echo "❌ Python 3.11 or higher is required — found $PYTHON_VERSION"
    exit 1
fi


# Java Setup
if ! command -v java &>/dev/null; then
    echo "❌ Java not found in PATH"
    exit 1
fi

JAVA_VERSION_OUTPUT=$(java -version 2>&1 | head -n 1)
JAVA_MAJOR_VERSION=$(echo "$JAVA_VERSION_OUTPUT" | grep -oE '\"[0-9]+' | tr -d '"')

if [[ "$JAVA_MAJOR_VERSION" -lt 17 ]]; then
    echo "❌ Java 17 or higher required — found Java $JAVA_MAJOR_VERSION"
    exit 1
fi

export JAVA_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null || echo "")
export PATH=$JAVA_HOME/bin:$PATH

# Spark Setup (rely on spark-submit in PATH)
export PYSPARK_PYTHON="${VENV_PATH}/bin/python"
export PYSPARK_DRIVER_PYTHON="${VENV_PATH}/bin/python"

PYSPARK_VERSION=$(python -c "import pyspark; print(pyspark.__version__)" 2>/dev/null || echo "")
PYSPARK_VERSION_MAJOR=$(echo "$PYSPARK_VERSION" | cut -d. -f1)
PYSPARK_IS_4=false
if [[ "$PYSPARK_VERSION_MAJOR" -ge 4 ]]; then
    PYSPARK_IS_4=true
fi

if $PYSPARK_IS_4; then
    echo "✅ Detected PySpark 4.x — enabling Arrow-based pandas compatibility"
    export PYSPARK_PANDAS_AS_ARROW=true
else
    echo "⚠️ Using PySpark < 4 — enabling compatibility bypass"
    export PYSPARK_PANDAS_COMPATIBILITY_CHECK=false
fi

# Verify pandas
"$PYSPARK_PYTHON" -c "import pandas; print('✅ pandas version:', pandas.__version__)"

# JAR Lookup
JAR_LOCATIONS=(
    "${BACKEND_DIR}/jars"
    "${PROJECT_ROOT}/backend/jars"
    "${PROJECT_ROOT}/jars"
    "/Users/kesavapraadeep/Desktop/gui-tdc-final/backend/jars"
    "/Users/kesavapraadeep/Desktop/gui-tdc-final/jars"
)

JAR_DIR=""
for jar_path in "${JAR_LOCATIONS[@]}"; do
    if [ -d "$jar_path" ] && [ -f "${jar_path}/terajdbc4.jar" ] && [ -f "${jar_path}/db2jcc4.jar" ]; then
        JAR_DIR="$jar_path"
        echo "✅ Found JDBC JARs at: $JAR_DIR"
        break
    fi
done

[ -z "$JAR_DIR" ] && { echo "❌ Missing JDBC JARs"; exit 1; }

# Validation Script Path
SCRIPT_PATH="${SCRIPT_DIR}/validate_main.py"
[ ! -f "$SCRIPT_PATH" ] && { echo "❌ Validation script not found: $SCRIPT_PATH"; exit 1; }

# Logging Setup
TS=$(date +%Y_%m_%d_%H.%M.%S)
LOG_DIR=${CURR_DIR}/logs
LOG_FILE=${LOG_DIR}/validation_main_${TS}.log
mkdir -p -m 755 "$LOG_DIR"
ln -sf "$LOG_FILE" "${LOG_DIR}/latest.log"

# Run Validation
{
    echo "Running validation @ $TS"
    if command -v spark-submit &> /dev/null; then
        spark-submit \
            --conf "spark.pyspark.python=$PYSPARK_PYTHON" \
            --conf "spark.pyspark.driver.python=$PYSPARK_DRIVER_PYTHON" \
            --conf "spark.driver.extraJavaOptions=-Dfile.encoding=UTF-8 -Djava.awt.headless=true" \
            --conf "spark.executor.extraJavaOptions=-Dfile.encoding=UTF-8 -Djava.awt.headless=true" \
            --conf "spark.sql.adaptive.enabled=false" \
            --conf "spark.serializer=org.apache.spark.serializer.KryoSerializer" \
            --conf "spark.sql.execution.arrow.pyspark.enabled=true" \
            --driver-memory 2g \
            --executor-memory 1g \
            --jars "${JAR_DIR}/terajdbc4.jar,${JAR_DIR}/db2jcc4.jar" \
            "${SCRIPT_PATH}" "${CURR_DIR}"
    else
        export SPARK_CLASSPATH="${JAR_DIR}/terajdbc4.jar:${JAR_DIR}/db2jcc4.jar"
        export SPARK_LOCAL_DIRS="/tmp/spark"
        mkdir -p /tmp/spark
        "$PYSPARK_PYTHON" "${SCRIPT_PATH}" "${CURR_DIR}"
    fi
} 2>&1 | tee -a "$LOG_FILE"

# Post-validation Archival
VALIDATION_EXIT_CODE=${PIPESTATUS[0]}
[ $VALIDATION_EXIT_CODE -ne 0 ] && {
    echo "❌ Validation failed with code $VALIDATION_EXIT_CODE"
    exit 1
}

[ -f "${CURR_DIR}/schema.py" ] && cp "${CURR_DIR}/schema.py" "${LOG_DIR}/schema.py_${TS}"
[ -f "${CURR_DIR}/schema.json" ] && cp "${CURR_DIR}/schema.json" "${LOG_DIR}/schema.json_${TS}"

# Compress Logs
FILES_TO_COMPRESS=()
[ -f "${LOG_DIR}/schema.py_${TS}" ] && FILES_TO_COMPRESS+=("${LOG_DIR}/schema.py_${TS}")
[ -f "${LOG_DIR}/schema.json_${TS}" ] && FILES_TO_COMPRESS+=("${LOG_DIR}/schema.json_${TS}")
[ -f "${LOG_FILE}" ] && FILES_TO_COMPRESS+=("${LOG_FILE}")
[ ${#FILES_TO_COMPRESS[@]} -gt 0 ] && gzip "${FILES_TO_COMPRESS[@]}"

# Done
deactivate
echo "✅ Done. Logs saved at: $LOG_DIR"
