CREATE OR REPLACE PROCEDURE DG_I_O_90BHR_T002.PersoonAdres_Bijwerken 
 
 (IN prmJobBatchDatumTijd TIMESTAMP(6) 
 ,IN prmJobNaamParent VARCHAR(50) 
 ,OUT Return_Code INTEGER) 
 
 
 
 
 LANGUAGE SQL
 BEGIN 
 
 
 DECLARE JobBatchDatumTijd TIMESTAMP(6); 
 DECLARE JobNaam VARCHAR(50); 
 DECLARE JobNaamParent VARCHAR(50); 
 DECLARE JobStartDatumTijd TIMESTAMP(6); 
 DECLARE JobStopDatumTijd TIMESTAMP(6); 
 DECLARE JobResultaatCode VARCHAR(15); 
 DECLARE JobLog_RC INTEGER; 
 
 
 DECLARE JobChunkTargetLaag VARCHAR(50); 
 DECLARE JobChunkTargetNaam VARCHAR(50); 
 DECLARE JobChunkUpdateStrategie VARCHAR(50); 
 DECLARE JobChunkRecordsInserted INTEGER; 
 DECLARE JobChunkRecordsUpdated INTEGER; 
 DECLARE JobChunkRecordsDeleted INTEGER; 
 DECLARE JobChunkBijgewerktTMWaarde VARCHAR(50); 
 DECLARE SourceBijgewerktTMWaarde VARCHAR(50); 
 DECLARE JobChunkLog_RC INTEGER; 
 DECLARE JobChunkSQLException VARCHAR(1000); 
 DECLARE JobChunkInitieleVulling CHAR(1); 
 DECLARE TargetResetIndicator INTEGER; 
 
 DECLARE SqlStrCursor VARCHAR(10000);
     DECLARE done INT DEFAULT 0; 
 DECLARE Cursor1 CURSOR FOR S1; 
 
 DECLARE EXIT HANDLER FOR SQLEXCEPTION 
 BEGIN 
 GET DIAGNOSTICS EXCEPTION 1 JobChunkSQLException = MESSAGE_TEXT; 
 SET JobStopDatumTijd = CURRENT TIMESTAMP; 
 SET JobResultaatCode = 'Error'; 
 CALL DG_I_O_90BHR_T002.JobLog(JobBatchDatumTijd, JobNaam, JobNaamParent, JobStartDatumTijd, JobStopDatumTijd, JobResultaatCode, JobLog_RC); 
 
 SET JobChunkRecordsInserted= -1; 
 SET JobChunkRecordsDeleted= -1; 
 SET JobChunkRecordsUpdated= -1; 
 
 CALL DG_I_O_90BHR_T002.JobChunkLog(JobBatchDatumTijd, JobNaam, JobNaamParent, JobChunkTargetLaag, JobChunkTargetNaam, JobChunkUpdateStrategie, JobChunkRecordsInserted, JobChunkRecordsUpdated, JobChunkRecordsDeleted, JobChunkBijgewerktTMWaarde, JobChunkSQLException, JobChunkInitieleVulling, JobChunkLog_RC); 
 
 SET Return_Code = 1; 
 
 END; 
 
 SET JobBatchDatumTijd = coalesce(prmJobBatchDatumTijd,CURRENT TIMESTAMP); 
 SET JobNaam='PersoonAdres_Bijwerken'; 
 SET JobNaamParent = coalesce(prmJobNaamParent,null); 
 
 SET JobStartDatumTijd= CURRENT TIMESTAMP; 
 
 SET JobChunkTargetLaag= 'DG_I_O_30INF_TSL'; 
 SET JobChunkTargetNaam= 'PersoonAdres'; 
 SET JobChunkUpdateStrategie= 'FullDeleteInsert'; 
 SET JobChunkRecordsDeleted= 0; 
 
 
 
 SET SqlStrCursor = 'LOCKING ROW FOR ACCESS SELECT COUNT(*) AS m FROM DG_I_O_30INF_TSL.PersoonAdres'; 
 PREPARE S1 FROM SqlStrCursor; 
 OPEN Cursor1; 
 FETCH Cursor1 INTO JobChunkRecordsDeleted; 
 CLOSE Cursor1; 
 
 
 DELETE DG_I_O_30INF_TSL.PersoonAdres; 
 
 
 INSERT INTO DG_I_O_30INF_TSL.PersoonAdres 
 SELECT 
 n.FiscaalNummer 
 ,bb.BSNPseudo AS FiscaalNummer_BSNPseudo 
 ,bb.BSNStatusCode AS FiscaalNummer_BSNStatusCode 
 ,bb.Toeslagbetrokken_ind AS FiscaalNummer_Toeslagbetrokken_ind 
 ,n.AdresSoortCode 
 ,n.PERS_ADRES_StartDatum 
 ,n.PERS_ADRES_StopDatum 
 ,n.PERS_ADRES_ID 
 ,n.PERS_ADRES_OPV_DatumTijd 
 ,n.PERS_ADRES_OPV_BronSoort 
 ,n.PERS_ADRES_OPV_BronNr 
 ,n.PERS_ADRES_AFV_DatumTijd 
 ,n.PERS_ADRES_AFV_BronSoort 
 ,n.PERS_ADRES_AFV_BronNr 
 ,n.PERS_ADRES_TAV_NAAM 
 ,n.ADRES_ID 
 ,n.ADRES_OPV_DatumTijd 
 ,n.ADRES_OPV_BronSoort 
 ,n.ADRES_OPV_BronNr 
 ,n.KeyAdres 
 ,n.Huisnummer 
 ,n.HuisnummerToevoeging 
 ,n.Postcode 
 ,n.LandCode 
 ,n.GemeenteCode 
 ,n.Straatnaam 
 ,n.Woonplaats 
 ,n.Locatie 
 ,n.LokatieSoortCode 
 ,n.AdresBuitenland1 
 ,n.AdresBuitenland2 
 ,n.AdresBuitenland3 
 ,JobBatchDatumTijd 
 ,NULL 
 FROM 
 ( 
 SELECT 
 CAST(B110.FINR AS INT) AS FiscaalNummer 
 ,B110.ADRSRTCD AS AdresSoortCode 
 ,B110.INGDAT AS PERS_ADRES_StartDatum 
 ,B110.VERVDAT AS PERS_ADRES_StopDatum 
 ,B110.ADRID AS PERS_ADRES_ID 
 ,B110.REGTSPOP AS PERS_ADRES_OPV_DatumTijd 
 ,B110.BOPSRTCD AS PERS_ADRES_OPV_BronSoort 
 ,B110.BOPCD AS PERS_ADRES_OPV_BronNr 
 ,B110.REGTSPAF AS PERS_ADRES_AFV_DatumTijd 
 ,B110.BAFSRTCD AS PERS_ADRES_AFV_BronSoort 
 ,B110.BAFCD AS PERS_ADRES_AFV_BronNr 
 ,B110.TAVNM AS PERS_ADRES_TAV_NAAM 
 ,B400.ADRID AS ADRES_ID 
 ,B400.REGTSPOP AS ADRES_OPV_DatumTijd 
 ,B400.BOPSRTCD AS ADRES_OPV_BronSoort 
 ,B400.BOPCD AS ADRES_OPV_BronNr 
 ,REPLACE(CASE WHEN B400.POSTCODE IS NOT NULL AND TRIM(B400.POSTCODE) <> '' 
 THEN TRIM(B400.POSTCODE) || '&' || COALESCE(TRIM(B400.HAPNR),'') || '&' || COALESCE(TRIM(B400.HUISNRTOE),'') 
 ELSE NULL 
 END , ' ', '') AS KeyAdres 
 ,TRIM(B400.HAPNR) AS Huisnummer 
 ,B400.HUISNRTOE AS HuisnummerToevoeging 
 ,B400.POSTCODE AS Postcode 
 ,CASE WHEN B400.LOKCD >= 5000 THEN B400.LOKCD 
 WHEN B400.LOKCD < 5000 AND B400.LOKCD <> 0 THEN 6030 
 WHEN (B400.LOKCD IS NULL OR B400.LOKCD = 0) AND (B400.POSTCODE IS NOT NULL OR B400.WOONPLTS IS NOT NULL) THEN 6030 
 ELSE 0 
 END AS LandCode 
 ,CASE WHEN B400.LOKCD < 5000 AND B400.LOKCD <> 0 
 THEN B400.LOKCD 
 ELSE 0 
 END AS GemeenteCode 
 ,B400.STRAATNM AS Straatnaam 
 ,B400.WOONPLTS AS Woonplaats 
 ,B400.LOKATIE AS Locatie 
 ,B400.LOKSRTCD AS LokatieSoortCode 
 ,B400.ADRESBTL1 AS AdresBuitenland1 
 ,B400.ADRESBTL2 AS AdresBuitenland2 
 ,B400.ADRESBTL3 AS AdresBuitenland3 
 ,JobBatchDatumTijd AS JobInsertDatetime 
 ,null AS JobLastUpdateDatetime 
 
 FROM DG_I_O_30INF_TSL_INPUT.BVR_PERSADRESPER B110 
 LEFT OUTER JOIN DG_I_O_30INF_TSL_INPUT.BVR_PERSOON B100 
 ON B110.FINR = B100.FINR 
 AND B100.REGTSPAF = '9999-12-31 00:00:00' 
 
 LEFT OUTER JOIN DG_I_O_30INF_TSL_INPUT.BVR_ADRES B400 
 ON B110.ADRID = B400.ADRID 
 
 WHERE B110.REGTSPAF = '9999-12-31 00:00:00' 
 ) n 
 
 LEFT OUTER JOIN DG_I_O_30INF_TSL.TSL_DF_BSNBehandeling bb 
 ON n.FiscaalNummer = bb.BSN 
 ; 
 
 SET JobStopDatumTijd = CURRENT TIMESTAMP; 
 SET JobResultaatCode = 'Ok'; 
 
 CALL DG_I_O_90BHR_T002.JobLog(JobBatchDatumTijd, JobNaam, JobNaamParent, JobStartDatumTijd, JobStopDatumTijd, JobResultaatCode, JobLog_RC); 
 
 SET SqlStrCursor = 'LOCKING ROW FOR ACCESS SELECT COUNT(*) AS m FROM DG_I_O_30INF_TSL.PersoonAdres WHERE JobInsertDatetime  = ''' || CAST(JobBatchDatumTijd AS VARCHAR(26)) || ''''; 
 PREPARE S1 FROM SqlStrCursor; 
 OPEN Cursor1; 
 FETCH Cursor1 INTO JobChunkRecordsInserted; 
 CLOSE Cursor1; 
 
 SET JobChunkRecordsUpdated = 0; 
 
 SET SqlStrCursor = 'LOCKING ROW FOR ACCESS SELECT MAX(COALESCE(JobLastUpdateDatetime,JobInsertDatetime)) AS m FROM DG_I_O_30INF_TSL.PersoonAdres'; 
 PREPARE S1 FROM SqlStrCursor; 
 OPEN Cursor1; 
 FETCH Cursor1 INTO JobChunkBijgewerktTMWaarde; 
 CLOSE Cursor1; 
 
 SET JobChunkSQLException= null; 
 
 CALL DG_I_O_90BHR_T002.JobChunkLog(JobBatchDatumTijd, JobNaam, JobNaamParent, JobChunkTargetLaag, JobChunkTargetNaam, JobChunkUpdateStrategie, JobChunkRecordsInserted, JobChunkRecordsUpdated, JobChunkRecordsDeleted, JobChunkBijgewerktTMWaarde, JobChunkSQLException, JobChunkInitieleVulling, JobChunkLog_RC); 
 SET Return_Code = CASE WHEN JobLog_RC = 0 AND JobChunkLog_RC = 0 THEN 0 ELSE 1 END; 
 
 DELETE DG_I_O_90BHR_T002.PersoonAdresBK; 
 
 END@
