import os
from dotenv import load_dotenv 

load_dotenv()

DB_DRIVERS = {
    'db2': {
        'driver': os.getenv("DB2_DRIVER", "com.ibm.db2.jcc.DB2Driver"),
        'py_driver': "ibm_db"
    },
    'teradata': {
        'driver': os.getenv("TERADATA_DRIVER", "com.teradata.jdbc.TeraDriver"),
        'py_driver': "teradatasql"
    }
}
