<script runat="server" language="JavaScript">
/*
  Script Activity: Validate-Catalog-Row-Count
  Purpose: Sanity-check that the promoted catalog row count didn't collapse due to a bad/truncated
           feed (e.g., SFTP transfer failure delivering a 0-byte or partial file). A >20% single-night
           drop is almost certainly a feed problem, not real inventory change, and should halt the
           automation rather than silently publishing a broken catalog to production emails.
*/
Platform.Load("core", "1.1.1");
%%=ContentBlockByKey("ShopStyle_SSJS_ErrorLogger")=%%
<!-- includes ssjs/shared/error-logger.ssjs: logAutomationError(), logAutomationInfo() -->

try {
    var todayCountRows = Platform.Function.LookupRows("Shared_ProductCatalog", "InStock", "1");
    var todayCount = todayCountRows.length;

    var historyRows = Platform.Function.LookupRows("Automation_RowCountHistory", "MetricName", "ShopStyle_ProductCatalog_InStockCount");
    var previousCount = historyRows.length > 0 ? parseInt(historyRows[0]["MetricValue"], 10) : todayCount;

    var percentChange = previousCount > 0 ? ((todayCount - previousCount) / previousCount) * 100 : 0;

    logAutomationInfo("Product-Catalog-Nightly-ETL", "Validate-Catalog-Row-Count",
        "Today: " + todayCount + ", Previous: " + previousCount + ", Change: " + percentChange.toFixed(1) + "%");

    if (percentChange < -20) {
        logAutomationError("Product-Catalog-Nightly-ETL", "Validate-Catalog-Row-Count",
            "In-stock catalog row count dropped " + Math.abs(percentChange).toFixed(1) + "% (from " +
            previousCount + " to " + todayCount + "). Likely a truncated/failed feed. Halting automation.",
            "Critical");
        throw new Error("Catalog row count anomaly detected — see Automation_ErrorLog");
    }

    if (todayCountRows.length > 0) {
        Platform.Function.UpdateData("Automation_RowCountHistory", 1,
            "MetricName", "ShopStyle_ProductCatalog_InStockCount",
            "MetricValue", String(todayCount),
            "RecordedDate", Now()
        );
    } else {
        Platform.Function.InsertData("Automation_RowCountHistory",
            "MetricName", "ShopStyle_ProductCatalog_InStockCount",
            "MetricValue", String(todayCount),
            "RecordedDate", Now()
        );
    }

} catch (ex) {
    logAutomationError("Product-Catalog-Nightly-ETL", "Validate-Catalog-Row-Count", Stringify(ex), "Critical");
    throw ex;
}
</script>
