# Tests automatizados

51 tests, ~2 segundos de ejecucion. **No requieren** PostgreSQL, el `.pkl`,
ni que FastAPI este corriendo. Son unit tests puros sobre la logica critica.

## Como correrlos

```bash
# Backend (Vitest)
cd backend
npm test             # 19 tests, ~0.8s
npm run test:watch   # modo watch para desarrollo

# ML Service (pytest)
python -m pytest ml-service/tests/ -v   # 32 tests, ~1.3s
```

Los dos suites son idempotentes: pueden correr en cualquier orden y
multiples veces seguidas. CI los corre en paralelo (ver GitHub Actions).

## Backend (Vitest) — 19 tests

| Archivo | Cubre |
|---|---|
| `backend/tests/auth.test.js` | hashPassword, verifyPassword, signToken, verifyToken. Casos: contrasena correcta/incorrecta, hash null, token invalido/vacio |
| `backend/tests/users.test.js` | sanitizeUserRow: nunca expone `password_hash`, defaults de `isActive`/`isSynthetic`, manejo de null |
| `backend/tests/predictor.test.js` | heuristicPredict: clases Bajo/Medio/Alto deterministas, snapshot intacto, forma de factores/areas/recomendaciones, fallback a heuristica cuando FastAPI no responde (fetch stub) |

### Por que estos tests importan

- **`sanitizeUserRow` excluye `password_hash`**: barrera critica de seguridad.
  Si alguien renombra una propiedad por error, este test falla inmediatamente.
- **`heuristicPredict` Bajo/Medio/Alto**: scoring deterministico que el
  frontend muestra a usuarios. Si alguien edita la formula sin querer,
  los tests detectan la regresion.
- **Fallback a heuristica**: cuando FastAPI no responde, el sistema no debe
  quedarse colgado; el fallback heuristico debe activarse transparentemente.

## ML Service (pytest) — 32 tests

| Archivo | Cubre |
|---|---|
| `ml-service/tests/test_student_model.py` | StudentInput: acepta 13 features validas, rechaza fuera de rango, defaults de PredictionResponse, FeatureContribution serialization |
| `ml-service/tests/test_prediction_service.py` | `_prepare_features` (DataFrame 13 columnas, nombres correctos), `_generate_recommendation` (texto por clase, fallback default), `_SHAP_AVAILABLE`, `health_check` |

### Por que estos tests importan

- **Validacion de input en Pydantic**: si alguien relaja `ge=0, le=5` en una
  feature, el modelo recibe datos invalidos silenciosamente. Estos tests
  detectan ese tipo de regresion.
- **Contrato de `_prepare_features`**: el `.pkl` espera nombres exactos de
  columna. Si alguien renombra una feature sin reentrenar, esto rompe la
  prediccion. El test verifica el contrato antes de que el modelo se entere.
- **`feature_contributions: []` por defecto**: si SHAP falla, la UI debe
  mostrar la prediccion sin la seccion SHAP, no crashear. El default de
  lista vacia lo garantiza.

## Out of scope (intencionalmente)

- **Tests de integracion HTTP**: requeririan mockear `db.js`, `users.js`,
  `pool` entero. Muy fragiles, alto costo de mantenimiento. La UI cubre
  el path completo via supertest en el frontend.
- **Tests de carga**: irrelevantes para una tesis academica.
- **Tests del frontend (Vitest + Testing Library)**: el ROI es bajo porque
  los componentes son delgados y la logica vive en el backend. Quedan
  como mejora futura documentada en el README.

## Como agregar un test

### Backend (Vitest)

```js
// backend/tests/mi-feature.test.js
import { describe, it, expect } from 'vitest'
import { miFunction } from '../src/mi-feature.js'

describe('mi-feature', () => {
  it('caso feliz', () => {
    expect(miFunction()).toBe(/* ... */)
  })
})
```

### ML Service (pytest)

```python
# ml-service/tests/test_mi_feature.py
from app.mi_feature import mi_function

def test_caso_feliz():
    assert mi_function() == ...
```

El test se descubre automaticamente por los archivos `*.test.js` / `test_*.py`.

## CI (GitHub Actions)

Los mismos tests corren automaticamente en GitHub Actions al hacer push a
`main` o abrir un PR. Ver `.github/workflows/tests.yml`.

- **3 jobs paralelos**: `backend-tests`, `ml-service-tests`, `frontend-lint`.
- **Cache de npm/pip** para que la corrida tarde ~1 min despues del primer run.
- **Sin secrets**: los tests son puros, no requieren BD ni servicios externos.

El badge en el README principal refleja el estado actual de la rama `main`.