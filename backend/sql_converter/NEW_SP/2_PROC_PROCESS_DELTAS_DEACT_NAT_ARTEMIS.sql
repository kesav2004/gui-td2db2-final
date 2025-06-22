REPLACE PROCEDURE DG_I_O_40ANA_CBC.PROC_PROCESS_DELTAS_DEACT_NAT(
IN par_COG_RUN_ID INTEGER
, IN par_ETL_RUN_ID INTEGER
, IN par_PROC_NR INTEGER
, OUT par_Status INTEGER)
BEGIN 
		
	
	DECLARE par_ZERO_ROWS, par_ACT_INS, par_ACT_UPD, par_MAX_ETL_RUN_ID, par_STEP, par_ERI_PROC, par_ERI_PROC_MS, par_CNT INTEGER DEFAULT 0;
	
	DECLARE par_SQLSTATE CHARACTER(5);
	DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET Unicode;
	DECLARE STMT1 VARCHAR(1500);
	DECLARE par_TABLE_NAME, par_TIN VARCHAR(50);	
	DECLARE cur_Tables CURSOR FOR SELECT NAME_TABLE, TIN_NAME FROM DG_I_O_40ANA_CBC.DpCBCD_cbc_tabellen;
	

	DECLARE EXIT HANDLER FOR SqlException
	BEGIN
	
		GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = Message_Text;

		ROLLBACK;		
		
		UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || Trim(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 3
		, ETL_RUN_ID_NAT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_PROCESS_DELTAS_DEACT_NAT';
		
		SET par_STATUS = 1;

	END;

	DECLARE EXIT HANDLER FOR SQLWARNING
	BEGIN

		SELECT SqlState INTO par_SQLSTATE;
		

		ROLLBACK;		
		
		UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || Trim(par_STEP) || '; '
		, ETL_RUN_ID_NAT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_PROCESS_DELTAS_DEACT_NAT';
		
		SET par_STATUS = 1;
		
	END;
	

	INSERT INTO  DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30(COG_RUN_ID, PROCEDURE_NUMBER, PROCEDURE_NAME, START_DATE)
	VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_PROCESS_DELTAS_DEACT_NAT', Current_Timestamp);

	BEGIN

		SELECT Count(*) INTO par_CNT
		FROM DG_I_O_40ANA_CBC.DpCBCD_tmp_repos_to_deact;
		
		IF par_CNT > 0 THEN
			BEGIN
			
				OPEN cur_Tables;
				
				L1: LOOP
				
					FETCH cur_tables INTO par_TABLE_NAME, par_TIN;
					

   					IF (SqlCode > 0) THEN
   						LEAVE L1;
   					END IF;
			
		
					SET STMT1 = 'UPDATE T
								FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || ' AS T,
									DG_I_O_40ANA_CBC.DpCBCD_tmp_repos_to_deact AS S
								SET END_DATE = S.END_DATE
								, CURRENT_FLAG = ''N''
								WHERE S.REPORTINGENTITYTIN = T.' || par_TIN || '
								AND S.CBCBODYID = T.CBCBODYID
								AND S.ETL_RUN_ID = T.ETL_RUN_ID
								AND S.TRANSMITTINGCOUNTRY = ''NL''
								AND T.END_DATE IS NULL;';

						
					EXECUTE IMMEDIATE STMT1;
					
					SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
					SET par_STEP = par_STEP + 1;
					
				END LOOP L1;
				
				CLOSE cur_TABLES;
				
				DELETE FROM DG_I_O_40ANA_CBC.DpCBCD_tmp_repos_to_deact;
				
			END;

		END IF;
		
		END;
		

	SELECT Coalesce(Max(ETL_RUN_ID),NULL) INTO par_MAX_ETL_RUN_ID
	FROM DG_I_O_40ANA_CBC.DpCBCD_msg_spec_rep_ent
	WHERE TRANSMITTINGCOUNTRY = 'NL';

	UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
	SET END_DATE =  Current_Timestamp
	, RUN_RESULT = 'Success'
	, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || Trim(Cast(par_ACT_INS AS VARCHAR(11))) || ' records inserted; ' || Trim(Cast(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
	, ETL_RUN_ID_NAT = par_MAX_ETL_RUN_ID
	WHERE COG_RUN_ID = par_COG_RUN_ID
	AND PROCEDURE_NUMBER = par_PROC_NR
	AND PROCEDURE_NAME = 'PROC_PROCESS_DELTAS_DEACT_NAT';
	
	SET par_STATUS = 0;
	
END;