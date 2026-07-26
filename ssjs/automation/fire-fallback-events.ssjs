<script runat="server" language="JavaScript">
/*
  Script Activity: Fire-Fallback-Events
  Runs immediately after automation-studio/sql/13-order-status-timeout-fallback.sql as the next
  step in the Order-Status-Timeout-Fallback automation. SQL Activities can populate a staging DE but
  cannot call the REST API — this Script Activity reads Staging_OrderStatusFallbackQueue and POSTs
  the corresponding interaction events, then clears the queue.
*/
Platform.Load("core", "1.1.1");

try {
    var restEndpoint = "https://" + Platform.Function.Lookup("Config_Environment", "Value", "Name", "RestApiSubdomain") + ".rest.marketingcloudapis.com";
    var authToken = Platform.Function.Lookup("Config_Environment", "Value", "Name", "AutomationOAuthToken");

    var queueRows = Platform.Function.LookupRows("Staging_OrderStatusFallbackQueue", "Processed", "0");
    var processedCount = 0;
    var errorCount = 0;

    for (var i = 0; i < queueRows.length; i++) {
        var row = queueRows[i];
        var orderId = row["OrderId"];
        var subscriberKey = row["SubscriberKey"];
        var eventType = row["FallbackEventType"];

        var payload = {
            ContactKey: subscriberKey,
            EventDefinitionKey: eventType,
            Data: {
                SubscriberKey: subscriberKey,
                OrderId: orderId,
                Source: "TimeoutFallback"
            }
        };

        var req = new Script.Util.HttpRequest(restEndpoint + "/interaction/v1/events");
        req.emptyContentHandling = 0;
        req.retries = 2;
        req.continueOnError = true;
        req.setHeader("Authorization", "Bearer " + authToken);
        req.setHeader("Content-Type", "application/json");
        req.method = "POST";
        req.postData = Stringify(payload);

        var response = req.send();

        if (response.statusCode == 202 || response.statusCode == 200) {
            Platform.Function.UpdateData("Staging_OrderStatusFallbackQueue", 2,
                "OrderId", orderId, "FallbackEventType", eventType,
                "Processed", "1", "ProcessedDate", Now()
            );
            processedCount++;
        } else {
            errorCount++;
            Platform.Function.InsertData("Automation_ErrorLog",
                "AutomationName", "Order-Status-Timeout-Fallback",
                "ActivityName", "Fire-Fallback-Events",
                "ErrorMessage", "HTTP " + response.statusCode + " for OrderId=" + orderId + " EventType=" + eventType,
                "OccurredDate", Now()
            );
        }
    }

    Write("Fallback events processed: " + processedCount + ", errors: " + errorCount);

} catch (ex) {
    Platform.Function.InsertData("Automation_ErrorLog",
        "AutomationName", "Order-Status-Timeout-Fallback",
        "ActivityName", "Fire-Fallback-Events",
        "ErrorMessage", Stringify(ex),
        "OccurredDate", Now()
    );
    /* Re-throw so the Automation Studio activity is marked failed and error-handling policy
       (HaltAutomationAndNotify) kicks in — see automation-studio/config/*.json errorHandling blocks. */
    throw ex;
}
</script>
