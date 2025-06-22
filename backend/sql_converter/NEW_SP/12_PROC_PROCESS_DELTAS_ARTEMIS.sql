REPLACE PROCEDURE DG_I_O_40ANA_CBC.PROC_PROCESS_DELTAS( /*
    To do:
    -- Alleen records invoegen / updaten als er geen foutcode van CMG aan zit.
    	-- Krijgen alleen berichten door als het een fout betreft op DOCREFID (DRI) niveau. (80000 niveau)
    	-- Berichten met een fout op MESSAGEREFID (MRI) worden door CMG niet doorgestuurd. (50000 niveau)
    	-- De errors op 50000 niveau kunnen wel doorgestuurd worden door CMG. Deze kunnen gebruikt worden ter informatie dat berichten geweigerd zijn.
    	-- Deze kunnen niet door COG ter indentifcatie van verzendende partij gebruikt worden.

    	-- Errors op 80000 niveau kunnen gekoppeld worden (op MRI en DRI) aan de records die in error zijn. Deze dienen dan niet getoond te worden.
    	-- In alle gevallen zal door CMG aangegeven worden dat het bericht fout is en zal om een nieuw bericht verzocht worden, dus de fouten hoeven in een later stadium niet meer actief gemaakt te worden.
    	-- Enige uitzondering (waarbij berichten niet als fataal gemerkt worden) is als CorrMessageRefId gebruikt wordt (80006 en 80007). Dan wordt om correctie verzocht. CorrMessageRefId wordt niet gebruikt in CBC DAC4. \
    	-- Inhoud vn bericht is in principe goed en zou door COG verwerkt kunnen worden.  Deze foutcodes zouden geaccepteerd kunnen worden.

    */
    IN par_COG_RUN_ID INTEGER,
    IN par_ETL_RUN_ID INTEGER,
    IN par_PROC_NR INTEGER,
    OUT par_STATUS INTEGER)
    BEGIN

                	-----------------------------------------------------------------------------------------------------------
                	-- Naam: DG_I_P_30INF_CBCI.PROC_PROCESS_DELTAS
                	--
                	-- Versie 1	| 22-05-2018	| Bas de Jong				| CoE COG		| Initiele versie
                	-- Versie 2	| 15-08-2018	| Bas de Jong				| CoE COG		| Update statement voor invoegen RESCOUNTRYCODE in cbcrepos_cnst_ents uit CBCREPORTS_SUMMARY
                	-- Versie 3	| 12-09-2018	| Bas de Jong				| CoE COG		| Join met msg_proc_val toegevoegd zodat alleen die berichten verwerkt worden die aan eisen voldoen
                	-- Versie 4	| 19-09-2018	| Bas de Jong				| CoE COG		| Toevoeging par_STEP voor identificatie waar proces fout gaat + filtering voor dubbele indexen
                	-- Versie 5	| 05-10-2018	| Bas de Jong				| CoE COG		| COALESCE(..., 'x') omzetten naar COALESCE(..., '')
                	-- Versie 6	| 12-10-2018	| Bas de Jong				| CoE COG		| Aanpassing voor filteren duplicate records ter voorkoming SQLSTATE Exception voor index violation + voorkomen vaker verwerken zelfde ETL_RUN_ID
                	-- Versie 7	| 23-10-2018	| Bas de Jong				| CoE COG		| Aanpassing als gevolg van toevoegen REPORTINGPERIOD aan hoofdtabellen
                	-- Versie 8	| 19-11-2018	| Bas de Jong				| CoE COG		| Aanpassing in INSERT van repo_ent: OECD3 gaf X_OP_TYPE = 'A' ipv 'D'. OECD3 uitgesloten bij INSERT.
                	-- Versie 9	| 03-12-2018	| Bas de Jong				| CoE COG		| Filteren alleen op Internationale berichten
                	-- Versie 10	| 11-06-2019	| Bas de Jong			| CoE COG		| Aanpassing feedback SQLEXCEPTION: verwijderen SQLSTATE
                    -- Versie 11	| 10-03-2022	| Thari Diefenbach      | CoE COG		| JIRA COGB-4887: Aanpassing aan laag 10 vanuit DF&A
                    -- Versie 12    | 23-01-2022    | Herman Stehouwer      | CoE COG       | JIRA COGB-5862: Run is stuk. In overleg met Henry sluiten we nu twee specifieke ETL_RUN_ID + REPORTINGENTITYIN uit.
                	--
                	-- Doel: verwerken van mutaties in tabellen in 30-laag
                	--
                	-- Commentaar: Per tabel/view uit de 20 laag worden eerst records toegevoegd voor nieuwe data en de nieuwe sitautie als gevolg van correcties (X_OP_TYPE = I / A).
                	-- 							Vervolgens worden UPDATES uitgevoerd voor het deactiveren van records als gevolg van het deleten / terugtrekken van data
                	--								en de oude situatie als gevolg van correcties. (X_OP_TYPE = A / D).
                	--
                	--								Op MESSAGE_SPEC tabellen worden inhoudelijk geen updates uitgevoerd. De header van een bericht corrigeert nooit de header van een eerder verzonden bericht.
                	--
                	--								Volgorde van verwerking van de tabellen is van belang. Eerst dienen de transacties op een hoofdtabel verwerkt te zijn, voor de transacties van een
                	--								detailtabel verwerkt mogen worden. Dit omdat de verwerking van een detailtabel gebruik maakt van informatie uit een hoofdtabel. UPDATES worden
                	--								vanuit de hoofdtabel verwerkt omdat vanuit de detailtabel geen unieke 1-op-1 link is te maken tussen CORRDOCREFID en DOCREFID.
                	--
                	--								-------------------------->>>>>>>>> ONOPGELOST ISSUE <<<<<<<<<--------------------------
                	--								Als batch/run meerdere berichten bevat waarin hetzelfde record (DOCREFID) geupdate wordt mbv CorrDocRefId: meerdere source regels die een enkele target regel proberen te updaten.
                	--								Als in verschillende berichten zitten wordt bericht niet tegengehouden door CMG, wel error 80002
                	--								Als in zelfde bericht meerdere updates op zelfde record zitten wordt dit bericht niet tegengehouden door CMG, wel error 80011
                	--
                	--								--------------------------->>>>>>>> LET OP BIJ TOEVOEGEN STROOM NATIONAAL!!!!!!!!!!!!!!!!!!!!!!!!   <<<<<<<<<<<-------------------------------------------
                	--								1) Als meerdere rapporten van de zelfde partij op een dag worden ontvangen (voor Internationaal) geeft dit geen problemen bij verwerking. INSERTS zorgen voor dat
                	--								eerst alle nieuwe records worden ingevoegd, UPDATE zorgt er vervolgens voor dat de juiste (laatste) records actief zijn obv het CORRDOCREFID.
                	--								2) Hergebruik van DOCREFID onder verschillende MESSAGEREFID (indienen nieuw rapport bij Nationaal) gaat ook fout. CORRDOCREFID wordt niet gebruikt.
                	--								UPDATES om records te deactiveren worden werken niet in dit geval. Er ontstaan dubbelere records bij stroom NAtionaal.
                	--								Nationaal toevoegen in huidige structuur levert problemen op voor Nationaal door geen gebruik CORRDOCREFID en niet controleren op DOCREFID.
                	--								Laatste versie voor NAtionaal wordt bepaald aan hand van datum/tijd verzenden/ontvangst
                	--								-------> Checken of eerdere versie van rapport van bedrijf en verslagjaar bestaat. Indien ja, dan oude versie deactiveren. Indien nee, dan niks deactiveren. APARTE PROCEDURE?
                	--								--------------------------->>>>>>>> LET OP BIJ TOEVOEGEN STROOM NATIONAAL!!!!!!!!!!!!!!!!!!!!!!!!   <<<<<<<<<<<-------------------------------------------
                	--
                	--								Als partij rapport in zijn geheel intrekt is er vanaf dat moment geen actief rapport meer. Historie is wel beschikbaar. Vorige versie, of versie daarvoor wordt niet actief gemaakt.
                	--
                	--								Zender is nationaal uniek te maken door gebruik van SENDINGENTITYIN en (evt) TRANSMITTINGCOUNTRY
                	--								Zender is internationaal uniek te maken door gebruik van TRANSMITTINGCOUNTRY
                	--
                	--------------------------------------------------------------------------------------------------------------

        DECLARE par_ZERO_ROWS, par_MAX_ETL_RUN_ID, par_ACT_INS, par_ACT_UPD, par_STEP, par_ERI_PROC, par_ERI_PROC_MS INTEGER DEFAULT 0;
        DECLARE par_SQLSTATE CHARACTER(5);
        DECLARE par_SQLMSG VARCHAR(118) CHARACTER SET UNICODE;

                	---------------- BEGIN VAN FOUTEN HANDLERS ---------------------------
                	-- Error handler voor SQLException errors. Log tijdstip stoppen procedure en roll back van alle transacties
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK
             -- Versie 10
             -- SELECT SqlState INTO par_SQLSTATE;

            GET DIAGNOSTICS EXCEPTION 1 par_SQLMSG = MESSAGE_TEXT;

                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;

                        		-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30   
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQLEXCEPTION after step ' || TRIM(par_STEP) || ': ' || par_SQLMSG || '; '					-- Versie 10
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_PROCESS_DELTAS';

            SET par_STATUS = 1;
        END;

                	-- Error handler voor SQLWarnings. Log tijdstip stoppen procedure en roll back van alle transacties
        DECLARE EXIT HANDLER FOR SQLWARNING
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK

            SELECT SqlState INTO par_SQLSTATE;

                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;

                        		-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQLWARNING sqlstate: ' || par_SQLSTATE || ' after step ' || TRIM(par_STEP) || '; '
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_PROCESS_DELTAS';

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
                AND  PROCEDURE_NAME = 'PROC_PROCESS_DELTAS';
        END;

                	-- Error handler voor als veld / tabel niet gevond wordt. Log tijdstip stoppen procedure en roll back van alle transacties
        DECLARE EXIT HANDLER FOR NOT FOUND
        BEGIN -- opslaan van SQLSTATE in parameter om te voorkomen dat waarde verloren gaat bij ROLLBACK

            SELECT SqlState INTO par_SQLSTATE;

                        		-- ROLLBACK voor UPDATE van RUNCONTROL tabel om te voorkomen dat deze update van RUNCONTROL ongedaan gemaakt wordt
            ROLLBACK;

                        		-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
            UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
            SET END_DATE =  CURRENT_TIMESTAMP
            , RUN_RESULT = 'ERROR'
            , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || 'SQL NOT FOUND sqlstate: ' || par_SQLSTATE || ' after step ' || TRIM(par_STEP) || '; '
            , ETL_RUN_ID_INT = 0
            WHERE COG_RUN_ID = par_COG_RUN_ID
                AND  PROCEDURE_NUMBER = par_PROC_NR
                AND  PROCEDURE_NAME = 'PROC_PROCESS_DELTAS';

            SET par_STATUS = 1;
        END;
                	---------------- EINDE VAN FOUTEN HANDLERS ---------------------------

                	-- Log start van procedure naar RUNCONTROL_30 tabel.
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30 (COG_RUN_ID, PROCEDURE_NUMBER, PROCEDURE_NAME, START_DATE)
        VALUES (par_COG_RUN_ID, par_PROC_NR, 'PROC_PROCESS_DELTAS', CURRENT_TIMESTAMP); -- Versie 5, versie 9
         -- Haal hoogste ETL_RUN_ID uit Message_Spec

        SELECT COALESCE(MAX(ETL_RUN_ID),0) INTO par_ERI_PROC_MS
            FROM DG_I_O_40ANA_CBC.DpCBCD_msg_spec
            WHERE TRANSMITTINGCOUNTRY <> 'NL'; -- Proces mag niet twee keer gedraaid worden voor dezelfde ETL_RUN_ID (ivm index violation)
         -- Kan zijn dat laden van 30-tabellen goed is gegaan, maar een latere procedure failt
         -- Dan is laatst succesvolle ETL_RUN_ID in Runcontrol (par_ETL_RUN_ID) lager dan in MESSAGE_SPEC (par_ERI_PROC_MS)
         -- par_ETL_RUN_ID wordt dan gelijk gezet aan laatst verwerkte Etl Run Id in MESSAGE_SPEC (par_ERI_PROC_MS).

        IF par_ETL_RUN_ID < par_ERI_PROC_MS THEN
            SET par_ERI_PROC = par_ERI_PROC_MS;
            ELSE
            SET par_ERI_PROC = par_ETL_RUN_ID;
            END IF;

                	-- BEGIN TRANSACTION: alles wordt terug gedraaid als iets fout gaat tussen BT en ET
       -- BT;
       BEGIN        		--------------------------------------------------------------------------------------------------------------------------

                		-- MESSAGE_SPEC
                		-- Alle records overnemen, ook als delete zou betreffen. Geeft aan wanneer een bericht is ontvangen en van wie
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_msg_spec(
	        "SENDINGENTITYIN"
	        , "SENDINGENTITYNAME"
	        , "TRANSMITTINGCOUNTRY"
	        , "MESSAGETYPE"
	        , "LANGUAGE"
	        , "WARNING"
	        , "CONTACT"
	        , "EULOCALFILING"
	        , "EUINCOMPLETE"
	        , "MESSAGEREFID"
	        , "MESSAGETYPEINDIC"
	        , "REPORTINGPERIOD"
	        , "TIMESTAMP"
	        , "RELNR"
	        , "USEDSOFTWAREPACKAGE"
	        , "X_BERICHTID"
	        , "X_ONTVANGSTDATUMTIJD"
	        , "ETL_RUN_ID"
	        , "ETL_STG_TIMESTAMP"
	        , "START_DATE"
	        , "END_DATE"
	        , "CURRENT_FLAG")
        SELECT 
        M."SENDINGENTITYIN",
            M."SENDINGENTITYNAME",
            M."TRANSMITTINGCOUNTRY",
            M."MESSAGETYPE",
            M."LANGUAGE",
            M."WARNING",
            M."CONTACT",
            M."EULOCALFILING",
            M."EUINCOMPLETE",
            M."MESSAGEREFID",
            M."MESSAGETYPEINDIC",
            M."REPORTINGPERIOD",
            M."TIMESTAMP",
            M."RELNR",
            M."USEDSOFTWAREPACKAGE",
            M."X_BERICHTID",
            M."X_ONTVANGSTDATUMTIJD",
            M."ETL_RUN_ID",
            M."ETL_STG_TIMESTAMP",
            M.X_ONTVANGSTDATUMTIJD AS "START_DATE" -- datum van ontvangst bij Poort
            ,
            NULL AS "END_DATE",
            'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_msg_spec AS M
            WHERE M.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = Activity_Count;
        SET par_STEP = 1;
                		-- Een MESSAGEREFID in tabel MESSAGE_SPEC krijgt geen END_DATE.
                		-- Datum tot wanneer bericht geldig is, is afhankelijk van TIN/REPORTINGENTITYTIN die onder de MESSAGEREFID hangt. Dit kan per bericht van de zelfde verzendende partij verschillen
                		-- END_DATE voor een bericht wordt bepaald en opgeslagen in tabel MESSAGE_SPEC_REP_ENT
                		-- Alle joins met onderliggende tabellen worden ook opgehangen aan de tabel MESSAGE_SPEC_REP_ENT

                	--------------------------------------------------------------------------------------------------------------------------

                		-- MESSAGE_SPEC_RECEIVING_cntry
                		-- Alle records overnemen, ook als delete zou betreffen. Geeft aan wanneer een bericht is ontvangen en van wie
         INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_msg_spec_rec_cntry(
	         "MESSAGEREFID"
	         , "SENDINGENTITYIN"
	         , "TRANSMITTINGCOUNTRY"
	         , "RECEIVINGCOUNTRY"
	         , "VOLGNR"
	         ,	"VOLGNR_COG"
	         , "ETL_RUN_ID"
	         , "ETL_STG_TIMESTAMP"
	         , "START_DATE"
	         , "END_DATE"
	         , "CURRENT_FLAG")
         SELECT S."MESSAGEREFID"
             , S."SENDINGENTITYIN"
             , S."TRANSMITTINGCOUNTRY"
             , S."RECEIVINGCOUNTRY"
             , S."VOLGNR"
             , RANK() OVER (PARTITION BY S.MESSAGEREFID, S.SENDINGENTITYIN, S.TRANSMITTINGCOUNTRY, S.ETL_RUN_ID
             ORDER BY S.VOLGNR) AS "VOLGNR_COG"
                 , S."ETL_RUN_ID"
                 , S."ETL_STG_TIMESTAMP"
                 , P.X_ONTVANGSTDATUMTIJD AS "START_DATE" 
                 , NULL AS "END_DATE"
                 , 'Y' AS "CURRENT_FLAG"
             FROM DG_I_O_40ANA_CBC.StCBCI_msg_spec_rec_cntry AS S
             INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
             ON S.MESSAGEREFID = P.MESSAGEREFID
             AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
             AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
             AND S.ETL_RUN_ID = P.ETL_RUN_ID
             WHERE S.ETL_RUN_ID > par_ERI_PROC;

         SET par_ACT_INS = par_ACT_INS + Activity_Count;
         SET par_STEP = 2;       
                		--------------------------------------------------------------------------------------------------------------------------

                		-- MESSAGE_SPEC_CORR_MESSAGE
                		-- Alle records overnemen, ook als delete zou betreffen. Geeft aan wanneer een bericht is ontvangen en van wie
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_msg_spec_corr_msg(
	        "MESSAGEREFID"
	        , "SENDINGENTITYIN"
	        , "TRANSMITTINGCOUNTRY"
	        ,"CORRMESSAGEREFID"
	        , "VOLGNR"
	        , "VOLGNR_COG"
	        , "ETL_RUN_ID"
	        , "ETL_STG_TIMESTAMP"
	        , "START_DATE"
	        , "END_DATE"
	        , "CURRENT_FLAG")
        SELECT 
        	S."MESSAGEREFID"
            , S."SENDINGENTITYIN"
            , S."TRANSMITTINGCOUNTRY"
            , S."CORRMESSAGEREFID"
            , S."VOLGNR"
            , RANK() OVER (PARTITION BY 
            					S.MESSAGEREFID
            					, S.SENDINGENTITYIN
            					, S.TRANSMITTINGCOUNTRY
            					, S.ETL_RUN_ID
            					ORDER BY S.VOLGNR) AS "VOLGNR_COG"
            					, S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                P.X_ONTVANGSTDATUMTIJD AS "START_DATE" -- datum van ontvangst bij Poort P.X_ONTVANGSTDATUMTIJD
                ,
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_msg_spec_corr_msg AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
            ON S.MESSAGEREFID = P.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
            WHERE S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 3;        
                 		--------------------------------------------------------------------------------------------------------------------------

                		-- repo_ent
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_repo_ent(
	        "MESSAGEREFID"
	        , "SENDINGENTITYIN"
	        , "TRANSMITTINGCOUNTRY"
	        , "REPORTINGPERIOD"
	        , "CBCBODYID"
	        , "DOCTYPEINDIC"
	        , "DOCREFID"
	        , "CORRDOCREFID"
	        , "CORRMESSAGEREFID"
	        , "REPORTINGROLE"
	        , "ISSUEDBY"
	        , "TIN"
	        , "ETL_RUN_ID"
	        , "ETL_STG_TIMESTAMP"
	        , "CMG_TD_NEGEER_INDICATIE"
	        , "CMG_TD_NEGEER_REDEN_CODE"
	        , "START_DATE"
	        , "END_DATE"
	        , "CURRENT_FLAG")
        SELECT S."MESSAGEREFID",
            S."SENDINGENTITYIN",
            S.TRANSMITTINGCOUNTRY,
            P.REPORTINGPERIOD,
            S."CBCBODYID",
            S."DOCTYPEINDIC",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."REPORTINGROLE",
            S."ISSUEDBY",
            S."TIN",
            S."ETL_RUN_ID",
            S."ETL_STG_TIMESTAMP",
            'N' AS "CMG_TD_NEGEER_INDICATIE",
            NULL AS "CMG_TD_NEGEER_REDEN_CODE",
            P.X_ONTVANGSTDATUMTIJD AS "START_DATE" -- datum van ontvangst bij Poort
            ,
            NULL AS "END_DATE",
            'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C	-- Versie 3
            ON S.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = C.ETL_RUN_ID
            AND S.CBCBODYID = C.CBCBODYID
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
            ON S.MESSAGEREFID = P.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  S.DOCTYPEINDIC <> 'OECD0' -- OECD0 is resend van data die al aanwezig behoort te zijn voor RE. Mag niet gewijzigd zijn. Zie sectie 8.1.1.2 van TS.

                AND  S.DOCTYPEINDIC <> 'OECD3' -- Versie 8: DOCTYPEINDIC = 'OECD3' geeft X_OP_TYPE = 'A' ipv 'D'.

                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;
                		/*AND NOT EXISTS (SELECT 'x' 						-- sluit berichten uit met errors op docrefid niveau (80000)
                													FROM DG_I_O_40ANA_CBC.StCBCI_statusmessage AS E
                													WHERE E.MESSAGEREFID = S.MESSAGEREFID
                													--AND COALESCE(E.SENDINGENTITYIN, '') = COALESCE(S.SENDINGENTITYIN, '')
                													--AND E.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
                													AND E.DOCREFIDINERROR = S.DOCREFID
                													AND E.ETL_RUN_ID = S.ETL_RUN_ID)*/

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 4;    
                		-- Deactiveren van records die gecorrigeerd worden
                		-- Geen uitsluiting van DOCTYPE OECD0 omdat bij OECD0 CORRDOCREFID niet gevuld is.
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS T,
            DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P,
             --> Hoofdtabel retourneert tijdstip van ontvangst nieuwe record.
        DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = P.X_ONTVANGSTDATUMTIJD - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- 'oude'' record identificeren op basis van CorrDocRefId

        WHERE T.DOCREFID = S.CORRDOCREFID -- update records met DocRefId wat vermeld staat in CorrDocRefId van nieuw bericht

            AND  T.TIN = S.TIN
            AND  T.ETL_RUN_ID <= S.ETL_RUN_ID -- correctie moet toegepast worden op oude records
             -- 'geldig tot' bepalen op basis van datum/tijd poort

            AND  S.MESSAGEREFID = P.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = P.ETL_RUN_ID
            AND  S.MESSAGEREFID = C.MESSAGEREFID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;
                		/*AND NOT EXISTS (SELECT 'x' 						-- sluit berichten uit met errors op docrefid niveau (80000)
                													FROM DG_I_O_40ANA_CBC.StCBCI_statusmessage AS E
                													WHERE E.MESSAGEREFID = S.MESSAGEREFID
                													--AND COALESCE(E.SENDINGENTITYIN, '') = COALESCE(S.SENDINGENTITYIN, '')
                													--AND E.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
                													AND E.DOCREFIDINERROR = S.DOCREFID
                													AND E.ETL_RUN_ID = S.ETL_RUN_ID)*/

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 5;

               		
--------------------------------------------------------------------------------------------------------------------------

                		-- repo_ent_IN
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_repo_ent_in(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "ISSUEDBY"
        	, "INTYPE"
        	, "IN"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."ISSUEDBY",
            S."INTYPE",
            S."IN",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_repo_ent_in AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P		-- Hoofdtabel van Reporting Entity voor ophalen tijdstip ontvangst Poort
            ON S.REPORTINGENTITYTIN = P.TIN
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  P.DOCTYPEINDIC <> 'OECD0'
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 6;
                   		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent_in AS T,
            DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 7;
 
                		--------------------------------------------------------------------------------------------------------------------------

                		-- repo_ent_NAME
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_repo_ent_name(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	,"CORRMESSAGEREFID"
        	, "NAME"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	,"CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."NAME",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR)AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_repo_ent_name AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P		-- Hoofdtabel van Reporting Entity voor ophalen tijdstip ontvangst Poort
            ON S.REPORTINGENTITYTIN = P.TIN
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  P.DOCTYPEINDIC <> 'OECD0'
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 8;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent_name AS T,
            DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 9;

                		--------------------------------------------------------------------------------------------------------------------------

                		-- repo_ent_ADDRESS
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_repo_ent_adrs (
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "LEGALADDRESSTYPE"
        	, "COUNTRYCODE"
        	, "ADDRESSFREE"
        	, "STREET"
        	, "BUILDINGIDENTIFIER"
        	, "SUITEIDENTIFIER"
        	, "FLOORIDENTIFIER"
        	, "DISTRICTNAME"
        	, "POB"
        	, "POSTCODE"
        	, "CITY"
        	, "COUNTRYSUBENTITY"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."LEGALADDRESSTYPE",
            S."COUNTRYCODE",
            S."ADDRESSFREE",
            S."STREET",
            S."BUILDINGIDENTIFIER",
            S."SUITEIDENTIFIER",
            S."FLOORIDENTIFIER",
            S."DISTRICTNAME",
            S."POB",
            S."POSTCODE",
            S."CITY",
            S."COUNTRYSUBENTITY",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_repo_ent_adrs AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P		-- Hoofdtabel van Reporting Entity voor ophalen tijdstip ontvangst Poort
            ON S.REPORTINGENTITYTIN = P.TIN
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  P.DOCTYPEINDIC <> 'OECD0'
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 10;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent_adrs AS T,
            DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 11;    
        
                		-------------------------------------------------------------------------------------------------------------------------

                		-- repo_ent_RES_cntry
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_repo_ent_res_cntry (
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	,  "RESCOUNTRYCODE"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."RESCOUNTRYCODE",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_repo_ent_res_cntry AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P		-- Hoofdtabel van Reporting Entity voor ophalen tijdstip ontvangst Poort
            ON S.REPORTINGENTITYTIN = P.TIN
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  P.DOCTYPEINDIC <> 'OECD0'
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 12;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_repo_ent_res_cntry AS T,
            DG_I_O_40ANA_CBC.StCBCI_repo_ent AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            DG_I_O_40ANA_CBC.DpCBCD_repo_ent AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 13;        
                		--------------------------------------------------------------------------------------------------------------------------

                		-- CBCREPORTS_SUMMARY
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_sum(
        	"MESSAGEREFID"
        	, "SENDINGENTITYIN"
        	, "TRANSMITTINGCOUNTRY"
        	, "REPORTINGPERIOD"
        	, "REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "DOCTYPEINDIC"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "RESCOUNTRYCODE"
        	, "PROFITORLOSSCURRCODE"
        	, "PROFITORLOSS"
        	, "TAXPAIDCURRCODE"
        	, "TAXPAID"
        	, "TAXACCRUEDCURRCODE"
        	, "TAXACCRUED"
        	, "CAPITALCURRCODE"
        	, "CAPITAL"
        	, "EARNINGSCURRCODE"
        	, "EARNINGS"
        	, "NBEMPLOYEES"
        	, "ASSETSCURRCODE"
        	, "ASSETS"
        	, "UNRELATEDCURRCODE"
        	, "UNRELATED"
        	, "RELATEDCURRCODE"
        	, "RELATED"
        	, "TOTALCURRCODE"
        	, "TOTAL"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG" )
        SELECT S."MESSAGEREFID",
            S."SENDINGENTITYIN",
            S."TRANSMITTINGCOUNTRY",
            P.REPORTINGPERIOD,
            S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."DOCTYPEINDIC",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."RESCOUNTRYCODE",
            S."PROFITORLOSSCURRCODE",
            S."PROFITORLOSS",
            S."TAXPAIDCURRCODE",
            S."TAXPAID",
            S."TAXACCRUEDCURRCODE",
            S."TAXACCRUED",
            S."CAPITALCURRCODE",
            S."CAPITAL",
            S."EARNINGSCURRCODE",
            S."EARNINGS",
            S."NBEMPLOYEES",
            S."ASSETSCURRCODE",
            S."ASSETS",
            S."UNRELATEDCURRCODE",
            S."UNRELATED",
            S."RELATEDCURRCODE",
            S."RELATED",
            S."TOTALCURRCODE",
            S."TOTAL",
            S."ETL_RUN_ID",
            S."ETL_STG_TIMESTAMP",
            'N' AS "CMG_TD_NEGEER_INDICATIE",
            NULL AS "CMG_TD_NEGEER_REDEN_CODE",
            P."X_ONTVANGSTDATUMTIJD" AS "START_DATE",
            NULL AS "END_DATE",
            'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_sum AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
            ON S.MESSAGEREFID = P.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON S.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = C.ETL_RUN_ID
            AND S.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 14;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_sum AS T,
            DG_I_O_40ANA_CBC.StCBCI_cbcrepos_sum AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P,
             --> MESSAGE_SPEC tabel retourneert tijdstip van ontvangst nieuwe record.
        DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = P."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- 'oude' record identificeren op basis van CorrDocRefId

        WHERE T.DOCREFID = S.CORRDOCREFID -- update records met DocRefId wat vermeld staat in CorrDocRefId van nieuw bericht

            AND  COALESCE(T.SENDINGENTITYIN, '')  = COALESCE(S.SENDINGENTITYIN, '')
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.ETL_RUN_ID <= S.ETL_RUN_ID -- correctie moet toegepast worden op oude records
             -- 'geldig tot' bepalen op basis van datum/tijd poort

            AND  S.MESSAGEREFID = P.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '')  = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = P.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA

            -- Deze specifieke ETD_RUN_ID icm deze specifieke reporting entity zorgen voor problemen en moeten worden uitgesloten
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')

            AND  S.X_OP_TYPE IN ('A', 'D')
            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y'
            AND  S.ETL_RUN_ID > par_ERI_PROC;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 15;


        --------------------------------------------------------------------------------------------------------------------------

                		-- cbcrepos_cnst_ents
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 4: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents(
        	"MESSAGEREFID"
        	, "SENDINGENTITYIN"
        	, "TRANSMITTINGCOUNTRY"
        	, "REPORTINGPERIOD"
        	, "REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "CONSTENTITYID"
        	, "DOCTYPEINDIC"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "INCORPCOUNTRYCODE"
        	, "OTHERENTITYINFO"
        	, "ISSUEDBY"
        	, "TIN"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG"
        	, "COG_RUN_ID")
        SELECT 
        	S."MESSAGEREFID",
            S."SENDINGENTITYIN",
            S."TRANSMITTINGCOUNTRY",
            P.REPORTINGPERIOD,
            S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCTYPEINDIC",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."INCORPCOUNTRYCODE",
            S."OTHERENTITYINFO",
            S."ISSUEDBY",
            S."TIN",
            S."ETL_RUN_ID",
            S."ETL_STG_TIMESTAMP",
            'N' AS "CMG_TD_NEGEER_INDICATIE",
            NULL AS "CMG_TD_NEGEER_REDEN_CODE",
            P."X_ONTVANGSTDATUMTIJD" AS "START_DATE",
            NULL AS "END_DATE",
            'Y' AS "CURRENT_FLAG",
            par_COG_RUN_ID AS COG_RUN_ID
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
            ON S.MESSAGEREFID = P.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON S.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = C.ETL_RUN_ID
            AND S.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 4: regel toegevoegd;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 16;


        
        
             
                		-- Verwerken updates en deletes op oude records
                		-- Versie 4: geen aanpassing benodigd omdat unieke records al uit 20-laag opgevraagd worden
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS T,
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec   AS P,
             --> MESSAGE_SPEC tabel retourneert tijdstip van ontvangst nieuwe record.
        DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C   
        SET "END_DATE" = P."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- 'oude'' record identificeren op basis van CorrDocRefId

        WHERE T.DOCREFID = S.CORRDOCREFID -- update records met DocRefId wat vermeld staat in CorrDocRefId van nieuw bericht

            AND  COALESCE(T.SENDINGENTITYIN, '')  = COALESCE(S.SENDINGENTITYIN, '')
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.ETL_RUN_ID <= S.ETL_RUN_ID -- correctie moet toegepast worden op oude records
             -- 'geldig tot' bepalen op basis van datum/tijd poort

            AND  S.MESSAGEREFID = P.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '')  = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = P.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')

             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P
             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 17;

        
       
   
                		-- Versie 2
                		-- RESCOUNTRYCODE uit CBCREPORTS_SUMMARY ook in cbcrepos_cnst_ents invoegen. Wordt niet door GegevensOntsluiting meegeleverd
                		-- Dit update statement werkt ook als niet ieder land een unieke DOCREFID heeft. Door gebruik van CBCREPORTID is ieder land uniek
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS T,  
           DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_sum  AS S
        SET RESCOUNTRYCODE = S.RESCOUNTRYCODE
        WHERE T.MESSAGEREFID = S.MESSAGEREFID
            AND  COALESCE(T.SENDINGENTITYIN,'') = COALESCE(S.SENDINGENTITYIN,'')
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.CBCBODYID = S.CBCBODYID
            AND  T.CBCREPORTID = S.CBCREPORTID
            AND  T.DOCREFID = S.DOCREFID
            AND  T.ETL_RUN_ID = S.ETL_RUN_ID
            AND  T.ETL_RUN_ID > par_ERI_PROC
            AND  T.RESCOUNTRYCODE IS NULL;

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 18;

        
        --------------------------------------------------------------------------------------------------------------------------

                		-- CONST_ENTITY_IN
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 6: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_in(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
       	 	, "CONSTENTITYID"
       	 	, "DOCREFID"
       	 	, "CORRDOCREFID"
       	 	, "CORRMESSAGEREFID"
       	 	, "TIN"
       	 	, "ISSUEDBY"
       	 	, "INTYPE"
       	 	, "IN"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."TIN",
            S."ISSUEDBY",
            S."INTYPE",
            S."IN",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cnst_ent_in AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS P		-- Hoofdtabel van Const. Entity voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.CBCREPORTID = P.CBCREPORTID
            AND S."CONSTENTITYID" = P."CONSTENTITYID"
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 6: regel toegevoegd;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 19;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_in AS T,   
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents      
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            (
	        SELECT 
	        	DISTINCT MESSAGEREFID,
	            SENDINGENTITYIN,
	            TRANSMITTINGCOUNTRY,
	            DOCREFID,
	            CORRDOCREFID,
	            CBCBODYID,
	            ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents) AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P
             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';
           
 
        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 20;


      
                		--------------------------------------------------------------------------------------------------------------------------

                		-- const_ent_res_cntry
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 6: filteren dubbele records
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_res_cntry(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "CONSTENTITYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "TIN"
        	, "RESCOUNTRYCODE"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."TIN",
            S."RESCOUNTRYCODE",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cnst_ent_res_cntry AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS P		-- Hoofdtabel van Const. Entity voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.CBCREPORTID = P.CBCREPORTID
            AND S."CONSTENTITYID" = P."CONSTENTITYID"
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 6: regel toegevoegd;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 21;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_res_cntry AS T,    
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            (
        SELECT DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            DOCREFID,
            CORRDOCREFID,
            CBCBODYID,
            ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents) AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')
             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P
             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 22;

        
        
        
 
                		--------------------------------------------------------------------------------------------------------------------------

                		-- const_entity_bizz_acts
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 6: filteren dubbele records
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_biz_acts(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "CONSTENTITYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "TIN"
        	, "BIZZACTIVITIES"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."TIN",
            S."BIZZACTIVITIES",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cnst_ent_biz_acts AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS P		-- Hoofdtabel van Const. Entity voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.CBCREPORTID = P.CBCREPORTID
            AND S."CONSTENTITYID" = P."CONSTENTITYID"
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 6: regel toegevoegd;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 23;

        
                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_biz_acts AS T,
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            DOCREFID,
            CORRDOCREFID,
            CBCBODYID,
            ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents) AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
  		     SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
  		      , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')

             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P
             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 24;
  
       
                		--------------------------------------------------------------------------------------------------------------------------

                		-- const_ent_adrs
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 4: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_adrs(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "CONSTENTITYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "TIN"
        	, "LEGALADDRESSTYPE"
        	, "COUNTRYCODE"
        	, "ADDRESSFREE"
        	, "STREET"
        	, "BUILDINGIDENTIFIER"
        	, "SUITEIDENTIFIER"
        	, "FLOORIDENTIFIER"
        	, "DISTRICTNAME"
        	, "POB"
        	, "POSTCODE"
        	, "CITY"
        	, "COUNTRYSUBENTITY"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."TIN",
            S."LEGALADDRESSTYPE",
            S."COUNTRYCODE",
            S."ADDRESSFREE",
            S."STREET",
            S."BUILDINGIDENTIFIER",
            S."SUITEIDENTIFIER",
            S."FLOORIDENTIFIER",
            S."DISTRICTNAME",
            S."POB",
            S."POSTCODE",
            S."CITY",
            S."COUNTRYSUBENTITY",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cnst_ent_adrs AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS P		-- Hoofdtabel van Const. Entity voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.CBCREPORTID = P.CBCREPORTID
            AND S."CONSTENTITYID" = P."CONSTENTITYID"
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 4: regel toegevoegd

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 25;

                		-- Verwerken updates en deletes op oude records
                		-- Versie 4: geen aanpassing benodigd omdat unieke records al uit 20-laag opgevraagd worden
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_adrs AS T,
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            DOCREFID,
            CORRDOCREFID,
            CBCBODYID,
            ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents) AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')
             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P
             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 26;

                      		--------------------------------------------------------------------------------------------------------------------------

                		-- const_ent_name
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 6: filteren dubbele records
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_name(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "CBCREPORTID"
        	, "CONSTENTITYID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "TIN"
        	, "NAME"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."CBCREPORTID",
            S."CONSTENTITYID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."TIN",
            S."NAME",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_cnst_ent_name AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents AS P		-- Hoofdtabel van Const. Entity voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.CBCREPORTID = P.CBCREPORTID
            AND S."CONSTENTITYID" = P."CONSTENTITYID"
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.CBCREPORTID, S.CONSTENTITYID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 6: regel toegevoegd;

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 27;

                		-- Verwerken updates en deletes op oude records
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_cnst_ent_name AS T,   
             -- DISTINCT clausule op source (s) tabel. Moet Ã©Ã©n DOCREFID retourneren voor records die geÃ¼pdate of delete moeten worden. CONST_ENTITIES bevat vaak meerdere entiteiten per land
        (
        SELECT 
        	DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            CBCBODYID,
            DOCREFID,
            CORRDOCREFID,
            ETL_RUN_ID,
            X_OP_TYPE
            FROM DG_I_O_40ANA_CBC.StCBCI_cbcrepos_cnst_ents
            WHERE ETL_RUN_ID > par_ERI_PROC
                AND  X_OP_TYPE  IN ('A', 'D') ) AS S,
            DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            (
        SELECT DISTINCT MESSAGEREFID,
            SENDINGENTITYIN,
            TRANSMITTINGCOUNTRY,
            DOCREFID,
            CORRDOCREFID,
            CBCBODYID,
            ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_cbcrepos_cnst_ents) AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')
             --AND S.ETL_RUN_ID > par_ERI_PROC			-- opgenomen in selectie van P
             --AND S.X_OP_TYPE in ('A', 'D')			-- opgenomen in selectie van P

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 28;

        
                		--------------------------------------------------------------------------------------------------------------------------

                		-- add_info
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 4: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_add_info(
        	"MESSAGEREFID"
        	, "SENDINGENTITYIN"
        	, "TRANSMITTINGCOUNTRY"
        	, "REPORTINGPERIOD"
        	, "REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	, "ADINFOID"
        	, "DOCTYPEINDIC"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "OTHERINFO"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG"
        	, COG_RUN_ID)
        SELECT 
        	S."MESSAGEREFID",
            S."SENDINGENTITYIN",
            S."TRANSMITTINGCOUNTRY",
            P.REPORTINGPERIOD,
            S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."ADINFOID",
            S."DOCTYPEINDIC",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."OTHERINFO",
            S."ETL_RUN_ID",
            S."ETL_STG_TIMESTAMP",
            'N' AS "CMG_TD_NEGEER_INDICATIE",
            NULL AS "CMG_TD_NEGEER_REDEN_CODE",
            P."X_ONTVANGSTDATUMTIJD" AS "START_DATE",
            NULL AS "END_DATE",
            'Y' AS "CURRENT_FLAG",
            par_COG_RUN_ID AS COG_RUN_ID
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P
            ON S.MESSAGEREFID = P.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON S.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND S.ETL_RUN_ID = C.ETL_RUN_ID
            AND S.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.ADINFOID
            ORDER BY S.ETL_SEQ_ID) = 1;					-- Versie 4 regel toegevoegd

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 29;

                		-- Verwerken updates en deletes op oude records
                		-- Versie 4: filteren van dubbele indexen
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_add_info AS T,
            (
        SELECT DISTINCT ETL_RUN_ID,
            CBCBODYID,
            TRANSMITTINGCOUNTRY,
            SENDINGENTITYIN,
            MESSAGEREFID,
            CORRDOCREFID
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info
            WHERE X_OP_TYPE IN ('A', 'D')
                AND  ETL_RUN_ID > par_ERI_PROC)  AS S,
             -- Versie 4: DISTINCT clausule toepassen om unieke CORRDOCREFID te genereren als input
        DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS P,
             --> MESSAGE_SPEC tabel retourneert tijdstip van ontvangst nieuwe record.
        DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = P."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- 'oude'' record identificeren op basis van CorrDocRefId

        WHERE T.DOCREFID = S.CORRDOCREFID -- update records met DocRefId wat vermeld staat in CorrDocRefId van nieuw bericht

            AND  COALESCE(T.SENDINGENTITYIN, '')  = COALESCE(S.SENDINGENTITYIN, '')
            AND  T.TRANSMITTINGCOUNTRY = S.TRANSMITTINGCOUNTRY
            AND  T.ETL_RUN_ID <= S.ETL_RUN_ID -- correctie moet toegepast worden op oude records
             -- 'geldig tot' bepalen op basis van datum/tijd poort

            AND  S.MESSAGEREFID = P.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '')  = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = P.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
             --AND S.X_OP_TYPE in ('A', 'D')
             --AND S.ETL_RUN_ID > par_ERI_PROC

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';


        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 30;

      
         
                		--------------------------------------------------------------------------------------------------------------------------

                		-- add_info_RES_cntry
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 4: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_add_info_res_cntry(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	,  "ADINFOID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "RESCOUNTRYCODE"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"        	
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."ADINFOID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."RESCOUNTRYCODE",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.ADINFOID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info_res_cntry AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_add_info AS P		-- Hoofdtabel van Additional Info voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ADINFOID = P.ADINFOID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.ADINFOID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 4: regel toegevoegd

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 31;

                		-- Verwerken updates en deletes op oude records
                		-- Versie 4: filteren van dubbele indexen
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_add_info_res_cntry AS T,
            (
        SELECT DISTINCT ETL_RUN_ID,
            CBCBODYID,
            TRANSMITTINGCOUNTRY,
            SENDINGENTITYIN,
            MESSAGEREFID,
            CORRDOCREFID
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info
            WHERE X_OP_TYPE IN ('A', 'D')
                AND  ETL_RUN_ID > par_ERI_PROC)  AS S,
             -- Versie 4: DISTINCT clausule toepassen om unieke CORRDOCREFID te genereren als input
        	DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
         	DG_I_O_40ANA_CBC.DpCBCD_add_info    AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')
             --AND S.X_OP_TYPE in ('A', 'D')
             --AND S.ETL_RUN_ID > par_ERI_PROC

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 32;
                		--------------------------------------------------------------------------------------------------------------------------

                		-- add_info_sum_ref
                		-- Insert nieuwe records (geheel nieuw of als gevolg van update)
                		-- Versie 4: filteren van dubbele indexen
        INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_add_info_sum_ref(
        	"REPORTINGENTITYTIN"
        	, "CBCBODYID"
        	,  "ADINFOID"
        	, "DOCREFID"
        	, "CORRDOCREFID"
        	, "CORRMESSAGEREFID"
        	, "SUMMARYREF"
        	, "VOLGNR"
        	, "VOLGNR_COG"
        	, "ETL_RUN_ID"
        	, "ETL_STG_TIMESTAMP"
        	, "CMG_TD_NEGEER_INDICATIE"
        	, "CMG_TD_NEGEER_REDEN_CODE"
        	, "START_DATE"
        	, "END_DATE"
        	, "CURRENT_FLAG")
        SELECT 
        	S."REPORTINGENTITYTIN",
            S."CBCBODYID",
            S."ADINFOID",
            S."DOCREFID",
            S."CORRDOCREFID",
            S."CORRMESSAGEREFID",
            S."SUMMARYREF",
            S."VOLGNR",
            RANK() OVER (PARTITION BY S.REPORTINGENTITYTIN, S.CBCBODYID, S.ADINFOID, S.DOCREFID, S.ETL_RUN_ID
            ORDER BY S.VOLGNR) AS "VOLGNR_COG",
                S."ETL_RUN_ID",
                S."ETL_STG_TIMESTAMP",
                'N' AS "CMG_TD_NEGEER_INDICATIE",
                NULL AS "CMG_TD_NEGEER_REDEN_CODE",
                P."START_DATE",
                NULL AS "END_DATE",
                'Y' AS "CURRENT_FLAG"
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info_sum_ref AS S
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_add_info AS P		-- Hoofdtabel van Additional Info voor ophalen tijdstip ontvangst Poort
            ON COALESCE(S.REPORTINGENTITYTIN, '') = COALESCE(P.REPORTINGENTITYTIN, '')
            AND S.DOCREFID = P.DOCREFID
            AND COALESCE(S.CORRDOCREFID, '') = COALESCE(P.CORRDOCREFID, '')
            AND S.CBCBODYID = P.CBCBODYID
            AND S.ADINFOID = P.ADINFOID
            AND S.ETL_RUN_ID = P.ETL_RUN_ID
                        		-- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3
            INNER JOIN DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
            ON P.MESSAGEREFID = C.MESSAGEREFID
            AND COALESCE(P.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND P.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND P.ETL_RUN_ID = C.ETL_RUN_ID
            AND P.CBCBODYID = C.CBCBODYID
            WHERE S.X_OP_TYPE IN ('I', 'A')
                AND  C.PROCESS = 'Y'
                AND  S.ETL_RUN_ID > par_ERI_PROC
            QUALIFY RANK() OVER (PARTITION BY S.ETL_RUN_ID, S.CBCBODYID, S.ADINFOID, S.DOCREFID, S.VOLGNR
            ORDER BY S.ETL_SEQ_ID) = 1;			-- Versie 4: regel toegevoegd

        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 33;

                		-- Verwerken updates en deletes op oude records
                		-- Versie 4: filteren van dubbele indexen
        UPDATE T
        FROM DG_I_O_40ANA_CBC.DpCBCD_add_info_sum_ref AS T,
            (
        SELECT 
        	DISTINCT ETL_RUN_ID,
            CBCBODYID,
            TRANSMITTINGCOUNTRY,
            SENDINGENTITYIN,
            MESSAGEREFID,
            CORRDOCREFID
            FROM DG_I_O_40ANA_CBC.StCBCI_add_info
            WHERE X_OP_TYPE IN ('A', 'D')
                AND  ETL_RUN_ID > par_ERI_PROC)  AS S,
             -- Versie 4: DISTINCT clausule toepassen om unieke CORRDOCREFID te genereren als input
        	DG_I_O_40ANA_CBC.DpCBCD_msg_spec AS M,
            DG_I_O_40ANA_CBC.DpCBCD_add_info AS P,
            DG_I_O_40ANA_CBC.DpCBCD_msg_proc_val AS C
        SET "END_DATE" = M."X_ONTVANGSTDATUMTIJD" - INTERVAL '1' SECOND
        , "CURRENT_FLAG" = 'N' -- Koppelen bron view aan message_spec tabel in 30-laag voor ophalen X_ONTVANGSTDATUMTIJD

        WHERE S.MESSAGEREFID = M.MESSAGEREFID
            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(M.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = M.TRANSMITTINGCOUNTRY -- Koppelen update hoofdtabel aan historische hoofdtabel

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(P.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = P.TRANSMITTINGCOUNTRY
            AND  S.CORRDOCREFID = P.DOCREFID
            AND  S.ETL_RUN_ID >= P.ETL_RUN_ID -- koppelen hoofdtabel historie aan detailtabel historie

            AND  P.DOCREFID = T.DOCREFID
            AND  COALESCE(P.CORRDOCREFID, '') = COALESCE(T.CORRDOCREFID, '')
            AND  P.CBCBODYID = T.CBCBODYID
            AND  P.ETL_RUN_ID = T.ETL_RUN_ID -- Koppeling met msg_proc_val voor geldigheid berichten. Versie 3

            AND  COALESCE(S.SENDINGENTITYIN, '') = COALESCE(C.SENDINGENTITYIN, '')
            AND  S.TRANSMITTINGCOUNTRY = C.TRANSMITTINGCOUNTRY
            AND  S.ETL_RUN_ID = C.ETL_RUN_ID
            AND  S.CBCBODYID = C.CBCBODYID
            AND  C.PROCESS = 'Y' -- SELECTIECRITERIA
            AND  TRIM(CONCAT(C.ETL_RUN_ID, '_', C.REPORTINGENTITYTIN)) NOT IN ('2049654_1133420984', '2049654_10753 29821')
             --AND S.X_OP_TYPE in ('A', 'D')
             --AND S.ETL_RUN_ID > par_ERI_PROC

            AND  T.END_DATE IS NULL
            AND  T.CURRENT_FLAG = 'Y';

        SET par_ACT_UPD = par_ACT_UPD + Activity_Count;
        SET par_STEP = 34;
      
         
                		-------------------------------------------------------------------------------------------------------------------

                		-- STATUSMESSAGE
                		-- Insert records. Komen geen updates op eerdere fouten dus alleen INSERTS.
                /*
                		INSERT INTO DG_I_O_40ANA_CBC.DpCBCD_statusmsg(X_OP_TYPE, X_USER, MESSAGEREFID, ERRORPATH, "ERRORCODE", ERRORDETAILS,
                					STATUS, VALIDATEDBY, DOCREFIDINERROR, ETL_SRC_STM_CDE, ETL_CHG_IND, ETL_RUN_ID, ETL_REJ_IND, ETL_STG_TIMESTAMP,
                					ETL_SEQ_ID, ETL_TD_TIMESTAMP, ETL_TD_NEGEER_INDICATIE, ETL_TD_NEGEER_REDEN_CODE)
                		SELECT S.X_OP_TYPE
                		, S.X_USER
                		, S.MESSAGEREFID
                		, S.ERRORPATH
                		, S."ERRORCODE"
                		, S.ERRORDETAILS
                		, S.STATUS
                		, S.VALIDATEDBY
                		, S.DOCREFIDINERROR
                		, S.ETL_SRC_STM_CDE
                		, S.ETL_CHG_IND
                		, S.ETL_RUN_ID
                		, S.ETL_REJ_IND
                		, S.ETL_STG_TIMESTAMP
                		, S.ETL_SEQ_ID
                		, S.ETL_TD_TIMESTAMP
                		, S.ETL_TD_NEGEER_INDICATIE
                		, S.ETL_TD_NEGEER_REDEN_CODE
                		FROM DG_I_O_40ANA_CBC.StCBCI_statusmessage AS S
                		WHERE S.ETL_RUN_ID  > par_ERI_PROC;
                */
        SET par_ACT_INS = par_ACT_INS + Activity_Count;
        SET par_STEP = 35;

                	--------------------------------------------------------------------------------------------------------------------------

                	-- END TRANSACTION: tot hier wordt alles teruggedraaid als iets fout gaat
        END; -- Ophalen hoogste ETL_RUN_ID wat verwerkt is. Geeft zelfde ETL_RUN_ID als MIH geen run gedraaid heeft na laatste keer dat deze job uitgevoerd is.
         -- Als procedure is fout gegaan is max ETL_RUN_ID = 0. Dit wordt gevuld in de Handlers en bereikt dit punt niet.
         -- Versie 9: WHERE statement toegevoegd

        SELECT COALESCE(MAX(ETL_RUN_ID),NULL) INTO par_MAX_ETL_RUN_ID
            FROM DG_I_O_40ANA_CBC.DpCBCD_msg_spec
            WHERE TRANSMITTINGCOUNTRY <> 'NL';

                	-- Wegschrijven naar RUNCONTROL_30 tabel dat procedure succesvol is voltooid
                	-- Versie 9: ETL_RUN_ID_PROCESSED --> ETL_RUN_ID_INT
        UPDATE DG_I_O_40ANA_CBC.DpCBCD_runcontrol_30
        SET END_DATE =  CURRENT_TIMESTAMP
        , RUN_RESULT = 'Success'
        , RUN_COMMENT = COALESCE(RUN_COMMENT, '') || TRIM(CAST(par_ACT_INS AS VARCHAR(11))) || ' records inserted; ' || TRIM(CAST(par_ACT_UPD - par_ZERO_ROWS AS VARCHAR(11))) || ' records updated.'
        , ETL_RUN_ID_INT = par_MAX_ETL_RUN_ID
        WHERE COG_RUN_ID = par_COG_RUN_ID
            AND  PROCEDURE_NUMBER = par_PROC_NR
            AND  PROCEDURE_NAME = 'PROC_PROCESS_DELTAS';

        SET par_STATUS = 0;       
        END;