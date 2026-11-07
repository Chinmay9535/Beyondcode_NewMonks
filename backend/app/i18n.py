"""Assistant phrases in Kannada, Hindi, Tamil and English.

Curated (not machine-generated at runtime) so the offline mode speaks well and the
LLM mode asks exactly the questions the clinic signed off on.
NOTE: needs a native-speaker review before use with patients.
"""
from __future__ import annotations

T: dict[str, dict[str, str]] = {
    "q_day": {
        "en": "Namaste {name}! I'm DrishtiSaathi. I'll ask a few questions about your daily life so your doctor can suggest the right lens. Tell me about a usual day: what work do you do?",
        "kn": "ನಮಸ್ಕಾರ {name}! ನಾನು ದೃಷ್ಟಿಸಾಥಿ. ನಿಮ್ಮ ವೈದ್ಯರು ಸರಿಯಾದ ಲೆನ್ಸ್ ಸೂಚಿಸಲು, ನಿಮ್ಮ ದಿನಚರಿಯ ಬಗ್ಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳುತ್ತೇನೆ. ನಿಮ್ಮ ಸಾಮಾನ್ಯ ದಿನದ ಬಗ್ಗೆ ಹೇಳಿ: ನೀವು ಯಾವ ಕೆಲಸ ಮಾಡುತ್ತೀರಿ?",
        "hi": "नमस्ते {name}! मैं दृष्टिसाथी हूँ। आपके डॉक्टर सही लेंस सुझा सकें, इसलिए मैं आपकी दिनचर्या के बारे में कुछ सवाल पूछूँगी। अपने आम दिन के बारे में बताइए: आप क्या काम करते हैं?",
        "ta": "வணக்கம் {name}! நான் த்ருஷ்டிசாதி. உங்கள் மருத்துவர் சரியான லென்ஸைப் பரிந்துரைக்க, உங்கள் அன்றாட வாழ்க்கை பற்றி சில கேள்விகள் கேட்கிறேன். உங்கள் வழக்கமான நாளைப் பற்றிச் சொல்லுங்கள்: நீங்கள் என்ன வேலை செய்கிறீர்கள்?",
    },
    "q_near": {
        "en": "Do you do any close-up work, like reading, sewing or using a phone? About how many hours a day?",
        "kn": "ಓದುವುದು, ಹೊಲಿಗೆ, ಫೋನ್ ಬಳಸುವುದು ಮುಂತಾದ ಹತ್ತಿರದ ಕೆಲಸ ಮಾಡುತ್ತೀರಾ? ದಿನಕ್ಕೆ ಸುಮಾರು ಎಷ್ಟು ಗಂಟೆ?",
        "hi": "क्या आप पास का काम करते हैं, जैसे पढ़ना, सिलाई या फ़ोन चलाना? दिन में लगभग कितने घंटे?",
        "ta": "படிப்பது, தையல், போன் பயன்படுத்துவது போன்ற அருகில் பார்க்கும் வேலை செய்கிறீர்களா? ஒரு நாளில் சுமார் எத்தனை மணி நேரம்?",
    },
    "q_mid": {
        "en": "What about things at arm's length, like a computer, cooking or a shop counter?",
        "kn": "ಕಂಪ್ಯೂಟರ್, ಅಡುಗೆ, ಅಂಗಡಿಯ ಕೌಂಟರ್ ಹೀಗೆ ಕೈ ಅಂತರದ ಕೆಲಸಗಳು ಇವೆಯೇ?",
        "hi": "और हाथ भर की दूरी के काम, जैसे कंप्यूटर, खाना बनाना या दुकान का काउंटर?",
        "ta": "கணினி, சமையல், கடை கவுண்டர் போன்ற கை தூரத்தில் செய்யும் வேலைகள் உள்ளனவா?",
    },
    "q_night": {
        "en": "Do you drive or ride a vehicle after dark?",
        "kn": "ಕತ್ತಲಾದ ಮೇಲೆ ನೀವು ವಾಹನ ಓಡಿಸುತ್ತೀರಾ?",
        "hi": "क्या आप अंधेरा होने के बाद गाड़ी चलाते हैं?",
        "ta": "இருட்டிய பிறகு நீங்கள் வாகனம் ஓட்டுவீர்களா?",
    },
    "q_glasses": {
        "en": "After surgery, how important is it for you to manage without glasses?",
        "kn": "ಶಸ್ತ್ರಚಿಕಿತ್ಸೆಯ ನಂತರ ಕನ್ನಡಕ ಇಲ್ಲದೆ ಇರುವುದು ನಿಮಗೆ ಎಷ್ಟು ಮುಖ್ಯ?",
        "hi": "सर्जरी के बाद बिना चश्मे के काम चलाना आपके लिए कितना ज़रूरी है?",
        "ta": "அறுவை சிகிச்சைக்குப் பிறகு கண்ணாடி இல்லாமல் இருப்பது உங்களுக்கு எவ்வளவு முக்கியம்?",
    },
    "q_budget": {
        "en": "Lenses differ in price. Should I show you every option, or focus on lower-cost ones?",
        "kn": "ಲೆನ್ಸ್‌ಗಳ ಬೆಲೆ ಬೇರೆ ಬೇರೆ ಇರುತ್ತದೆ. ಎಲ್ಲಾ ಆಯ್ಕೆಗಳನ್ನು ತೋರಿಸಲೇ, ಅಥವಾ ಕಡಿಮೆ ಬೆಲೆಯವುಗಳ ಮೇಲೆ ಗಮನ ಕೊಡಲೇ?",
        "hi": "लेंस की कीमतें अलग-अलग होती हैं। क्या मैं सभी विकल्प दिखाऊँ, या कम कीमत वाले विकल्पों पर ध्यान दूँ?",
        "ta": "லென்ஸ்களின் விலை வேறுபடும். எல்லா வாய்ப்புகளையும் காட்டட்டுமா, அல்லது குறைந்த விலையுள்ளவற்றில் கவனம் செலுத்தட்டுமா?",
    },
    "done": {
        "en": "Thank you, {name}. I've made a summary of your day for {doctor}. They will go through the lens options with you and approve the final choice.",
        "kn": "ಧನ್ಯವಾದಗಳು {name}. ನಿಮ್ಮ ದಿನಚರಿಯ ಸಾರಾಂಶವನ್ನು {doctor} ಅವರಿಗೆ ಕಳುಹಿಸಿದ್ದೇನೆ. ಅವರು ನಿಮ್ಮೊಂದಿಗೆ ಲೆನ್ಸ್ ಆಯ್ಕೆಗಳನ್ನು ಚರ್ಚಿಸಿ ಅಂತಿಮ ನಿರ್ಧಾರ ಮಾಡುತ್ತಾರೆ.",
        "hi": "धन्यवाद {name}। मैंने आपकी दिनचर्या का सारांश {doctor} को भेज दिया है। वे आपके साथ लेंस के विकल्पों पर बात करेंगे और अंतिम चुनाव को मंज़ूरी देंगे।",
        "ta": "நன்றி {name}. உங்கள் அன்றாட வாழ்க்கையின் சுருக்கத்தை {doctor} அவர்களுக்கு அனுப்பியுள்ளேன். அவர் உங்களுடன் லென்ஸ் வாய்ப்புகளைப் பற்றிப் பேசி இறுதி முடிவை அங்கீகரிப்பார்.",
    },
    "heard": {
        "en": "Got it: {items}.",
        "kn": "ಸರಿ, ಗಮನಿಸಿದೆ: {items}.",
        "hi": "ठीक है, नोट किया: {items}।",
        "ta": "சரி, குறித்துக்கொண்டேன்: {items}.",
    },
    "thanks": {"en": "Thank you.", "kn": "ಧನ್ಯವಾದ.", "hi": "धन्यवाद।", "ta": "நன்றி."},
    "redflag_urgent": {
        "en": "This needs your doctor's attention now. I have alerted {doctor}. If the pain is severe or your vision is suddenly much worse, go to the clinic or call {emergency} immediately. Clinic: {phone}.",
        "kn": "ಇದಕ್ಕೆ ತಕ್ಷಣ ವೈದ್ಯರ ಗಮನ ಬೇಕು. ನಾನು {doctor} ಅವರಿಗೆ ತಿಳಿಸಿದ್ದೇನೆ. ನೋವು ತೀವ್ರವಾಗಿದ್ದರೆ ಅಥವಾ ದೃಷ್ಟಿ ಇದ್ದಕ್ಕಿದ್ದಂತೆ ತುಂಬಾ ಕಡಿಮೆಯಾದರೆ, ತಕ್ಷಣ ಕ್ಲಿನಿಕ್‌ಗೆ ಹೋಗಿ ಅಥವಾ {emergency} ಗೆ ಕರೆ ಮಾಡಿ. ಕ್ಲಿನಿಕ್: {phone}.",
        "hi": "इस पर अभी डॉक्टर का ध्यान ज़रूरी है। मैंने {doctor} को सूचना दे दी है। अगर दर्द बहुत ज़्यादा है या नज़र अचानक बहुत कम हो गई है, तो तुरंत क्लिनिक जाइए या {emergency} पर कॉल कीजिए। क्लिनिक: {phone}।",
        "ta": "இதற்கு உடனே மருத்துவரின் கவனம் தேவை. {doctor} அவர்களுக்குத் தெரிவித்துவிட்டேன். வலி கடுமையாக இருந்தால் அல்லது பார்வை திடீரென மிகவும் குறைந்தால், உடனே கிளினிக்கிற்குச் செல்லுங்கள் அல்லது {emergency} ஐ அழையுங்கள். கிளினிக்: {phone}.",
    },
    "redflag_soon": {
        "en": "I've shared this with {doctor}'s team; they will call you today. If it gets worse, call the clinic: {phone}.",
        "kn": "ಇದನ್ನು {doctor} ಅವರ ತಂಡಕ್ಕೆ ತಿಳಿಸಿದ್ದೇನೆ; ಅವರು ಇಂದು ನಿಮಗೆ ಕರೆ ಮಾಡುತ್ತಾರೆ. ಹೆಚ್ಚಾದರೆ ಕ್ಲಿನಿಕ್‌ಗೆ ಕರೆ ಮಾಡಿ: {phone}.",
        "hi": "मैंने यह {doctor} की टीम को बता दिया है; वे आज आपको फ़ोन करेंगे। अगर तकलीफ़ बढ़े तो क्लिनिक को कॉल करें: {phone}।",
        "ta": "இதை {doctor} அவர்களின் குழுவுக்குத் தெரிவித்துள்ளேன்; அவர்கள் இன்று உங்களை அழைப்பார்கள். அதிகமானால் கிளினிக்கை அழையுங்கள்: {phone}.",
    },
    "not_found": {
        "en": "I don't have clinic guidance on that, so I won't guess. I've passed your question to the clinic team.",
        "kn": "ಅದರ ಬಗ್ಗೆ ಕ್ಲಿನಿಕ್‌ನ ಮಾರ್ಗದರ್ಶನ ನನ್ನ ಬಳಿ ಇಲ್ಲ, ಹಾಗಾಗಿ ನಾನು ಊಹಿಸುವುದಿಲ್ಲ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕ್ಲಿನಿಕ್ ತಂಡಕ್ಕೆ ಕಳುಹಿಸಿದ್ದೇನೆ.",
        "hi": "इस बारे में मेरे पास क्लिनिक की जानकारी नहीं है, इसलिए मैं अंदाज़ा नहीं लगाऊँगी। मैंने आपका सवाल क्लिनिक की टीम को भेज दिया है।",
        "ta": "அதைப் பற்றி கிளினிக்கின் வழிகாட்டுதல் என்னிடம் இல்லை, அதனால் நான் ஊகிக்க மாட்டேன். உங்கள் கேள்வியை கிளினிக் குழுவுக்கு அனுப்பியுள்ளேன்.",
    },
    "vision_saved": {
        "en": "Saved. Your doctor can see this result.",
        "kn": "ಉಳಿಸಲಾಗಿದೆ. ಈ ಫಲಿತಾಂಶ ನಿಮ್ಮ ವೈದ್ಯರಿಗೆ ಕಾಣುತ್ತದೆ.",
        "hi": "सहेज लिया गया। आपके डॉक्टर यह नतीजा देख सकते हैं।",
        "ta": "சேமிக்கப்பட்டது. இந்த முடிவை உங்கள் மருத்துவர் பார்க்கலாம்.",
    },
    "checkin_ok": {
        "en": "Thank you. Your answers look as expected for this stage of recovery. Keep using your drops.",
        "kn": "ಧನ್ಯವಾದ. ಚೇತರಿಕೆಯ ಈ ಹಂತಕ್ಕೆ ನಿಮ್ಮ ಉತ್ತರಗಳು ನಿರೀಕ್ಷಿತವಾಗಿವೆ. ಡ್ರಾಪ್ಸ್ ಹಾಕುವುದನ್ನು ಮುಂದುವರಿಸಿ.",
        "hi": "धन्यवाद। ठीक होने के इस चरण के हिसाब से आपके जवाब सामान्य हैं। अपनी ड्रॉप्स डालते रहिए।",
        "ta": "நன்றி. குணமடையும் இந்தக் கட்டத்திற்கு உங்கள் பதில்கள் எதிர்பார்த்தபடி உள்ளன. சொட்டு மருந்தைத் தொடர்ந்து போடுங்கள்.",
    },
}

# Quick-reply chips for questions with a fixed scale (tap or say).
OPTIONS: dict[str, list[dict]] = {
    "night": [
        {"value": "often", "en": "Yes, often", "kn": "ಹೌದು, ಹೆಚ್ಚಾಗಿ", "hi": "हाँ, अक्सर", "ta": "ஆம், அடிக்கடி"},
        {"value": "sometimes", "en": "Sometimes", "kn": "ಕೆಲವೊಮ್ಮೆ", "hi": "कभी-कभी", "ta": "சில நேரம்"},
        {"value": "never", "en": "No", "kn": "ಇಲ್ಲ", "hi": "नहीं", "ta": "இல்லை"},
    ],
    "glasses": [
        {"value": "very", "en": "Very important", "kn": "ತುಂಬಾ ಮುಖ್ಯ", "hi": "बहुत ज़रूरी", "ta": "மிக முக்கியம்"},
        {"value": "somewhat", "en": "Somewhat", "kn": "ಸ್ವಲ್ಪ ಮುಖ್ಯ", "hi": "थोड़ा ज़रूरी", "ta": "ஓரளவு"},
        {"value": "dont_mind", "en": "I don't mind glasses", "kn": "ಕನ್ನಡಕ ಪರವಾಗಿಲ್ಲ", "hi": "चश्मा चलेगा", "ta": "கண்ணாடி பரவாயில்லை"},
    ],
    "budget": [
        {"value": "all", "en": "Show all options", "kn": "ಎಲ್ಲಾ ತೋರಿಸಿ", "hi": "सभी दिखाइए", "ta": "எல்லாம் காட்டுங்கள்"},
        {"value": "balanced", "en": "Balanced", "kn": "ಮಧ್ಯಮ", "hi": "बीच का", "ta": "நடுத்தரம்"},
        {"value": "low", "en": "Lower cost", "kn": "ಕಡಿಮೆ ಬೆಲೆ", "hi": "कम कीमत", "ta": "குறைந்த விலை"},
    ],
}


def t(key: str, lang: str, **kw) -> str:
    entry = T[key]
    return entry.get(lang, entry["en"]).format(**kw)


def options(topic: str, lang: str) -> list[dict[str, str]]:
    return [{"value": o["value"], "label": o.get(lang, o["en"])} for o in OPTIONS.get(topic, [])]


def option_label(topic: str, value: str, lang: str) -> str | None:
    for o in OPTIONS.get(topic, []):
        if o["value"] == value:
            return o.get(lang, o["en"])
    return None
