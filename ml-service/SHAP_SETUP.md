# SHAP setup (opcional, para explicabilidad por prediccion)

La sesion 2026-10-09 agrego `shap==0.46.0` a `requirements.txt` y un endpoint
nuevo en FastAPI que devuelve `feature_contributions` por prediccion.

**Sin SHAP, todo sigue funcionando**: el endpoint responde con
`feature_contributions: []` y la UI simplemente no muestra esa seccion.

## Instalacion

Si ya tienes el venv en `ml-service/.venv/`:

```bash
cd ml-service
python -m venv .venv  # solo si no existe
.venv/Scripts/python.exe -m pip install -r requirements.txt
```

Esto instala shap 0.46.0 y todas las demas deps.

## Persistir background sample

Una vez, despues de reentrenar el modelo:

```bash
cd ml-training
.venv/Scripts/python.exe train_from_real.py
```

Esto ahora persiste `ml-training/data/background_sample.pkl` (50 filas del
train set) que SHAP usa para interventional perturbations.

## Reiniciar FastAPI

```bash
cd ml-service
.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Al arrancar deberias ver en logs:

```
SHAP TreeExplainer inicializado (19 features post-transform).
```

## Verificar

1. Abrir panel admin → Analisis del modelo → llenar formulario → "Predecir".
2. Debajo de las barras de probabilidad aparecen ~19 filas con barras SHAP
   centradas en 0. Rojo = aumenta la probabilidad de la clase predicha,
   verde = la disminuye.
3. Detener FastAPI y volver a predecir: la UI sigue funcionando pero la
   seccion SHAP no aparece (es lo esperado sin FastAPI).

