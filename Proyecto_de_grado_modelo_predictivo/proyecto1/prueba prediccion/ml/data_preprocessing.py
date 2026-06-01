"""
Módulo de preprocesamiento de datos
Limpieza, validación y encoding de variables
"""

import pandas as pd
import numpy as np
import logging

logger = logging.getLogger(__name__)


class DataPreprocessor:
    """
    Preprocesador de datos para Saber Pro
    """
    
    @staticmethod
    def clean_data(df):
        """
        Limpia datos:
        - Elimina filas con valores nulos
        - Valida rangos
        """
        logger.info("Limpiando datos...")
        
        # Eliminar nulos
        initial_rows = len(df)
        df = df.dropna()
        removed = initial_rows - len(df)
        
        if removed > 0:
            logger.info(f"  - Removidas {removed} filas con valores nulos")
        
        # Validar rangos
        validations = {
            'edad': (16, 70),
            'promedio': (0, 5),
            'horas_estudio': (0, 168),
            'estrato': (1, 6),
            'semestre': (1, 10)
        }
        
        for col, (min_val, max_val) in validations.items():
            before = len(df)
            df = df[(df[col] >= min_val) & (df[col] <= max_val)]
            after = len(df)
            
            if before != after:
                logger.info(f"  - {col}: removidas {before-after} filas fuera de rango [{min_val}, {max_val}]")
        
        logger.info(f"Filas finales: {len(df)}")
        return df
    
    @staticmethod
    def encode_categorical(df):
        """
        Encoding de variables categóricas
        """
        logger.info("Codificando variables categóricas...")
        
        # Encoding binario
        if 'acceso_internet' in df.columns:
            df['acceso_internet'] = df['acceso_internet'].astype(int)
            logger.info("  - acceso_internet: booleano → int")
        
        # Target encoding (resultado_saber_pro)
        if 'resultado_saber_pro' in df.columns:
            mapping = {'Bajo': 0, 'Medio': 1, 'Alto': 2}
            df['resultado_saber_pro'] = df['resultado_saber_pro'].map(mapping)
            logger.info("  - resultado_saber_pro: Bajo→0, Medio→1, Alto→2")
        
        return df
    
    @staticmethod
    def normalize_features(X, fit=True, scaler=None):
        """
        Normaliza features usando StandardScaler
        """
        from sklearn.preprocessing import StandardScaler
        
        if fit:
            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)
            return X_scaled, scaler
        else:
            if scaler is None:
                raise ValueError("Scaler required for transformation")
            return scaler.transform(X), scaler
    
    @staticmethod
    def get_feature_importance(model, feature_names):
        """
        Extrae importancia de features del modelo
        """
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
        elif hasattr(model, 'coef_'):
            # Para Logistic Regression, usar valor absoluto
            importances = np.abs(model.coef_[0])
        else:
            return None
        
        # Normalizar
        importances = importances / importances.sum()
        
        # Crear dataframe
        importance_df = pd.DataFrame({
            'feature': feature_names,
            'importance': importances
        }).sort_values('importance', ascending=False)
        
        logger.info("\nImportancia de Features:")
        for idx, row in importance_df.iterrows():
            logger.info(f"  {row['feature']:20s}: {row['importance']:.4f} ({row['importance']*100:.2f}%)")
        
        return importance_df


def generate_synthetic_data(n_samples=1000):
    """
    Genera datos sintéticos para pruebas
    """
    np.random.seed(42)
    
    data = {
        'edad': np.random.randint(18, 65, n_samples),
        'promedio': np.random.uniform(2.0, 5.0, n_samples),
        'horas_estudio': np.random.uniform(5, 50, n_samples),
        'estrato': np.random.randint(1, 7, n_samples),
        'carrera': np.random.choice(
            ['Ingeniería de Sistemas', 'Administración', 'Psicología', 'Medicina'],
            n_samples
        ),
        'acceso_internet': np.random.choice([True, False], n_samples),
        'semestre': np.random.randint(1, 11, n_samples),
    }
    
    df = pd.DataFrame(data)
    
    # Generar target correlacionado con features
    # Lógica simple: si promedio alto y muchas horas, más probable alto
    df['resultado_saber_pro'] = df.apply(
        lambda row: (
            'Alto' if (row['promedio'] > 4.0 and row['horas_estudio'] > 25)
            else 'Bajo' if (row['promedio'] < 3.0 and row['horas_estudio'] < 15)
            else 'Medio'
        ),
        axis=1
    )
    
    return df


if __name__ == "__main__":
    # Ejemplo: generar y procesar datos
    logging.basicConfig(level=logging.INFO)
    
    print("Generando datos sintéticos...")
    df = generate_synthetic_data(1000)
    
    print("\nPrimeras filas:")
    print(df.head())
    
    print("\nLimpiando datos...")
    df_clean = DataPreprocessor.clean_data(df)
    
    print("\nCodificando...")
    df_encoded = DataPreprocessor.encode_categorical(df_clean)
    
    print("\nDatos procesados:")
    print(df_encoded.head())
