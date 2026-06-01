#!/usr/bin/env python
"""
Script de entrenamiento para el modelo predictor Saber Pro.
Sistema predictor para estudiantes universitarios UNAC.

Modelo: Regresion Logistica Multiple
Dataset: saber_pro_data.csv con features de historial academico

Features:
- promedio_acumulado (0-5)
- promedio_basicas (0-5)
- promedio_ingenieria (0-5)
- num_reprobadas (0-10)
- pct_creditos (0-100)
- semestre (1-10)
- estrato (1-6)
- genero (M/F)

Target: resultado (Bajo/Medio/Alto)

Funcionalidades:
1. Cargar datos desde CSV
2. Preprocesamiento: one-hot encoding para genero, scaling para features numericas
3. Entrenamiento de DOS modelos: LogisticRegression y GradientBoostingClassifier
4. Split train/test 80/20 con stratify
5. Evaluacion completa: accuracy, precision, recall, f1, classification_report, confusion_matrix, ROC AUC
6. Seleccion del mejor modelo por accuracy
7. Guardar modelo (.pkl) y metricas (.json)
8. Pipeline de sklearn con ColumnTransformer
"""

import warnings
import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, OneHotEncoder, label_binarize
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    roc_auc_score
)

# Configuracion
RANDOM_STATE = 42
TEST_SIZE = 0.2

# Suprimir warnings
warnings.filterwarnings('ignore')


def load_data(filepath: Path) -> pd.DataFrame:
    """
    Carga los datos desde un archivo CSV.

    Args:
        filepath: Ruta al archivo CSV

    Returns:
        DataFrame con los datos cargados
    """
    print("=" * 60)
    print("CARGANDO DATOS")
    print("=" * 60)
    print(f"Ruta: {filepath}")

    df = pd.read_csv(filepath)
    print(f"Muestras cargadas: {len(df)}")
    print(f"Columnas: {df.columns.tolist()}")
    print(f"\nPrimeras 5 filas:")
    print(df.head())

    return df


def preprocess_data(df: pd.DataFrame) -> tuple:
    """
    Preprocesa los datos para el entrenamiento.

    Args:
        df: DataFrame con los datos crudos

    Returns:
        Tupla con (X, y, preprocessor, target_mapping)
    """
    print("\n" + "=" * 60)
    print("PREPROCESAMIENTO DE DATOS")
    print("=" * 60)

    # Separar features y target
    target_col = 'resultado'
    # Solo usar las 8 features necesarias para el modelo
    model_features = [
        'promedio_acumulado', 'promedio_basicas', 'promedio_ingenieria',
        'num_reprobadas', 'pct_creditos', 'semestre', 'estrato', 'genero'
    ]
    X = df[model_features]
    y = df[target_col]

    # Mapear target: Bajo=0, Medio=1, Alto=2
    target_mapping = {'Bajo': 0, 'Medio': 1, 'Alto': 2}
    y_encoded = y.map(target_mapping)

    print(f"Target mapping: {target_mapping}")
    print(f"\nDistribucion de clases:")
    print(y.value_counts())

    # Definir columnas numericas y categoricas
    numeric_features = [
        'promedio_acumulado', 'promedio_basicas', 'promedio_ingenieria',
        'num_reprobadas', 'pct_creditos', 'semestre', 'estrato'
    ]
    categorical_features = ['genero']

    print(f"\nFeatures numericas: {numeric_features}")
    print(f"Features categoricas: {categorical_features}")

    # Crear ColumnTransformer para preprocesamiento
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), numeric_features),
            ('cat', OneHotEncoder(drop='first', sparse_output=False), categorical_features)
        ],
        remainder='drop'
    )

    print("\nPreprocesador creado con ColumnTransformer:")
    print("  - StandardScaler para features numericas")
    print("  - OneHotEncoder para features categoricas")

    return X, y_encoded, preprocessor, target_mapping


def split_data(X: pd.DataFrame, y: pd.Series, test_size: float = TEST_SIZE) -> tuple:
    """
    Divide los datos en conjuntos de entrenamiento y prueba.

    Args:
        X: Features
        y: Target
        test_size: Proporcion para test

    Returns:
        Tupla con (X_train, X_test, y_train, y_test)
    """
    print("\n" + "=" * 60)
    print("DIVISION DE DATOS")
    print("=" * 60)
    print(f"Train/Test split: {(1-test_size)*100:.0f}/{test_size*100:.0f}")
    print(f"Stratify: True")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        random_state=RANDOM_STATE,
        stratify=y
    )

    print(f"Muestras entrenamiento: {len(X_train)}")
    print(f"Muestras prueba: {len(X_test)}")

    return X_train, X_test, y_train, y_test


def train_models(X_train: pd.DataFrame, y_train: pd.Series, preprocessor) -> dict:
    """
    Entrena dos modelos para comparacion.

    Args:
        X_train: Features de entrenamiento
        y_train: Target de entrenamiento
        preprocessor: Preprocesador ColumnTransformer

    Returns:
        Diccionario con los pipelines entrenados
    """
    print("\n" + "=" * 60)
    print("ENTRENAMIENTO DE MODELOS")
    print("=" * 60)

    models = {}

    # Modelo 1: LogisticRegression
    print("\n[1] LogisticRegression")
    print("    - max_iter: 2000")
    print("    - class_weight: balanced")
    print("    - random_state: 42")

    lr_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', LogisticRegression(
            max_iter=2000,
            class_weight='balanced',
            random_state=RANDOM_STATE
        ))
    ])

    lr_pipeline.fit(X_train, y_train)
    models['LogisticRegression'] = lr_pipeline
    print("    Entrenamiento completado!")

    # Modelo 2: GradientBoostingClassifier
    print("\n[2] GradientBoostingClassifier")
    print("    - n_estimators: 100")
    print("    - learning_rate: 0.1")
    print("    - max_depth: 4")
    print("    - random_state: 42")

    gb_pipeline = Pipeline([
        ('preprocessor', preprocessor),
        ('classifier', GradientBoostingClassifier(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=4,
            random_state=RANDOM_STATE
        ))
    ])

    gb_pipeline.fit(X_train, y_train)
    models['GradientBoostingClassifier'] = gb_pipeline
    print("    Entrenamiento completado!")

    return models


def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series, model_name: str) -> dict:
    """
    Evalua un modelo con metricas completas.

    Args:
        model: Pipeline del modelo
        X_test: Features de prueba
        y_test: Target de prueba
        model_name: Nombre del modelo

    Returns:
        Diccionario con las metricas
    """
    print("\n" + "-" * 40)
    print(f"EVALUACION: {model_name}")
    print("-" * 40)

    # Predicciones
    y_pred = model.predict(X_test)

    # Metricas basicas
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')

    print(f"\nAccuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")

    # Classification Report
    class_names = ['Bajo', 'Medio', 'Alto']
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=class_names))

    # Confusion Matrix
    print("Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"         Predicho")
    print(f"         Bajo  Medio  Alto")
    print(f"Real Bajo   {cm[0][0]:3d}   {cm[0][1]:3d}   {cm[0][2]:3d}")
    print(f"Real Medio  {cm[1][0]:3d}   {cm[1][1]:3d}   {cm[1][2]:3d}")
    print(f"Real Alto   {cm[2][0]:3d}   {cm[2][1]:3d}   {cm[2][2]:3d}")

    # ROC AUC (OneVsRest)
    y_pred_proba = model.predict_proba(X_test)
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])

    # Calcular AUC para cada clase
    roc_auc_classes = []
    for i in range(3):
        if len(np.unique(y_test_bin[:, i])) > 1:
            auc = roc_auc_score(y_test_bin[:, i], y_pred_proba[:, i])
        else:
            auc = float('nan')
        roc_auc_classes.append(auc)

    # ROC AUC promedio (One-vs-Rest)
    roc_auc_ovr = roc_auc_score(y_test_bin, y_pred_proba, multi_class='ovr', average='weighted')

    print(f"\nROC AUC (OneVsRest):")
    print(f"  - Bajo:  {roc_auc_classes[0]:.4f}")
    print(f"  - Medio: {roc_auc_classes[1]:.4f}")
    print(f"  - Alto:  {roc_auc_classes[2]:.4f}")
    print(f"  - Promedio: {roc_auc_ovr:.4f}")

    metrics = {
        'accuracy': float(accuracy),
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'confusion_matrix': cm.tolist(),
        'classification_report': classification_report(
            y_test, y_pred, target_names=class_names, output_dict=True
        ),
        'roc_auc_per_class': {
            'Bajo': float(roc_auc_classes[0]),
            'Medio': float(roc_auc_classes[1]),
            'Alto': float(roc_auc_classes[2])
        },
        'roc_auc_ovr_weighted': float(roc_auc_ovr)
    }

    return metrics


def select_best_model(results: dict) -> str:
    """
    Selecciona el mejor modelo basandose en accuracy.

    Args:
        results: Diccionario con resultados de cada modelo

    Returns:
        Nombre del mejor modelo
    """
    print("\n" + "=" * 60)
    print("SELECCION DEL MEJOR MODELO")
    print("=" * 60)

    print("\nComparacion de Accuracy:")
    for name, metrics in results.items():
        print(f"  {name}: {metrics['accuracy']:.4f}")

    # Seleccionar por mayor accuracy
    best_model_name = max(results, key=lambda x: results[x]['accuracy'])

    print(f"\n*** Modelo seleccionado: {best_model_name} ***")
    print(f"    Accuracy: {results[best_model_name]['accuracy']:.4f}")

    return best_model_name


def save_model(model, filepath: Path) -> None:
    """
    Guarda el modelo entrenado.

    Args:
        model: Pipeline del modelo
        filepath: Ruta de guardado
    """
    print("\n" + "=" * 60)
    print("GUARDANDO MODELO")
    print("=" * 60)

    # Crear directorio si no existe
    filepath.parent.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, filepath)
    print(f"Modelo guardado en: {filepath}")
    print(f"Tamano: {filepath.stat().st_size / 1024:.2f} KB")


def save_metrics(results: dict, best_model: str, filepath: Path) -> None:
    """
    Guarda las metricas en un archivo JSON.

    Args:
        results: Diccionario con resultados de cada modelo
        best_model: Nombre del mejor modelo
        filepath: Ruta de guardado
    """
    print("\n" + "=" * 60)
    print("GUARDANDO METRICAS")
    print("=" * 60)

    # Crear directorio si no existe
    filepath.parent.mkdir(parents=True, exist_ok=True)

    output = {
        'best_model': best_model,
        'all_models': results,
        'best_model_metrics': results[best_model]
    }

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Metricas guardadas en: {filepath}")


def main():
    """
    Funcion principal de entrenamiento.
    """
    # Rutas
    BASE_DIR = Path(__file__).parent
    DATA_PATH = BASE_DIR / 'datasets' / 'saber_pro_data.csv'
    MODEL_OUTPUT_PATH = BASE_DIR / 'trained_models' / 'saberpro_model.pkl'
    METRICS_OUTPUT_PATH = BASE_DIR / 'models' / 'desercion_metrics.json'

    print("\n" + "=" * 60)
    print("SISTEMA PREDICTOR SABER PRO - ENTRENAMIENTO")
    print("=" * 60)
    print(f"Fecha: 2026-05-26")
    print(f"Random State: {RANDOM_STATE}")

    # 1. Cargar datos
    df = load_data(DATA_PATH)

    # 2. Preprocesamiento
    X, y, preprocessor, target_mapping = preprocess_data(df)

    # 3. Split train/test
    X_train, X_test, y_train, y_test = split_data(X, y)

    # 4. Entrenar modelos
    models = train_models(X_train, y_train, preprocessor)

    # 5. Evaluar modelos
    print("\n" + "=" * 60)
    print("EVALUACION DE MODELOS")
    print("=" * 60)

    results = {}
    for name, model in models.items():
        results[name] = evaluate_model(model, X_test, y_test, name)

    # 6. Seleccionar mejor modelo
    best_model_name = select_best_model(results)
    best_model = models[best_model_name]

    # 7. Guardar modelo y metricas
    save_model(best_model, MODEL_OUTPUT_PATH)
    save_metrics(results, best_model_name, METRICS_OUTPUT_PATH)

    # Resumen final
    print("\n" + "=" * 60)
    print("ENTRENAMIENTO COMPLETADO")
    print("=" * 60)
    print(f"Modelo guardado: {MODEL_OUTPUT_PATH}")
    print(f"Metricas guardadas: {METRICS_OUTPUT_PATH}")
    print(f"Mejor modelo: {best_model_name}")
    print(f"Accuracy final: {results[best_model_name]['accuracy']:.4f}")

    return best_model, results[best_model_name]


if __name__ == '__main__':
    main()
