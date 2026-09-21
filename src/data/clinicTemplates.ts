// Predefined template bank + knowledge base for the "doctors-clinics" voice
// journey — the Level 1 hybrid design: fixed, pre-written sentences for the
// routine parts of the call (asks, confirmation, FAQ facts), so wording is
// guaranteed identical across every call, in every supported language.
// AI is only invoked (in chat/route.ts) when deterministic matching can't
// confidently resolve a field or a question — never for the routine path.

export type ClinicLang =
  | "en-IN" | "hi-IN" | "ta-IN" | "te-IN" | "bn-IN"
  | "ml-IN" | "kn-IN" | "pa-IN" | "gu-IN" | "or-IN";

export const CLINIC_SUPPORTED_LANGS: ClinicLang[] = [
  "en-IN", "hi-IN", "ta-IN", "te-IN", "bn-IN", "ml-IN", "kn-IN", "pa-IN", "gu-IN", "or-IN",
];

export const CLINIC_BRAND_NAME = "Sunrise Multi-Specialty Clinic";

export interface ClinicTemplateBank {
  greeting: string;
  askMobile: string;         // {name}
  askDob: string;            // {name}
  askDepartment: string;
  askSlot: string;
  askTime: string;     // {date} — caller gave a day/date but no time yet
  outOfHours: string;
  doctorDayMismatch: string; // {doctor} {days} {hours}
  confirmation: string;      // {name} {mobile} {department} {doctor} {date_time}
  confirmed: string;         // {id}
  correction: string;
  couldNotUnderstand: string;
  farewell: string;
  alreadyConfirmed: string; // {id} — booking already confirmed earlier this call; anything after that shouldn't re-enter confirm logic
}

export const CLINIC_TEMPLATES: Record<ClinicLang, ClinicTemplateBank> = {
  "en-IN": {
    greeting: `Hello! Welcome to ${CLINIC_BRAND_NAME}. I'm your virtual receptionist. I can help you with appointments and general clinic information. May I know your name?`,
    askMobile: "Thank you, {name}! Could you please share your 10-digit mobile number?",
    askDob: "Thank you, {name}! Could you please share your date of birth or age?",
    askDepartment: "How can I help you today — a doctor appointment, a specific specialty, or a lab test?",
    askSlot: "When would you like to schedule this? We're open Monday to Saturday, 9 AM to 7 PM — closed Sundays. If this is urgent, our emergency desk is available 24/7.",
    askTime: "Got it, {date}. What time would you like to come in? We're open 9 AM to 7 PM.",
    outOfHours: "I'm sorry, we're only open Monday to Saturday, 9 AM to 7 PM, and closed on Sundays — that time isn't available. Would another time in those hours work?",
    doctorDayMismatch: "{doctor} is only available on {days}, {hours}. Would one of those work for you?",
    confirmation: "Let me confirm: {name}, mobile {mobile}, for {department} with {doctor}, on {date_time}. Is that correct?",
    confirmed: "Your appointment is confirmed! Details have been sent to your WhatsApp. Your reference ID is {id}.",
    correction: "No problem — what would you like to change?",
    couldNotUnderstand: "Sorry, I didn't quite catch that. Could you say it again?",
    farewell: `Thank you for calling ${CLINIC_BRAND_NAME}. Take care, and have a great day!`,
    alreadyConfirmed: `Your appointment is already confirmed — reference ID {id}. Is there anything else I can help you with?`,
  },
  "hi-IN": {
    greeting: `नमस्ते! ${CLINIC_BRAND_NAME} में आपका स्वागत है। मैं आपकी वर्चुअल रिसेप्शनिस्ट हूं। मैं अपॉइंटमेंट और क्लिनिक की जानकारी में आपकी मदद कर सकती हूं। कृपया अपना नाम बताइए?`,
    askMobile: "शुक्रिया, {name} जी! कृपया अपना 10 अंकों का मोबाइल नंबर बताइए?",
    askDob: "शुक्रिया, {name} जी! कृपया अपनी जन्मतिथि या उम्र बताइए?",
    askDepartment: "आज मैं आपकी कैसे मदद कर सकती हूं — डॉक्टर अपॉइंटमेंट, कोई खास स्पेशलिटी, या लैब टेस्ट?",
    askSlot: "आप कब अपॉइंटमेंट लेना चाहेंगे? हम सोमवार से शनिवार, सुबह 9 बजे से शाम 7 बजे तक खुले हैं — रविवार बंद। अगर यह इमरजेंसी है, तो हमारा डेस्क 24/7 उपलब्ध है।",
    askTime: "ठीक है, {date}। आप किस समय आना चाहेंगे? हम सुबह 9 बजे से शाम 7 बजे तक खुले हैं।",
    outOfHours: "माफ कीजिए, हम सिर्फ सोमवार से शनिवार, सुबह 9 से शाम 7 बजे तक खुले हैं, रविवार बंद — वह समय उपलब्ध नहीं है। क्या इन घंटों में कोई और समय ठीक रहेगा?",
    doctorDayMismatch: "{doctor} सिर्फ {days}, {hours} को उपलब्ध हैं। क्या इनमें से कोई समय आपके लिए ठीक रहेगा?",
    confirmation: "तो कन्फर्म कर दूं: {name}, मोबाइल {mobile}, {department} के लिए {doctor} के साथ, {date_time} को। क्या यह सही है?",
    confirmed: "आपकी अपॉइंटमेंट कन्फर्म हो गई है! जानकारी आपके व्हाट्सऐप पर भेज दी गई है। आपकी रेफरेंस आईडी है {id}।",
    correction: "कोई बात नहीं — आप क्या बदलना चाहेंगे?",
    couldNotUnderstand: "माफ़ कीजिए, मुझे समझ नहीं आया। क्या आप फिर से बता सकते हैं?",
    farewell: `${CLINIC_BRAND_NAME} को कॉल करने के लिए धन्यवाद। अपना ख्याल रखें, आपका दिन शुभ हो!`,
    alreadyConfirmed: `आपकी अपॉइंटमेंट पहले से ही कन्फर्म है — रेफरेंस आईडी {id}। क्या मैं आपकी किसी और चीज़ में मदद कर सकती हूं?`,
  },
  "ta-IN": {
    greeting: `வணக்கம்! ${CLINIC_BRAND_NAME}-க்கு உங்களை வரவேற்கிறோம். நான் உங்கள் மெய்நிகர் வரவேற்பாளர். அப்பாயிண்ட்மென்ட் மற்றும் கிளினிக் தகவல்களுக்கு உதவ முடியும். உங்கள் பெயர் என்ன?`,
    askMobile: "நன்றி, {name}! உங்கள் 10 இலக்க மொபைல் நம்பரைச் சொல்ல முடியுமா?",
    askDob: "நன்றி, {name}! உங்கள் பிறந்த தேதி அல்லது வயதைச் சொல்ல முடியுமா?",
    askDepartment: "இன்று உங்களுக்கு எப்படி உதவலாம் — டாக்டர் அப்பாயிண்ட்மென்ட், குறிப்பிட்ட ஸ்பெஷாலிட்டி, அல்லது லேப் டெஸ்ட்?",
    askSlot: "எப்போது அப்பாயிண்ட்மென்ட் வேண்டும்? நாங்கள் திங்கள் முதல் சனி வரை, காலை 9 முதல் மாலை 7 வரை திறந்திருக்கிறோம் — ஞாயிறு விடுமுறை. அவசரமானால், எங்கள் டெஸ்க் 24/7 கிடைக்கும்.",
    askTime: "சரி, {date}. நீங்கள் எந்த நேரத்தில் வர விரும்புகிறீர்கள்? நாங்கள் காலை 9 முதல் மாலை 7 வரை திறந்திருக்கிறோம்.",
    outOfHours: "மன்னிக்கவும், நாங்கள் திங்கள் முதல் சனி வரை, காலை 9 முதல் மாலை 7 வரை மட்டுமே திறந்திருக்கிறோம், ஞாயிறு விடுமுறை — அந்த நேரம் கிடைக்காது. இந்த நேரத்தில் வேறு நேரம் சரியாக இருக்குமா?",
    doctorDayMismatch: "{doctor} {days}, {hours} மட்டுமே கிடைப்பார். இதில் ஏதேனும் நேரம் உங்களுக்கு சரியாக இருக்குமா?",
    confirmation: "உறுதி செய்கிறேன்: {name}, மொபைல் {mobile}, {department}-க்காக {doctor} உடன், {date_time} அன்று. இது சரியா?",
    confirmed: "உங்கள் அப்பாயிண்ட்மென்ட் உறுதி செய்யப்பட்டது! விவரங்கள் உங்கள் வாட்ஸ்அப்பிற்கு அனுப்பப்பட்டுள்ளன. உங்கள் ரெஃபரன்ஸ் ஐடி {id}.",
    correction: "பரவாயில்லை — நீங்கள் என்ன மாற்ற விரும்புகிறீர்கள்?",
    couldNotUnderstand: "மன்னிக்கவும், எனக்கு புரியவில்லை. மீண்டும் சொல்ல முடியுமா?",
    farewell: `${CLINIC_BRAND_NAME}-ஐ அழைத்ததற்கு நன்றி. உங்களை கவனித்துக்கொள்ளுங்கள், நல்ல நாளாக இருக்கட்டும்!`,
    alreadyConfirmed: `உங்கள் அப்பாயிண்ட்மென்ட் ஏற்கனவே உறுதி செய்யப்பட்டது — ரெஃபரன்ஸ் ஐடி {id}. வேறு எதிலாவது உதவ முடியுமா?`,
  },
  "te-IN": {
    greeting: `నమస్కారం! ${CLINIC_BRAND_NAME} కి స్వాగతం. నేను మీ వర్చువల్ రిసెప్షనిస్ట్. అపాయింట్‌మెంట్లు మరియు క్లినిక్ సమాచారం కోసం సహాయం చేయగలను. మీ పేరు చెప్పగలరా?`,
    askMobile: "ధన్యవాదాలు, {name}! మీ 10 అంకెల మొబైల్ నంబర్ చెప్పగలరా?",
    askDob: "ధన్యవాదాలు, {name}! మీ పుట్టిన తేదీ లేదా వయస్సు చెప్పగలరా?",
    askDepartment: "ఈరోజు మీకు ఎలా సహాయం చేయగలను — డాక్టర్ అపాయింట్‌మెంట్, ఒక ప్రత్యేక స్పెషాలిటీ, లేదా ల్యాబ్ టెస్ట్?",
    askSlot: "ఎప్పుడు షెడ్యూల్ చేయాలనుకుంటున్నారు? మేము సోమవారం నుండి శనివారం వరకు, ఉదయం 9 నుండి సాయంత్రం 7 వరకు తెరిచి ఉంటాము — ఆదివారం సెలవు. ఇది ఎమర్జెన్సీ అయితే, మా డెస్క్ 24/7 అందుబాటులో ఉంటుంది.",
    askTime: "సరే, {date}. మీరు ఏ సమయంలో రావాలనుకుంటున్నారు? మేము ఉదయం 9 నుండి సాయంత్రం 7 వరకు తెరిచి ఉంటాము.",
    outOfHours: "క్షమించండి, మేము సోమవారం నుండి శనివారం వరకు, ఉదయం 9 నుండి సాయంత్రం 7 వరకు మాత్రమే తెరిచి ఉంటాము, ఆదివారం సెలవు — ఆ సమయం అందుబాటులో లేదు. ఈ గంటల్లో వేరే సమయం సరిపోతుందా?",
    doctorDayMismatch: "{doctor} {days}, {hours} మాత్రమే అందుబాటులో ఉంటారు. వీటిలో ఏదైనా సమయం మీకు సరిపోతుందా?",
    confirmation: "నిర్ధారిస్తున్నాను: {name}, మొబైల్ {mobile}, {department} కోసం {doctor} తో, {date_time} న. ఇది సరైనదేనా?",
    confirmed: "మీ అపాయింట్‌మెంట్ నిర్ధారించబడింది! వివరాలు మీ వాట్సాప్‌కి పంపబడ్డాయి. మీ రిఫరెన్స్ ఐడి {id}.",
    correction: "పర్వాలేదు — మీరు ఏమి మార్చాలనుకుంటున్నారు?",
    couldNotUnderstand: "క్షమించండి, నాకు అర్థం కాలేదు. మళ్ళీ చెప్పగలరా?",
    farewell: `${CLINIC_BRAND_NAME} కి కాల్ చేసినందుకు ధన్యవాదాలు. జాగ్రత్తగా ఉండండి, మంచి రోజు కావాలి!`,
    alreadyConfirmed: `మీ అపాయింట్‌మెంట్ ఇప్పటికే నిర్ధారించబడింది — రిఫరెన్స్ ఐడి {id}. మరేదైనా సహాయం కావాలా?`,
  },
  "bn-IN": {
    greeting: `নমস্কার! ${CLINIC_BRAND_NAME}-এ আপনাকে স্বাগতম। আমি আপনার ভার্চুয়াল রিসেপশনিস্ট। অ্যাপয়েন্টমেন্ট ও ক্লিনিকের তথ্যের জন্য সাহায্য করতে পারি। আপনার নাম বলবেন?`,
    askMobile: "ধন্যবাদ, {name}! আপনার ১০ সংখ্যার মোবাইল নম্বরটি বলবেন?",
    askDob: "ধন্যবাদ, {name}! আপনার জন্ম তারিখ বা বয়স বলবেন?",
    askDepartment: "আজ আপনাকে কীভাবে সাহায্য করতে পারি — ডাক্তার অ্যাপয়েন্টমেন্ট, নির্দিষ্ট বিশেষত্ব, নাকি ল্যাব টেস্ট?",
    askSlot: "কখন অ্যাপয়েন্টমেন্ট চান? আমরা সোমবার থেকে শনিবার, সকাল ৯টা থেকে সন্ধ্যা ৭টা পর্যন্ত খোলা থাকি — রবিবার বন্ধ। জরুরি হলে, আমাদের ডেস্ক ২৪/৭ পাওয়া যায়।",
    askTime: "ঠিক আছে, {date}। আপনি কোন সময়ে আসতে চান? আমরা সকাল ৯টা থেকে সন্ধ্যা ৭টা পর্যন্ত খোলা থাকি।",
    outOfHours: "দুঃখিত, আমরা শুধু সোমবার থেকে শনিবার, সকাল ৯টা থেকে সন্ধ্যা ৭টা পর্যন্ত খোলা থাকি, রবিবার বন্ধ — সেই সময়টা পাওয়া যাবে না। এই সময়ের মধ্যে অন্য কোনো সময় ঠিক হবে কি?",
    doctorDayMismatch: "{doctor} শুধু {days}, {hours} সময়ে পাওয়া যান। এর মধ্যে কোনো সময় আপনার জন্য ঠিক হবে?",
    confirmation: "তাহলে নিশ্চিত করছি: {name}, মোবাইল {mobile}, {department}-এর জন্য {doctor}-এর সাথে, {date_time}-এ। এটা কি ঠিক আছে?",
    confirmed: "আপনার অ্যাপয়েন্টমেন্ট নিশ্চিত হয়ে গেছে! বিস্তারিত আপনার হোয়াটসঅ্যাপে পাঠানো হয়েছে। আপনার রেফারেন্স আইডি {id}।",
    correction: "কোনো সমস্যা নেই — আপনি কী পরিবর্তন করতে চান?",
    couldNotUnderstand: "দুঃখিত, আমি বুঝতে পারিনি। আবার বলবেন?",
    farewell: `${CLINIC_BRAND_NAME}-এ কল করার জন্য ধন্যবাদ। নিজের যত্ন নিন, আপনার দিনটি শুভ হোক!`,
    alreadyConfirmed: `আপনার অ্যাপয়েন্টমেন্ট ইতিমধ্যেই নিশ্চিত হয়ে গেছে — রেফারেন্স আইডি {id}। আর কিছুতে সাহায্য করতে পারি?`,
  },
  "ml-IN": {
    greeting: `നമസ്കാരം! ${CLINIC_BRAND_NAME}-ലേക്ക് സ്വാഗതം. ഞാൻ നിങ്ങളുടെ വെർച്വൽ റിസപ്ഷനിസ്റ്റ് ആണ്. അപ്പോയിന്റ്മെന്റുകൾക്കും ക്ലിനിക് വിവരങ്ങൾക്കും സഹായിക്കാം. നിങ്ങളുടെ പേര് പറയാമോ?`,
    askMobile: "നന്ദി, {name}! നിങ്ങളുടെ 10 അക്ക മൊബൈൽ നമ്പർ പറയാമോ?",
    askDob: "നന്ദി, {name}! നിങ്ങളുടെ ജനനത്തീയതി അല്ലെങ്കിൽ പ്രായം പറയാമോ?",
    askDepartment: "ഇന്ന് എങ്ങനെ സഹായിക്കാം — ഡോക്ടർ അപ്പോയിന്റ്മെന്റ്, ഒരു പ്രത്യേക സ്പെഷ്യാലിറ്റി, അതോ ലാബ് ടെസ്റ്റ്?",
    askSlot: "എപ്പോൾ ഷെഡ്യൂൾ ചെയ്യണം? ഞങ്ങൾ തിങ്കൾ മുതൽ ശനി വരെ, രാവിലെ 9 മുതൽ വൈകിട്ട് 7 വരെ തുറന്നിരിക്കും — ഞായർ അവധി. അടിയന്തിരമാണെങ്കിൽ, ഞങ്ങളുടെ ഡെസ്ക് 24/7 ലഭ്യമാണ്.",
    askTime: "ശരി, {date}. നിങ്ങൾ ഏത് സമയത്ത് വരാൻ ആഗ്രഹിക്കുന്നു? ഞങ്ങൾ രാവിലെ 9 മുതൽ വൈകിട്ട് 7 വരെ തുറന്നിരിക്കും.",
    outOfHours: "ക്ഷമിക്കണം, ഞങ്ങൾ തിങ്കൾ മുതൽ ശനി വരെ, രാവിലെ 9 മുതൽ വൈകിട്ട് 7 വരെ മാത്രമേ തുറന്നിരിക്കൂ, ഞായർ അവധി — ആ സമയം ലഭ്യമല്ല. ഈ സമയത്തിനുള്ളിൽ വേറെ സമയം ശരിയാകുമോ?",
    doctorDayMismatch: "{doctor} {days}, {hours} മാത്രമേ ലഭ്യമാകൂ. ഇതിൽ ഏതെങ്കിലും സമയം നിങ്ങൾക്ക് ശരിയാകുമോ?",
    confirmation: "സ്ഥിരീകരിക്കട്ടെ: {name}, മൊബൈൽ {mobile}, {department}-ന് {doctor}-ഒപ്പം, {date_time}-ന്. ഇത് ശരിയാണോ?",
    confirmed: "നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് സ്ഥിരീകരിച്ചു! വിവരങ്ങൾ നിങ്ങളുടെ വാട്സ്ആപ്പിലേക്ക് അയച്ചിട്ടുണ്ട്. നിങ്ങളുടെ റഫറൻസ് ഐഡി {id}.",
    correction: "കുഴപ്പമില്ല — എന്താണ് മാറ്റണ്ടത്?",
    couldNotUnderstand: "ക്ഷമിക്കണം, എനിക്ക് മനസ്സിലായില്ല. വീണ്ടും പറയാമോ?",
    farewell: `${CLINIC_BRAND_NAME}-ലേക്ക് വിളിച്ചതിന് നന്ദി. ശ്രദ്ധിക്കുക, നല്ല ദിവസം ആശംസിക്കുന്നു!`,
    alreadyConfirmed: `നിങ്ങളുടെ അപ്പോയിന്റ്മെന്റ് ഇതിനകം സ്ഥിരീകരിച്ചു — റഫറൻസ് ഐഡി {id}. മറ്റെന്തെങ്കിലും സഹായം വേണോ?`,
  },
  "kn-IN": {
    greeting: `ನಮಸ್ಕಾರ! ${CLINIC_BRAND_NAME} ಗೆ ಸ್ವಾಗತ. ನಾನು ನಿಮ್ಮ ವರ್ಚುವಲ್ ರಿಸೆಪ್ಶನಿಸ್ಟ್. ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಮತ್ತು ಕ್ಲಿನಿಕ್ ಮಾಹಿತಿಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ. ನಿಮ್ಮ ಹೆಸರು ಹೇಳಿ?`,
    askMobile: "ಧನ್ಯವಾದಗಳು, {name}! ನಿಮ್ಮ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ನಂಬರ್ ಹೇಳುತ್ತೀರಾ?",
    askDob: "ಧನ್ಯವಾದಗಳು, {name}! ನಿಮ್ಮ ಹುಟ್ಟಿದ ದಿನಾಂಕ ಅಥವಾ ವಯಸ್ಸು ಹೇಳುತ್ತೀರಾ?",
    askDepartment: "ಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ — ಡಾಕ್ಟರ್ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್, ನಿರ್ದಿಷ್ಟ ಸ್ಪೆಷಾಲಿಟಿ, ಅಥವಾ ಲ್ಯಾಬ್ ಟೆಸ್ಟ್?",
    askSlot: "ಯಾವಾಗ ವೇಳಾಪಟ್ಟಿ ಬೇಕು? ನಾವು ಸೋಮವಾರದಿಂದ ಶನಿವಾರದವರೆಗೆ, ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 7 ರವರೆಗೆ ತೆರೆದಿರುತ್ತೇವೆ — ಭಾನುವಾರ ರಜೆ. ತುರ್ತು ಇದ್ದರೆ, ನಮ್ಮ ಡೆಸ್ಕ್ 24/7 ಲಭ್ಯವಿದೆ.",
    askTime: "ಸರಿ, {date}. ನೀವು ಯಾವ ಸಮಯಕ್ಕೆ ಬರಲು ಬಯಸುತ್ತೀರಿ? ನಾವು ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 7 ರವರೆಗೆ ತೆರೆದಿರುತ್ತೇವೆ.",
    outOfHours: "ಕ್ಷಮಿಸಿ, ನಾವು ಸೋಮವಾರದಿಂದ ಶನಿವಾರದವರೆಗೆ, ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 7 ರವರೆಗೆ ಮಾತ್ರ ತೆರೆದಿರುತ್ತೇವೆ, ಭಾನುವಾರ ರಜೆ — ಆ ಸಮಯ ಲಭ್ಯವಿಲ್ಲ. ಈ ಸಮಯದೊಳಗೆ ಬೇರೆ ಸಮಯ ಸರಿಹೊಂದುತ್ತದೆಯೇ?",
    doctorDayMismatch: "{doctor} {days}, {hours} ಮಾತ್ರ ಲಭ್ಯವಿರುತ್ತಾರೆ. ಇವುಗಳಲ್ಲಿ ಯಾವುದಾದರೂ ಸಮಯ ನಿಮಗೆ ಸರಿಹೊಂದುತ್ತದೆಯೇ?",
    confirmation: "ಖಚಿತಪಡಿಸುತ್ತೇನೆ: {name}, ಮೊಬೈಲ್ {mobile}, {department} ಗಾಗಿ {doctor} ಜೊತೆ, {date_time} ರಂದು. ಇದು ಸರಿಯೇ?",
    confirmed: "ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಖಚಿತಗೊಂಡಿದೆ! ವಿವರಗಳನ್ನು ನಿಮ್ಮ ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ರೆಫರೆನ್ಸ್ ಐಡಿ {id}.",
    correction: "ಪರವಾಗಿಲ್ಲ — ನೀವು ಏನು ಬದಲಾಯಿಸಲು ಬಯಸುತ್ತೀರಿ?",
    couldNotUnderstand: "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಹೇಳುತ್ತೀರಾ?",
    farewell: `${CLINIC_BRAND_NAME} ಗೆ ಕರೆ ಮಾಡಿದ್ದಕ್ಕೆ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮನ್ನು ನೀವು ಚೆನ್ನಾಗಿ ನೋಡಿಕೊಳ್ಳಿ, ಶುಭ ದಿನ!`,
    alreadyConfirmed: `ನಿಮ್ಮ ಅಪಾಯಿಂಟ್‌ಮೆಂಟ್ ಈಗಾಗಲೇ ಖಚಿತಗೊಂಡಿದೆ — ರೆಫರೆನ್ಸ್ ಐಡಿ {id}. ಬೇರೆ ಏನಾದರೂ ಸಹಾಯ ಬೇಕೇ?`,
  },
  "pa-IN": {
    greeting: `ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ${CLINIC_BRAND_NAME} ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਮੈਂ ਤੁਹਾਡੀ ਵਰਚੁਅਲ ਰਿਸੈਪਸ਼ਨਿਸਟ ਹਾਂ। ਅਪਾਇੰਟਮੈਂਟ ਅਤੇ ਕਲੀਨਿਕ ਜਾਣਕਾਰੀ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ। ਆਪਣਾ ਨਾਮ ਦੱਸੋ?`,
    askMobile: "ਧੰਨਵਾਦ, {name} ਜੀ! ਆਪਣਾ 10 ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦੱਸੋਗੇ?",
    askDob: "ਧੰਨਵਾਦ, {name} ਜੀ! ਆਪਣੀ ਜਨਮ ਮਿਤੀ ਜਾਂ ਉਮਰ ਦੱਸੋਗੇ?",
    askDepartment: "ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ — ਡਾਕਟਰ ਅਪਾਇੰਟਮੈਂਟ, ਕੋਈ ਖਾਸ ਸਪੈਸ਼ਲਿਟੀ, ਜਾਂ ਲੈਬ ਟੈਸਟ?",
    askSlot: "ਤੁਸੀਂ ਕਦੋਂ ਅਪਾਇੰਟਮੈਂਟ ਲੈਣਾ ਚਾਹੋਗੇ? ਅਸੀਂ ਸੋਮਵਾਰ ਤੋਂ ਸ਼ਨੀਵਾਰ, ਸਵੇਰੇ 9 ਵਜੇ ਤੋਂ ਸ਼ਾਮ 7 ਵਜੇ ਤੱਕ ਖੁੱਲ੍ਹੇ ਹਾਂ — ਐਤਵਾਰ ਬੰਦ। ਜੇ ਐਮਰਜੈਂਸੀ ਹੈ, ਸਾਡਾ ਡੈਸਕ 24/7 ਉਪਲਬਧ ਹੈ।",
    askTime: "ਠੀਕ ਹੈ, {date}। ਤੁਸੀਂ ਕਿਸ ਸਮੇਂ ਆਉਣਾ ਚਾਹੋਗੇ? ਅਸੀਂ ਸਵੇਰੇ 9 ਵਜੇ ਤੋਂ ਸ਼ਾਮ 7 ਵਜੇ ਤੱਕ ਖੁੱਲ੍ਹੇ ਹਾਂ।",
    outOfHours: "ਮਾਫ਼ ਕਰਨਾ, ਅਸੀਂ ਸਿਰਫ਼ ਸੋਮਵਾਰ ਤੋਂ ਸ਼ਨੀਵਾਰ, ਸਵੇਰੇ 9 ਤੋਂ ਸ਼ਾਮ 7 ਵਜੇ ਤੱਕ ਖੁੱਲ੍ਹੇ ਹਾਂ, ਐਤਵਾਰ ਬੰਦ — ਉਹ ਸਮਾਂ ਉਪਲਬਧ ਨਹੀਂ। ਇਹਨਾਂ ਘੰਟਿਆਂ ਵਿੱਚ ਕੋਈ ਹੋਰ ਸਮਾਂ ਠੀਕ ਰਹੇਗਾ?",
    doctorDayMismatch: "{doctor} ਸਿਰਫ਼ {days}, {hours} ਨੂੰ ਉਪਲਬਧ ਹਨ। ਇਹਨਾਂ ਵਿੱਚੋਂ ਕੋਈ ਸਮਾਂ ਤੁਹਾਡੇ ਲਈ ਠੀਕ ਰਹੇਗਾ?",
    confirmation: "ਤਾਂ ਪੱਕਾ ਕਰ ਦੇਵਾਂ: {name}, ਮੋਬਾਈਲ {mobile}, {department} ਲਈ {doctor} ਨਾਲ, {date_time} ਨੂੰ। ਕੀ ਇਹ ਠੀਕ ਹੈ?",
    confirmed: "ਤੁਹਾਡੀ ਅਪਾਇੰਟਮੈਂਟ ਪੱਕੀ ਹੋ ਗਈ ਹੈ! ਜਾਣਕਾਰੀ ਤੁਹਾਡੇ ਵਟਸਐਪ 'ਤੇ ਭੇਜ ਦਿੱਤੀ ਗਈ ਹੈ। ਤੁਹਾਡੀ ਰੈਫਰੈਂਸ ਆਈਡੀ ਹੈ {id}।",
    correction: "ਕੋਈ ਗੱਲ ਨਹੀਂ — ਤੁਸੀਂ ਕੀ ਬਦਲਣਾ ਚਾਹੋਗੇ?",
    couldNotUnderstand: "ਮਾਫ਼ ਕਰਨਾ, ਮੈਨੂੰ ਸਮਝ ਨਹੀਂ ਆਇਆ। ਕੀ ਤੁਸੀਂ ਦੁਬਾਰਾ ਦੱਸ ਸਕਦੇ ਹੋ?",
    farewell: `${CLINIC_BRAND_NAME} ਨੂੰ ਕਾਲ ਕਰਨ ਲਈ ਧੰਨਵਾਦ। ਆਪਣਾ ਖਿਆਲ ਰੱਖੋ, ਤੁਹਾਡਾ ਦਿਨ ਸ਼ੁਭ ਹੋਵੇ!`,
    alreadyConfirmed: `ਤੁਹਾਡੀ ਅਪਾਇੰਟਮੈਂਟ ਪਹਿਲਾਂ ਹੀ ਪੱਕੀ ਹੋ ਚੁੱਕੀ ਹੈ — ਰੈਫਰੈਂਸ ਆਈਡੀ {id}। ਕੀ ਮੈਂ ਕਿਸੇ ਹੋਰ ਚੀਜ਼ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦੀ ਹਾਂ?`,
  },
  "gu-IN": {
    greeting: `નમસ્તે! ${CLINIC_BRAND_NAME} માં તમારું સ્વાગત છે. હું તમારી વર્ચ્યુઅલ રિસેપ્શનિસ્ટ છું. અપોઇન્ટમેન્ટ અને ક્લિનિક માહિતી માટે મદદ કરી શકું છું. તમારું નામ કહેશો?`,
    askMobile: "આભાર, {name}! તમારો 10 અંકનો મોબાઇલ નંબર કહેશો?",
    askDob: "આભાર, {name}! તમારી જન્મ તારીખ અથવા ઉંમર કહેશો?",
    askDepartment: "આજે હું તમને કેવી રીતે મદદ કરી શકું — ડોક્ટર અપોઇન્ટમેન્ટ, ચોક્કસ સ્પેશિયાલિટી, કે લેબ ટેસ્ટ?",
    askSlot: "તમે ક્યારે અપોઇન્ટમેન્ટ લેવા માંગો છો? અમે સોમવારથી શનિવાર, સવારે 9 થી સાંજે 7 વાગ્યા સુધી ખુલ્લા છીએ — રવિવારે બંધ. જો ઇમરજન્સી હોય, તો અમારો ડેસ્ક 24/7 ઉપલબ્ધ છે.",
    askTime: "ઠીક છે, {date}. તમે કયા સમયે આવવા માંગો છો? અમે સવારે 9 થી સાંજે 7 વાગ્યા સુધી ખુલ્લા છીએ.",
    outOfHours: "માફ કરશો, અમે ફક્ત સોમવારથી શનિવાર, સવારે 9 થી સાંજે 7 વાગ્યા સુધી ખુલ્લા છીએ, રવિવારે બંધ — તે સમય ઉપલબ્ધ નથી. આ કલાકોમાં બીજો સમય ચાલશે?",
    doctorDayMismatch: "{doctor} ફક્ત {days}, {hours} એ ઉપલબ્ધ છે. આમાંથી કોઈ સમય તમારા માટે ચાલશે?",
    confirmation: "તો કન્ફર્મ કરું: {name}, મોબાઇલ {mobile}, {department} માટે {doctor} સાથે, {date_time} એ. શું આ સાચું છે?",
    confirmed: "તમારી અપોઇન્ટમેન્ટ કન્ફર્મ થઈ ગઈ છે! વિગતો તમારા વોટ્સએપ પર મોકલવામાં આવી છે. તમારો રેફરન્સ આઈડી {id} છે.",
    correction: "કોઈ વાંધો નહીં — તમે શું બદલવા માંગો છો?",
    couldNotUnderstand: "માફ કરશો, મને સમજાયું નહીં. શું તમે ફરીથી કહેશો?",
    farewell: `${CLINIC_BRAND_NAME} ને કૉલ કરવા બદલ આભાર. તમારું ધ્યાન રાખો, તમારો દિવસ શુભ રહે!`,
    alreadyConfirmed: `તમારી અપોઇન્ટમેન્ટ પહેલેથી જ કન્ફર્મ છે — રેફરન્સ આઈડી {id}. શું હું બીજી કોઈ બાબતમાં મદદ કરી શકું?`,
  },
  "or-IN": {
    greeting: `ନମସ୍କାର! ${CLINIC_BRAND_NAME} କୁ ସ୍ୱାଗତ। ମୁଁ ଆପଣଙ୍କର ଭର୍ଚୁଆଲ୍ ରିସେପ୍ସନିଷ୍ଟ। ଆପଏଣ୍ଟମେଣ୍ଟ ଏବଂ କ୍ଲିନିକ୍ ସୂଚନା ପାଇଁ ସାହାଯ୍ୟ କରିପାରିବି। ଆପଣଙ୍କ ନାମ କ'ଣ?`,
    askMobile: "ଧନ୍ୟବାଦ, {name}! ଆପଣଙ୍କର 10 ଅଙ୍କ ବିଶିଷ୍ଟ ମୋବାଇଲ୍ ନମ୍ବର କହିବେ କି?",
    askDob: "ଧନ୍ୟବାଦ, {name}! ଆପଣଙ୍କର ଜନ୍ମ ତାରିଖ କିମ୍ବା ବୟସ କହିବେ କି?",
    askDepartment: "ଆଜି ମୁଁ କିପରି ସାହାଯ୍ୟ କରିପାରିବି — ଡାକ୍ତର ଆପଏଣ୍ଟମେଣ୍ଟ, ଏକ ନିର୍ଦ୍ଦିଷ୍ଟ ସ୍ପେଶାଲିଟି, ନା ଲ୍ୟାବ୍ ଟେଷ୍ଟ?",
    askSlot: "କେବେ ଆପଏଣ୍ଟମେଣ୍ଟ ନେବାକୁ ଚାହାଁନ୍ତି? ଆମେ ସୋମବାରରୁ ଶନିବାର, ସକାଳ 9ଟାରୁ ସନ୍ଧ୍ୟା 7ଟା ପର୍ଯ୍ୟନ୍ତ ଖୋଲା ରହୁ — ରବିବାର ବନ୍ଦ। ଜରୁରୀ ହେଲେ, ଆମର ଡେସ୍କ 24/7 ଉପଲବ୍ଧ।",
    askTime: "ଠିକ୍ ଅଛି, {date}। ଆପଣ କେଉଁ ସମୟରେ ଆସିବାକୁ ଚାହାଁନ୍ତି? ଆମେ ସକାଳ 9ଟାରୁ ସନ୍ଧ୍ୟା 7ଟା ପର୍ଯ୍ୟନ୍ତ ଖୋଲା ରହୁ।",
    outOfHours: "କ୍ଷମା କରନ୍ତୁ, ଆମେ କେବଳ ସୋମବାରରୁ ଶନିବାର, ସକାଳ 9ଟାରୁ ସନ୍ଧ୍ୟା 7ଟା ପର୍ଯ୍ୟନ୍ତ ଖୋଲା ରହୁ, ରବିବାର ବନ୍ଦ — ସେହି ସମୟ ଉପଲବ୍ଧ ନାହିଁ। ଏହି ସମୟ ମଧ୍ୟରେ ଅନ୍ୟ ସମୟ ଠିକ୍ ରହିବ କି?",
    doctorDayMismatch: "{doctor} କେବଳ {days}, {hours} ରେ ଉପଲବ୍ଧ। ଏଥିମଧ୍ୟରୁ କୌଣସି ସମୟ ଆପଣଙ୍କ ପାଇଁ ଠିକ୍ ରହିବ କି?",
    confirmation: "ତେବେ ନିଶ୍ଚିତ କରୁଛି: {name}, ମୋବାଇଲ୍ {mobile}, {department} ପାଇଁ {doctor} ସହିତ, {date_time} ରେ। ଏହା ଠିକ୍ କି?",
    confirmed: "ଆପଣଙ୍କ ଆପଏଣ୍ଟମେଣ୍ଟ ନିଶ୍ଚିତ ହୋଇଗଲା! ବିବରଣୀ ଆପଣଙ୍କ ହ୍ୱାଟସ୍ଆପ୍‌କୁ ପଠାଯାଇଛି। ଆପଣଙ୍କ ରେଫରେନ୍ସ ଆଇଡି {id}।",
    correction: "କୌଣସି ଅସୁବିଧା ନାହିଁ — ଆପଣ କ'ଣ ବଦଳାଇବାକୁ ଚାହାଁନ୍ତି?",
    couldNotUnderstand: "କ୍ଷମା କରନ୍ତୁ, ମୁଁ ବୁଝିପାରିଲି ନାହିଁ। ଆପଣ ପୁଣି କହିବେ କି?",
    farewell: `${CLINIC_BRAND_NAME} କୁ କଲ୍ କରିଥିବାରୁ ଧନ୍ୟବାଦ। ନିଜର ଯତ୍ନ ନିଅନ୍ତୁ, ଆପଣଙ୍କର ଦିନ ଶୁଭ ହେଉ!`,
    alreadyConfirmed: `ଆପଣଙ୍କ ଆପଏଣ୍ଟମେଣ୍ଟ ପୂର୍ବରୁ ନିଶ୍ଚିତ ହୋଇଯାଇଛି — ରେଫରେନ୍ସ ଆଇଡି {id}। ଆଉ କୌଣସି ବିଷୟରେ ସାହାଯ୍ୟ କରିପାରିବି କି?`,
  },
};

// ─── Knowledge base — deterministic FAQ facts, one per language ────────────
export interface ClinicKnowledgeBank {
  consultationFee: string;
  labServices: string;
  location: string;
  paymentMethods: string;
  emergencyContact: string;
  specialtyList: string;
  doctorInfo: string; // {doctor} {specialty} {days} {hours}
  operatingHours: string; // {days} {hours}
}

export const CLINIC_KB: Record<ClinicLang, ClinicKnowledgeBank> = {
  "en-IN": {
    consultationFee: "₹600 for a standard OPD consultation, ₹300 for a follow-up.",
    labServices: "Blood tests, X-rays, ECG, and diagnostic imaging — open 7 AM to 7 PM daily. Fasting tests are best between 7 and 11 AM.",
    location: "Central Health Complex, 2nd Floor — wheelchair accessible, with dedicated parking.",
    paymentMethods: "We accept cash, UPI, and all major cards. An insurance TPA desk is also available.",
    emergencyContact: "For emergencies, call 112 or visit our on-site desk — available 24/7.",
    specialtyList: "We have General Medicine, Cardiology, Orthopedics, Dermatology, ENT, Pediatrics, Gynecology, Neurology, Ophthalmology, Dental Care, and Diagnostics & Pathology (lab tests, X-Ray, ECG).",
    doctorInfo: "{doctor} handles {specialty}, available {days}, {hours}.",
    operatingHours: "We're open {days}, {hours}.",
  },
  "hi-IN": {
    consultationFee: "स्टैंडर्ड OPD consultation के लिए ₹600, फॉलो-अप के लिए ₹300।",
    labServices: "ब्लड टेस्ट, एक्स-रे, ईसीजी और डायग्नोस्टिक इमेजिंग — रोज़ सुबह 7 से शाम 7 बजे तक। फास्टिंग टेस्ट सुबह 7 से 11 बजे के बीच सबसे अच्छे रहते हैं।",
    location: "सेंट्रल हेल्थ कॉम्प्लेक्स, दूसरी मंजिल — व्हीलचेयर एक्सेसिबल, डेडिकेटेड पार्किंग के साथ।",
    paymentMethods: "हम कैश, UPI और सभी प्रमुख कार्ड स्वीकार करते हैं। इंश्योरेंस TPA डेस्क भी उपलब्ध है।",
    emergencyContact: "इमरजेंसी के लिए 112 पर कॉल करें या हमारे ऑन-साइट डेस्क पर जाएं — 24/7 उपलब्ध।",
    specialtyList: "हमारे पास जनरल मेडिसिन, कार्डियोलॉजी, ऑर्थोपेडिक्स, डर्मेटोलॉजी, ईएनटी, पीडियाट्रिक्स, गायनेकोलॉजी, न्यूरोलॉजी, ऑप्थल्मोलॉजी, डेंटल केयर, और डायग्नोस्टिक्स एंड पैथोलॉजी (लैब टेस्ट, एक्स-रे, ईसीजी) हैं।",
    doctorInfo: "{doctor} {specialty} देखते हैं, उपलब्ध {days}, {hours}।",
    operatingHours: "हम {days}, {hours} खुले हैं।",
  },
  "ta-IN": {
    consultationFee: "ஸ்டாண்டர்ட் OPD கன்சல்டேஷனுக்கு ₹600, ஃபாலோ-அப்புக்கு ₹300.",
    labServices: "ரத்த பரிசோதனை, எக்ஸ்-ரே, ஈசிஜி, மற்றும் டயக்னாஸ்டிக் இமேஜிங் — தினமும் காலை 7 முதல் மாலை 7 வரை. உண்ணாவிரத பரிசோதனைகள் காலை 7 முதல் 11 வரை சிறந்தது.",
    location: "சென்ட்ரல் ஹெல்த் காம்ப்ளக்ஸ், 2வது தளம் — வீல்சேர் அணுகல், தனி பார்க்கிங் வசதி.",
    paymentMethods: "நாங்கள் கேஷ், UPI, மற்றும் அனைத்து முக்கிய கார்டுகளையும் ஏற்கிறோம். இன்சூரன்ஸ் TPA டெஸ்க்கும் உள்ளது.",
    emergencyContact: "அவசரநிலைக்கு 112-ஐ அழைக்கவும் அல்லது எங்கள் ஆன்-சைட் டெஸ்க்கிற்கு வரவும் — 24/7 கிடைக்கும்.",
    specialtyList: "எங்களிடம் ஜெனரல் மெடிசின், கார்டியாலஜி, ஆர்த்தோபெடிக்ஸ், டெர்மாட்டாலஜி, ENT, பீடியாட்ரிக்ஸ், கைனகாலஜி, நியூராலஜி, ஆஃப்தல்மாலஜி, டெண்டல் கேர், மற்றும் டயாக்னோஸ்டிக்ஸ் & பேத்தாலஜி (லேப் டெஸ்ட், எக்ஸ்-ரே, ஈசிஜி) உள்ளது.",
    doctorInfo: "{doctor} {specialty} பார்க்கிறார், கிடைக்கும் {days}, {hours}.",
    operatingHours: "நாங்கள் {days}, {hours} திறந்திருக்கிறோம்.",
  },
  "te-IN": {
    consultationFee: "స్టాండర్డ్ OPD కన్సల్టేషన్‌కి ₹600, ఫాలో-అప్‌కి ₹300.",
    labServices: "బ్లడ్ టెస్ట్‌లు, ఎక్స్-రేలు, ఈసీజీ, డయాగ్నొస్టిక్ ఇమేజింగ్ — రోజూ ఉదయం 7 నుండి సాయంత్రం 7 వరకు. ఫాస్టింగ్ టెస్ట్‌లకు ఉదయం 7 నుండి 11 మధ్య మంచిది.",
    location: "సెంట్రల్ హెల్త్ కాంప్లెక్స్, 2వ అంతస్తు — వీల్‌చైర్ యాక్సెస్, ప్రత్యేక పార్కింగ్‌తో.",
    paymentMethods: "మేము క్యాష్, UPI, మరియు అన్ని ప్రధాన కార్డులను అంగీకరిస్తాము. ఇన్సూరెన్స్ TPA డెస్క్ కూడా అందుబాటులో ఉంది.",
    emergencyContact: "ఎమర్జెన్సీల కోసం 112కి కాల్ చేయండి లేదా మా ఆన్-సైట్ డెస్క్‌ని సందర్శించండి — 24/7 అందుబాటులో ఉంటుంది.",
    specialtyList: "మా వద్ద జనరల్ మెడిసిన్, కార్డియాలజీ, ఆర్థోపెడిక్స్, డెర్మటాలజీ, ENT, పీడియాట్రిక్స్, గైనకాలజీ, న్యూరాలజీ, ఆప్తాల్మాలజీ, డెంటల్ కేర్, మరియు డయాగ్నోస్టిక్స్ & పాథాలజీ (ల్యాబ్ టెస్ట్‌లు, ఎక్స్-రే, ఈసీజీ) ఉన్నాయి.",
    doctorInfo: "{doctor} {specialty} చూస్తారు, అందుబాటులో {days}, {hours}.",
    operatingHours: "మేము {days}, {hours} తెరిచి ఉంటాము.",
  },
  "bn-IN": {
    consultationFee: "স্ট্যান্ডার্ড OPD কনসালটেশনের জন্য ₹৬০০, ফলো-আপের জন্য ₹৩০০।",
    labServices: "ব্লাড টেস্ট, এক্স-রে, ইসিজি, এবং ডায়াগনস্টিক ইমেজিং — প্রতিদিন সকাল ৭টা থেকে সন্ধ্যা ৭টা পর্যন্ত। ফাস্টিং টেস্ট সকাল ৭টা থেকে ১১টার মধ্যে সবচেয়ে ভালো।",
    location: "সেন্ট্রাল হেলথ কমপ্লেক্স, ২য় তলা — হুইলচেয়ার অ্যাক্সেসযোগ্য, নিজস্ব পার্কিং সহ।",
    paymentMethods: "আমরা ক্যাশ, UPI, এবং সব প্রধান কার্ড গ্রহণ করি। ইনস্যুরেন্স TPA ডেস্কও আছে।",
    emergencyContact: "জরুরী অবস্থায় ১১২ নম্বরে কল করুন বা আমাদের অন-সাইট ডেস্কে যান — ২৪/৭ উপলব্ধ।",
    specialtyList: "আমাদের কাছে জেনারেল মেডিসিন, কার্ডিওলজি, অর্থোপেডিক্স, ডার্মাটোলজি, ইএনটি, পেডিয়াট্রিক্স, গাইনোকোলজি, নিউরোলজি, অপথালমোলজি, ডেন্টাল কেয়ার, এবং ডায়াগনস্টিকস অ্যান্ড প্যাথলজি (ল্যাব টেস্ট, এক্স-রে, ইসিজি) আছে।",
    doctorInfo: "{doctor} {specialty} দেখেন, উপলব্ধ {days}, {hours}।",
    operatingHours: "আমরা {days}, {hours} খোলা থাকি।",
  },
  "ml-IN": {
    consultationFee: "സ്റ്റാൻഡേർഡ് OPD കൺസൾട്ടേഷന് ₹600, ഫോളോ-അപ്പിന് ₹300.",
    labServices: "ബ്ലഡ് ടെസ്റ്റുകൾ, എക്സ്-റേ, ഇസിജി, ഡയഗ്നോസ്റ്റിക് ഇമേജിംഗ് — എല്ലാ ദിവസവും രാവിലെ 7 മുതൽ വൈകിട്ട് 7 വരെ. ഫാസ്റ്റിംഗ് ടെസ്റ്റുകൾക്ക് രാവിലെ 7 മുതൽ 11 വരെ ഏറ്റവും നല്ലത്.",
    location: "സെൻട്രൽ ഹെൽത്ത് കോംപ്ലക്സ്, 2-ാം നില — വീൽചെയർ ആക്സസ്, പ്രത്യേക പാർക്കിംഗ്.",
    paymentMethods: "ഞങ്ങൾ ക്യാഷ്, UPI, എല്ലാ പ്രധാന കാർഡുകളും സ്വീകരിക്കുന്നു. ഇൻഷുറൻസ് TPA ഡെസ്കും ലഭ്യമാണ്.",
    emergencyContact: "അടിയന്തിര ഘട്ടങ്ങളിൽ 112 വിളിക്കുക അല്ലെങ്കിൽ ഞങ്ങളുടെ ഓൺ-സൈറ്റ് ഡെസ്ക് സന്ദർശിക്കുക — 24/7 ലഭ്യമാണ്.",
    specialtyList: "ഞങ്ങൾക്ക് ജനറൽ മെഡിസിൻ, കാർഡിയോളജി, ഓർത്തോപീഡിക്സ്, ഡെർമറ്റോളജി, ENT, പീഡിയാട്രിക്സ്, ഗൈനക്കോളജി, ന്യൂറോളജി, ഒഫ്താൽമോളജി, ഡെന്റൽ കെയർ, ഡയഗ്നോസ്റ്റിക്സ് & പാത്തോളജി (ലാബ് ടെസ്റ്റുകൾ, എക്സ്-റേ, ഇസിജി) എന്നിവയുണ്ട്.",
    doctorInfo: "{doctor} {specialty} കാണുന്നു, ലഭ്യമായ സമയം {days}, {hours}.",
    operatingHours: "ഞങ്ങൾ {days}, {hours} തുറന്നിരിക്കും.",
  },
  "kn-IN": {
    consultationFee: "ಸ್ಟ್ಯಾಂಡರ್ಡ್ OPD ಕನ್ಸಲ್ಟೇಶನ್‌ಗೆ ₹600, ಫಾಲೋ-ಅಪ್‌ಗೆ ₹300.",
    labServices: "ರಕ್ತ ಪರೀಕ್ಷೆಗಳು, ಎಕ್ಸ್-ರೇ, ಇಸಿಜಿ, ಮತ್ತು ಡಯಾಗ್ನೋಸ್ಟಿಕ್ ಇಮೇಜಿಂಗ್ — ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ 7 ರಿಂದ ಸಂಜೆ 7 ರವರೆಗೆ. ಫಾಸ್ಟಿಂಗ್ ಪರೀಕ್ಷೆಗಳಿಗೆ ಬೆಳಿಗ್ಗೆ 7 ರಿಂದ 11 ರ ನಡುವೆ ಉತ್ತಮ.",
    location: "ಸೆಂಟ್ರಲ್ ಹೆಲ್ತ್ ಕಾಂಪ್ಲೆಕ್ಸ್, 2ನೇ ಮಹಡಿ — ವೀಲ್‌ಚೇರ್ ಪ್ರವೇಶ, ಪ್ರತ್ಯೇಕ ಪಾರ್ಕಿಂಗ್.",
    paymentMethods: "ನಾವು ಕ್ಯಾಶ್, UPI, ಮತ್ತು ಎಲ್ಲಾ ಪ್ರಮುಖ ಕಾರ್ಡ್‌ಗಳನ್ನು ಸ್ವೀಕರಿಸುತ್ತೇವೆ. ಇನ್ಶೂರೆನ್ಸ್ TPA ಡೆಸ್ಕ್ ಸಹ ಲಭ್ಯವಿದೆ.",
    emergencyContact: "ತುರ್ತು ಸಂದರ್ಭಗಳಲ್ಲಿ 112 ಗೆ ಕರೆ ಮಾಡಿ ಅಥವಾ ನಮ್ಮ ಆನ್-ಸೈಟ್ ಡೆಸ್ಕ್‌ಗೆ ಭೇಟಿ ನೀಡಿ — 24/7 ಲಭ್ಯವಿದೆ.",
    specialtyList: "ನಮ್ಮಲ್ಲಿ ಜನರಲ್ ಮೆಡಿಸಿನ್, ಕಾರ್ಡಿಯಾಲಜಿ, ಆರ್ಥೋಪೆಡಿಕ್ಸ್, ಡರ್ಮಟಾಲಜಿ, ENT, ಪೀಡಿಯಾಟ್ರಿಕ್ಸ್, ಗೈನಕಾಲಜಿ, ನ್ಯೂರಾಲಜಿ, ಆಫ್ತಾಲ್ಮಾಲಜಿ, ಡೆಂಟಲ್ ಕೇರ್, ಮತ್ತು ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್ & ಪ್ಯಾಥಾಲಜಿ (ಲ್ಯಾಬ್ ಟೆಸ್ಟ್‌ಗಳು, ಎಕ್ಸ್-ರೇ, ಇಸಿಜಿ) ಇವೆ.",
    doctorInfo: "{doctor} {specialty} ನೋಡುತ್ತಾರೆ, ಲಭ್ಯವಿರುವ ಸಮಯ {days}, {hours}.",
    operatingHours: "ನಾವು {days}, {hours} ತೆರೆದಿರುತ್ತೇವೆ.",
  },
  "pa-IN": {
    consultationFee: "ਸਟੈਂਡਰਡ OPD ਕੰਸਲਟੇਸ਼ਨ ਲਈ ₹600, ਫਾਲੋ-ਅੱਪ ਲਈ ₹300।",
    labServices: "ਬਲੱਡ ਟੈਸਟ, ਐਕਸ-ਰੇ, ਈਸੀਜੀ, ਅਤੇ ਡਾਇਗਨੌਸਟਿਕ ਇਮੇਜਿੰਗ — ਹਰ ਰੋਜ਼ ਸਵੇਰੇ 7 ਤੋਂ ਸ਼ਾਮ 7 ਵਜੇ ਤੱਕ। ਫਾਸਟਿੰਗ ਟੈਸਟ ਸਵੇਰੇ 7 ਤੋਂ 11 ਵਜੇ ਦੇ ਵਿਚਕਾਰ ਸਭ ਤੋਂ ਵਧੀਆ ਹੁੰਦੇ ਹਨ।",
    location: "ਸੈਂਟਰਲ ਹੈਲਥ ਕੰਪਲੈਕਸ, ਦੂਜੀ ਮੰਜ਼ਿਲ — ਵ੍ਹੀਲਚੇਅਰ ਪਹੁੰਚ, ਵੱਖਰੀ ਪਾਰਕਿੰਗ ਨਾਲ।",
    paymentMethods: "ਅਸੀਂ ਕੈਸ਼, UPI, ਅਤੇ ਸਾਰੇ ਮੁੱਖ ਕਾਰਡ ਸਵੀਕਾਰ ਕਰਦੇ ਹਾਂ। ਇੰਸ਼ੋਰੈਂਸ TPA ਡੈਸਕ ਵੀ ਉਪਲਬਧ ਹੈ।",
    emergencyContact: "ਐਮਰਜੈਂਸੀ ਲਈ 112 'ਤੇ ਕਾਲ ਕਰੋ ਜਾਂ ਸਾਡੇ ਆਨ-ਸਾਈਟ ਡੈਸਕ 'ਤੇ ਜਾਓ — 24/7 ਉਪਲਬਧ।",
    specialtyList: "ਸਾਡੇ ਕੋਲ ਜਨਰਲ ਮੈਡੀਸਨ, ਕਾਰਡੀਓਲੋਜੀ, ਆਰਥੋਪੈਡਿਕਸ, ਡਰਮਾਟੋਲੋਜੀ, ENT, ਪੀਡੀਆਟ੍ਰਿਕਸ, ਗਾਇਨੀਕੋਲੋਜੀ, ਨਿਊਰੋਲੋਜੀ, ਓਫਥਾਲਮੋਲੋਜੀ, ਡੈਂਟਲ ਕੇਅਰ, ਅਤੇ ਡਾਇਗਨੌਸਟਿਕਸ ਐਂਡ ਪੈਥੋਲੋਜੀ (ਲੈਬ ਟੈਸਟ, ਐਕਸ-ਰੇ, ਈਸੀਜੀ) ਹਨ।",
    doctorInfo: "{doctor} {specialty} ਦੇਖਦੇ ਹਨ, ਉਪਲਬਧ {days}, {hours}।",
    operatingHours: "ਅਸੀਂ {days}, {hours} ਖੁੱਲ੍ਹੇ ਹਾਂ।",
  },
  "gu-IN": {
    consultationFee: "સ્ટાન્ડર્ડ OPD કન્સલ્ટેશન માટે ₹600, ફોલો-અપ માટે ₹300.",
    labServices: "બ્લડ ટેસ્ટ, એક્સ-રે, ઈસીજી, અને ડાયગ્નોસ્ટિક ઈમેજિંગ — રોજ સવારે 7 થી સાંજે 7 વાગ્યા સુધી. ફાસ્ટિંગ ટેસ્ટ સવારે 7 થી 11 વાગ્યાની વચ્ચે શ્રેષ્ઠ છે.",
    location: "સેન્ટ્રલ હેલ્થ કોમ્પ્લેક્સ, 2જો માળ — વ્હીલચેર એક્સેસ, અલગ પાર્કિંગ સાથે.",
    paymentMethods: "અમે કેશ, UPI, અને તમામ મુખ્ય કાર્ડ સ્વીકારીએ છીએ. ઈન્શ્યોરન્સ TPA ડેસ્ક પણ ઉપલબ્ધ છે.",
    emergencyContact: "ઇમરજન્સી માટે 112 પર કૉલ કરો અથવા અમારા ઓન-સાઇટ ડેસ્કની મુલાકાત લો — 24/7 ઉપલબ્ધ.",
    specialtyList: "અમારી પાસે જનરલ મેડિસિન, કાર્ડિયોલોજી, ઓર્થોપેડિક્સ, ડર્મેટોલોજી, ENT, પીડિયાટ્રિક્સ, ગાયનેકોલોજી, ન્યુરોલોજી, ઓપ્થાલ્મોલોજી, ડેન્ટલ કેર, અને ડાયગ્નોસ્ટિક્સ એન્ડ પેથોલોજી (લેબ ટેસ્ટ, એક્સ-રે, ઈસીજી) છે.",
    doctorInfo: "{doctor} {specialty} જુએ છે, ઉપલબ્ધ {days}, {hours}.",
    operatingHours: "અમે {days}, {hours} ખુલ્લા છીએ.",
  },
  "or-IN": {
    consultationFee: "ଷ୍ଟାଣ୍ଡାର୍ଡ OPD କନସଲଟେସନ୍ ପାଇଁ ₹600, ଫଲୋ-ଅପ୍ ପାଇଁ ₹300।",
    labServices: "ବ୍ଲଡ୍ ଟେଷ୍ଟ, ଏକ୍ସ-ରେ, ଇସିଜି, ଏବଂ ଡାଇଗ୍ନୋଷ୍ଟିକ୍ ଇମେଜିଂ — ପ୍ରତିଦିନ ସକାଳ 7ଟାରୁ ସନ୍ଧ୍ୟା 7ଟା ପର୍ଯ୍ୟନ୍ତ। ଫାଷ୍ଟିଂ ଟେଷ୍ଟ ସକାଳ 7ରୁ 11ଟା ମଧ୍ୟରେ ସର୍ବୋତ୍ତମ।",
    location: "ସେଣ୍ଟ୍ରାଲ୍ ହେଲ୍ଥ କମ୍ପ୍ଲେକ୍ସ, 2ୟ ମହଲା — ହୁଇଲଚେୟାର୍ ପ୍ରବେଶ, ନିଜସ୍ୱ ପାର୍କିଂ ସହିତ।",
    paymentMethods: "ଆମେ କ୍ୟାଶ୍, UPI, ଏବଂ ସମସ୍ତ ପ୍ରମୁଖ କାର୍ଡ ଗ୍ରହଣ କରୁ। ଇନସ୍ୟୁରାନ୍ସ TPA ଡେସ୍କ ମଧ୍ୟ ଉପଲବ୍ଧ।",
    emergencyContact: "ଜରୁରୀକାଳୀନ ପାଇଁ 112କୁ କଲ୍ କରନ୍ତୁ କିମ୍ବା ଆମର ଅନ୍-ସାଇଟ୍ ଡେସ୍କକୁ ଯାଆନ୍ତୁ — 24/7 ଉପଲବ୍ଧ।",
    specialtyList: "ଆମ ପାଖରେ ଜେନେରାଲ୍ ମେଡିସିନ୍, କାର୍ଡିଓଲୋଜି, ଅର୍ଥୋପେଡିକ୍ସ, ଡର୍ମାଟୋଲୋଜି, ENT, ପେଡିଆଟ୍ରିକ୍ସ, ଗାଇନୋକୋଲୋଜି, ନ୍ୟୁରୋଲୋଜି, ଅଫ୍ଥାଲ୍ମୋଲୋଜି, ଡେଣ୍ଟାଲ୍ କେୟାର୍, ଏବଂ ଡାଇଗ୍ନୋଷ୍ଟିକ୍ସ ଏବଂ ପାଥୋଲୋଜି (ଲ୍ୟାବ୍ ଟେଷ୍ଟ, ଏକ୍ସ-ରେ, ଇସିଜି) ଅଛି।",
    doctorInfo: "{doctor} {specialty} ଦେଖନ୍ତି, ଉପଲବ୍ଧ {days}, {hours}।",
    operatingHours: "ଆମେ {days}, {hours} ଖୋଲା ରହୁ।",
  },
};

// ─── Doctor roster — structured for deterministic hours/day validation ─────
export interface DoctorRosterEntry {
  specialtyEn: string;
  doctor: string;
  days: number[]; // 0=Sun .. 6=Sat
  startHour: number; // 24hr
  endHour: number;   // 24hr
  requiresFasting?: boolean;
}

export const DOCTOR_ROSTER: Record<string, DoctorRosterEntry> = {
  "General Medicine": { specialtyEn: "General Medicine", doctor: "Dr. Ananya Sen", days: [1, 2, 3, 4, 5, 6], startHour: 9, endHour: 19 },
  "Cardiology": { specialtyEn: "Cardiology", doctor: "Dr. R. K. Sharma", days: [1, 3, 5], startHour: 10, endHour: 14 },
  "Orthopedics": { specialtyEn: "Orthopedics", doctor: "Dr. Rajiv Verma", days: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 14 },
  "Dermatology": { specialtyEn: "Dermatology", doctor: "Dr. Pooja Gupta", days: [1, 2, 3, 4, 5, 6], startHour: 11, endHour: 18 },
  "ENT": { specialtyEn: "ENT", doctor: "Dr. Vikram Malhotra", days: [2, 4, 6], startHour: 11, endHour: 15 },
  "Pediatrics": { specialtyEn: "Pediatrics", doctor: "Dr. Meera Rao", days: [1, 2, 3, 4, 5, 6], startHour: 9, endHour: 13 },
  "Gynecology": { specialtyEn: "Gynecology", doctor: "Dr. Sunita Kapoor", days: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 16 },
  "Neurology": { specialtyEn: "Neurology", doctor: "Dr. Sanjay Kapoor", days: [1, 3, 5], startHour: 14, endHour: 18 },
  "General Dentistry": { specialtyEn: "General Dentistry", doctor: "Dr. Aman Joshi", days: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 19 },
  "Root Canal Treatment (Endodontics)": { specialtyEn: "Root Canal Treatment (Endodontics)", doctor: "Dr. Neha Kulkarni", days: [2, 4, 6], startHour: 11, endHour: 17 },
  "Braces & Orthodontics": { specialtyEn: "Braces & Orthodontics", doctor: "Dr. Karan Mehta", days: [1, 3, 5], startHour: 10, endHour: 16 },
  "Dental Crowns & Implants (Prosthodontics)": { specialtyEn: "Dental Crowns & Implants (Prosthodontics)", doctor: "Dr. Aman Joshi", days: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 19 },
  "Ophthalmology": { specialtyEn: "Ophthalmology", doctor: "Dr. Alok Nath", days: [1, 2, 3, 4, 5, 6], startHour: 10, endHour: 17 },
  "Blood Test / Pathology": { specialtyEn: "Blood Test / Pathology", doctor: "Central Pathology Desk", days: [1, 2, 3, 4, 5, 6], startHour: 7, endHour: 19, requiresFasting: true },
  "X-Ray & Imaging": { specialtyEn: "X-Ray & Imaging", doctor: "Central Pathology Desk", days: [1, 2, 3, 4, 5, 6], startHour: 9, endHour: 18 },
  "ECG": { specialtyEn: "ECG", doctor: "Central Pathology Desk", days: [1, 2, 3, 4, 5, 6], startHour: 9, endHour: 18 },
};

export const CLINIC_OPEN_DAYS = [1, 2, 3, 4, 5, 6]; // Mon-Sat, closed Sunday
export const CLINIC_OPEN_HOUR = 9;
export const CLINIC_CLOSE_HOUR = 19;

// index 0=Sunday .. 6=Saturday
export const DAY_NAMES: Record<ClinicLang, string[]> = {
  "en-IN": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  "hi-IN": ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"],
  "ta-IN": ["ஞாயிறு", "திங்கள்", "செவ்வாய்", "புதன்", "வியாழன்", "வெள்ளி", "சனி"],
  "te-IN": ["ఆదివారం", "సోమవారం", "మంగళవారం", "బుధవారం", "గురువారం", "శుక్రవారం", "శనివారం"],
  "bn-IN": ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"],
  "ml-IN": ["ഞായർ", "തിങ്കൾ", "ചൊവ്വ", "ബുധൻ", "വ്യാഴം", "വെള്ളി", "ശനി"],
  "kn-IN": ["ಭಾನುವಾರ", "ಸೋಮವಾರ", "ಮಂಗಳವಾರ", "ಬುಧವಾರ", "ಗುರುವಾರ", "ಶುಕ್ರವಾರ", "ಶನಿವಾರ"],
  "pa-IN": ["ਐਤਵਾਰ", "ਸੋਮਵਾਰ", "ਮੰਗਲਵਾਰ", "ਬੁੱਧਵਾਰ", "ਵੀਰਵਾਰ", "ਸ਼ੁੱਕਰਵਾਰ", "ਸ਼ਨੀਵਾਰ"],
  "gu-IN": ["રવિવાર", "સોમવાર", "મંગળવાર", "બુધવાર", "ગુરુવાર", "શુક્રવાર", "શનિવાર"],
  "or-IN": ["ରବିବାର", "ସୋମବାର", "ମଙ୍ଗଳବାର", "ବୁଧବାର", "ଗୁରୁବାର", "ଶୁକ୍ରବାର", "ଶନିବାର"],
};

export function fillTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.split(`{${key}}`).join(value);
  }
  return out;
}

export function formatHourRange(startHour: number, endHour: number): string {
  const fmt = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    let hour12 = h % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12} ${period}`;
  };
  return `${fmt(startHour)} - ${fmt(endHour)}`;
}

export function formatDaysList(days: number[], lang: ClinicLang): string {
  const names = DAY_NAMES[lang];
  return days.map((d) => names[d]).join(", ");
}
