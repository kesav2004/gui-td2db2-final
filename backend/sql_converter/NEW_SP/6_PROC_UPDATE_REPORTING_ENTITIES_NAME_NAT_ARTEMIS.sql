REPLACE PROCEDURE DG_I_O_40ANA_CBC.PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT(
	IN par_COG_RUN_ID INTEGER, 
	IN par_ETL_RUN_ID INTEGER, 
	IN par_PROC_NR INTEGER, 
	IN par_TABLE_NAME VARCHAR(40), 
	OUT par_Status INTEGER)
	BEGIN
	
		
	-----------------------------------------------------------------------------------------------------------
	-- Naam: DG_I_P_30INF_CBC.PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT
	-- 
	-- Versie 1	| 27-11-2018	| Bas de Jong				| CoE COG		| Initiele versie
	-- Versie 2	| 25-01-2019	| Bas de Jong				| CoE COG		| SENDINGENTITYIN niet meenemen voor NL rapporten in bepalen naam. Zorgt er voor dat MESSAGEREFID niet meer uniek hoeft te zijn, maar dit behoort het wel te zijn icm REPORTINGENTITYTIN
	-- Versie 3	| 16-04-2019	| Bas de Jong				| CoE COG		| Jira COGB-1263: juist vullen van RE_NAME_KEY in hoofdtabellen.
	-- Versie 4	| 01-05-2019	| Bas de Jong				| CoE COG		| Resetten van par_COUNT bij iedere iteratie. & Verbeteren feedback van SQLEXCEPTION
	-- Versie 5	| 11-06-2019	| Bas de Jong				| CoE COG		| Aanpassing feedback SQLEXCEPTION: verwijderen SQLSTATE
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
	
	DECLARE par_ZERO_ROWS, par_ACT_UPD, par_MIS_REP, par_STEP, par_ETL_RUN_MAX, par_COUNT INTEGER DEFAULT 0;
	
	DECLARE par_SQLSTATE CHARACTER(5);
	DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET Unicode;
	
	DECLARE par_TIN, SEI VARCHAR(50);
	DECLARE TC VARCHAR(2);
	DECLARE MRI, RETI VARCHAR(100);
	DECLARE DRI, CDRI VARCHAR(250);
	DECLARE CBI DECIMAL(19,0);
	DECLARE CTN, ERI INTEGER;
	DECLARE RP DATE;
	DECLARE SD TIMESTAMP(6);
	DECLARE STMT1, STMT2 VARCHAR(3000);
	DECLARE cur_UPDATE CURSOR FOR S1;
	DECLARE cur_COUNT CURSOR FOR S2;
	
	---------------- BEGIN VAN FOUTEN HANDLERS ---------------------------
	-- Error handler voor SQLException errors. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SqlException
	BEGIN
	
		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		-- Versie 5
		-- SELECT SqlState INTO par_SQLSTATE;
		
		-- Versie 4: uitlezen error message
		GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = Message_Text;
		
		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;		
		
		UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || Trim(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 5
		, ETL_RUN_ID_NAT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT';
		
		SET par_STATUS = 1;

	END;
	
	-- Error handler voor SQLWarnings. Log tijdstip stoppen procedure en roll back van alle transacties
	DECLARE EXIT HANDLER FOR SQLWARNING
	BEGIN
	
		-- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
		SELECT SqlState INTO par_SQLSTATE;
		
		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
		ROLLBACK;		
		
		UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
		SET END_DATE =  Current_Timestamp
		, RUN_RESULT = 'ERROR'
		, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || Trim(par_STEP) || '; '
		, ETL_RUN_ID_NAT = 0
		WHERE COG_RUN_ID = par_COG_RUN_ID
		AND PROCEDURE_NUMBER = par_PROC_NR
		AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT';
		
		SET par_STATUS = 1;
		
	END;
	
	-- Geen NOTFOUND of SQLSTATE '02000' handler. Als einde van cursor bereikt wordt, wordt SQLSTATE '02000' / SQLCODE <> 0 gegeven en dit wordt gebruikt om 
	-- de WHILE loop te beeindigen. Een CONTINUE handler met UPDATE zorgt er voor dat de SQLSTATE weer naar '00000' / SQLCODE = 0 gaat en de WHILE loop actief blijft.

	---------------- EINDE VAN FOUTEN HANDLERS ---------------------------

	-- Log start van procedure naar RUNCONTROL_30 tabel.
	INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30 (
	COG_RUN_ID
	, PROCEDURE_NUMBER
	, PROCEDURE_NAME
	, START_DATE)
	VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT', Current_Timestamp);
	
	IF par_TABLE_NAME NOT IN ('DpCBCD_repo_ent', 'DpCBCD_cbcrepos_sum', 'DpCBCD_cbcrepos_cnst_ents', 'DpCBCD_add_info') 
	THEN
		BEGIN
			-- Tabelnaam uit IN parameter is niet correct. Procedure wordt afgebroken.
			UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
			SET END_DATE =  Current_Timestamp
			, RUN_RESULT = 'ERROR'
			, RUN_COMMENT = 'Table name provided as IN parameter is not accepted: ' || par_TABLE_NAME || '. '
			, ETL_RUN_ID_NAT = 0
			WHERE COG_RUN_ID = par_COG_RUN_ID
			AND PROCEDURE_NUMBER = par_PROC_NR
			AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT';
			
			SET par_STATUS = 1;
			SET par_STEP = 1;
		
		END;
	ELSE
		BEGIN	
			-- Tabel REPORTING_ENTITY heeft veld TIN, de andere tabellen heeft REPORTINGENTITYTIN
			IF par_TABLE_NAME = 'DpCBCD_repo_ent' 
			THEN 
				SET par_TIN = 'TIN';
			ELSE 
				SET par_TIN = 'REPORTINGENTITYTIN';
			END IF;
			
			-- Zoek hoogste ETL_RUN_ID wat verwerkt gaat worden.
			SET STMT1 = 'SELECT Coalesce(MAX(ETL_RUN_ID),0)
											FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || '
											WHERE RE_NAME_KEY IS NULL
											AND TRANSMITTINGCOUNTRY = ''NL''
											AND ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || ';';
				
			-- Mbv cursor hoogste te verwerken ETL_RUN_ID opslaan voor wegschrijven naar runcontrol tabel aan einde
			PREPARE S1 FROM STMT1;
			OPEN cur_UPDATE;
			FETCH cur_UPDATE INTO par_ETL_RUN_MAX;
			CLOSE cur_UPDATE;
			
			SET par_STEP = 2;
			
			-- BEGIN TRANSACTION: alles wordt terug gedraaid als iets fout gaat tussen BT en ET
			BEGIN
	
				-- Zoek alle regels in opgegeven (hoofd)tabel zonder RE_NAME_KEY (TIN behoort overal gevuld te zijn)
				-- Dit geldt voor alle rapporten want RE_NAME_KEY wordt niet gevuld door MIH
				-- Versie 2: SENDINGENTITYIN verwijderd uit selectie
				SET STMT1 = 'SELECT DISTINCT T.TRANSMITTINGCOUNTRY
				, T.' || par_TIN || '
				, T.REPORTINGPERIOD
				, T.MESSAGEREFID
				, T.CBCBODYID
				, T.START_DATE
				, T.ETL_RUN_ID
				FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || ' AS T
				WHERE T.RE_NAME_KEY IS NULL
				AND T.TRANSMITTINGCOUNTRY = ''NL''
				AND T.ETL_RUN_ID > ' || Trim(Cast(par_ETL_RUN_ID AS VARCHAR(19))) || '
				ORDER BY T.ETL_RUN_ID, T.START_DATE, T.CBCBODYID;';
				
				SET par_STEP = 3;
				
				-- laad cursor
				PREPARE S1 FROM STMT1;
				
				-- laad resultaten in cursor
				OPEN cur_UPDATE;
				
				L1: LOOP
					
						-- versie 2: verwijderen SEI uit selectie
						FETCH cur_UPDATE INTO TC, RETI, RP, MRI, CBI, SD, ERI;
						
						-- Exit statement for loop (als eind cursor file is bereikt)
   						IF (SqlCode > 0) THEN
   							LEAVE L1;
   						END IF;
						
						-- Check (tel) of er rapporten aanwezig zijn waar de RE_NAME_KEY al gevuld is. 
						-- Deze telling wordt voor iedere row in de cursor opnieuw gedaan omdat de situatie na verwerking van cursor row anders kan zijn.
						-- Versie 2: SENDINGENTITYIN verwijderd uit selectie
						SET STMT2 = 'SELECT COUNT(RE_NAME_KEY) OVER (PARTITION BY TRANSMITTINGCOUNTRY, ' || par_TIN || ', REPORTINGPERIOD) AS XVAL
								FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || '
								WHERE RE_NAME_KEY IS NOT NULL
								AND TRANSMITTINGCOUNTRY = ''NL''
								AND ' || par_TIN || ' = '''  || RETI || '''
								AND REPORTINGPERIOD = DATE ''' || Cast(Cast(RP AS DATE Format 'dd-mm-yyyy') AS DATE Format 'yyyy-mm-dd') || ''';';
						
						-- Versie 4: Resetten van par_COUNT bij iedere iteratie. Als STMT2 voor cursor cur_COUNT geen resultaat geeft, wordt par_COUNT niet geupdate
						-- en blijft oude waarde behouden, wat tot verkeerde verwerking van records kan leiden.
						SET par_COUNT = 0 ;
						
						PREPARE S2 FROM STMT2;
						OPEN cur_COUNT;
						FETCH cur_COUNT INTO par_COUNT;
						CLOSE cur_COUNT;
						
						-- Bestaat er al een versie waarvoor de naam is ingevuld
						IF par_COUNT > 0 THEN
							
								-- Indien ja, neem deze over van eerdere versie
								-- Versie 2: SENDINGENTITYIN verwijderd uit selectie
								SET STMT2 = 'UPDATE T
								FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || ' AS T,
									(SELECT DISTINCT TRANSMITTINGCOUNTRY, ' || par_TIN || ', REPORTINGPERIOD, RE_NAME_KEY
										FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || '
										WHERE RE_NAME_KEY IS NOT NULL
									) AS S
								SET RE_NAME_KEY = S.RE_NAME_KEY
								WHERE T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
								AND T.' || par_TIN || ' = S.' || par_TIN || '
								AND T.REPORTINGPERIOD = S.REPORTINGPERIOD
								AND T.TRANSMITTINGCOUNTRY = ''NL''
								AND T.' || par_TIN || ' = ''' || RETI || '''
								AND T.ETL_RUN_ID = ' || Trim(Cast(ERI AS VARCHAR(19))) || '
								AND T.CBCBODYID = ' || Trim(CBI (Format 'ZZZZZZZZZZZZZZZZZZ9')) || ';';			--TRIM(CAST(CBI AS VARCHAR(19)))
								
						ELSE
							-- Indien nee, vul met naam van Rep.Ent.
							-- Versie 2: SENDINGENTITYIN verwijderd uit selectie
							
							-- Versie 3: COGB-1263 tabel REPORTING_ENTITY is altijd aanwezig en vullen van RE_NAME_KEY in deze tabel wordt als eerste aangeroepem. 
							-- RE_NAME_KEY in tabel REPORTING_ENTITY is leidend voor andere tabellen
							IF par_TABLE_NAME = 'DpCBCD_repo_ent' 
							THEN
							
								-- Versie 3
								-- Er bestaat nog geen rapport voor gegeven tin en reportingperiod IN REPORTING_ENTITY. Naam halen uit het bericht. 
								SET STMT2 = 'UPDATE T
								FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || ' AS T,
									DG_I_O_40ANA_CBC.DpCBCD_repo_ent_name AS N
								SET RE_NAME_KEY = N.NAME
								WHERE T.' || par_TIN || ' = N.REPORTINGENTITYTIN
								AND T.ETL_RUN_ID = N.ETL_RUN_ID
								AND T.CBCBODYID = N.CBCBODYID
								AND T.' || par_TIN || ' = ''' || RETI || '''
								AND T.TRANSMITTINGCOUNTRY = ''NL''
								AND T.CBCBODYID = ' || Trim(CBI (Format 'ZZZZZZZZZZZZZZZZZZ9')) || '
								AND T.ETL_RUN_ID = ' || Trim(Cast(ERI AS VARCHAR(19))) || ';';
								
							ELSE 

								-- Versie 3
								-- Er bestaat nog geen rapport voor gegeven tin en reportingperiod in gegeven hoofdtabel. Naam halen uit RE_NAME_KEY van REPORTING_ENTITY van zelfde rapport.
								SET STMT2 = 'UPDATE T
								FROM DG_I_O_40ANA_CBC.' || par_TABLE_NAME || ' AS T,
									DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS N
								SET RE_NAME_KEY = N.RE_NAME_KEY
								WHERE T.' || par_TIN || ' = N.TIN
								AND T.ETL_RUN_ID = N.ETL_RUN_ID
								AND T.CBCBODYID = N.CBCBODYID
								AND T.' || par_TIN || ' = ''' || RETI || '''
								AND T.TRANSMITTINGCOUNTRY = ''NL''
								AND T.CBCBODYID = ' || Trim(CBI (Format 'ZZZZZZZZZZZZZZZZZZ9')) || '
								AND T.ETL_RUN_ID = ' || Trim(Cast(ERI AS VARCHAR(19))) || ';';	

							END IF;
								
						END IF;
						
						EXECUTE IMMEDIATE STMT2;
													
						SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
						SET par_STEP = 4;
										
				END LOOP L1;
									
				CLOSE cur_UPDATE;
			
			-- END TRANSACTION: tot hier wordt alles teruggedraaid als iets fout gaat
			END;
			
			-- Wegschrijven naar RUNCONTROL_30 tabel dat procedure succesvol is voltooid
			UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
				SET END_DATE =  Current_Timestamp
				, RUN_RESULT = 'Success'
				, RUN_COMMENT = Coalesce(RUN_COMMENT, '') || Trim(Cast(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
				, ETL_RUN_ID_NAT = par_ETL_RUN_MAX
				WHERE COG_RUN_ID = par_COG_RUN_ID
				AND PROCEDURE_NUMBER = par_PROC_NR
				AND PROCEDURE_NAME = 'PROC_UPDATE_REPORTING_ENTITIES_NAME_NAT';
				
			SET par_STATUS = 0;
	
		END;
	END IF;
	
	END;