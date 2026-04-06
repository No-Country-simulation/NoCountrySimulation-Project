
# backend/migrate_db.py
import sqlite3
import hashlib
from app.schemas import TextNormalizer

def migrate_database():
    """Agrega las nuevas columnas a la base de datos existente"""
    conn = sqlite3.connect('feedback.db')
    cursor = conn.cursor()
    
    # Verificar qué columnas existen
    cursor.execute("PRAGMA table_info(feedbacks)")
    columns = [column[1] for column in cursor.fetchall()]
    
    print(f"Columnas existentes: {columns}")
    
    # Agregar columna texto_normalizado si no existe
    if 'texto_normalizado' not in columns:
        print("Agregando columna texto_normalizado...")
        cursor.execute("ALTER TABLE feedbacks ADD COLUMN texto_normalizado TEXT")
        print("✓ Columna texto_normalizado agregada")
    
    # Agregar columna texto_hash si no existe
    if 'texto_hash' not in columns:
        print("Agregando columna texto_hash...")
        cursor.execute("ALTER TABLE feedbacks ADD COLUMN texto_hash VARCHAR(64)")
        print("✓ Columna texto_hash agregada")
    
    # Crear índices
    print("\nCreando índices...")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedbacks_texto_hash ON feedbacks(texto_hash)")
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_feedbacks_fecha ON feedbacks(fecha)")
    print("✓ Índices creados")
    
    # Migrar datos existentes - normalizar textos existentes
    print("\nMigrando datos existentes...")
    cursor.execute("SELECT id, texto FROM feedbacks WHERE texto_normalizado IS NULL")
    rows = cursor.fetchall()
    
    normalizer = TextNormalizer()
    updated = 0
    
    for row in rows:
        feedback_id, texto = row
        if texto:
            # Normalizar texto
            texto_con_emojis = normalizer.emojis_to_text(texto)
            texto_normalizado = normalizer.normalize_text(texto_con_emojis)
            
            # Generar hash
            texto_hash = hashlib.sha256(texto_normalizado.encode('utf-8')).hexdigest()
            
            # Actualizar registro
            cursor.execute(
                "UPDATE feedbacks SET texto_normalizado = ?, texto_hash = ? WHERE id = ?",
                (texto_normalizado, texto_hash, feedback_id)
            )
            updated += 1
            
            if updated % 10 == 0:
                print(f"  Procesados {updated} de {len(rows)}...")
    
    conn.commit()
    print(f"\n✓ {updated} registros migrados exitosamente")
    
    # Verificar resultados
    cursor.execute("SELECT COUNT(*) FROM feedbacks WHERE texto_normalizado IS NOT NULL")
    count = cursor.fetchone()[0]
    print(f"\nTotal de feedbacks con datos normalizados: {count}")
    
    cursor.close()
    conn.close()
    
    print("\n✅ Migración completada exitosamente!")

if __name__ == "__main__":
    migrate_database()