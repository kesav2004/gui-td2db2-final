[
    {
        "table": "SOURCE_SCHEMA.EMPLOYEE",
        "keys": "EMPNO",
        "predicate": "",
        "fields": "EMPNO,WORKDEPT,EDLEVEL,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "WORKDEPT": "CHARACTER",
            "EDLEVEL": "SMALLINT",
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
        "fields": "EMPNO,WORKDEPT,EDLEVEL,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "WORKDEPT": "CHARACTER",
            "EDLEVEL": "SMALLINT",
            "SEX": "CHARACTER",
            "BIRTHDATE": "DATE",
            "SALARY": "DECIMAL",
            "BONUS": "DECIMAL",
            "COMM": "DECIMAL"
        }
    }
]