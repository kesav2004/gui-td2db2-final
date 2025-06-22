REPLACE PROCEDURE DG_I_P_30INF_CBCI.PROC_UPDATE_MESSAGE_SPEC_REP_ENT(IN par_COG_RUN_ID INTEGER, IN par_ETL_RUN_ID INTEGER, IN par_PROC_NR INTEGER, OUT par_Status INTEGER)
BEGIN
	
		
	-----------------------------------------------------------------------------------------------------------
	-- Naam: DG_I_P_30INF_CBC.PROC_UPDATE_MESSAGE_SPEC_REP_ENT
	-- 
	-- Versie 1	| 02-07-2018	| Bas de Jong				| CoE COG		| Initiele versie
	-- Versie 2	| 04-09-2018	| Bas de Jong				| CoE COG		| Aanpassing tbv dubbele reporting entity tin in enkel bericht, en bericht van type OECD1 waarvoor reporting entity tin al bestaat. 
	-- Versie 3	| 19-09-2018	| Bas de Jong				| CoE COG		| Toevoeging par_STEP voor identificatie waar proces fout gaat
	-- Versie 4	| 25-09-2018	| Bas de Jong				| CoE COG		| Aanpassing als gevolg van toevoeging veld RE_NAME_KEY
	-- Versie 5	| 28-09-2018	| Bas de Jong				| CoE COG		| Cursor  veld RENA robuust gemaakt om om te kunnen gaan met ' in RE_NAME_KEY (bedrijfsnaam). 
	-- Versie 6	| 12-10-2018	| Bas de Jong				| CoE COG		| Voorkomen dat ETL_RUN_IDs dubbel verwerkt kunnen worden
	-- Versie 7	| 23-10-2018	| Bas de Jong				| CoE COG		| Toevoegen REPORTINGPERIOD aan criteria voor update END_DATE en CURRENT_FLAG. Laatste rapport per REPORTINGPERIOD is actief.
	-- Versie 8	| 20-11-2018	| Bas de Jong				| CoE COG		| Toevoegen update voor deactiveren rapporten op basis van OECD3 van Rep.Ent
	-- Versie 9	| 04-12-2018	| Bas de Jong				| CoE COG		| Aanpassen a.g.v. toevoegen stroom Nationaal
	-- Versie 10	| 07-05-2019	| Bas de Jong				| CoE COG		| Verbeteren feedback van SQLEXCEPTION
	-- Versie 11	| 11-06-2019	| Bas de Jong				| CoE COG		| Aanpassing feedback SQLEXCEPTION: verwijderen SQLSTATE
	-- Versie 12	| 10-03-2022	| Thari Diefenbach			| CoE COG		| JIRA COGB-4887: Aanpassing aan laag 10 vanuit DF&A
	--
	-- Doel: MESSAGE_SPEC_REP_ENT vullen en updaten met combinaties van MESSAGEREFID en REPORTINGENTITY.
	--
	-- Commentaar: Gekozen voor gebruik van een CURSOR omdat binnen een run meerdere updates van dezelfde MNE kunnen zitten.
	--					START_DATE wordt opgehaald uit laatste versie van bericht voor zelfde ReportingEntityTin.
	--
	--					Zonder Reporting Entity kan een rapport niet 'bestaan'. Als deze wordt ingetrokken, wordt ook het hele rapport ingetrokken vanuit perspectief van MESSAGE_SPEC_REP_ENT
	--
	--------------------------------------------------------------------------------------------------------------

	DECLARE par_ZERO_ROWS, par_ACT_UPD, par_ACT_INS, par_DBL_REP, par_MAX_ETL_RUN_ID, par_STEP, par_ERI_PROC, par_ERI_PROC_MS INTEGER DEFAULT 0;

	DECLARE par_SQLSTATE CHARACTER(5);
	DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET Unicode;

	DECLARE SEI VARCHAR(50);
	DECLARE TC VARCHAR(2);
	DECLARE RPER DATE;
	DECLARE REP VARCHAR(100);
	DECLARE RENA VARCHAR(200);
	DECLARE ERI INTEGER;
	DECLARE SD TIMESTAMP(6);
	DECLARE STMT1, STMT2 VARCHAR(1500);
	DECLARE cur_UPDATE CURSOR FOR S1;

	---------------- BEGIN VAN FOUTEN HANDLERS ---------------------------
	-- Error handler voor SQLException errors. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SqlException
	BEGIN

		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		-- Versie 11
		-- SELECT SqlState INTO par_SQLSTATE;

		-- Versie 10: uitlezen error message
		GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = Message_Text;

		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;

		-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
		UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || Trim(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 11
		, ETL_RUN_ID_INT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_MESSAGE_SPEC_REP_ENT';

		SET par_STATUS = 1;

	END;

	-- Error handler voor SQLWarnings. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SQLWARNING
	BEGIN

		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		SELECT SqlState INTO par_SQLSTATE;

		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;

		-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
		UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || Trim(par_STEP) || '; '
		, ETL_RUN_ID_INT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_MESSAGE_SPEC_REP_ENT';

		SET par_STATUS = 1;

	END;

	-- Geen NOTFOUND of SQLSTATE '02000' handler. Als einde van cursor bereikt wordt, wordt SQLSTATE '02000' / SQLCODE <> 0 gegeven en dit wordt gebruikt om
	-- de WHILE loop te beeindigen. Een CONTINUE handler met UPDATE zorgt er voor dat de SQLSTATE weer naar '00000' / SQLCODE = 0 gaat en de WHILE loop actief blijft.

	---------------- EINDE VAN FOUTEN HANDLERS ---------------------------

	-- Log start van procedure naar RUNCONTROL_30 tabel.
	INSERT INTO DG_I_P_30INF_CBCI.RUNCONTROL_30 (COG_RUN_ID, PROCEDURE_NUMBER, PROCEDURE_NAME, START_DATE)
	VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_UPDATE_MESSAGE_SPEC_REP_ENT', Current_Timestamp);

	-- Versie 6: voorkomen van dubbel verwerken ETL_RUN_IDs
	-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement
	-- Haal hoogste ETL_RUN_ID uit Message_Spec_Rep_Ent
	SELECT Coalesce(Max(ETL_RUN_ID),0) INTO par_ERI_PROC_MS
	FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT
	WHERE TRANSMITTINGCOUNTRY <> 'NL';

	-- Proces mag niet twee keer gedraaid worden voor dezelfde ETL_RUN_ID (ivm ontbreken unique index)
	-- Kan zijn dat updaten van deze tabel goed is gegaan, maar een latere procedure failt
	-- Dan is laatst succesvolle ETL_RUN_ID in Runcontrol (par_ETL_RUN_ID) lager dan in MESSAGE_SPEC_REP_ENT (par_ERI_PROC_MS)
	-- par_ETL_RUN_ID wordt dan gelijk gezet aan laatst verwerkte Etl Run Id in MESSAGE_SPEC_REP_ENT (par_ERI_PROC_MS).
	IF par_ETL_RUN_ID < par_ERI_PROC_MS THEN
		SET par_ERI_PROC = par_ERI_PROC_MS;
	ELSE
		SET par_ERI_PROC = par_ETL_RUN_ID;
	END IF;

	BT;

		-- Invoegen alle nieuwe combinaties van MessageRefID en ReportingEntity (Tin en Name) voor gegeven ETL_RUN_ID
		-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement. Toevoegen veld COG_RUN_ID.
		INSERT INTO DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT(SENDINGENTITYIN, SENDINGENTITYNAME, TRANSMITTINGCOUNTRY,
				CBCBODYID, REPORTINGENTITYTIN, RE_NAME_KEY, MESSAGETYPE, "LANGUAGE", "WARNING", CONTACT, EULOCALFILING, EUINCOMPLETE,
				MESSAGEREFID, MESSAGETYPEINDIC, REPORTINGPERIOD, "TIMESTAMP", RELNR,
				USEDSOFTWAREPACKAGE, X_BERICHTID, X_ONTVANGSTDATUMTIJD, ETL_RUN_ID,
				ETL_STG_TIMESTAMP, START_DATE, END_DATE, CURRENT_FLAG, COG_RUN_ID)
		SELECT DISTINCT Coalesce(M.SENDINGENTITYIN, '') AS SENDINGENTITYIN
		, M.SENDINGENTITYNAME
		, M.TRANSMITTINGCOUNTRY
		, S.CBCBODYID
		, S.REPORTINGENTITYTIN
		, S.RE_NAME_KEY
		, M.MESSAGETYPE
		, M."LANGUAGE"
		, M."WARNING"
		, M.CONTACT
		, M.EULOCALFILING
		, M.EUINCOMPLETE
		, M.MESSAGEREFID
		, M.MESSAGETYPEINDIC
		, M.REPORTINGPERIOD
		, M."TIMESTAMP"
		, M.RELNR
		, M.USEDSOFTWAREPACKAGE
		, M.X_BERICHTID
		, M.X_ONTVANGSTDATUMTIJD
		, M.ETL_RUN_ID
		, M.ETL_STG_TIMESTAMP
		, M.START_DATE
		, M.END_DATE
		, M.CURRENT_FLAG
		, par_COG_RUN_ID
		FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC AS M
		-- Alle verschillende Reporting Entities in het bericht worden geselecteerd
		INNER JOIN (
				-- Uit REPORTING_ENTITY
				SELECT S1.MESSAGEREFID
					, S1.SENDINGENTITYIN
					, S1.TRANSMITTINGCOUNTRY
					, S1.TIN AS REPORTINGENTITYTIN
					, S1.RE_NAME_KEY
					, S1.CBCBODYID
					, S1.ETL_RUN_ID
					, S1.START_DATE
					, S1.END_DATE
					, S1.CURRENT_FLAG
				FROM DG_I_P_30INF_CBCI.REPORTING_ENTITY AS S1
				WHERE S1.ETL_RUN_ID > par_ERI_PROC
				
				UNION 
				
				-- Uit CBCREPORTS (alleen SUMMARY. Iedere Messagerefid, Reportingentittytin combinatie in SUMMARY staat ook in CBCREPORTS_CONST_ENTITIES)
				SELECT DISTINCT S2.MESSAGEREFID
					, S2.SENDINGENTITYIN
					, S2.TRANSMITTINGCOUNTRY
					, S2.REPORTINGENTITYTIN
					, S2.RE_NAME_KEY
					, S2.CBCBODYID
					, S2.ETL_RUN_ID
					, S2.START_DATE
					, S2.END_DATE
					, S2.CURRENT_FLAG
				FROM DG_I_P_30INF_CBCI.CBCREPORTS_SUMMARY AS S2
				WHERE S2.ETL_RUN_ID > par_ERI_PROC
				
				UNION
				
				-- Uit Additional Info
				SELECT DISTINCT S3.MESSAGEREFID
					, S3.SENDINGENTITYIN
					, S3.TRANSMITTINGCOUNTRY
					, S3.REPORTINGENTITYTIN
					, S3.RE_NAME_KEY
					, S3.CBCBODYID
					, S3.ETL_RUN_ID
					, S3.START_DATE
					, S3.END_DATE
					, S3.CURRENT_FLAG
				FROM DG_I_P_30INF_CBCI.ADDITIONAL_INFO AS S3
				WHERE S3.ETL_RUN_ID > par_ERI_PROC
		) AS S
		ON M.MESSAGEREFID = S.MESSAGEREFID
		AND Coalesce(M.SENDINGENTITYIN, '') = Coalesce(S.SENDINGENTITYIN, '')
		AND M.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
		AND M.ETL_RUN_ID = S.ETL_RUN_ID
		WHERE M.TRANSMITTINGCOUNTRY <> 'NL';
			
		SET par_ACT_INS = Activity_Count;
		SET par_STEP = 1;

		-- Checken of UPDATE in 1x uitgevoerd kan worden of dat met behulp van cursor moet. (geldt alleen voor OECD2 update. Deze zijn in deze table opgenomen, intrekken volgt later in procedure)
		-- UPDATE van END_DATE en CURRENT_FLAG van oude MESSAGEREFID, REPORTINGENTITYTIN combinatie welke nu niet meer geldig is als gevolg van ontvangen nieuw rapport
		-- Versie 7: REPORTINGPERIOD toegevoegd.
		-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement
		SELECT Coalesce(Count(*),0) INTO par_DBL_REP
		FROM (
			SELECT SENDINGENTITYIN, TRANSMITTINGCOUNTRY, REPORTINGPERIOD, REPORTINGENTITYTIN, RE_NAME_KEY, Count(CBCBODYID) AS NR
			FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT
			WHERE ETL_RUN_ID > par_ERI_PROC
			AND START_DATE IS NOT NULL
			AND CURRENT_FLAG = 'Y'
			AND TRANSMITTINGCOUNTRY <> 'NL'
			GROUP BY SENDINGENTITYIN, TRANSMITTINGCOUNTRY, REPORTINGPERIOD, REPORTINGENTITYTIN, RE_NAME_KEY
			HAVING Count(CBCBODYID) > 1
		) AS A;
		
		SET par_STEP = 2;
		
		IF par_DBL_REP = 0 THEN
			BEGIN
				
				-- UPDATE in 1 x (Set END_DATE en CURRENT_FLAG voor verlopen MESSAGEREFID voor gegeven REPORTINGENTITY)
				-- Als procedures juist lopen staat er voor iedere TRANSMITTINGCOUNTRY, REPORTINGPERIOD, REPORTINGENTITYTIN, RE_NAME_KEY combinatie maar 1 oude regel open. 
				-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement
				UPDATE T
				FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS T,			-- oude record
				DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS S							-- nieuwe record
				SET END_DATE = S.START_DATE - INTERVAL '1' SECOND
				, CURRENT_FLAG = 'N'
				WHERE Coalesce(T.SENDINGENTITYIN, '') = Coalesce(S.SENDINGENTITYIN, '')
				AND T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
				AND T.REPORTINGPERIOD = S.REPORTINGPERIOD
				AND T.REPORTINGENTITYTIN = S.REPORTINGENTITYTIN
				AND T.RE_NAME_KEY = S.RE_NAME_KEY
				AND T.ETL_RUN_ID < S.ETL_RUN_ID							-- als geen dubbele records in deze batch zitten, is ETL_RUN_ID van oude record tenminste kleiner dan ETL_RUN_ID van nieuwe record
				AND S.ETL_RUN_ID > par_ERI_PROC
				AND S.START_DATE IS NOT NULL
				AND S.CURRENT_FLAG = 'Y'
				AND T.END_DATE IS NULL
				AND T.CURRENT_FLAG = 'Y'
				AND T.TRANSMITTINGCOUNTRY <> 'NL';
				
				SET par_ACT_UPD = Activity_Count;
				SET par_STEP = 3;
			
			END;
		ELSE
			BEGIN
				-- UPDATE via cursor (Set END_DATE en CURRENT_FLAG voor verlopen MESSAGEREFID voor gegeven REPORTINGENTITY)
				-- Versie 7: REPORTINGPERIOD toegevoegd in criteria
				-- Versie 9: toevoegen TRANSMITTINGCOUNTRY aan WHERE statement
			
					SET STMT1 = 'SELECT T.SENDINGENTITYIN
					, T.TRANSMITTINGCOUNTRY
					, T.REPORTINGPERIOD
					, T.REPORTINGENTITYTIN
					, T.RE_NAME_KEY
					, T.ETL_RUN_ID
					, T.START_DATE
					FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC_REP_ENT AS T
					WHERE T.START_DATE IS NOT NULL
					AND T.CURRENT_FLAG = ''Y''
					AND T.TRANSMITTINGCOUNTRY <> ''NL''
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
   						END IF;
											
						-- Update oude MESSAGEREFID, REPORTINGENTITYTIN cominatie met START_DATE -1 sec van nieuwe bericht van dezelfde combinatie
						-- Versie 7: REPORTINGPERIOD toegevoegd in criteria
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

	ET;
	
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
	
END;
