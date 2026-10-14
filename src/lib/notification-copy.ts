const farmerAlertTranslations: Record<string, {
  heading: string;
  empty: string;
  reason: string;
  closes: string;
  markRead: string;
  action?: string;
  newLabel?: string;
  emailFailed?: string;
}> = {
  English: {
    heading: "New farm opportunity alerts",
    empty: "Matching skills programmes, funding, mentorship, bursaries and learnerships will appear here.",
    reason: "This opportunity may suit your farm. Check the eligibility details before applying.",
    closes: "Closes",
    markRead: "Mark as read",
    action: "View details and apply",
    newLabel: "new",
    emailFailed: "In-app alert · Email alert was not sent",
  },
  isiZulu: {
    heading: "Izaziso ezintsha zamathuba okulima",
    empty: "Izinhlelo zamakhono, uxhaso, ukuqeqeshwa ngabeluleki, imifundaze nama-learnership afana nawe azovela lapha.",
    reason: "Leli thuba lingase lifanele ipulazi lakho. Hlola izimfuneko ngaphambi kokufaka isicelo.",
    closes: "Usuku lokuvala",
    markRead: "Maka njengokufundiwe",
    action: "Buka imininingwane bese ufaka isicelo",
    newLabel: "okusha",
    emailFailed: "Isaziso sangaphakathi · I-imeyili ayithunyelwanga",
  },
  isiXhosa: {
    heading: "Izaziso zamathuba amatsha okulima",
    empty: "Iinkqubo zezakhono, inkxaso-mali, iingcebiso, iibhasari nee-learnership ezikufaneleyo ziya kuvela apha.",
    reason: "Eli thuba lingalifanela ifama yakho. Jonga iimfuno zokufaneleka ngaphambi kokufaka isicelo.",
    closes: "Ivala",
    markRead: "Phawula njengokufundiwe",
    action: "Jonga iinkcukacha uze ufake isicelo",
    newLabel: "entsha",
    emailFailed: "Isaziso sangaphakathi · I-imeyile ayithunyelwanga",
  },
  Afrikaans: {
    heading: "Nuwe plaasgeleentheid-waarskuwings",
    empty: "Passende vaardigheidsprogramme, befondsing, mentorskap, beurse en leerderskappe sal hier verskyn.",
    reason: "Hierdie geleentheid kan by jou plaas pas. Gaan die geskiktheidsvereistes na voordat jy aansoek doen.",
    closes: "Sluit",
    markRead: "Merk as gelees",
    action: "Sien besonderhede en doen aansoek",
    newLabel: "nuwe",
    emailFailed: "Inprogramwaarskuwing · E-pos is nie gestuur nie",
  },
  Sesotho: {
    heading: "Litsebiso tse ncha tsa menyetla ea temo",
    empty: "Mananeo a litsebo, lichelete, boeletsi, libasari le lithupelo tse u loketseng li tla hlaha mona.",
    reason: "Monyetla ona o ka tšoanela polasi ea hau. Sheba litlhoko pele u etsa kopo.",
    closes: "E koala",
    markRead: "Tšoaea hore e baliloe",
    action: "Sheba lintlha 'me u etse kopo",
    newLabel: "ncha",
    emailFailed: "Tsebiso ea ka har'a app · Imeile ha ea romeloa",
  },
  Setswana: {
    heading: "Ditsiboso tse disha tsa ditshono tsa temo",
    empty: "Mananeo a bokgoni, madi, kaelo, dibasari le dithupelo tse di go tshwanetseng di tla tlhagelela fano.",
    reason: "Tshono eno e ka tshwanela polasi ya gago. Sekaseka ditlhokego pele o dira kopo.",
    closes: "E tswalwa",
    markRead: "Tshwaya e badilwe",
    action: "Bona dintlha mme o dire kopo",
    newLabel: "disha",
    emailFailed: "Tshitshimo ya app · Imeile ga e a romelwa",
  },
  Sepedi: {
    heading: "Ditsebišo tše mpsha tša menyetla ya temo",
    empty: "Mananeo a mabokgoni, ditšhelete, boeletši, dibasari le mananeo a go ithuta ao a go swanelago a tla tšwelela mo.",
    reason: "Monyetla wo o ka swanela polasa ya gago. Lekola dinyakwa pele o dira kgopelo.",
    closes: "O tswalelwa",
    markRead: "Swaya bjalo ka yeo e badilwego",
    action: "Bona dintlha gomme o dire kgopelo",
    newLabel: "tše mpsha",
    emailFailed: "Tsebišo ya ka gare ga app · Emeile ga se ya romelwa",
  },
  Xitsonga: {
    heading: "Switiviso leswintshwa swa mikarhi ya vurimi",
    empty: "Minongonoko ya vuswikoti, mali, vuleteri, tibasari ni vuleteri bya learner leyi ku faneleke yi ta humelela laha.",
    reason: "Nkarhi lowu wu nga ha fambelana ni purasi ra wena. Kambisisa swilaveko u nga si endla xikombelo.",
    closes: "Siku ro pfala",
    markRead: "Fungha tani hi leswi hlayiweke",
    action: "Vona vuxokoxoko u tlhela u endla xikombelo",
    newLabel: "swintshwa",
    emailFailed: "Xitiviso xa le ka app · Imeyili a yi rhumeriwanga",
  },
  Tshivenda: {
    heading: "Nḓivhadzo ntswa dza zwikhala zwa vhulimi",
    empty: "Mbekanyamushumo dza vhukoni, masheleni, vhulivhisi, dibasari na vhugudisi vhune ha ni fanela zwi ḓo bvelela hafha.",
    reason: "Hetshi tshikhala tshi nga fanelea bulasi ḽaṋu. Sedzani zwidodombedzwa zwa u fanelea ni sa athu ita khumbelo.",
    closes: "Tshi vala",
    markRead: "Maka sa zwo vhaliwa",
    action: "Vhonani mafhungo ni ita khumbelo",
    newLabel: "zwiswa",
    emailFailed: "Nḓivhadzo ya app · Email a yo ngo rumelwa",
  },
  siSwati: {
    heading: "Tatiso letinsha tematfuba ekulima",
    empty: "Tinhlelo temakhono, timali, kuceqeshwa, emabhasari nekuceceshwa lokukufanele kutawuvela lapha.",
    reason: "Lelithuba lingahle lifanele libhizinisi lakho lekuhlanyela. Hlola timfuneko ngaphambi kwekufaka sicelo.",
    closes: "Livala",
    markRead: "Maka njengalokufundziwe",
    action: "Buka imininingwane ufake sicelo",
    newLabel: "lokusha",
    emailFailed: "Satiso sangekhatsi ku-app · I-imeyili ayikatsunyelwa",
  },
  isiNdebele: {
    heading: "Iimemezelo ezitjha zamathuba wokulima",
    empty: "Amalungiselelo wamakhono, imali, ukwelulekwa, amabhasari nama-learnership afaneleko azokubonakala la.",
    reason: "Ithuba leli lingafanelana nefama yakho. Hlola iimfuneko ngaphambi kokufaka isibawo.",
    closes: "Ivala",
    markRead: "Tshwaya njengokufundiweko",
    action: "Bona imininingwana ufake isibawo",
    newLabel: "ezitjha",
    emailFailed: "Isaziso sangaphakathi kuhlelo lokusebenza · I-imeyili ayikathunyelwa",
  },
};

export function getFarmerAlertCopy(language: string) {
  return { ...farmerAlertTranslations.English, ...(farmerAlertTranslations[language] ?? {}) };
}

export function getFarmerEmailCopy(language: string) {
  const copy = getFarmerAlertCopy(language);
  return {
    subject: copy.heading,
    intro: copy.reason,
    action: copy.action,
  };
}
