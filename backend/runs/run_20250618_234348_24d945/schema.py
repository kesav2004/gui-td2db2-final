[
    {
        "table": "SOURCE_SCHEMA.EMPLOYEE",
        "keys": "EMPNO",
        "predicate": "",
        "fields": "EMPNO,WORKDEPT,PHONENO,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "WORKDEPT": "CHARACTER",
            "PHONENO": "CHARACTER",
            "SEX": "CHARACTER",
            "BIRTHDATE": "DATE",
            "SALARY": "DECIMAL",
            "BONUS": "DECIMAL",
            "COMM": "DECIMAL"
        }
    },
    {
        "table": "TARGET_SCHEMA.EMPLOYEE",
        "keys": "EMPNO",
        "predicate": "",
        "fields": "EMPNO,WORKDEPT,PHONENO,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "WORKDEPT": "CHARACTER",
            "PHONENO": "CHARACTER",
            "SEX": "CHARACTER",
            "BIRTHDATE": "DATE",
            "SALARY": "DECIMAL",
            "BONUS": "DECIMAL",
            "COMM": "DECIMAL"
        }
    }
]