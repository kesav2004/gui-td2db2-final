CREATE OR REPLACE PROCEDURE DG_I_P_30INF_CBCI.PROC_UPDATE_MESSAGE_SPEC_REP_ENT
(IN par_COG_RUN_ID INTEGER,
 IN par_ETL_RUN_ID INTEGER,
  IN par_PROC_NR INTEGER,
   OUT par_Status INTEGER) 

 LANGUAGE SQL
 BEGIN 
 T.TRANSMITTINGCOUNTRY 
 , T.REPORTINGPERIOD 
 , T.REPORTINGENTITYTIN 
 , T.RE_NAME_KEY 
 , T.ETL_RUN_ID 
 , T.START_DATE 
 FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS T 
 WHERE T.START_DATE IS NOT NULL 
 AND T.CURRENT_FLAG = 'Y' 
 AND T.TRANSMITTINGCOUNTRY <> 'NL'
 AND T.ETL_RUN_ID > ' || Trim(Cast(par_ERI_PROC AS VARCHAR(19))) || ' 
 ORDER BY T.ETL_RUN_ID, T.START_DATE, T.SENDINGENTITYIN, T.TRANSMITTINGCOUNTRY, T.REPORTINGENTITYTIN, T.RE_NAME_KEY;';
					-- kan mogelijk nog fout gaan in verwerking als berichten in verkeerde volgorde bij Poort aankomen
					
					-- laad cursor
					PREPARE S1 FROM STMT1;
					
					-- laad resultaten in cursor
					OPEN cur_UPDATE;
					
					-- zolang einde van cursor lijst niet bereikt is
					L1: LOOP
					
						FETCH cur_UPDATE INTO SEI, TC, RPER, REP, RENA, ERI, SD;
				
					   -- Exit statement for loop (als eind cursor file is bereikt)
   						IF (SqlCode > 0) THEN
   							LEAVE L1;
   						END IF;'
									
						SET STMT2 = 'UPDATE T 
 FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS T, 
 (SELECT SENDINGENTITYIN 
 , TRANSMITTINGCOUNTRY 
 , REPORTINGPERIOD 
 , REPORTINGENTITYTIN 
 , RE_NAME_KEY 
 , MAX(START_DATE) AS START_DATE 
 FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT 
 WHERE COALESCE(SENDINGENTITYIN, '''') = COALESCE(''' || SEI || ''', '''') 
 AND TRANSMITTINGCOUNTRY = ''' || TC || ''' 
 AND REPORTINGPERIOD = DATE ''' || Cast(Cast(RPER AS DATE Format 'dd-mm-yyyy') AS DATE Format 'yyyy-mm-dd') || ''' 
 AND REPORTINGENTITYTIN = ''' || REP || ''' 
 AND RE_NAME_KEY = ''' || OReplace(RENA, '''', '''''') || ''' 
 AND ETL_RUN_ID <= ' || ERI || ' 
 AND START_DATE < TIMESTAMP ''' || Cast( SD AS VARCHAR(25))  || ''' 
 AND END_DATE IS NULL 
 GROUP BY SENDINGENTITYIN 
 , TRANSMITTINGCOUNTRY 
 , REPORTINGPERIOD 
 , REPORTINGENTITYTIN 
 , RE_NAME_KEY) AS S 
 SET END_DATE = TIMESTAMP ''' || Cast( SD AS VARCHAR(25))  || ''' - INTERVAL ''1'' SECOND 
 , CURRENT_FLAG = ''N'' 
 WHERE COALESCE(T.SENDINGENTITYIN, '''') = COALESCE(S.SENDINGENTITYIN, '''') 
 AND T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY 
 AND T.REPORTINGPERIOD = S.REPORTINGPERIOD 
 AND T.REPORTINGENTITYTIN = S.REPORTINGENTITYTIN 
 AND T.RE_NAME_KEY = S.RE_NAME_KEY 
 AND T.START_DATE = S.START_DATE 
 AND T.END_DATE IS NULL;';
											
						EXECUTE IMMEDIATE STMT2;
			
						SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
						SET par_STEP = 4;
								
					END LOOP L1;
						
					CLOSE cur_UPDATE;
			
			END;
		END IF;
		
		-- Versie 8:
		-- Update MESSAGE_SPEC_REP_ENT voor alle rapporten waar Reporting Entity is ingetrokken
		-- Veronderstelling dat als Rep.Ent ingetrokken wordt, het hele rapport wordt ingetrokken.
		-- Intrekken kan maar 1x dus hoeft niet met cursor gedaan te worden.
		-- Als het goed is staat maar 1 rapport open voor de betreffende rep.ent./reportingperiod. Deze wordt afgesloten door het OECD3 bericht.
		UPDATE T
		FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS T,
			(	SELECT RE.SENDINGENTITYIN, RE.TRANSMITTINGCOUNTRY, R3.MESSAGEREFID, R3.CBCBODYID, 
					RE.TIN, R3.RE_NAME_KEY, MS.REPORTINGPERIOD, R3.ETL_RUN_ID, R3.START_DATE, R3.END_DATE, R3.CURRENT_FLAG
				-- Selecteer de OECD3 berichten voor Reporting Entity
				FROM DG_I_P_20GEG_CBCI.REPORTING_ENTITY AS RE
				-- Zoek Rep.Ent. / bericht wat geupdate gaat worden met deze intrekking
				INNER JOIN DG_I_P_30INF_CBCI.REPORTING_ENTITY AS R3
					ON RE.TRANSMITTINGCOUNTRY = R3.TRANSMITTINGCOUNTRY
					AND Coalesce(RE.SENDINGENTITYIN, '') = Coalesce(R3.SENDINGENTITYIN, '')
					AND RE.TIN = R3.TIN
					AND RE.CORRDOCREFID = R3.DOCREFID
					AND RE.ETL_RUN_ID >= R3.ETL_RUN_ID
				-- Via MESSAGE_SPEC ReportingPeriod opzoeken voor link met MESSAGE_SPEC_REP_ENT
				INNER JOIN DG_I_P_30INF_CBCI.MESSAGE_SPEC AS MS
					ON R3.TRANSMITTINGCOUNTRY = MS.TRANSMITTINGCOUNTRY
					AND Coalesce(R3.SENDINGENTITYIN, '') = Coalesce(MS.SENDINGENTITYIN, '')
					AND R3.MESSAGEREFID = MS.MESSAGEREFID
					AND R3.ETL_RUN_ID = MS.ETL_RUN_ID
				WHERE RE.DOCTYPEINDIC = 'OECD3'
				AND R3.END_DATE IS NOT NULL
				AND R3.CURRENT_FLAG = 'N'
				AND R3.ETL_RUN_ID > par_ERI_PROC
			) AS S
		SET END_DATE = S.END_DATE - INTERVAL '1' SECOND
			, CURRENT_FLAG = 'N'
		WHERE T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
		AND Coalesce(T.SENDINGENTITYIN, '') = Coalesce(S.SENDINGENTITYIN, '')
		AND T.REPORTINGPERIOD = S.REPORTINGPERIOD
		AND T.REPORTINGENTITYTIN = S.TIN
		AND T.RE_NAME_KEY = S.RE_NAME_KEY
		AND T.START_DATE >= S.START_DATE
		AND T.ETL_RUN_ID >= S.ETL_RUN_ID
		AND T.END_DATE IS NULL;
		
		SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
		SET par_STEP = 5;


	
	-- Ophalen hoogste ETL_RUN_ID wat verwerkt is. Geeft zelfde ETL_RUN_ID als MIH geen run gedraaid heeft na laatste keer dat deze job uitgevoerd is.
	-- Als procedure is fout gegaan is max ETL_RUN_ID = 0. Dit wordt gevuld in de Handlers en bereikt dit punt niet.
	-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement
	SELECT Coalesce(Max(ETL_RUN_ID),NULL) INTO par_MAX_ETL_RUN_ID
	FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT
	WHERE TRANSMITTINGCOUNTRY <> 'NL';
	
	-- Wegschrijven naar RUNCONTROL_30 tabel dat procedure succesvol is voltooid
	-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
	UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
	SET END_DATE =  Current_Timestamp
	, RUN_RESULT = 'Success'
	, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || Trim(Cast(par_ACT_INS AS VARCHAR(11))) || ' records inserted; ' || Trim(Cast(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
	, ETL_RUN_ID_INT = par_MAX_ETL_RUN_ID
	WHERE COG_RUN_ID = par_COG_RUN_ID
	AND PROCEDURE_NUMBER = par_PROC_NR
	AND PROCEDURE_NAME = 'PROC_UPDATE_MESSAGE_SPEC_REP_ENT'; 
 
 SET par_STATUS = 0; 
 
 END@
