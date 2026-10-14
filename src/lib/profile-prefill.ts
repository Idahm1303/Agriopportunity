export function applyProfileSuggestions(form: HTMLFormElement, fields: Record<string, string>, profileKind: "farmer" | "smme") {
  const aliases: Record<string, string> = profileKind === "farmer"
    ? {
        farmname: "farmName",
        province: "province",
        registeredprovince: "province",
        district: "district",
        town: "district",
        farmsizehectares: "farmSizeHectares",
        farmingtype: "farmingType",
        yearsfarming: "yearsFarming",
        farmerstage: "farmerStage",
        landtenure: "landTenure",
      }
    : {
        businessname: "businessName",
        registeredbusinessname: "businessName",
        registrationnumber: "registrationNumber",
        cipcnumber: "registrationNumber",
        cipcregistered: "cipcRegistered",
        province: "province",
        registeredprovince: "province",
        sector: "sectorFocus",
        sectorfocus: "sectorFocus",
        employeecount: "employeesCount",
        yearstrading: "yearsTrading",
        fundingstage: "fundingStage",
      };

  for (const [label, value] of Object.entries(fields)) {
    const targetName = aliases[label.toLowerCase().replace(/[^a-z]/g, "")];
    if (!targetName) continue;
    const field = form.elements.namedItem(targetName);
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) {
      if (field instanceof HTMLInputElement && field.type === "checkbox") {
        field.checked = /^(true|yes|registered)$/i.test(value.trim());
      } else {
        field.value = value;
      }
      field.dispatchEvent(new Event("input", { bubbles: true }));
      field.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
