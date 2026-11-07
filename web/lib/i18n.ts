import type { Lang } from "./api";

// Patient-facing interface text. Needs a native-speaker review before clinical use.
const S = {
  tagline: { en: "Your cataract companion", kn: "ನಿಮ್ಮ ಕಣ್ಣಿನ ಪೊರೆ ಸಂಗಾತಿ", hi: "मोतियाबिंद में आपका साथी", ta: "உங்கள் கண்புரை துணை" },
  consentTitle: { en: "Before we talk", kn: "ಮಾತನಾಡುವ ಮೊದಲು", hi: "बात शुरू करने से पहले", ta: "பேசுவதற்கு முன்" },
  consentBody: {
    en: "DrishtiSaathi will record what you tell it about your daily life and your recovery, and share it only with your eye clinic. It does not diagnose: your doctor makes every decision. You can delete your data at any time.",
    kn: "ನಿಮ್ಮ ದಿನಚರಿ ಮತ್ತು ಚೇತರಿಕೆಯ ಬಗ್ಗೆ ನೀವು ಹೇಳುವುದನ್ನು ದೃಷ್ಟಿಸಾಥಿ ದಾಖಲಿಸಿ, ನಿಮ್ಮ ಕಣ್ಣಿನ ಕ್ಲಿನಿಕ್‌ನೊಂದಿಗೆ ಮಾತ್ರ ಹಂಚಿಕೊಳ್ಳುತ್ತದೆ. ಇದು ರೋಗನಿರ್ಣಯ ಮಾಡುವುದಿಲ್ಲ: ಎಲ್ಲಾ ನಿರ್ಧಾರಗಳನ್ನು ನಿಮ್ಮ ವೈದ್ಯರೇ ಮಾಡುತ್ತಾರೆ. ನಿಮ್ಮ ಮಾಹಿತಿಯನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಅಳಿಸಬಹುದು.",
    hi: "आप अपनी दिनचर्या और रिकवरी के बारे में जो बताएँगे, दृष्टिसाथी उसे दर्ज करेगी और सिर्फ़ आपके आँखों के क्लिनिक के साथ साझा करेगी। यह बीमारी का निदान नहीं करती: हर फ़ैसला आपके डॉक्टर लेते हैं। आप कभी भी अपना डेटा मिटा सकते हैं।",
    ta: "உங்கள் அன்றாட வாழ்க்கை மற்றும் குணமடைதல் பற்றி நீங்கள் சொல்வதை த்ருஷ்டிசாதி பதிவு செய்து, உங்கள் கண் கிளினிக்குடன் மட்டுமே பகிரும். இது நோயறிதல் செய்யாது: எல்லா முடிவுகளையும் உங்கள் மருத்துவரே எடுப்பார். உங்கள் தரவை எப்போது வேண்டுமானாலும் நீக்கலாம்.",
  },
  consentAgree: { en: "I agree, let's start", kn: "ಒಪ್ಪುತ್ತೇನೆ, ಶುರು ಮಾಡೋಣ", hi: "मैं सहमत हूँ, शुरू करें", ta: "ஒப்புக்கொள்கிறேன், தொடங்கலாம்" },
  tabTalk: { en: "Talk", kn: "ಮಾತು", hi: "बातचीत", ta: "பேச்சு" },
  tabLens: { en: "My lens", kn: "ನನ್ನ ಲೆನ್ಸ್", hi: "मेरा लेंस", ta: "என் லென்ஸ்" },
  tabRecovery: { en: "Recovery", kn: "ಚೇತರಿಕೆ", hi: "रिकवरी", ta: "குணமடைதல்" },
  tabAsk: { en: "Ask", kn: "ಕೇಳಿ", hi: "पूछें", ta: "கேளுங்கள்" },
  tapToSpeak: { en: "Tap and speak", kn: "ಒತ್ತಿ ಮಾತನಾಡಿ", hi: "दबाएँ और बोलें", ta: "அழுத்திப் பேசுங்கள்" },
  listening: { en: "Listening…", kn: "ಕೇಳುತ್ತಿದ್ದೇನೆ…", hi: "सुन रही हूँ…", ta: "கேட்கிறேன்…" },
  typeHere: { en: "Or type here", kn: "ಅಥವಾ ಇಲ್ಲಿ ಬರೆಯಿರಿ", hi: "या यहाँ लिखें", ta: "அல்லது இங்கே எழுதுங்கள்" },
  send: { en: "Send", kn: "ಕಳುಹಿಸಿ", hi: "भेजें", ta: "அனுப்பு" },
  showEnglish: { en: "Show English", kn: "ಇಂಗ್ಲಿಷ್ ತೋರಿಸಿ", hi: "अंग्रेज़ी दिखाएँ", ta: "ஆங்கிலம் காட்டு" },
  readAloud: { en: "Read aloud", kn: "ಗಟ್ಟಿಯಾಗಿ ಓದಿ", hi: "पढ़कर सुनाएँ", ta: "வாசித்துக் காட்டு" },
  noVoice: { en: "Voice input isn't available in this browser. Please type, or open in Chrome.", kn: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಇಲ್ಲ. ದಯವಿಟ್ಟು ಬರೆಯಿರಿ ಅಥವಾ Chrome ಬಳಸಿ.", hi: "इस ब्राउज़र में आवाज़ से लिखना उपलब्ध नहीं है। कृपया टाइप करें या Chrome में खोलें।", ta: "இந்த உலாவியில் குரல் உள்ளீடு இல்லை. தட்டச்சு செய்யுங்கள் அல்லது Chrome இல் திறக்கவும்." },
  yourDay: { en: "Your day, as I understood it", kn: "ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡ ನಿಮ್ಮ ದಿನಚರಿ", hi: "आपका दिन, जैसा मैंने समझा", ta: "நான் புரிந்துகொண்ட உங்கள் நாள்" },
  waitingDoctor: { en: "{doctor} will review your lens options with you.", kn: "{doctor} ಅವರು ನಿಮ್ಮೊಂದಿಗೆ ಲೆನ್ಸ್ ಆಯ್ಕೆಗಳನ್ನು ಪರಿಶೀಲಿಸುತ್ತಾರೆ.", hi: "{doctor} आपके साथ लेंस के विकल्प देखेंगे।", ta: "{doctor} உங்களுடன் லென்ஸ் வாய்ப்புகளைப் பார்ப்பார்." },
  hoursDay: { en: "{h} h a day", kn: "ದಿನಕ್ಕೆ {h} ಗಂ", hi: "दिन में {h} घंटे", ta: "நாளுக்கு {h} மணி" },
  atNight: { en: "at night", kn: "ರಾತ್ರಿ", hi: "रात में", ta: "இரவில்" },
  yourLens: { en: "Your lens", kn: "ನಿಮ್ಮ ಲೆನ್ಸ್", hi: "आपका लेंस", ta: "உங்கள் லென்ஸ்" },
  approvedBy: { en: "Approved by {doctor}", kn: "{doctor} ಅನುಮೋದಿಸಿದ್ದಾರೆ", hi: "{doctor} द्वारा स्वीकृत", ta: "{doctor} அங்கீகரித்தது" },
  doctorNote: { en: "Doctor's note", kn: "ವೈದ್ಯರ ಟಿಪ್ಪಣಿ", hi: "डॉक्टर का नोट", ta: "மருத்துவர் குறிப்பு" },
  dayWithLens: { en: "Your day with this lens", kn: "ಈ ಲೆನ್ಸ್‌ನೊಂದಿಗೆ ನಿಮ್ಮ ದಿನ", hi: "इस लेंस के साथ आपका दिन", ta: "இந்த லென்ஸுடன் உங்கள் நாள்" },
  clear: { en: "Clear", kn: "ಸ್ಪಷ್ಟ", hi: "साफ़", ta: "தெளிவு" },
  strain: { en: "Some strain", kn: "ಸ್ವಲ್ಪ ಕಷ್ಟ", hi: "थोड़ी दिक्कत", ta: "சிறிது சிரமம்" },
  glasses: { en: "Glasses needed", kn: "ಕನ್ನಡಕ ಬೇಕು", hi: "चश्मा चाहिए", ta: "கண்ணாடி தேவை" },
  halos: { en: "Halos at night", kn: "ರಾತ್ರಿ ವೃತ್ತಗಳು", hi: "रात में घेरे", ta: "இரவில் வட்டங்கள்" },
  hoursClear: { en: "{a} of your {b} daily hours clear without glasses", kn: "ನಿಮ್ಮ ದಿನದ {b} ಗಂಟೆಗಳಲ್ಲಿ {a} ಗಂಟೆ ಕನ್ನಡಕವಿಲ್ಲದೆ ಸ್ಪಷ್ಟ", hi: "आपके दिन के {b} घंटों में से {a} घंटे बिना चश्मे के साफ़", ta: "உங்கள் நாளின் {b} மணி நேரத்தில் {a} மணி கண்ணாடி இல்லாமல் தெளிவு" },
  compare: { en: "Compare lenses", kn: "ಲೆನ್ಸ್‌ಗಳನ್ನು ಹೋಲಿಸಿ", hi: "लेंस की तुलना करें", ta: "லென்ஸ்களை ஒப்பிடுங்கள்" },
  seeIt: { en: "See it for yourself", kn: "ನೀವೇ ನೋಡಿ", hi: "खुद देखिए", ta: "நீங்களே பாருங்கள்" },
  today: { en: "Today", kn: "ಇಂದು", hi: "आज", ta: "இன்று" },
  afterSurgery: { en: "After surgery", kn: "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ ನಂತರ", hi: "सर्जरी के बाद", ta: "அறுவை சிகிச்சைக்குப் பின்" },
  dragCompare: { en: "Drag the line to compare", kn: "ಹೋಲಿಸಲು ಗೆರೆಯನ್ನು ಎಳೆಯಿರಿ", hi: "तुलना के लिए रेखा खींचें", ta: "ஒப்பிட கோட்டை இழுங்கள்" },
  illustrative: { en: "Illustrative simulation to support your conversation with the doctor. Not a prediction.", kn: "ವೈದ್ಯರೊಂದಿಗಿನ ಮಾತುಕತೆಗೆ ಸಹಾಯಕ್ಕಾಗಿ ಮಾದರಿ ಚಿತ್ರಣ. ಇದು ಭವಿಷ್ಯವಾಣಿ ಅಲ್ಲ.", hi: "डॉक्टर से बातचीत में मदद के लिए एक उदाहरण। यह भविष्यवाणी नहीं है।", ta: "மருத்துவருடன் பேச உதவும் மாதிரிக் காட்சி. இது கணிப்பு அல்ல." },
  useCamera: { en: "Use my camera", kn: "ನನ್ನ ಕ್ಯಾಮೆರಾ ಬಳಸಿ", hi: "मेरा कैमरा इस्तेमाल करें", ta: "என் கேமராவைப் பயன்படுத்து" },
  useScene: { en: "Street scene", kn: "ರಸ್ತೆ ದೃಶ್ಯ", hi: "सड़क का दृश्य", ta: "தெருக் காட்சி" },
  cameraAt: { en: "What is the camera looking at?", kn: "ಕ್ಯಾಮೆರಾ ಏನನ್ನು ನೋಡುತ್ತಿದೆ?", hi: "कैमरा क्या देख रहा है?", ta: "கேமரா எதைப் பார்க்கிறது?" },
  far: { en: "Far away", kn: "ದೂರ", hi: "दूर", ta: "தொலைவு" },
  arm: { en: "Arm's length", kn: "ಕೈ ಅಂತರ", hi: "हाथ भर दूर", ta: "கை தூரம்" },
  near: { en: "Reading distance", kn: "ಓದುವ ದೂರ", hi: "पढ़ने की दूरी", ta: "படிக்கும் தூரம்" },
  share: { en: "Share with family on WhatsApp", kn: "ಕುಟುಂಬದೊಂದಿಗೆ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಹಂಚಿ", hi: "परिवार के साथ व्हाट्सएप पर भेजें", ta: "குடும்பத்துடன் வாட்ஸ்அப்பில் பகிருங்கள்" },
  noPlan: { en: "Your doctor has not approved a lens yet. Finish the conversation in Talk, then your doctor will go through the options with you.", kn: "ನಿಮ್ಮ ವೈದ್ಯರು ಇನ್ನೂ ಲೆನ್ಸ್ ಅನುಮೋದಿಸಿಲ್ಲ. 'ಮಾತು' ವಿಭಾಗದಲ್ಲಿ ಮಾತುಕತೆ ಮುಗಿಸಿ, ನಂತರ ವೈದ್ಯರು ನಿಮ್ಮೊಂದಿಗೆ ಆಯ್ಕೆಗಳನ್ನು ಚರ್ಚಿಸುತ್ತಾರೆ.", hi: "आपके डॉक्टर ने अभी लेंस मंज़ूर नहीं किया है। 'बातचीत' में बात पूरी करें, फिर डॉक्टर आपके साथ विकल्प देखेंगे।", ta: "உங்கள் மருத்துவர் இன்னும் லென்ஸை அங்கீகரிக்கவில்லை. 'பேச்சு' பகுதியில் உரையாடலை முடியுங்கள், பிறகு மருத்துவர் வாய்ப்புகளைப் பற்றிப் பேசுவார்." },
  rightEye: { en: "Right eye", kn: "ಬಲ ಕಣ್ಣು", hi: "दायीं आँख", ta: "வலது கண்" },
  leftEye: { en: "Left eye", kn: "ಎಡ ಕಣ್ಣು", hi: "बायीं आँख", ta: "இடது கண்" },
  forDistance: { en: "set for distance", kn: "ದೂರಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ", hi: "दूर के लिए", ta: "தொலைவுக்கு அமைக்கப்பட்டது" },
  forNear: { en: "set a little for near", kn: "ಸ್ವಲ್ಪ ಹತ್ತಿರಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ", hi: "थोड़ा पास के लिए", ta: "சற்று அருகுக்கு அமைக்கப்பட்டது" },
  alreadyDone: { en: "already operated", kn: "ಈಗಾಗಲೇ ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ ಆಗಿದೆ", hi: "ऑपरेशन हो चुका", ta: "ஏற்கனவே அறுவை சிகிச்சை முடிந்தது" },
  blendedExplain: {
    en: "Blended vision: one eye sees far, the other is set a little closer. Your brain combines them, so you need glasses less often, even with a lower-priced lens.",
    kn: "ಮಿಶ್ರ ದೃಷ್ಟಿ: ಒಂದು ಕಣ್ಣು ದೂರ ನೋಡುತ್ತದೆ, ಇನ್ನೊಂದು ಸ್ವಲ್ಪ ಹತ್ತಿರಕ್ಕೆ ಹೊಂದಿಸಲಾಗಿದೆ. ಮೆದುಳು ಎರಡನ್ನೂ ಸೇರಿಸುತ್ತದೆ, ಹಾಗಾಗಿ ಕಡಿಮೆ ಬೆಲೆಯ ಲೆನ್ಸ್‌ನಲ್ಲೇ ಕನ್ನಡಕದ ಅಗತ್ಯ ಕಡಿಮೆಯಾಗುತ್ತದೆ.",
    hi: "मिली-जुली नज़र: एक आँख दूर देखती है, दूसरी थोड़ा पास के लिए रखी जाती है। दिमाग़ दोनों को जोड़ लेता है, इसलिए कम कीमत के लेंस में भी चश्मे की ज़रूरत कम होती है।",
    ta: "கலப்புப் பார்வை: ஒரு கண் தொலைவைப் பார்க்கும், மற்றொன்று சற்று அருகுக்கு அமைக்கப்படும். மூளை இரண்டையும் இணைக்கிறது, அதனால் குறைந்த விலை லென்ஸிலேயே கண்ணாடி தேவை குறையும்.",
  },
  dayN: { en: "Day {n} after surgery", kn: "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ ನಂತರ {n}ನೇ ದಿನ", hi: "सर्जरी के बाद दिन {n}", ta: "அறுவை சிகிச்சைக்குப் பின் {n}வது நாள்" },
  surgeryOn: { en: "Surgery on {d}", kn: "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆ {d}", hi: "सर्जरी {d} को", ta: "அறுவை சிகிச்சை {d}" },
  todaysDrops: { en: "Today's drops", kn: "ಇಂದಿನ ಡ್ರಾಪ್ಸ್", hi: "आज की ड्रॉप्स", ta: "இன்றைய சொட்டு மருந்து" },
  markTaken: { en: "I put it in", kn: "ಹಾಕಿದೆ", hi: "डाल दी", ta: "போட்டேன்" },
  taken: { en: "Done", kn: "ಆಯಿತು", hi: "हो गया", ta: "முடிந்தது" },
  upcoming: { en: "Later", kn: "ನಂತರ", hi: "बाद में", ta: "பின்னர்" },
  due: { en: "Due now", kn: "ಈಗ ಹಾಕಿ", hi: "अभी डालें", ta: "இப்போது போடுங்கள்" },
  missed: { en: "Missed", kn: "ತಪ್ಪಿತು", hi: "छूट गई", ta: "தவறியது" },
  noDropsToday: { en: "No drops scheduled today.", kn: "ಇಂದು ಯಾವುದೇ ಡ್ರಾಪ್ಸ್ ಇಲ್ಲ.", hi: "आज कोई ड्रॉप नहीं है।", ta: "இன்று சொட்டு மருந்து இல்லை." },
  dosesTaken: { en: "Doses taken so far", kn: "ಇದುವರೆಗೆ ಹಾಕಿದ ಡೋಸ್", hi: "अब तक डाली गई खुराक", ta: "இதுவரை போட்ட டோஸ்" },
  checkups: { en: "Check-ups", kn: "ತಪಾಸಣೆಗಳು", hi: "जाँच", ta: "பரிசோதனைகள்" },
  checkinTitle: { en: "How is your eye today?", kn: "ಇಂದು ನಿಮ್ಮ ಕಣ್ಣು ಹೇಗಿದೆ?", hi: "आज आपकी आँख कैसी है?", ta: "இன்று உங்கள் கண் எப்படி இருக்கிறது?" },
  pain: { en: "Pain", kn: "ನೋವು", hi: "दर्द", ta: "வலி" },
  p0: { en: "None", kn: "ಇಲ್ಲ", hi: "नहीं", ta: "இல்லை" },
  p1: { en: "Mild", kn: "ಸ್ವಲ್ಪ", hi: "हल्का", ta: "லேசான" },
  p2: { en: "Moderate", kn: "ಮಧ್ಯಮ", hi: "मध्यम", ta: "மிதமான" },
  p3: { en: "Severe", kn: "ತೀವ್ರ", hi: "बहुत ज़्यादा", ta: "கடுமையான" },
  vision: { en: "Vision since yesterday", kn: "ನಿನ್ನೆಗಿಂತ ದೃಷ್ಟಿ", hi: "कल से नज़र", ta: "நேற்றைவிடப் பார்வை" },
  better: { en: "Better", kn: "ಉತ್ತಮ", hi: "बेहतर", ta: "நன்று" },
  same: { en: "Same", kn: "ಅಷ್ಟೇ", hi: "वैसी ही", ta: "அதே" },
  worse: { en: "Worse", kn: "ಕೆಟ್ಟದು", hi: "ख़राब", ta: "மோசம்" },
  redness: { en: "Redness", kn: "ಕೆಂಪು", hi: "लाली", ta: "சிவப்பு" },
  rNone: { en: "None", kn: "ಇಲ್ಲ", hi: "नहीं", ta: "இல்லை" },
  rSame: { en: "Same", kn: "ಅಷ್ಟೇ", hi: "उतनी ही", ta: "அதே அளவு" },
  rMore: { en: "More", kn: "ಹೆಚ್ಚು", hi: "ज़्यादा", ta: "அதிகம்" },
  sendCheckin: { en: "Send to my doctor", kn: "ವೈದ್ಯರಿಗೆ ಕಳುಹಿಸಿ", hi: "डॉक्टर को भेजें", ta: "மருத்துவருக்கு அனுப்பு" },
  askTitle: { en: "Ask anything about your eye", kn: "ನಿಮ್ಮ ಕಣ್ಣಿನ ಬಗ್ಗೆ ಏನು ಬೇಕಾದರೂ ಕೇಳಿ", hi: "अपनी आँख के बारे में कुछ भी पूछें", ta: "உங்கள் கண் பற்றி எதையும் கேளுங்கள்" },
  askHint: { en: "Answers come only from your clinic's own guidance.", kn: "ಉತ್ತರಗಳು ನಿಮ್ಮ ಕ್ಲಿನಿಕ್‌ನ ಮಾರ್ಗದರ್ಶನದಿಂದ ಮಾತ್ರ.", hi: "जवाब सिर्फ़ आपके क्लिनिक की जानकारी से आते हैं।", ta: "பதில்கள் உங்கள் கிளினிக்கின் வழிகாட்டுதலிலிருந்து மட்டுமே." },
  askExamples: { en: "When can I take a bath?|Can I watch TV?|When can I pray again?", kn: "ಸ್ನಾನ ಯಾವಾಗ ಮಾಡಬಹುದು?|ಟಿವಿ ನೋಡಬಹುದೇ?|ಕಾಡಿಗೆ ಹಚ್ಚಬಹುದೇ?", hi: "मैं कब नहा सकता हूँ?|क्या मैं टीवी देख सकता हूँ?|नमाज़ कब पढ़ सकता हूँ?", ta: "எப்போது குளிக்கலாம்?|டிவி பார்க்கலாமா?|கண்மை போடலாமா?" },
  source: { en: "Source", kn: "ಮೂಲ", hi: "स्रोत", ta: "ஆதாரம்" },
  callClinic: { en: "Call clinic", kn: "ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ", hi: "क्लिनिक को कॉल", ta: "கிளினிக்கை அழை" },
  emergency: { en: "Emergency", kn: "ತುರ್ತು", hi: "आपातकाल", ta: "அவசரம்" },
  eraseData: { en: "Delete my data", kn: "ನನ್ನ ಮಾಹಿತಿ ಅಳಿಸಿ", hi: "मेरा डेटा मिटाएँ", ta: "என் தரவை நீக்கு" },
  eraseConfirm: { en: "Delete everything DrishtiSaathi knows about you? This cannot be undone.", kn: "ದೃಷ್ಟಿಸಾಥಿಯಲ್ಲಿರುವ ನಿಮ್ಮ ಎಲ್ಲಾ ಮಾಹಿತಿ ಅಳಿಸಬೇಕೇ? ಇದನ್ನು ಹಿಂಪಡೆಯಲು ಆಗುವುದಿಲ್ಲ.", hi: "दृष्टिसाथी में आपकी सारी जानकारी मिटा दें? यह वापस नहीं होगा।", ta: "த்ருஷ்டிசாதியில் உள்ள உங்கள் எல்லாத் தகவலையும் நீக்கவா? இதைத் திரும்பப் பெற முடியாது." },
  notFoundCode: { en: "We couldn't find that code. Check the code your clinic gave you.", kn: "ಆ ಕೋಡ್ ಸಿಗಲಿಲ್ಲ. ಕ್ಲಿನಿಕ್ ಕೊಟ್ಟ ಕೋಡ್ ಪರಿಶೀಲಿಸಿ.", hi: "यह कोड नहीं मिला। क्लिनिक से मिला कोड जाँचें।", ta: "அந்தக் குறியீடு கிடைக்கவில்லை. கிளினிக் தந்த குறியீட்டைச் சரிபாருங்கள்." },
  surgeryPlanned: { en: "Your surgery date will appear here once the clinic sets it.", kn: "ಕ್ಲಿನಿಕ್ ದಿನಾಂಕ ನಿಗದಿಪಡಿಸಿದ ನಂತರ ಇಲ್ಲಿ ಕಾಣುತ್ತದೆ.", hi: "क्लिनिक तारीख तय करेगा तो यहाँ दिखेगी।", ta: "கிளினிக் தேதியை நிர்ணயித்ததும் இங்கே தோன்றும்." },
} as const;

export type Key = keyof typeof S;

// Patient-facing names for lens plans (strategy keys from backend/clinic.json).
const PLAN: Record<string, Record<Lang, string>> = {
  mono: { en: "Monofocal in both eyes", kn: "ಎರಡೂ ಕಣ್ಣಿಗೆ ಮೊನೊಫೋಕಲ್", hi: "दोनों आँखों में मोनोफोकल", ta: "இரு கண்களிலும் மோனோஃபோகல்" },
  mono_blend: { en: "Blended vision (monofocal)", kn: "ಮಿಶ್ರ ದೃಷ್ಟಿ (ಮೊನೊಫೋಕಲ್)", hi: "मिली-जुली नज़र (मोनोफोकल)", ta: "கலப்புப் பார்வை (மோனோஃபோகல்)" },
  edof: { en: "EDOF in both eyes", kn: "ಎರಡೂ ಕಣ್ಣಿಗೆ EDOF", hi: "दोनों आँखों में EDOF", ta: "இரு கண்களிலும் EDOF" },
  edof_micro: { en: "Blended vision (EDOF)", kn: "ಮಿಶ್ರ ದೃಷ್ಟಿ (EDOF)", hi: "मिली-जुली नज़र (EDOF)", ta: "கலப்புப் பார்வை (EDOF)" },
  tri: { en: "Trifocal in both eyes", kn: "ಎರಡೂ ಕಣ್ಣಿಗೆ ಟ್ರೈಫೋಕಲ್", hi: "दोनों आँखों में ट्राइफोकल", ta: "இரு கண்களிலும் ட்ரைஃபோகல்" },
  mono_single: { en: "Monofocal", kn: "ಮೊನೊಫೋಕಲ್", hi: "मोनोफोकल", ta: "மோனோஃபோகல்" },
  mono_blend_single: { en: "Monofocal, set for near", kn: "ಮೊನೊಫೋಕಲ್, ಹತ್ತಿರಕ್ಕೆ", hi: "मोनोफोकल, पास के लिए", ta: "மோனோஃபோகல், அருகுக்கு" },
  edof_single: { en: "EDOF", kn: "EDOF", hi: "EDOF", ta: "EDOF" },
  edof_micro_single: { en: "EDOF, set for near", kn: "EDOF, ಹತ್ತಿರಕ್ಕೆ", hi: "EDOF, पास के लिए", ta: "EDOF, அருகுக்கு" },
  tri_single: { en: "Trifocal", kn: "ಟ್ರೈಫೋಕಲ್", hi: "ट्राइफोकल", ta: "ட்ரைஃபோகல்" },
};
export function planName(key: string, lang: Lang, fallback: string): string {
  return PLAN[key]?.[lang] ?? fallback;
}

export function tr(lang: Lang, key: Key, vars: Record<string, string | number> = {}): string {
  const entry = S[key] as Record<string, string>;
  let s = entry[lang] ?? entry.en;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export const LANG_NAMES: Record<Lang, string> = { kn: "ಕನ್ನಡ", hi: "हिन्दी", ta: "தமிழ்", en: "English" };
export const SPEECH_LOCALE: Record<Lang, string> = { kn: "kn-IN", hi: "hi-IN", ta: "ta-IN", en: "en-IN" };
