# Reporte de resultados - Modelo Predictor Saber Pro

- **Version del modelo**: `real-data-v1`
- **Fuente**: dataset_saber_pro_real (PostgreSQL)
- **Filas en dataset**: 736
- **Filas usadas**: 627
- **Mejor modelo**: **GradientBoostingClassifier**

## Derivacion del target

Target derivado de la columna `promedio_acumulado`:

| Clase | Rango |
|-------|-------|
| Bajo  | < 3.0 |
| Medio | 3.0 <= x < 4.0 |
| Alto  | >= 4.0 |

Excluidos: NULL o = 0

## Metricas del mejor modelo (test set)

| Metrica | Valor |
|---------|-------|
| Accuracy | 0.8492 |
| Precision (weighted) | 0.8573 |
| Recall (weighted) | 0.8492 |
| F1 (weighted) | 0.8468 |
| ROC AUC (OvR weighted) | 0.9565 |

## Classification report

| Clase | Precision | Recall | F1 | Support |
|-------|-----------|--------|----|---------|
| Bajo | 1.0000 | 0.6429 | 0.7826 | 14 |
| Medio | 0.8571 | 0.8136 | 0.8348 | 59 |
| Alto | 0.8197 | 0.9434 | 0.8772 | 53 |

## Matriz de confusion (test set)

| | Pred: Bajo | Pred: Medio | Pred: Alto |
|---|---|---|---|
| **Real: Bajo** | 9 | 5 | 0 |
| **Real: Medio** | 0 | 48 | 11 |
| **Real: Alto** | 0 | 3 | 50 |

## Comparacion de modelos

| Modelo | Accuracy | Precision | Recall | F1 | ROC AUC |
|--------|----------|-----------|--------|----|---------|
| LogisticRegression | 0.7937 | 0.8117 | 0.7937 | 0.7887 | 0.9421 |
| GradientBoostingClassifier | 0.8492 | 0.8573 | 0.8492 | 0.8468 | 0.9565 |

## Graficos generados

- `comparacion_metricas.png`
- `matriz_confusion_gradientboostingclassifier.png`
- `feature_importance.png`
- `distribucion_clases.png`
- `roc_curves.png`

## Nota importante

El target se deriva del `promedio_acumulado` del estudiante porque el dataset no contiene el puntaje real de Saber Pro. El modelo aprende a predecir el rendimiento academico agregado, no el desempeno en la prueba estandarizada. Para una prediccion real de Saber Pro se necesitaria un dataset con la variable objetivo real.