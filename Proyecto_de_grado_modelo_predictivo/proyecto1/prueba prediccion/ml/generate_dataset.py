"""
Generador de datos sintéticos para el sistema predictor Saber Pro.
Genera estudiantes con historial académico y resultado Saber Pro.

Usage:
    python generate_dataset.py
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random

np.random.seed(42)
random.seed(42)

NOMBRES_M = ['Juan', 'Carlos', 'Miguel', 'Andres', 'David', 'Sebastian', 'Daniel', 'Alejandro',
             'Felipe', 'Santiago', 'Nicolas', 'Mauricio', 'Diego', 'Jose', 'Gabriel', 'Luis',
             'Emilio', 'Esteban', 'Javier', 'Ricardo', 'Fernando', 'Antonio', 'Pedro', 'Jorge']

NOMBRES_F = ['Maria', 'Carolina', 'Laura', 'Ana', 'Carmen', 'Claudia', 'Patricia', 'Sandra',
             'Margarita', 'Diana', 'Paula', 'Andrea', 'Fernanda', 'Julianna', 'Valentina',
             'Camila', 'Gabriela', 'Sofia', 'Isabella', 'Manuela', 'Luciana', 'Mariana', 'Elena']

APELLIDOS = ['Gonzalez', 'Rodriguez', 'Martinez', 'Lopez', 'Hernandez', 'Garcia', 'Perez', 'Sanchez',
             'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Reyes', 'Morales', 'Cruz',
             'Ortiz', 'Gutierrez', 'Chavez', 'Jimenez', 'Ruiz', 'Mendoza', 'Vargas', 'Castro']

def generar_estudiante(num: int) -> dict:
    genero = random.choice(['M', 'F'])
    nombres = random.choice(NOMBRES_M if genero == 'M' else NOMBRES_F)
    apellidos = random.choice(APELLIDOS)
    semestre_actual = max(3, min(9, int(np.random.normal(6, 1.5))))
    estrato_probs = [0.15, 0.25, 0.30, 0.15, 0.10, 0.05]
    estrato = np.random.choice([1, 2, 3, 4, 5, 6], p=estrato_probs)
    edad = int(np.random.normal(21 + (semestre_actual - 1) * 0.5, 1.5))
    fecha_nac = datetime.now() - timedelta(days=365 * max(18, min(30, edad)))
    anios_cursados = (max(1, semestre_actual - 1) + 1) // 2
    fecha_ingreso = datetime.now() - timedelta(days=365 * anios_cursados)

    return {
        'estudiante_id': num,
        'documento': f'{random.randint(10000000, 99999999)}',
        'nombres': f'{nombres} {random.choice(NOMBRES_M if genero == "F" else NOMBRES_F)}',
        'apellidos': apellidos,
        'genero': genero,
        'fecha_nacimiento': fecha_nac.strftime('%Y-%m-%d'),
        'estrato': estrato,
        'programa': 'Ingenieria de Sistemas' if random.random() < 0.7 else 'Ingenieria Industrial',
        'semestre_actual': semestre_actual,
        'fecha_ingreso': fecha_ingreso.strftime('%Y-%m-%d')
    }

def generar_notas_y_features(estudiante: dict, target_resultado: str) -> dict:
    """Genera notas que produzcan el resultado deseado."""
    semestre = estudiante['semestre_actual']

    if target_resultado == 'Alto':
        # Promedios altos, pocas reprobadas
        promedio_acumulado = np.random.uniform(3.8, 4.8)
        promedio_basicas = np.random.uniform(3.5, 4.5)
        promedio_ingenieria = np.random.uniform(3.9, 4.9)
        num_reprobadas = random.randint(0, 2)
    elif target_resultado == 'Medio':
        # Promedios medios, algunas reprobadas
        promedio_acumulado = np.random.uniform(3.0, 3.9)
        promedio_basicas = np.random.uniform(2.7, 3.6)
        promedio_ingenieria = np.random.uniform(3.1, 4.0)
        num_reprobadas = random.randint(1, 5)
    else:  # Bajo
        # Promedios bajos, muchas reprobadas
        promedio_acumulado = np.random.uniform(2.0, 3.1)
        promedio_basicas = np.random.uniform(1.8, 2.9)
        promedio_ingenieria = np.random.uniform(2.1, 3.2)
        num_reprobadas = random.randint(3, 10)

    # Ajustar creditos segun semestre
    max_creditos = 170
    creditos_semestre = semestre * 17
    pct_creditos = min(100, (creditos_semestre / max_creditos) * 100 + random.uniform(-5, 10))

    return {
        'estudiante_id': estudiante['estudiante_id'],
        'promedio_acumulado': round(promedio_acumulado, 2),
        'promedio_basicas': round(promedio_basicas, 2),
        'promedio_ingenieria': round(promedio_ingenieria, 2),
        'num_reprobadas': num_reprobadas,
        'pct_creditos': round(pct_creditos, 1),
        'semestre': semestre,
        'estrato': estudiante['estrato'],
        'genero': estudiante['genero'],
        'programa': estudiante['programa'],
        'resultado': target_resultado
    }

def main():
    print("=" * 60)
    print("GENERADOR DE DATOS SINTETICOS - SABER PRO")
    print("=" * 60)

    num_estudiantes = 200
    target_distribution = {'Alto': 0.35, 'Medio': 0.45, 'Bajo': 0.20}

    estudiantes = []
    datos_ml = []

    print(f"\nGenerando {num_estudiantes} estudiantes...")
    print(f"Distribución objetivo: Alto={int(num_estudiantes*0.35)}, Medio={int(num_estudiantes*0.45)}, Bajo={int(num_estudiantes*0.20)}")

    for i in range(num_estudiantes):
        estudiante = generar_estudiante(i + 1)
        estudiantes.append(estudiante)

        # Seleccionar resultado basado en distribución
        rand = random.random()
        if rand < target_distribution['Alto']:
            target = 'Alto'
        elif rand < target_distribution['Alto'] + target_distribution['Medio']:
            target = 'Medio'
        else:
            target = 'Bajo'

        features = generar_notas_y_features(estudiante, target)
        datos_ml.append(features)

        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{num_estudiantes} estudiantes generados...")

    df_estudiantes = pd.DataFrame(estudiantes)
    df_datos_ml = pd.DataFrame(datos_ml)

    output_path = 'E:/Projects/proyecto1/prueba prediccion/ml/datasets/'
    df_estudiantes.to_csv(f'{output_path}estudiantes.csv', index=False)
    df_datos_ml.to_csv(f'{output_path}saber_pro_data.csv', index=False)

    print(f"\n[OK] Estudiantes guardados: {output_path}estudiantes.csv ({len(df_estudiantes)} registros)")
    print(f"[OK] Dataset ML guardado: {output_path}saber_pro_data.csv ({len(df_datos_ml)} registros)")

    print("\n" + "=" * 60)
    print("ESTADISTICAS DEL DATASET")
    print("=" * 60)
    print(f"\nDistribucion de resultados:")
    print(df_datos_ml['resultado'].value_counts())

    print(f"\nPromedio general: {df_datos_ml['promedio_acumulado'].mean():.2f}")
    print(f"Rango semestre: {df_datos_ml['semestre'].min()} - {df_datos_ml['semestre'].max()}")
    print(f"Total reprobadas: {df_datos_ml['num_reprobadas'].sum()}")

    print("\n" + "=" * 60)
    print("DATOS GENERADOS EXITOSAMENTE!")
    print("=" * 60)

if __name__ == '__main__':
    main()