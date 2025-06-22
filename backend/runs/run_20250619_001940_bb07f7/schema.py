[
    {
        "table": "SOURCE_SCHEMA.EMPLOYEE",
        "keys": "EMPNO",
        "predicate": "",
        "fields": "EMPNO,FIRSTNME,WORKDEPT,HIREDATE,EDLEVEL,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "FIRSTNME": "VARCHAR",
            "WORKDEPT": "CHARACTER",
            "HIREDATE": "DATE",
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
        "fields": "EMPNO,FIRSTNME,WORKDEPT,HIREDATE,EDLEVEL,SEX,BIRTHDATE,SALARY,BONUS,COMM",
        "groupby": "WORKDEPT",
        "datatype": {
            "EMPNO": "CHARACTER",
            "FIRSTNME": "VARCHAR",
            "WORKDEPT": "CHARACTER",
            "HIREDATE": "DATE",
            "EDLEVEL": "SMALLINT",
            "SEX": "CHARACTER",
            "BIRTHDATE": "DATE",
            "SALARY": "DECIMAL",
            "BONUS": "DECIMAL",
            "COMM": "DECIMAL"
        }
    }
]