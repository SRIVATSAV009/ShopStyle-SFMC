<script runat="server" language="JavaScript">
/*
  Shared Script Include: Error-Logger
  Included via Platform.Function.ContentBlockByKey("ShopStyle_SSJS_ErrorLogger") at the top of every
  Automation Studio Script Activity, giving every activity a single, consistent way to log to
  Automation_ErrorLog (see config/data-extensions/Automation_ErrorLog.json) instead of ad hoc
  InsertData calls scattered across scripts.
*/

function logAutomationError(automationName, activityName, errorMessage, severity) {
    severity = severity || "Error";
    var errorId = automationName + "-" + activityName + "-" + (new Date()).getTime();
    try {
        Platform.Function.InsertData(
            "Automation_ErrorLog",
            "ErrorLogId", errorId,
            "AutomationName", automationName,
            "ActivityName", activityName,
            "ErrorMessage", String(errorMessage).substring(0, 4000),
            "Severity", severity,
            "OccurredDate", Now(),
            "Resolved", "false"
        );
    } catch (loggingFailure) {
        /* Logging must never itself throw and mask the original error */
        Write("CRITICAL: failed to write to Automation_ErrorLog: " + Stringify(loggingFailure));
    }
}

function logAutomationInfo(automationName, activityName, message) {
    Write("[" + automationName + "/" + activityName + "] " + message);
}
</script>
