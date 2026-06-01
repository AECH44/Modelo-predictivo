-- ============================================
-- USUARIO DE PRUEBA PARA EL SISTEMA
-- ============================================

-- Insertar usuario de prueba
-- Password: admin123 (hasheado con bcrypt)
INSERT INTO usuarios (email, password_hash, nombre) VALUES
('admin@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.4V5F5DxP5vFx6i', 'Administrador');

-- Verificar usuario creado
SELECT id, email, nombre, created_at FROM usuarios;
