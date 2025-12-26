# test_connection.py
import pymysql

try:
    connection = pymysql.connect(
        host='localhost',
        port=3306,
        user='inv',
        password='@SgiInventory123',  # Python handles @ correctly
        database='inventory',
        cursorclass=pymysql.cursors.DictCursor
    )
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 as test")
        result = cursor.fetchone()
        print("✅ Connection successful!")
        print(f"   Result: {result}")
    
    connection.close()
    
except Exception as e:
    print(f"❌ Connection failed: {e}")