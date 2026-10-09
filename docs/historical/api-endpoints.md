# Documentacion de Endpoints API - Sistema Predictor Saber Pro

Documentacion completa de la API REST para el sistema de prediccion de resultados Saber Pro.

---

## Informacion General

| Item | Valor |
|------|-------|
| Base URL | http://localhost:8000 |
| Version API | 1.0.0 |
| Documentacion Interactiva | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

---

## Tabla de Contenidos

1. [POST /api/predict](#post-apipredict)
2. [GET /api/health](#get-apihealth)
3. [GET /api/history/{documento}](#get-apihistorydocumento)
4. [GET /api/statistics](#get-apistatistics)
5. [Codigos de Error](#codigos-de-error)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## POST /api/predict

Realiza una prediccion de desempeno en el examen Saber Pro para un estudiante.

### Descripcion

Este endpoint recibe los datos academicos y demograficos de un estudiante y retorna una prediccion categorizada (Bajo, Medio, Alto) junto con la probabilidad de confianza y recomendaciones personalizadas.

### URL
```
POST http://localhost:8000/api/predict
```

### Headers
```
Content-Type: application/json
```

### Parametros de Query (Opcional)

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| documento | string | No | Numero de documento del estudiante (para guardar en historial) |

### Request Body

```json
{
  "promedio_acumulado": 4.2,
  "promedio_basicas": 4.0,
  "promedio_ingenieria": 4.3,
  "num_reprobadas": 2,
  "pct_creditos": 75.5,
  "semestre": 6,
  "estrato": 3,
  "genero": "M"
}
```

### Campos del Request

| Campo | Tipo | Rango | Descripcion |
|-------|------|-------|-------------|
| promedio_acumulado | float | 0.0 - 5.0 | Promedio academico acumulado |
| promedio_basicas | float | 0.0 - 5.0 | Promedio en materias basicas |
| promedio_ingenieria | float | 0.0 - 5.0 | Promedio en materias de ingenieria |
| num_reprobadas | integer | 0 - 20 | Numero de materias reprobadas |
| pct_creditos | float | 0.0 - 100.0 | Porcentaje de creditos aprobados |
| semestre | integer | 1 - 10 | Semestre actual |
| estrato | integer | 1 - 6 | Estrato socioeconomico |
| genero | string | M o F | Genero del estudiante |

### Response (200 OK)

```json
{
  "resultado": "Alto",
  "probabilidad": 0.87,
  "confidence_pct": 87.0,
  "recomendacion": "Excelente! Tu prediccion indica un alto rendimiento esperado...",
  "timestamp": "2026-05-26T10:30:00.123456",
  "model_version": "1.0.0"
}
```

### Campos del Response

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| resultado | string | Categoria predicha: "Bajo", "Medio" o "Alto" |
| probabilidad | float | Confianza de la prediccion (0-1) |
| confidence_pct | float | Porcentaje de confianza (0-100) |
| recomendacion | string | Recomendacion personalizada |
| timestamp | datetime | Fecha y hora de la prediccion |
| model_version | string | Version del modelo ML usado |

### Response de Error (422 - Validation Error)

```json
{
  "detail": [
    {
      "loc": ["body", "promedio_acumulado"],
      "msg": "ensure this value is less than or equal to 5",
      "type": "value_error.number.not_le"
    }
  ]
}
```

### Ejemplo curl

```bash
curl -X POST http://localhost:8000/api/predict ^
  -H "Content-Type: application/json" ^
  -d "{\"promedio_acumulado\": 4.2, \"promedio_basicas\": 4.0, \"promedio_ingenieria\": 4.3, \"num_reprobadas\": 2, \"pct_creditos\": 75.5, \"semestre\": 6, \"estrato\": 3, \"genero\": \"M\"}"
```

---

## GET /api/health

Verifica el estado del sistema y sus componentes.

### Descripcion

Este endpoint permite verificar si el sistema esta funcionando correctamente, incluyendo la carga del modelo ML y la conexion a la base de datos.

### URL
```
GET http://localhost:8000/api/health
```

### Response (200 OK)

```json
{
  "status": "healthy",
  "model_loaded": true,
  "database_connected": true,
  "model_version": "1.0.0",
  "timestamp": "2026-05-26T10:30:00.123456"
}
```

### Campos del Response

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| status | string | Estado general: "healthy" o "degraded" |
| model_loaded | boolean | Si el modelo ML esta cargado |
| database_connected | boolean | Si la BD esta conectada |
| model_version | string | Version del modelo |
| timestamp | datetime | Fecha y hora de la verificacion |

### Estados Posibles

| Status | Significado |
|--------|-------------|
| healthy | Todo funcionando correctamente |
| degraded | Funcionando pero con limitaciones (ej: sin modelo ML) |

### Ejemplo curl

```bash
curl http://localhost:8000/api/health
```

---

## GET /api/history/{documento}

Obtiene el historial de predicciones de un estudiante especifico.

### Descripcion

Este endpoint retorna todas las predicciones realizadas para un numero de documento especifico, incluyendo estadisticas del historial.

### URL
```
GET http://localhost:8000/api/history/{documento}
```

### Parametros de Path

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| documento | string | Si | Numero de documento del estudiante |

### Parametros de Query

| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| limit | integer | 10 | Maximo de registros a retornar (1-100) |

### Response (200 OK)

```json
{
  "documento": "12345678",
  "predictions": [
    {
      "id": 5,
      "documento": "12345678",
      "resultado": "Alto",
      "probabilidad": 0.87,
      "confidence_pct": 87.0,
      "promedio_acumulado": 4.2,
      "promedio_basicas": 4.0,
      "promedio_ingenieria": 4.3,
      "num_reprobadas": 2,
      "pct_creditos": 75.5,
      "semestre": 6,
      "estrato": 3,
      "genero": "M",
      "recomendacion": "Excelente! Tu prediccion indica...",
      "timestamp": "2026-05-26T10:30:00"
    }
  ],
  "total_predictions": 5,
  "average_confidence": 85.4,
  "average_probability": 0.854
}
```

### Campos del Response

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| documento | string | Numero de documento |
| predictions | array | Lista de predicciones historicas |
| total_predictions | integer | Total de predicciones encontradas |
| average_confidence | float | Promedio de confianza |
| average_probability | float | Promedio de probabilidad |

### Ejemplo curl

```bash
curl "http://localhost:8000/api/history/12345678?limit=10"
```

---

## GET /api/statistics

Obtiene estadisticas generales del sistema de predicciones.

### Descripcion

Este endpoint retorna estadisticas agregadas del sistema, incluyendo distribucion por categoria y promedios generales.

### URL
```
GET http://localhost:8000/api/statistics
```

### Response (200 OK)

```json
{
  "total_predictions": 1500,
  "average_confidence": 82.5,
  "average_probability": 0.825,
  "category_distribution": {
    "Bajo": {
      "total": 300,
      "avg_confidence": 78.2,
      "avg_probability": 0.782
    },
    "Medio": {
      "total": 700,
      "avg_confidence": 85.1,
      "avg_probability": 0.851
    },
    "Alto": {
      "total": 500,
      "avg_confidence": 88.3,
      "avg_probability": 0.883
    }
  },
  "timestamp": "2026-05-26T10:30:00.123456"
}
```

### Campos del Response

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| total_predictions | integer | Total de predicciones en el sistema |
| average_confidence | float | Promedio de confianza general |
| average_probability | float | Promedio de probabilidad general |
| category_distribution | object | Distribucion por categoria |
| timestamp | datetime | Fecha y hora de la consulta |

### Ejemplo curl

```bash
curl http://localhost:8000/api/statistics
```

---

## Codigos de Error

### 400 - Bad Request

Solicitud malformada.

```json
{
  "detail": "Datos de entrada invalidos"
}
```

### 404 - Not Found

Recurso no encontrado.

```json
{
  "detail": "Documento no encontrado"
}
```

### 422 - Validation Error

Datos no cumplen la validacion Pydantic.

```json
{
  "detail": [
    {
      "loc": ["body", "semestre"],
      "msg": "ensure this value is greater than or equal to 1",
      "type": "value_error.number.not_ge"
    }
  ]
}
```

### 500 - Internal Server Error

Error interno del servidor.

```json
{
  "detail": "Error interno del servidor",
  "error": "Error procesando prediccion",
  "timestamp": "2026-05-26T10:30:00"
}
```

---

## Ejemplos de Uso

### Python - requests

```python
import requests

url = "http://localhost:8000/api/predict"
payload = {
    "promedio_acumulado": 4.2,
    "promedio_basicas": 4.0,
    "promedio_ingenieria": 4.3,
    "num_reprobadas": 2,
    "pct_creditos": 75.5,
    "semestre": 6,
    "estrato": 3,
    "genero": "M"
}

response = requests.post(url, json=payload)
print(response.json())
```

### JavaScript - fetch

```javascript
const payload = {
    promedio_acumulado: 4.2,
    promedio_basicas: 4.0,
    promedio_ingenieria: 4.3,
    num_reprobadas: 2,
    pct_creditos: 75.5,
    semestre: 6,
    estrato: 3,
    genero: "M"
};

fetch('http://localhost:8000/api/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL (Windows PowerShell)

```bash
curl -X POST http://localhost:8000/api/predict `
  -H "Content-Type: application/json" `
  -d '{"promedio_acumulado": 4.2, "promedio_basicas": 4.0, "promedio_ingenieria": 4.3, "num_reprobadas": 2, "pct_creditos": 75.5, "semestre": 6, "estrato": 3, "genero": "M"}'
```

### cURL (Linux/macOS)

```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{"promedio_acumulado": 4.2, "promedio_basicas": 4.0, "promedio_ingenieria": 4.3, "num_reprobadas": 2, "pct_creditos": 75.5, "semestre": 6, "estrato": 3, "genero": "M"}'
```

---

## Coleccion Postman

Para importar en Postman:

```json
{
  "info": {
    "name": "Predictor Saber Pro API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:8000/api/health"
      }
    },
    {
      "name": "Realizar Prediccion",
      "request": {
        "method": "POST",
        "url": "http://localhost:8000/api/predict",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\"promedio_acumulado\": 4.2, \"promedio_basicas\": 4.0, \"promedio_ingenieria\": 4.3, \"num_reprobadas\": 2, \"pct_creditos\": 75.5, \"semestre\": 6, \"estrato\": 3, \"genero\": \"M\"}"
        }
      }
    },
    {
      "name": "Historial de Predicciones",
      "request": {
        "method": "GET",
        "url": "http://localhost:8000/api/history/12345678?limit=10"
      }
    },
    {
      "name": "Estadisticas del Sistema",
      "request": {
        "method": "GET",
        "url": "http://localhost:8000/api/statistics"
      }
    }
  ]
}
```

---

## Rate Limiting (Futuro)

```
Limite: 100 peticiones por minuto
Header: X-RateLimit-Remaining: 99
```

---

## Autenticacion (Futuro)

```
Authorization: Bearer <token>
```

---

**Documentacion de Endpoints completada.**