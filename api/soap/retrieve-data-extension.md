# SOAP API — Retrieve Data Extension Rows

Used by legacy/batch integrations (the on-prem call-center system, certain BI extract tools) that only
support SOAP, not the REST Data Extension APIs used elsewhere in this repo. Authenticates with the same
OAuth2 bearer token (see [`../../mc-connect/oauth-config.md`](../../mc-connect/oauth-config.md)) passed
via a `fueloauth` SOAP header rather than an HTTP `Authorization` header.

## Endpoint

```
POST https://{soap_instance_url}/Service.asmx
Content-Type: text/xml
SOAPAction: Retrieve
```

## Request

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns="http://exacttarget.com/wsdl/partnerAPI">
  <soapenv:Header>
    <fueloauth xmlns="http://exacttarget.com">{access_token}</fueloauth>
  </soapenv:Header>
  <soapenv:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>DataExtensionObject[ShopStyle_Subscribers]</ObjectType>
        <Properties>SubscriberKey</Properties>
        <Properties>EmailAddress</Properties>
        <Properties>SubscriberStatus</Properties>
        <Properties>LastEngagementDate</Properties>
        <Filter xsi:type="SimpleFilterPart" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
          <Property>SubscriberStatus</Property>
          <SimpleOperator>equals</SimpleOperator>
          <Value>Active</Value>
        </Filter>
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </soapenv:Body>
</soapenv:Envelope>
```

## Response (abridged)

```xml
<RetrieveResponseMsg>
  <OverallStatus>OK</OverallStatus>
  <Results>
    <Properties>
      <Property><Name>SubscriberKey</Name><Value>SUB-000482913</Value></Property>
      <Property><Name>EmailAddress</Name><Value>jane.doe@example.com</Value></Property>
      <Property><Name>SubscriberStatus</Name><Value>Active</Value></Property>
      <Property><Name>LastEngagementDate</Name><Value>2026-07-20T10:15:00</Value></Property>
    </Properties>
  </Results>
  <!-- additional <Results> elements, one per row, paginated via RequestID + ContinueRequest for >2500 rows -->
</RetrieveResponseMsg>
```

## Pagination

Results are capped at 2,500 rows per call. If `OverallStatus` is `MoreDataAvailable`, the caller issues
a follow-up `ContinueRequestMsg` with the returned `RequestID`:

```xml
<ContinueRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
  <ContinueRequest>{RequestID}</ContinueRequest>
</ContinueRequestMsg>
```

## Reference Client

[`../mock-server/clients/soapClient.js`](../mock-server/clients/soapClient.js) implements Retrieve +
ContinueRequest pagination and is exercised by the SOAP folder in
[`../../postman/ShopStyle-SFMC.postman_collection.json`](../../postman/ShopStyle-SFMC.postman_collection.json).
