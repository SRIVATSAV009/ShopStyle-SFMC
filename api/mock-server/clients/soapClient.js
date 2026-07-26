"use strict";
/**
 * Reference client for the SOAP Retrieve/ContinueRequest pattern (api/soap/retrieve-data-extension.md).
 * Builds and parses the envelope by hand (no SOAP library dependency) since the surface used here is
 * small and stable; a production integration might prefer a full SOAP client library instead.
 */

function buildRetrieveEnvelope(accessToken, dataExtensionName, properties, filter) {
  const filterXml = filter
    ? `<Filter xsi:type="SimpleFilterPart" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
         <Property>${filter.property}</Property>
         <SimpleOperator>${filter.operator}</SimpleOperator>
         <Value>${filter.value}</Value>
       </Filter>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                   xmlns:ns="http://exacttarget.com/wsdl/partnerAPI">
  <soapenv:Header><fueloauth xmlns="http://exacttarget.com">${accessToken}</fueloauth></soapenv:Header>
  <soapenv:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>DataExtensionObject[${dataExtensionName}]</ObjectType>
        ${properties.map((p) => `<Properties>${p}</Properties>`).join("\n        ")}
        ${filterXml}
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function parsePropertyRows(xml) {
  const resultBlocks = xml.match(/<Results>[\s\S]*?<\/Results>/g) || [];
  return resultBlocks.map((block) => {
    const propBlocks = block.match(/<Property>[\s\S]*?<\/Property>/g) || [];
    const row = {};
    for (const p of propBlocks) {
      const name = (p.match(/<Name>(.*?)<\/Name>/) || [])[1];
      const value = (p.match(/<Value>(.*?)<\/Value>/) || [])[1];
      if (name) row[name] = value;
    }
    return row;
  });
}

async function retrieve(soapBaseUrl, accessToken, dataExtensionName, properties, filter) {
  const envelope = buildRetrieveEnvelope(accessToken, dataExtensionName, properties, filter);
  const res = await fetch(`${soapBaseUrl}/Service.asmx`, {
    method: "POST",
    headers: { "Content-Type": "text/xml", SOAPAction: "Retrieve" },
    body: envelope,
  });
  const xml = await res.text();
  return parsePropertyRows(xml);
}

module.exports = { buildRetrieveEnvelope, parsePropertyRows, retrieve };
