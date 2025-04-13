// العناصر الرئيسية في الصفحة
const surahsList = document.getElementById('surahsList');
const surahContent = document.getElementById('surahContent');
const versesContainer = document.getElementById('versesContainer');
const surahName = document.getElementById('surahName');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const playBtn = document.getElementById('playBtn');
const stopBtn = document.getElementById('stopBtn');
const prevVerseBtn = document.getElementById('prevVerse');
const nextVerseBtn = document.getElementById('nextVerse');
const playPause = document.getElementById('playPause');
const progressBar = document.getElementById('progressBar');
const toggleSurahsBtn = document.getElementById('toggleSurahsBtn');
const reciterSelect = document.getElementById('reciter');
const fontSizeSelect = document.getElementById('fontSize');
const playbackSpeedSelect = document.getElementById('playbackSpeed');

// متغيرات التطبيق
let currentSurah = null;
let currentVerseIndex = 0;
let currentSurahIndex = 0;
let audio = null;
let slowAudio = null;
let isPlaying = false;
let surahs = [];
let autoPlayEnabled = false;
let currentReciter = 'ar.alafasy';
let currentWord = null;
let currentAudio = null;

// معرفات القراء
const RECITERS = {
    'alafasy': 'ar.alafasy',
    'minshawi': 'ar.minshawi',
    'husary': 'ar.husary',
    'abdulbasit': 'ar.abdulbasit',
    'muaiqly': 'ar.maiqli',
    'sudais': 'ar.abdurrahmaansudais',
    'shatri': 'ar.shaatree',
    'rifai': 'ar.hanirifai',
    'shahriar': 'ar.parhizgar',
    'hudhaify': 'ar.hudhaify',
    'shuraym': 'ar.shuraym',
    'basfar': 'ar.basfar',
    'ajamy': 'ar.ajamy',
    'ghamdi': 'ar.ghamdi',
    'jibreel': 'ar.jibreel',
    'jazaery': 'ar.jazaery'
};

// تحميل السور عند بدء التطبيق
async function loadSurahs() {
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await response.json();
        if (data.data) {
            surahs = data.data;
            displaySurahs();
            
            // تحميل آخر موقع محفوظ
            const savedPosition = localStorage.getItem('quranPosition');
            if (savedPosition) {
                const position = JSON.parse(savedPosition);
                currentSurahIndex = position.surahNumber - 1;
                currentVerseIndex = position.verseIndex;
                await loadSurah(position.surahNumber, position.verseIndex);
            } else {
                currentSurahIndex = 0;
                currentVerseIndex = 0;
                await loadSurah(1, 0); // تحميل سورة الفاتحة افتراضياً
            }
        }
    } catch (error) {
        console.error('Error loading surahs:', error);
        surahsList.innerHTML = '<div class="error">حدث خطأ في تحميل السور. يرجى المحاولة مرة أخرى.</div>';
    }
}

// عرض السور في القائمة
function displaySurahs() {
    surahsList.innerHTML = '';
    surahs.forEach(surah => {
        const surahItem = document.createElement('div');
        surahItem.className = 'surah-item';
        surahItem.textContent = `${surah.number}. ${surah.name}`;
        surahItem.addEventListener('click', () => loadSurah(surah.number));
        surahsList.appendChild(surahItem);
    });
}

// تحميل سورة محددة
async function loadSurah(surahNumber, savedVerseIndex = 0) {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${currentReciter}`);
        const data = await response.json();
        
        if (data.data) {
            currentSurah = data.data;
            currentSurahIndex = surahNumber - 1;
            currentVerseIndex = savedVerseIndex;
            displaySurah();
            surahsList.classList.remove('active');
            
            // حفظ الموقع الحالي
            saveCurrentPosition();
            
            // إذا كان هناك صوت يعمل، قم بتحديثه
            if (isPlaying) {
                playCurrentVerse();
            }
        }
    } catch (error) {
        console.error('Error loading surah:', error);
        versesContainer.innerHTML = '<div class="error">حدث خطأ في تحميل السورة. يرجى المحاولة مرة أخرى.</div>';
    }
}

// عرض محتوى السورة
async function displaySurah() {
    if (!currentSurah) return;
    
    surahName.textContent = `${currentSurah.name} - الآية ${currentSurah.ayahs[currentVerseIndex].numberInSurah}`;
    versesContainer.innerHTML = '';
    
    const ayah = currentSurah.ayahs[currentVerseIndex];
    const verseElement = document.createElement('div');
    verseElement.className = 'verse current-verse';
    
    const verseText = document.createElement('div');
    verseText.className = 'verse-text';
    verseText.textContent = ayah.text;
    
    // تطبيق حجم الخط المحفوظ
    const savedFontSize = localStorage.getItem('fontSize') || 'medium';
    verseText.style.fontSize = getFontSize(savedFontSize);
    
    verseElement.appendChild(verseText);
    versesContainer.appendChild(verseElement);
    
    // حفظ الموقع الحالي
    saveCurrentPosition();
}

// تشغيل الآية الحالية
async function playCurrentVerse() {
    if (!currentSurah || !currentSurah.ayahs[currentVerseIndex]) return;
    
    stopAllAudio();
    
    const verse = currentSurah.ayahs[currentVerseIndex];
    audio = new Audio(verse.audio);
    
    // تطبيق سرعة التشغيل المحفوظة
    const savedSpeed = localStorage.getItem('playbackSpeed') || '1';
    audio.playbackRate = parseFloat(savedSpeed);
    
    try {
        await audio.play();
        isPlaying = true;
        updatePlayButton();
        
        audio.addEventListener('ended', () => {
            isPlaying = false;
            updatePlayButton();
            if (autoPlayEnabled) {
                goToNextVerse();
            }
        });
        
        displaySurah();
    } catch (error) {
        console.error('Error playing verse:', error);
        isPlaying = false;
        updatePlayButton();
    }
}

// دالة لإيقاف جميع الأصوات
function stopAllAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
    }
    if (slowAudio) {
        slowAudio.pause();
        slowAudio.currentTime = 0;
        slowAudio = null;
    }
    isPlaying = false;
    updatePlayButton();
}

// الانتقال إلى الآية التالية
async function goToNextVerse() {
    if (!currentSurah) return;
    
    if (currentVerseIndex < currentSurah.ayahs.length - 1) {
        currentVerseIndex++;
        displaySurah();
        playCurrentVerse();
    } else if (currentSurahIndex < surahs.length - 1) {
        await loadSurah(currentSurahIndex + 2);
        currentVerseIndex = 0;
        displaySurah();
        playCurrentVerse();
    }
}

// الانتقال إلى الآية السابقة
function goToPreviousVerse() {
    if (!currentSurah) return;
    
    if (currentVerseIndex > 0) {
        currentVerseIndex--;
        displaySurah();
        playCurrentVerse();
    }
}

// تحديث زر التشغيل/الإيقاف
function updatePlayButton() {
    const icon = playPause.querySelector('i');
    icon.className = isPlaying ? 'fas fa-pause' : 'fas fa-play';
}

// إضافة مستمعي الأحداث
toggleSurahsBtn.addEventListener('click', () => {
    surahsList.classList.toggle('active');
});

settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
    updateSettings();
});

playBtn.addEventListener('click', () => {
    autoPlayEnabled = true;
    playCurrentVerse();
});

stopBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    stopAllAudio();
});

nextVerseBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    goToNextVerse();
    updateVersePosition();
});

prevVerseBtn.addEventListener('click', () => {
    autoPlayEnabled = false;
    goToPreviousVerse();
    updateVersePosition();
});

playPause.addEventListener('click', () => {
    if (audio) {
        if (audio.paused) {
            audio.play();
            isPlaying = true;
        } else {
            audio.pause();
            isPlaying = false;
        }
        updatePlayButton();
    } else {
        playCurrentVerse();
    }
});

// تحديث الإعدادات
function updateSettings() {
    // إيقاف الصوت عند فتح الإعدادات
    stopAllAudio();
    
    // تحديث حجم الخط
    const newFontSize = fontSizeSelect.value;
    applyFontSize(newFontSize);
    
    // تحديث القارئ
    const reciterId = reciterSelect.value;
    currentReciter = RECITERS[reciterId] || 'ar.alafasy';
    localStorage.setItem('reciter', reciterId);
    
    // تحديث سرعة التشغيل
    const playbackSpeed = playbackSpeedSelect.value;
    localStorage.setItem('playbackSpeed', playbackSpeed);
    
    if (audio) {
        audio.playbackRate = parseFloat(playbackSpeed);
    }
    
    // إعادة تحميل السورة مع الحفاظ على الموضع الحالي
    if (currentSurah) {
        loadSurah(currentSurah.number, currentVerseIndex);
    }
}

// تطبيق حجم الخط
function applyFontSize(size) {
    const verses = document.querySelectorAll('.verse-text');
    if (!verses.length) return;
    
    let fontSize;
    switch(size) {
        case 'small':
            fontSize = '8vw';
            break;
        case 'medium':
            fontSize = '11vw';
            break;
        case 'large':
            fontSize = '14vw';
            break;
        case 'xlarge':
            fontSize = '17vw';
            break;
        default:
            fontSize = '11vw';
    }
    
    verses.forEach(verse => {
        verse.style.fontSize = fontSize;
    });
    
    // حفظ الإعداد في localStorage
    localStorage.setItem('fontSize', size);
}

// حفظ الموقع الحالي
function saveCurrentPosition() {
    if (!currentSurah) return;
    
    const position = {
        surahNumber: currentSurah.number,
        verseIndex: currentVerseIndex,
        reciter: reciterSelect.value,
        timestamp: new Date().getTime()
    };
    
    localStorage.setItem('quranPosition', JSON.stringify(position));
}

// استرجاع آخر موقع والإعدادات
async function loadLastPosition() {
    try {
        // استرجاع الإعدادات
        const savedReciter = localStorage.getItem('reciter') || 'alafasy';
        const savedSpeed = localStorage.getItem('playbackSpeed') || '1';
        const savedFontSize = localStorage.getItem('fontSize') || 'medium';
        
        // تطبيق القارئ المحفوظ
        if (savedReciter) {
            reciterSelect.value = savedReciter;
            currentReciter = RECITERS[savedReciter];
        }
        
        // تطبيق سرعة التشغيل المحفوظة
        if (savedSpeed) {
            playbackSpeedSelect.value = savedSpeed;
        }
        
        // تطبيق حجم الخط المحفوظ
        if (savedFontSize) {
            fontSizeSelect.value = savedFontSize;
            applyFontSize(savedFontSize);
        }
        
        // استرجاع الموقع المحفوظ
        const savedPosition = localStorage.getItem('quranPosition');
        if (savedPosition) {
            const position = JSON.parse(savedPosition);
            await loadSurah(position.surahNumber, position.verseIndex);
        } else {
            await loadSurah(1, 0); // تحميل سورة الفاتحة افتراضياً
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        await loadSurah(1, 0); // تحميل سورة الفاتحة في حالة حدوث خطأ
    }
}

// تحديث الموقع عند تغيير الآية
function updateVersePosition() {
    if (!currentSurah) return;
    saveCurrentPosition();
}

// إضافة مستمعي الأحداث
document.addEventListener('DOMContentLoaded', () => {
    // مستمع تغيير حجم الخط
    fontSizeSelect.addEventListener('change', () => {
        applyFontSize(fontSizeSelect.value);
    });
    
    // مستمعي الأحداث الأخرى
    reciterSelect.addEventListener('change', updateSettings);
    playbackSpeedSelect.addEventListener('change', updateSettings);
    
    // تحميل الإعدادات المحفوظة
    loadLastPosition();
});

// حفظ الموقع قبل إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    saveCurrentPosition();
});

// تحديث الموقع كل 30 ثانية
setInterval(saveCurrentPosition, 30000);

// دالة مساعدة للحصول على حجم الخط
function getFontSize(size) {
    switch(size) {
        case 'small': return '8vw';
        case 'medium': return '11vw';
        case 'large': return '14vw';
        case 'xlarge': return '17vw';
        default: return '11vw';
    }
}

// بدء التطبيق
loadSurahs();

async function playVerse(verseNumber, speed = 'normal') {
    try {
        // إيقاف أي صوت حالي
        if (currentAudio) {
            stopAudio();
        }

        // جلب رابط الصوت للآية
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/ar.alafasy`);
        const data = await response.json();
        
        if (data.code === 200) {
            currentAudio = new Audio(data.data.audio);
            
            // ضبط سرعة التشغيل
            if (speed === 'slow') {
                currentAudio.playbackRate = 0.75;
            } else {
                currentAudio.playbackRate = 1.0;
            }
            
            // تحديث الواجهة
            document.querySelectorAll('.verse').forEach(verse => {
                verse.classList.remove('current-verse');
                if (verse.getAttribute('data-verse') === verseNumber.toString()) {
                    verse.classList.add('current-verse');
                }
            });
            
            await currentAudio.play();
        }
    } catch (error) {
        console.error('Error playing verse:', error);
    }
}

function playWord(wordAudioUrl) {
    try {
        if (currentAudio) {
            stopAudio();
        }
        
        currentAudio = new Audio(wordAudioUrl);
        currentAudio.play();
    } catch (error) {
        console.error('Error playing word:', error);
    }
}

function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
} 