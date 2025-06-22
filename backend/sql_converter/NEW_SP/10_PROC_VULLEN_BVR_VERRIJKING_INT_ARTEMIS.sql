REPLACE PROCEDURE DG_I_O_40ANA_CBC.PROC_VULLEN_BVR_VERRIJKING_INT(
    IN par_COG_RUN_ID INTEGER,
    IN par_ETL_RUN_ID_INT INTEGER,
    IN par_PROC_NR INTEGER,
    OUT par_Status INTEGER)
    BEGIN
                	
                	-----------------------------------------------------------------------------------------------------------
                	-- Naam: DG_I_P_30INF_CBC.PROC_VULLEN_BVR_VERRIJKING_INT
                	-- 
                	-- Versie 1	| 20-06-2018	| Bas de Jong				| CoE COG		| Initiele versie
                	-- Versie 2	| 19-09-2018	| Bas de Jong				| CoE COG		| Toevoeging par_STEP voor identificatie waar proces fout gaat
                	-- Versie 3	| 01-10-2018	| Bas de Jong				| CoE COG		| Reg.ex. toegevoegd voor filteren RSIN nummer uit TIN --> TIN_CLEAN
                	-- Versie 4	| 05-10-2018	| Bas de Jong				| CoE COG		| Update op reg.ex voor TIN clean (verwijderen punten en spaties)
                	-- Versie 5	| 12-10-2018	| Bas de Jong				| CoE COG		| Voorkomen wegschrijven dubbele records
                	-- Versie 6	| 04-12-2018	| Bas de Jong				| CoE COG		| Combineren Internationale en Nationale stroom 
                	-- Versie 7	| 16-01-2019	| Bas de Jong				| CoE COG		| Uitbreiden filter voor selectie van Nederlandse entiteiten
                	-- Versie 8	| 12-02-2019	| Bas de Jong				| CoE COG		| Aanpassing filter
                	-- Versie 9	| 19-04-2019	| Bas de Jong				| CoE COG		| Aanpasing filter uit versie 7: stond te ruim.
                	-- Versie 10	| 07-05-2019	| Bas de Jong				| CoE COG		| Verbeteren feedback van SQLEXCEPTION
                	-- Versie 11	| 22-05-2019	| Bas de Jong				| CoE COG		| Jira CORC-128: Alleen wegschrijven Internationaal
                	-- Versie 12	| 11-06-2019	| Bas de Jong				| CoE COG		| Aanpassing feedback SQLEXCEPTION: verwijderen SQLSTATE
                	-- Versie 13	| 07-10-2019	| Bas de Jong				| CoE COG		| Jira CORC-189: toevoegen BVR informatie
                	-- Versie 14	| 18-12-2019	| Bas de Jong				| CoE COG		| Jira CORC-208: toevoegen BVR velden mbt branche en onderncd
                	-- Versie 15	| 09-04-2021	| Ron Zieck      				| CoE COG		| Jira COGB-3430  BVR verrijking met goede TIN_CLEAN levert geen resultaat op.
                    -- Versie 16    | 17-12-2021    | Thari Diefenbach              | CoE COG       | Jira COGB-4237 Oplossen Multiple Source Errors d.m.v. toepassen views met filters
                    -- Versie 17	| 13-07-2022	| Thari Diefenbach				| CoE COG		| Jira COGB-5307 Multiple Source Error door conflicterende records in BVR_ECONEENHEIDREL, BVR_ECONEENHEID en BVR_PERSNNPPER
                	--
                	-- Doel: Filteren van nieuwe Nederlandse TIN nummers uit Reporting Entity en Constituent Entity tabellen van Internationale stroom om BVR tabel te vullen voor verrijking.
                	-- 
                	-- Commentaar: 
                	--
                	--
                	--------------------------------------------------------------------------------------------------------------
                	
        DECLARE par_ZERO_ROWS, par_MAX_ETL_RUN_ID_INT, par_MAX_ETL_RUN_ID_NAT, par_ACT_CNT, par_ACT_UPD, par_STEP INTEGER DEFAULT 0;
        DECLARE par_SQLSTATE CHARACTER(5);
        DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET UNICODE;
                	
                	---------------- BEGIN VAN FOUTEN HANDLERS ---------------------------
                	-- Error handler voor SQLException errors. Log tijdstip stoppen procedure en roll back van alle transacties
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
             -- Versie 12
             --SELECT SqlState INTO par_SQLSTATE;
             -- Versie 10: uitlezen error message
            
            GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = MESSAGE_TEXT;
                        		
                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;		
                        		
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || TRIM(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 12
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_VULLEN_BVR_VERRIJKING_INT';
                        		
            SET par_STATUS = 1;
        END;
                	
                	-- error handler voor als INSERT statement foutmelding geeft omdat RecID automatisch gevuld wordt
        DECLARE CONTINUE HANDLER FOR SQLSTATE 'T5860'
        BEGIN -- Geen actie ondernemen. Mag doorgaan omdat waarschuwing niet kritiek is.
            
        END;
                	
                	-- Error handler voor SQLWarnings. Log tijdstip stoppen procedure en roll back van alle transacties
        DECLARE EXIT HANDLER FOR SQLWARNING
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
            
            SELECT SqlState INTO par_SQLSTATE;
                        		
                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;		
                        		
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || TRIM(par_STEP) || '; '
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_VULLEN_BVR_VERRIJKING_INT';
                        		
            SET par_STATUS = 1;
        END;
                	
                	-- error handler voor als UPDATE statement geen rijen hoeft te updaten (no rows found). Proces gaat door (CONTINUE HANDLER)
        DECLARE CONTINUE HANDLER FOR SQLSTATE '02000'
        BEGIN
                        	-- geen records gevonden om te updaten
                        	-- verhoog teller van aantal queries waar 0 rijen geupdate worden met 1
            SET par_ZERO_ROWS = par_ZERO_ROWS  + 1;
                        		
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET RUN_COMMENT = ' 0 rows updated for ' || CAST(par_ZERO_ROWS AS VARCHAR(2)) || ' queries; '
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_VULLEN_BVR_VERRIJKING_INT';
        END;
                	
                	-- Error handler voor als veld / tabel niet gevond wordt. Log tijdstip stoppen procedure en roll back van alle transacties	
        DECLARE EXIT HANDLER FOR NOT FOUND
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
            
            SELECT SqlState INTO par_SQLSTATE;
                        		
                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;		
                        		
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQL NOT FOUND sqlstate: ' || par_SQLSTATE || ' after step ' || TRIM(par_STEP) || '; '
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_VULLEN_BVR_VERRIJKING_INT';
                        		
            SET par_STATUS = 1;
        END;
                	---------------- EINDE VAN FOUTEN HANDLERS ---------------------------
                
                	-- Log start van procedure naar RUNCONTROL_30 tabel.
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30 (
            COG_RUN_ID
            , PROCEDURE_NUMBER
            , PROCEDURE_NAME
            , START_DATE)
        VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_VULLEN_BVR_VERRIJKING_INT', CURRENT_TIMESTAMP);
                	
                	-- BEGIN TRANSACTION: alles wordt terug gedraaid als iets fout gaat tussen BT en ET
        BEGIN
                		--------------------------------------------------------------------------------------------------------------------------
                		
                		-- Versie 5: voorkomen dat ETL_RUN_ID dubbel verwerkt worden als hoofdprocedure van 30-laag tussentijds wordt afgebroken
        DELETE
        FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr
        WHERE TRANSMITTINGCOUNTRY <> 'NL'
            AND  ETL_RUN_ID > par_ETL_RUN_ID_INT;
                		
                		-- Schrijf TIN nummer van Nederlandse Reporting Entities weg naar BVR tabel
                		-- Versie 6: WHERE stametement aangepast dat zowel Nationaal als Internationaal juiste records geselecteerd worden
                		-- Versie 13: andere tabel en kolommen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_entn_bvr(
        	MESSAGEREFID
        	, SENDINGENTITYIN
        	, TRANSMITTINGCOUNTRY
        	, REPORTINGENTITYTIN
        	, RE_NAME_KEY
        	,REPORTINGPERIOD
        	, CBCBODYID
        	, DOCREFID
        	, "RE/CE"
        	, TIN
        	, TIN_CLEAN
        	, ENTITY_NAME
        	, ETL_RUN_ID
        	, COG_RUN_ID) -- Selecteer gegevens uit subtabel en pas regular expressies toe op de TIN om het TIN-nummer te filteren als het aan bepaalde formats voldoet
        
        SELECT 
        	A.MESSAGEREFID,
            A.SENDINGENTITYIN,
            A.TRANSMITTINGCOUNTRY,
            A.REPORTINGENTITYTIN,
            A.RE_NAME_KEY,
            A.REPORTINGPERIOD,
            A.CBCBODYID,
            A.DOCREFID,
            A."RE/CE",
            A.TIN,
            
            CASE -- versie 3
            
                WHEN Length(A.TIN_CL) >= 11 AND POSITION('NL' IN A.TIN_CL) > 0 THEN SUBSTR(A.TIN_CL, RegExp_Instr(A.TIN_CL, 'NL', 1,1,1), 9) -- RSIN beginnend met NL
            
                WHEN Length(A.TIN_CL) >= 12 AND POSITION('B' IN A.TIN_CL) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, 'B', 9, 1)-9, 9) -- RSIN eindigend met B##
            
                WHEN Length(A.TIN_CL) >= 10 AND POSITION('V' IN A.TIN_CL) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, 'V', 9, 1)-9, 9) -- RSIN eindigend met V##
            
                WHEN Length(A.TIN_CL) >= 10 AND POSITION('L0' IN A.TIN_CL) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, 'L0', 9, 1)-9, 9) -- RSIN eindigend met L##
            
                WHEN Length(A.TIN_CL) = 11 AND SUBSTR(A.TIN_CL,1,2) = '00' THEN SUBSTR(A.TIN_CL, 3, 9) -- RSIN van lengte 11 beginnend met 00   versie 8
            
                WHEN Length(A.TIN_CL) = 9 AND SUBSTR(A.TIN_CL,1,1) = '8' THEN A.TIN_CL -- RSIN van lengte 9 beginnend met 8
            
                WHEN Length(A.TIN_CL) = 9 AND SUBSTR(A.TIN_CL,1,2) = '00' THEN A.TIN_CL -- RSIN van lengte 9 beginnend met 00
            
                WHEN Length(A.TIN_CL) = 8 AND SUBSTR(A.TIN_CL,1,1) = '0' THEN LPad(A.TIN_CL, 9, '0') -- RSIN van lengte 8 beginnend met 0	versie 8
            
                WHEN Length(A.TIN_CL) = 7 THEN LPad(A.TIN_CL, 9, '0') -- RSIN van lengte 7, aanvullend met 2 voorloopnullen
             -- Speciale gevallen
            
                WHEN Length(A.TIN) = 11 AND SUBSTR(A.TIN, 10, 2) = '.0' AND A.TRANSMITTINGCOUNTRY = 'AT' THEN SUBSTR(A.TIN, 1,9) -- RSIN van AT eindigend op .0. Originele TIN omdat . vervangen wordt in TIN_CL. Versie 8
            
                WHEN Length(A.TIN) = 9 AND SUBSTR(A.TIN, 8, 2) = '.0' AND A.TRANSMITTINGCOUNTRY = 'AT' THEN '00' || SUBSTR(A.TIN, 1,7) -- RSIN van AT eindigend op .0. Originele TIN omdat . vervangen wordt in TIN_CL. Versie 8
            
                WHEN Length(A.TIN_CL) >= 10 AND POSITION('FU:' IN A.TIN_CL) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, 'FU:', 9, 1)-9, 9) -- RSIN eindigend met FU:#####
            
                WHEN Length(A.TIN_CL) >= 10 AND POSITION('(' IN A.TIN_CL) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, '(', 9, 1)-9, 9) -- RSIN eindigend met (....)
            
                WHEN Length(A.TIN_CL) >= 12 AND Instr(A.TIN_CL, 'B', 9, 1) > 9 THEN SUBSTR(A.TIN_CL, Instr(A.TIN_CL, 'B', 9, 1)-9, 9)												-- RSIN eindigend met B## maar beginnend met NB
            ELSE NULL
            END AS TIN_CLEAN,
                A.ENTITY_NAME,
                A.ETL_RUN_ID,
                A.COG_RUN_ID
            FROM ( -- selecteer gegevens van Reporting Entity als TIN uitgegeven is door NL en deze geen 'NOTIN'' bevat. Oorsprong rapport is buitenland (internationale stroom)
             -- TIN van de Reporting Entity wordt geschoond van spaties, streepjes, hashtags en andere leestekens
            
            SELECT 
            	RE.MESSAGEREFID,
                RE.SENDINGENTITYIN,
                RE.TRANSMITTINGCOUNTRY,
                RE.TIN AS REPORTINGENTITYTIN,
                RE.RE_NAME_KEY,
                RE.REPORTINGPERIOD,
                RE.CBCBODYID,
                RE.DOCREFID,
                'RE' AS "RE/CE",
                RE.TIN,
                OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(RE.TIN, ' ', NULL), '.', NULL), '''', NULL), '-', NULL), '#', NULL), '"', NULL), ',', NULL), ':', NULL), 'RSIN', NULL), 'N ', NULL), ' ', NULL) AS TIN_CL -- Versie 8: #, ',' en " toegevoegd
                ,
                REN."NAME" AS ENTITY_NAME,
                RE.ETL_RUN_ID,
                par_COG_RUN_ID AS COG_RUN_ID
                FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS RE
                LEFT OUTER JOIN  (
                SELECT "NAME",
                    REPORTINGENTITYTIN,
                    CBCBODYID,
                    DOCREFID,
                    ETL_RUN_ID
                    FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent_name
                    WHERE VOLGNR_COG = 1) AS REN
                ON RE.DOCREFID = REN.DOCREFID
                AND RE.CBCBODYID = REN.CBCBODYID
                AND RE.TIN = REN.REPORTINGENTITYTIN
                AND RE.ETL_RUN_ID = REN.ETL_RUN_ID
                WHERE RE.TRANSMITTINGCOUNTRY <> 'NL'
                    AND  RE.ETL_RUN_ID > par_ETL_RUN_ID_INT
                    AND  RE.ISSUEDBY = 'NL'
                    AND  RE.TIN <> 'NOTIN'
            ) AS A;
                		
        SET par_ACT_CNT = Activity_Count;
        SET par_STEP = 1;
                		
                		-- Schrijf TIN nummer van Nederlandse Constituent Entities weg naar BVR tabel
                		-- DISTINCT clausule toegevoegd: als een TIN van een NL CE meerdere keren in enkel CBC rapprot voorkomt wordt deze maar 1 keer weggeschreven 
                		-- Versie 6: WHERE stametement aangepast dat zowel Nationaal als Internationaal juiste records geselecteerd worden
                		-- Versie 13: andere tabel en kolommen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_entn_bvr(
            MESSAGEREFID
            , SENDINGENTITYIN
            , TRANSMITTINGCOUNTRY
            , REPORTINGENTITYTIN
            , RE_NAME_KEY
            , REPORTINGPERIOD
            , CBCBODYID
            , DOCREFID
            , "RE/CE"
            , TIN
            , TIN_CLEAN
            , ENTITY_NAME
            , ETL_RUN_ID
            , COG_RUN_ID) -- Selecteer gegevens uit subtabel en pas regular expressies toe op de TIN om het TIN-nummer te filteren als het aan bepaalde formats voldoet
        
        SELECT 
            B.MESSAGEREFID,
            B.SENDINGENTITYIN,
            B.TRANSMITTINGCOUNTRY,
            B.REPORTINGENTITYTIN,
            B.RE_NAME_KEY,
            B.REPORTINGPERIOD,
            B.CBCBODYID,
            B.DOCREFID,
            B."RE/CE",
            B.TIN,
            
            CASE -- versie 3
            
                WHEN Length(B.TIN_CL) >= 11 AND POSITION('NL' IN B.TIN_CL) > 0 THEN SUBSTR(B.TIN_CL, RegExp_Instr(B.TIN_CL, 'NL', 1,1,1), 9) -- RSIN beginnend met NL
            
                WHEN Length(B.TIN_CL) >= 12 AND POSITION('B' IN B.TIN_CL) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, 'B', 9, 1)-9, 9) -- RSIN eindigend met B##
            
                WHEN Length(B.TIN_CL) >= 10 AND POSITION('V' IN B.TIN_CL) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, 'V', 9, 1)-9, 9) -- RSIN eindigend met V##
            
                WHEN Length(B.TIN_CL) >= 10 AND POSITION('L0' IN B.TIN_CL) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, 'L0', 9, 1)-9, 9) -- RSIN eindigend met L##
            
                WHEN Length(B.TIN_CL) = 11 AND SUBSTR(B.TIN_CL,1,2) = '00' THEN SUBSTR(B.TIN_CL, 3, 9) -- RSIN van lengte 11 beginnend met 00    versie 8
            
                WHEN Length(B.TIN_CL) = 9 AND SUBSTR(B.TIN_CL,1,1) = '8' THEN B.TIN_CL -- RSIN van lengte 9 beginnend met 8
            
                WHEN Length(B.TIN_CL) = 9 AND SUBSTR(B.TIN_CL,1,2) = '00' THEN B.TIN_CL -- RSIN van lengte 9 beginnend met 00
            
                WHEN Length(B.TIN_CL) = 8 AND SUBSTR(B.TIN_CL,1,1) = '0' THEN LPad(B.TIN_CL, 9, '0') -- RSIN van lengte 8 beginnend met 0	versie 8
            
                WHEN Length(B.TIN_CL) = 7 THEN LPad(B.TIN_CL, 9, '0') -- RSIN van lengte 7, aanvullend met 2 voorloopnullen
             -- Speciale gevallen
            
                WHEN Length(B.TIN) = 11 AND SUBSTR(B.TIN, 10, 2) = '.0' AND B.TRANSMITTINGCOUNTRY = 'AT' THEN SUBSTR(B.TIN, 1,9) -- RSIN van AT eindigend op .0. Originele TIN omdat . vervangen wordt in TIN_CL. Versie 8
            
                WHEN Length(B.TIN) = 9 AND SUBSTR(B.TIN, 8, 2) = '.0' AND B.TRANSMITTINGCOUNTRY = 'AT' THEN '00' || SUBSTR(B.TIN, 1,7) -- RSIN van AT eindigend op .0. Originele TIN omdat . vervangen wordt in TIN_CL. Versie 8
            
                WHEN Length(B.TIN_CL) >= 10 AND POSITION('FU:' IN B.TIN_CL) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, 'FU:', 9, 1)-9, 9) -- RSIN eindigend met FU:#####
            
                WHEN Length(B.TIN_CL) >= 10 AND POSITION('(' IN B.TIN_CL) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, '(', 9, 1)-9, 9) -- RSIN eindigend met (....)
            
                WHEN Length(B.TIN_CL) >= 12 AND Instr(B.TIN_CL, 'B', 9, 1) > 9 THEN SUBSTR(B.TIN_CL, Instr(B.TIN_CL, 'B', 9, 1)-9, 9)												-- RSIN eindigend met B## maar beginnend met NB
            ELSE NULL
            END AS TIN_CLEAN,
                B.ENTITY_NAME,
                B.ETL_RUN_ID,
                B.COG_RUN_ID
            FROM ( -- selecteer gegevens van Constituent Entity als TIN uitgegeven is door NL en deze geen 'NOTIN'' bevat, or als RESCOUNTRYCODE = NL maar land van uitgifte is niet NL. 
             -- Oorsprong rapport IS buitenland (internationale stroom)
             -- TIN van de Reporting Entity wordt geschoond van spaties, streepjes, hashtags en andere leestekens
            
            SELECT DISTINCT 
                CE.MESSAGEREFID,
                CE.SENDINGENTITYIN,
                CE.TRANSMITTINGCOUNTRY,
                CE.REPORTINGENTITYTIN,
                CE.RE_NAME_KEY,
                CE.REPORTINGPERIOD,
                CE.CBCBODYID,
                CE.DOCREFID,
                'CE' AS "RE/CE",
                CE.TIN,
                OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(OReplace(CE.TIN, ' ', NULL), '.', NULL), '''', NULL), '-', NULL), '#', NULL), '"', NULL), ',', NULL), ':', NULL), 'RSIN', NULL), 'N ', NULL), ' ', NULL) AS TIN_CL -- Versie 8: #, ',' en " toegevoegd
                ,
                RCN."NAME" AS ENTITY_NAME,
                CE.ETL_RUN_ID,
                par_COG_RUN_ID AS COG_RUN_ID
                FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS CE
                LEFT OUTER JOIN (
                SELECT "NAME",
                    CBCBODYID,
                    CBCREPORTID,
                    CONSTENTITYID,
                    DOCREFID,
                    TIN,
                    ETL_RUN_ID
                    FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_name
                    WHERE VOLGNR_COG = 1) AS RCN
                ON  CE.CBCBODYID = RCN.CBCBODYID
                AND CE.CBCREPORTID = RCN.CBCREPORTID
                AND CE.CONSTENTITYID = RCN.CONSTENTITYID
                AND CE.DOCREFID = RCN.DOCREFID
                AND CE.TIN = RCN.TIN
                AND CE.ETL_RUN_ID = RCN.ETL_RUN_ID
                WHERE (( CE.TRANSMITTINGCOUNTRY <> 'NL'
                AND CE.ETL_RUN_ID > par_ETL_RUN_ID_INT
                AND CE.ISSUEDBY = 'NL')
                                					-- Versie 9: selectie criteria aangepast (stonden te ruim)
                                					-- Versie 7: selectie criteria uitgebreid
                OR (CE.TRANSMITTINGCOUNTRY <> 'NL'
                AND CE.RESCOUNTRYCODE = 'NL'
                AND (CE.ISSUEDBY <> 'NL' OR CE.ISSUEDBY IS NULL)
                AND CE.ETL_RUN_ID > par_ETL_RUN_ID_INT))
                    AND  CE.TIN <> 'NOTIN'
                    AND  CE.TIN <> 'NO TIN'
            ) AS B;
                		
        SET par_ACT_CNT = par_ACT_CNT + Activity_Count;
        SET par_STEP = 2;
                				
                		--------------------------------------------------------------------------------------------------------------------------
                		-- Versie 13: ophalen informatie uit BVR tabellen
                		-- Join TIN_CLEAN vanuit ENTITEITEN_BVR met de tabel 'bvr_persnnpper' uit BVR om gegevens uit BVR te halen.
                		-- Gegevens worden iedere run getracht uit BVR te halen zolang BVR_DOSNR leeg is. (dus geen enemalige poging om match te vinden)
                		-- Versie 14: toevoegen velden mbt branche en onderncd
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr AS T,
            (
        SELECT 
            DISTINCT DT.TRANSMITTINGCOUNTRY,
            DT.MESSAGEREFID,
            DT.ETL_RUN_ID,
            DT.CBCBODYID,
            DT.Datum,
            DT.TIN_CLEAN,
            DT.FINR --, A.FINR
            ,
            A.NAAM,
            B.RELSRTCD,
            B.DOSNR,
            C.DOSNAAM,
            C.DOSTEAM --, C.DOSKTR
            ,
            C.BRANCHE,
            E.OMSCHR,
            D.KANTNM,
            F.ONDERNCD
            FROM 
                        					-- Gegevens selecteren van regels waar TIN_CLEAN een string van tenminste 9 cijfers bevat en BVR_DOSNR nog niet gevuld is.
                        					-- Als BVR_DOSNR ontbreekt wordt iedere keer ddt deze procedure draait opnieuw geprobeerd de gegevens te vinden / matchen met BVR
            (
            SELECT 
                TRANSMITTINGCOUNTRY,
                MESSAGEREFID,
                ETL_RUN_ID,
                CBCBODYID,
                REPORTINGPERIOD AS Datum,
                TIN_CLEAN,
                CAST(TIN_CLEAN AS INTEGER) AS FINR
            FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr
                WHERE RegExp_Similar(TIN_CLEAN, '.*\d{9}.*') = 1
                    AND  TIN_CLEAN IS NOT NULL
                    -- Let op: we sluiten hier (tijdelijk) een 43 TINs uit van verwerking totdat de business heeft gekeken wat er precies mee te doen.
                    AND  TIN_CLEAN NOT IN ('819853203','859840827','818146254','819175225','808927267','810593932','810670343','859113036','821041460','003202665','805111451','818220594','805046987','823495656','812046328','819863634','809377950','809377950','859770539','859763250','005887240','810632111','861123116','818146266','859764023','859840773','850530635','002201847','819853148','858284121','812046328','852957579','805107721','811101307','810670422','859772986','861188299','804315589','859768272','819853215','859773334','800203823','851727049','801813566')
                -- Let op: de volgende zijn uitgesloten ivm de 27-februari-2023 storing
                    AND TIN_CLEAN NOT IN ('003252486', '853048836', '857497339', '855670149', '853372809', '859409533', '862073637', '001132726', '821203320', '001190994', '007560394', '818916084', '856049232', '852915044', '800633544', '851425999', '008383029', '855599327', '821454651', '801356192', '819863634', '002976043', '004143930')
                    AND  BVR_DOSNR IS NULL) AS DT
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_persr_filt AS A
            ON DT.FINR = A.FINR
            AND DT.Datum >= A.INGDAT 
            AND DT.Datum < A.VERVDAT
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_ecorel_filt AS B
            ON A.FINR = B.FINR
            AND DT.Datum >= B.INGDAT 
            AND DT.Datum < B.VERVDAT
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_eco_filt AS C
            ON B.DOSNR = C.DOSNR
            AND DT.Datum >= C.INGDAT 
            AND DT.Datum < C.VERVDAT
            LEFT OUTER JOIN DG_I_O_40ANA_CBC_INPUT.BVR_KANTOOR AS D
            ON C.KANTID = D.KANTID
            AND DT.Datum >= D.INGDAT
            AND DT.Datum < D.VERVDAT
            LEFT OUTER JOIN DG_I_O_40ANA_CBC_INPUT.BVR_BRANCHE AS E
            ON C.BRANCHE = E.BRANCHECD
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_vpbaktiv_filt AS F
            ON DT.FINR = F.FINR
            AND DT.Datum >= F.INGDAT
            AND DT.Datum < F.VERVDAT) AS S
        SET BVR_ENTITEIT_NAAM = S.NAAM
        , BVR_RELSRTCD = S.RELSRTCD
        , BVR_DOSNR = S.DOSNR
        , BVR_DOSNAAM = S.DOSNAAM
        , BVR_DOSTEAM = S.DOSTEAM
                			--, BVR_DOSKTR = S.DOSKTR
        , BVR_BRANCHE_OMSCHR = S.OMSCHR
        , BVR_KANTNM = S.KANTNM
        , BVR_ONDERNCD = S.ONDERNCD
        WHERE T.REPORTINGPERIOD = S.Datum
            AND  T.TIN_CLEAN = S.TIN_CLEAN
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.MESSAGEREFID = S.MESSAGEREFID
            AND  T.ETL_RUN_ID = S.ETL_RUN_ID
            AND  T.CBCBODYID = S.CBCBODYID
            AND  S.DOSNR IS NOT NULL
            -- ONDERSTAANDE REGEL IS EEN HACK: TO REMOVE!
            -- We wachten hier eerst op oplossingen voor de multiple-source errors vanuit de business
            AND  S.ETL_RUN_ID > 2049572 -- temp fix: REMOVE ME!
            AND  T.BVR_DOSNR IS NULL;
                		
        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 3;
                		
                			
                		/*Versie 15 COGB-3430 Als datum REPORTING PERIOD valt na vervaldatum binnen een jaar dan geen resultaat. DOSNR blijft dan leeg.
                		    Door onderstaande update voor die gevallen waarvoor DOSNR IS NULL AND BVR_ENTITEIT_NAAM IS NOT NULL zonder ingangs en einddatum uitvraging zullen deze wel geupdate worden.*/
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr AS T,
            (
        SELECT 
            DISTINCT DT.TRANSMITTINGCOUNTRY,
            DT.MESSAGEREFID,
            DT.ETL_RUN_ID,
            DT.CBCBODYID,
            DT.Datum,
            DT.TIN_CLEAN,
            DT.FINR,
            A.NAAM,
            B.RELSRTCD,
            B.DOSNR,
            C.DOSNAAM,
            C.DOSTEAM,
            C.BRANCHE,
            E.OMSCHR,
            D.KANTNM,
            F.ONDERNCD
            FROM 
                        					-- Gegevens selecteren van regels waar TIN_CLEAN een string van tenminste 9 cijfers bevat en BVR_DOSNR nog niet gevuld is.
                        					--Update zonder rekening te houden met datums.
            (
            SELECT 
                TRANSMITTINGCOUNTRY,
                MESSAGEREFID,
                ETL_RUN_ID,
                CBCBODYID,
                REPORTINGPERIOD AS Datum,
                TIN_CLEAN,
                CAST(TIN_CLEAN AS INTEGER) AS FINR
            FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr
                WHERE RegExp_Similar(TIN_CLEAN, '.*\d{9}.*') = 1
                    AND  TIN_CLEAN IS NOT NULL
                    AND  BVR_ENTITEIT_NAAM IS NOT NULL
                    AND  BVR_DOSNR IS NULL) AS DT
                            
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_persr_filt_finr_uniq AS A
            ON DT.FINR = A.FINR
                            
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_ecorel_filt_finr_uniq AS B
            ON A.FINR = B.FINR
                            
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_eco_filt_dosnr_uniq AS C
            ON B.DOSNR = C.DOSNR
            LEFT OUTER JOIN DG_I_O_40ANA_CBC_INPUT.BVR_KANTOOR AS D
            ON C.KANTID = D.KANTID
            LEFT OUTER JOIN DG_I_O_40ANA_CBC_INPUT.BVR_BRANCHE AS E
            ON C.BRANCHE = E.BRANCHECD
                            
            LEFT OUTER JOIN DG_I_O_40ANA_CBC.DpCBCV_bvr_vpbaktiv_filt_finr_uniq AS F
            ON DT.FINR  = F.FINR) AS S
        SET 
        BVR_RELSRTCD = S.RELSRTCD
        , BVR_DOSNR = S.DOSNR
        , BVR_DOSNAAM = S.DOSNAAM
        , BVR_DOSTEAM = S.DOSTEAM
        , BVR_BRANCHE_OMSCHR = S.OMSCHR
        , BVR_KANTNM = S.KANTNM
        , BVR_ONDERNCD = S.ONDERNCD
        WHERE T.REPORTINGPERIOD = S.Datum
            AND  T.TIN_CLEAN = S.TIN_CLEAN
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.MESSAGEREFID = S.MESSAGEREFID
            AND  T.ETL_RUN_ID = S.ETL_RUN_ID
            AND  T.CBCBODYID = S.CBCBODYID
            AND  T.BVR_DOSNR IS NULL;
                				
        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 4;
                	
                	-- END TRANSACTION: tot hier wordt alles teruggedraaid als iets fout gaat
        END;
        IF par_ACT_CNT > 0 THEN -- Ophalen hoogste ETL_RUN_ID wat verwerkt is. Geeft zelfde ETL_RUN_ID als MIH geen run gedraaid heeft na laatste keer dat deze job uitgevoerd is.
             -- Als procedure is fout gegaan is max ETL_RUN_ID = 0. Dit wordt gevuld in de Handlers en bereikt dit punt niet.
            
            SELECT COALESCE(MAX(ETL_RUN_ID),NULL) INTO par_MAX_ETL_RUN_ID_INT
                FROM DG_I_O_40ANA_CBC.DpCBCD_entn_bvr
                WHERE TRANSMITTINGCOUNTRY <> 'NL';
            ELSE
            SET par_MAX_ETL_RUN_ID_NAT = NULL;
            END IF;
                	
                	-- Wegschrijven naar RUNCONTROL_30 tabel dat procedure succesvol is voltooid
        UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
        SET END_DATE =  CURRENT_TIMESTAMP
        , RUN_RESULT = 'Success'
        , RUN_COMMENT =
        CASE
            WHEN par_ACT_CNT = 0 THEN 'No new records to process' ELSE TRIM(CAST(par_ACT_CNT AS VARCHAR(11))) || 'records inserted; ' || TRIM(CAST(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
        END
        , ETL_RUN_ID_INT = par_MAX_ETL_RUN_ID_INT
        WHERE COG_RUN_ID = par_COG_RUN_ID
            AND  PROCEDURE_NUMBER = par_PROC_NR
            AND  PROCEDURE_NAME = 'PROC_VULLEN_BVR_VERRIJKING_INT';
                		
        SET par_STATUS = 0;
    END;