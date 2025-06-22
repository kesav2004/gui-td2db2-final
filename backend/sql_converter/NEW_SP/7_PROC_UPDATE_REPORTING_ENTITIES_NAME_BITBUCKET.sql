	REPLACE PROCEDURE DG_I_P_30INF_CBCI.PROC_UPDATE_REPORTING_ENTITIES_NAME(IN par_COG_RUN_ID INTEGER, IN par_ETL_RUN_ID INTEGER, IN par_PROC_NR INTEGER, IN par_TABLE_NAME VARCHAR(40), OUT par_Status INTEGER)
	BEGIN
	
		
	-----------------------------------------------------------------------------------------------------------
	-- Naam: DG_I_P_30INF_CBC.PROC_UPDATE_REPORTING_ENTITIES_NAME
	-- 
	-- Versie 1	| 26-09-2018	| Bas de Jong				| CoE COG		| Initiele versie
	-- Versie 2	| 12-10-2018	| Bas de Jong				| CoE COG		| Voorkomen dat ETL_RUN_IDs dubbel verwerkt kunnen worden
	-- Versie 3	| 22-10-2018	| Bas de Jong				| CoE COG		| Update van RE_NAME_KEY als rapport RE met OECD0 bevat en rapport alleen nieuwe (extra) informatie (OECD1)
	-- Versie 4	| 21-11-2018	| Bas de Jong				| CoE COG		| Index aan RE_NAME_KEY toevoegen als meerdere rapporten met verschillende reportingperiods in zelfde kalenderdaar bestaan
	-- Versie 5	| 04-12-2018	| Bas de Jong				| CoE COG		| Aanpassen tbv toevoegen stroom Nationaal: (voor de zekerheid) alleen International records verwerkt worden
	-- Versie 6	| 18-02-2019	| Bas de Jong				| CoE COG		| Statement voor update RE_NAME_KEY aangepast. Criteria stonden te strak.
	-- Versie 7	| 07-05-2019	| Bas de Jong				| CoE COG		| Verbeteren feedback van SQLEXCEPTION
	-- Versie 8	| 11-06-2019	| Bas de Jong				| CoE COG		| Aanpassing feedback SQLEXCEPTION: verwijderen SQLSTATE
    -- Versie 9 | 05-04-2022	| Thari Diefenbach			| CoE COG		| COGB-5011: (Tijdelijke?) fix voor run in endless loop door while
	--
	-- Doel: RE_NAME_KEY invullen in tabellen om te dienen als key om rapporten met indetieke TIN (NOTIN oid) te onderscheiden
	-- 
	-- Commentaar: IN parameter bepaalt voor welke tabel de Rep.Entitties geupdate moeten worden. Keuze uit:
	--					REPORTING_ENTITY, CBCREPORTS_SUMMARY, CBCREPORTS_CONST_ENTITIES en ADDITIONAL_INFO. Gebruik gemaakt van DynamicSQL.
	--
	--					Gekozen voor gebruik van een CURSOR omdat binnen een run meerdere updates van dezelfde MNE kunnen zitten.
	--					Reporting Entity Name wordt opgehaald uit vorige versie van het bericht. Als vorige bericht OECD1 is dan is naam beschikbaar. 
	--					Als vorige bericht een OECD2 is dan hoeft naam niet aanwezig te zijn. Cursor zorgt er voor dat updates in volgorde van binnenkomst
	--					worden verwerkt en vorige bericht altijd beschikt over naam.
	--					
	--
	--------------------------------------------------------------------------------------------------------------
	
	DECLARE par_ZERO_ROWS, par_ACT_UPD, par_MIS_REP, par_STEP, par_ETL_RUN_MAX INTEGER DEFAULT 0;
	
	DECLARE par_SQLSTATE CHARACTER(5);
	DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET Unicode;
	
	DECLARE par_TIN, SEI VARCHAR(50);
	DECLARE TC VARCHAR(2);
	DECLARE RETI VARCHAR(100);
	DECLARE DRI, CDRI VARCHAR(250);
	DECLARE ERI INTEGER;
	DECLARE STMT1, STMT2 VARCHAR(3000);
	DECLARE cur_UPDATE CURSOR FOR S1;
	
	---------------- BEGIN VAN FOUTEN HANDLERS ---------------------------
	-- Error handler voor SQLException errors. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SqlException
	BEGIN
	
		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		-- Versie 8
		-- SELECT SqlState INTO par_SQLSTATE;
		
		-- Versie 7: uitlezen error message
		GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = Message_Text;

		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;		
		
		-- Versie 5: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
		UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || Trim(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 8
		, ETL_RUN_ID_INT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME';
		
		SET par_STATUS = 1;

	END;
	
	-- Error handler voor SQLWarnings. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SQLWARNING
	BEGIN
	
		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		SELECT SqlState INTO par_SQLSTATE;
		
		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;		
		
		-- Versie 5: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
		UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || Trim(par_STEP) || '; '
		, ETL_RUN_ID_INT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME';
		
		SET par_STATUS = 1;
		
	END;
	
	-- Geen NOTFOUND of SQLSTATE '02000' handler. Als einde van cursor bereikt wordt, wordt SQLSTATE '02000' / SQLCODE <> 0 gegeven en dit wordt gebruikt om 
	-- de WHILE loop te beeindigen. Een CONTINUE handler met UPDATE zorgt er voor dat de SQLSTATE weer naar '00000' / SQLCODE = 0 gaat en de WHILE loop actief blijft.

	---------------- EINDE VAN FOUTEN HANDLERS ---------------------------

	-- Log start van procedure naar RUNCONTROL_30 tabel.
	INSERT INTO DG_I_P_30INF_CBCI.RUNCONTROL_30 (COG_RUN_ID, PROCEDURE_NUMBER, PROCEDURE_NAME, START_DATE)
	VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_UPDATE_REPORTING_ENTITIES_NAME', Current_Timestamp);
	
	IF par_TABLE_NAME NOT IN ('REPORTING_ENTITY', 'CBCREPORTS_SUMMARY', 'CBCREPORTS_CONST_ENTITIES', 'ADDITIONAL_INFO') 
	THEN
		
		-- Tabelnaam uit IN parameter is niet correct. Procedure wordt afgebroken.
		-- Versie 5: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
		UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = 'Table name provided as IN parameter is not accepted: ' || par_TABLE_NAME || '. '
		, ETL_RUN_ID_INT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME';
		
		SET par_STATUS = 1;
		SET par_STEP = 1;
		
	ELSE
			
			-- Tabel REPORTING_ENTITY heeft veld TIN, de andere tabellen heeft REPORTINGENTITYTIN
			IF par_TABLE_NAME = 'REPORTING_ENTITY' 
			THEN 
				SET par_TIN = 'TIN';
			ELSE 
				SET par_TIN = 'REPORTINGENTITYTIN';
			END IF;
			
			-- Zoek hoogste ETL_RUN_ID wat verwerkt gaat worden.
			-- Versie 5: toevoegen TRANSMITTINGCOUNTRY aan WHERE clausule
			SET STMT1 = 'SELECT MAX(ETL_RUN_ID)
											FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || '
											WHERE RE_NAME_KEY IS NULL
											AND TRANSMITTINGCOUNTRY <> ''NL''
											AND ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || ';';
				
			-- Mbv cursor hoogste te verwerken ETL_RUN_ID opslaan voor wegschrijven naar runcontrol tabel aan einde
			PREPARE S1 FROM STMT1;
			OPEN cur_UPDATE;
			FETCH cur_UPDATE INTO par_ETL_RUN_MAX;
			CLOSE cur_UPDATE;
			
			SET par_STEP = 2;
			
			-- BEGIN TRANSACTION: alles wordt terug gedraaid als iets fout gaat tussen BT en ET
			BT;
	
			-- Update veld RE_NAME_KEY van opgegeven hoofdtabel met naam van MNE voor eerste versie van rapport per reportingperiod
			-- Voor opvolgende rapporten wordt de naam afgeleid uit deze eerste versie. Dit om verschillen in spelwijze te voorkomen.
			-- Versie 4: Logica voor bepalen RE_NAME_KEY aanpassen als meerdere rapporten met verschillende reportingperiod in zelfde kalenderjaar bestaan
			-- Versie 5: Filter voor TRANSMITTINGCOUNTRY aan WHERE statement toegevoegd
			SET STMT1 = 'UPDATE T
										FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS T,
										(SELECT MS.SENDINGENTITYIN
											, MS.TRANSMITTINGCOUNTRY
											, MS.MESSAGEREFID
											, MS.REPORTINGPERIOD
											, MS.X_ONTVANGSTDATUMTIJD
											, RE.CBCBODYID
											, RE.TIN
											, RN.NAME
											, RN.VOLGNR_COG
											, MS.ETL_RUN_ID
											, RANK() OVER (PARTITION BY MS.TRANSMITTINGCOUNTRY, RE.TIN, RN.NAME, EXTRACT (YEAR FROM MS.REPORTINGPERIOD) ORDER BY MS.REPORTINGPERIOD) AS REP_RANK
											FROM DG_I_P_30INF_CBCI.MESSAGE_SPEC AS MS
											INNER JOIN DG_I_P_30INF_CBCI.REPORTING_ENTITY AS RE
												ON MS.MESSAGEREFID = RE.MESSAGEREFID
												AND COALESCE(MS.SENDINGENTITYIN, '''') = COALESCE(RE.SENDINGENTITYIN, '''')
												AND MS.TRANSMITTINGCOUNTRY = RE.TRANSMITTINGCOUNTRY
												AND MS.ETL_RUN_ID = RE.ETL_RUN_ID
											INNER JOIN DG_I_P_30INF_CBCI.REPORTING_ENTITY_NAME AS RN
												ON RE.TIN = RN.REPORTINGENTITYTIN
												AND RE.CBCBODYID = RN.CBCBODYID
												AND RE.ETL_RUN_ID = RN.ETL_RUN_ID
											WHERE RE.DOCTYPEINDIC = ''OECD1''
											AND MS.TRANSMITTINGCOUNTRY <> ''NL''
											AND RN.VOLGNR_COG = 1
											QUALIFY RANK() OVER (PARTITION BY MS.TRANSMITTINGCOUNTRY, RE.TIN, RN.NAME, MS.REPORTINGPERIOD ORDER BY MS.X_ONTVANGSTDATUMTIJD, RN.VOLGNR_COG) = 1
										) AS S
										SET RE_NAME_KEY = CASE
																							WHEN S.REP_RANK > 1 THEN S.NAME || '' - '' || CAST((S.REP_RANK -1) AS VARCHAR(2))
																							ELSE S.NAME
																						END
										WHERE T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
										AND T.MESSAGEREFID = S.MESSAGEREFID
										AND T.CBCBODYID = S.CBCBODYID
										AND T.ETL_RUN_ID = S.ETL_RUN_ID
										AND T.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
										AND T.RE_NAME_KEY IS NULL;';

			EXECUTE IMMEDIATE STMT1;
		
			SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
			SET par_STEP = 3;
		
			-- Versie 3: Update RE_NAME_KEY in tabellen voor rapport met OECD0 voor RE en OECD1 voor andere data in rapport
			-- TI N is wel gevuld (meegeleverd door MIH) maar OECD0 is niet verwerkt in REP_ENT (update van Rep.Ent. en detailtabellen van Rep.Ent. is lastig als OECD0 van Rep.Ent. geen CORRDOCREFID heeft)
			-- Update hoeft niet plaats te vinden op REPORTING_ENTITY tabel (data is daar niet aanwezig), alleen op SUM, CE en AI
			-- Startpunt is 20-laag omdat OECD0 niet in 30-laag is opgenomen
			-- Veronderstelling is dat inhoud van OECD0 voor Rep.Ent. qua inhoud gelijk is aan OECD1 voor Rep.Ent. van oorspronkelijke bericht en dat naam (volgorde) ook identiek is
			-- !!!!!!!!!!!!! Werkt nog niet voor nieuwe logica van versie 4 voor alternatieve RE_NAME_KEY !!!!!!!!!!!!!!!!!!
			-- Versie 5: Filter voor TRANSMITTINGCOUNTRY aan WHERE statement toegevoegd
			IF par_TABLE_NAME <> 'REPORTING_ENTITY' 
			THEN 

				SET STMT1 = 'UPDATE T
											FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS T,
											(
												SELECT RE.SENDINGENTITYIN
												, RE.TRANSMITTINGCOUNTRY
												, RE.MESSAGEREFID
												, RE.CBCBODYID
												, RE.TIN
												, RN.NAME
												, RN.VOLGNR
												, RE.ETL_RUN_ID
												FROM DG_I_P_20GEG_CBCI.REPORTING_ENTITY AS RE
												INNER JOIN DG_I_P_20GEG_CBCI.REPORTING_ENTITY_NAME AS RN
													ON RE.TIN = RN.REPORTINGENTITYTIN
													AND RE.CBCBODYID = RN.CBCBODYID
													AND RE.ETL_RUN_ID = RN.ETL_RUN_ID
												WHERE RE.DOCTYPEINDIC = ''OECD0''
												AND RE.TRANSMITTINGCOUNTRY <> ''NL''
												AND RE.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
												QUALIFY RANK() OVER (PARTITION BY RE.TRANSMITTINGCOUNTRY, RE.MESSAGEREFID, RE.TIN, RE.CBCBODYID, RE.ETL_RUN_ID ORDER BY RN.VOLGNR) = 1
											) AS S
											SET RE_NAME_KEY = S.NAME
											WHERE T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
											AND COALESCE(T.SENDINGENTITYIN, '''') = COALESCE(S.SENDINGENTITYIN, '''')
											AND T.MESSAGEREFID = S.MESSAGEREFID
											AND T.CBCBODYID = S.CBCBODYID
											AND T.ETL_RUN_ID = S.ETL_RUN_ID
											AND T.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
											AND T.RE_NAME_KEY IS NULL;';

			EXECUTE IMMEDIATE STMT1;
		
			SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
			SET par_STEP = 4;

			END IF;			

			-- Check of er meerdere updates van een MNE in deze run zitten waarvoor Rep.Ent Naam ontbreekt. (Rep.Ent. Naam niet direct uit vorige bericht te herleiden)
			-- Versie 5: Filter voor TRANSMITTINGCOUNTRY aan WHERE statement toegevoegd
			SET STMT1 = 'SELECT COALESCE(COUNT(*),0)  AS Records
						FROM (
							SELECT DISTINCT S1.SENDINGENTITYIN, S1.TRANSMITTINGCOUNTRY, S1.' || par_TIN || ', S2.RE_NAME_KEY, S1.REPORTINGPERIOD, S1.DOCREFID, S1.CORRDOCREFID, S1.ETL_RUN_ID
							FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS S1
							LEFT OUTER JOIN DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS S2
								ON S1.CORRDOCREFID = S2.DOCREFID
								AND COALESCE(S1.SENDINGENTITYIN, '''')  = COALESCE(S2.SENDINGENTITYIN, '''')
								AND S1.TRANSMITTINGCOUNTRY = S2.TRANSMITTINGCOUNTRY
								AND S1.ETL_RUN_ID >= S2.ETL_RUN_ID
							WHERE S1.RE_NAME_KEY IS NULL
							AND S2.RE_NAME_KEY IS NULL
							AND S1.TRANSMITTINGCOUNTRY <> ''NL''
							AND S1.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
						) AS A;';
						
						SET par_STEP = 5;
			
			-- Mbv cursor aantal records met meerdere updates opslaan in parameter par_MIS_REP
			PREPARE S1 FROM STMT1;
			OPEN cur_UPDATE;
			FETCH cur_UPDATE INTO par_MIS_REP;
			CLOSE cur_UPDATE;
			
			IF par_MIS_REP > 0 THEN
			-- Run bevat meerdere updates op zelfde MNE met ontbrekende Reporting Entity
			BEGIN
			
				-- Zoek alle regels in opgegeven (hoofd)tabel zonder RE_NAME_KEY (TIN behoort overal gevuld te zijn)
				-- Dit geldt voor alle rapporten want RE_NAME_KEY wordt niet gevuld door MIH
				-- Versie 5: Filter voor TRANSMITTINGCOUNTRY aan WHERE statement toegevoegd
				SET STMT1 = 'SELECT DISTINCT T.SENDINGENTITYIN
				, T.TRANSMITTINGCOUNTRY
				, T.' || par_TIN || '
				, T.DOCREFID
				, T.CORRDOCREFID
				, T.ETL_RUN_ID
				FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS T
				WHERE T.RE_NAME_KEY IS NULL
				AND T.TRANSMITTINGCOUNTRY <> ''NL''
				AND T.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
				ORDER BY T.ETL_RUN_ID, T.START_DATE, T.CBCBODYID;';
				-- Alleen als een bericht meerdere updates voor dezelfde MNE bevat wordt CBCBODYID als tie-breaker gebruikt. 
				
				SET par_STEP = 6;
				
				-- laad cursor
				PREPARE S1 FROM STMT1;
				
				-- laad resultaten in cursor
				OPEN cur_UPDATE;
				
				--WHILE (SqlCode = 0) 
				--DO
				
					FETCH cur_UPDATE INTO SEI, TC, RETI, DRI, CDRI, ERI;
					
					-- Update gegevens tabel met RE_NAME_KEY van record waar CORRDOCREFID naar verwijst
					-- Selectie van source rows uniek maken voor update dmv DISTINCT.
					-- Versie 6: SENDINGENTITYIN = '''|| SEI || ''' verwijderd. Werkt niet als SEI = null 
					SET STMT2 = 'UPDATE T
					FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS T,
					(SELECT DISTINCT SENDINGENTITYIN, TRANSMITTINGCOUNTRY, ' || par_TIN || ', RE_NAME_KEY, DOCREFID, CORRDOCREFID, ETL_RUN_ID
						FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || '
						WHERE TRANSMITTINGCOUNTRY = ''' || TC || '''
						AND ' || par_TIN || ' = ''' || RETI || '''
						AND DOCREFID = ''' || CDRI || '''
						AND ETL_RUN_ID <= ' || Trim(Cast(ERI AS VARCHAR(19))) || ') AS S
					SET RE_NAME_KEY = S.RE_NAME_KEY
					WHERE T.DOCREFID = ''' || DRI || '''
					AND COALESCE(T.SENDINGENTITYIN, '''')  = COALESCE(S.SENDINGENTITYIN, '''')
					AND T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
					AND T.' || par_TIN || ' = S.' || par_TIN || '
					AND T.ETL_RUN_ID = ' || Trim(Cast(ERI AS VARCHAR(19))) || '
					AND T.RE_NAME_KEY IS NULL;';
						
					EXECUTE IMMEDIATE STMT2;
		
					SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
					SET par_STEP = 7;
							
				--END WHILE;
					
				CLOSE cur_UPDATE;
			
			END;
			ELSE
			-- UPDATE kan in 1x uitgevoerd worden
			BEGIN
				
				-- Versie 5: Filter voor TRANSMITTINGCOUNTRY aan WHERE statement toegevoegd
				SET STMT2 = 'UPDATE T
						FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS T,
						(SELECT DISTINCT S1.SENDINGENTITYIN, S1.TRANSMITTINGCOUNTRY, 
								S1.' || par_TIN || ' AS TIN,
								S2.RE_NAME_KEY, S1.DOCREFID, S1.CORRDOCREFID, S1.ETL_RUN_ID
							FROM DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS S1
							LEFT OUTER JOIN DG_I_P_30INF_CBCI.' || par_TABLE_NAME || ' AS S2
								ON S1.CORRDOCREFID = S2.DOCREFID
								AND COALESCE(S1.SENDINGENTITYIN, '''')  = COALESCE(S2.SENDINGENTITYIN, '''')
								AND S1.TRANSMITTINGCOUNTRY = S2.TRANSMITTINGCOUNTRY
								AND S1.ETL_RUN_ID >= S2.ETL_RUN_ID
							WHERE S1.RE_NAME_KEY IS NULL
							AND S1.TRANSMITTINGCOUNTRY <> ''NL''
							AND S1.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || ' ) AS S
						SET RE_NAME_KEY = S.RE_NAME_KEY
						WHERE T.DOCREFID = S.DOCREFID
						AND COALESCE(T.CORRDOCREFID, ''x'')  = COALESCE(S.CORRDOCREFID, ''x'')
						AND COALESCE(T.SENDINGENTITYIN, '''')  = COALESCE(S.SENDINGENTITYIN, '''')
						AND T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
						AND T.ETL_RUN_ID = S.ETL_RUN_ID;';
				
				EXECUTE IMMEDIATE STMT2;
				
				SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
				SET par_STEP = 8;
			
			END;
			END IF;
			
			-- END TRANSACTION: tot hier wordt alles teruggedraaid als iets fout gaat
			ET;
			
			-- Wegschrijven naar RUNCONTROL_30 tabel dat procedure succesvol is voltooid
			-- Versie 5: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
			UPDATE DG_I_P_30INF_CBCI.RUNCONTROL_30
				SET END_DATE =  Current_Timestamp
				, RUN_RESULT = 'Success'
				, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || Trim(Cast(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
				, ETL_RUN_ID_INT = par_ETL_RUN_MAX
				WHERE COG_RUN_ID = par_COG_RUN_ID
				AND PROCEDURE_NUMBER = par_PROC_NR
				AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME';
				
			SET par_STATUS = 0;
		
		END IF;
	
	END;
