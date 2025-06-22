import teradatasql

try:
    conn = teradatasql.connect(
        host="test-ueqxqobf2silukbp.env.clearscape.teradata.com:1025",
        user="demo_user",
        password="kESAVA32@",
        database="tdwm"
    )
    print("✅ Connected successfully to Teradata!")
    conn.close()
except Exception as e:
    print("❌ Connection failed:", str(e))
