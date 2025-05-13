// العناصر الرئيسية في الصفحة

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('✅ Service Worker registered:', reg))
            .catch(err => console.error('❌ Service Worker registration failed:', err));
    });
}

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
const volumeSlider = document.getElementById('volume');
const volumeValue = document.getElementById('volumeValue');
const tafseerModal = document.getElementById('tafseerModal');
const tafseerText = document.getElementById('tafseerText');
const closeTafseer = document.getElementById('closeTafseer');
const darkModeBtn = document.getElementById('darkModeBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const translationLanguageSelect = document.getElementById('translationLanguage');
const tafseerLanguageSelect = document.getElementById('tafseerLanguage');

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
let isAutoSwitch = true;
let showTranslation = true;
let translationLanguage = 'en.sahih'; // اللغة الافتراضية
let tafseerLanguage = 'ar.muyassar'; // اللغة الافتراضية للتفسير
let isAutoPlay = true; // القراءة التلقائية مفعلة افتراضيًا

// Ensure isAutoPlay is initialized correctly
const savedAutoPlay = localStorage.getItem('autoPlay');
isAutoPlay = savedAutoPlay === null ? true : savedAutoPlay === 'true';
let autoPlayCheckbox = document.getElementById('autoPlay');
if (autoPlayCheckbox) {
    autoPlayCheckbox.checked = isAutoPlay;
}

// معرفات القراء
const RECITERS = {
    'alafasy': 'ar.alafasy',
    'minshawi': 'ar.minshawi',
    'husary': 'ar.husary',
    'sudais': 'ar.abdurrahmaansudais',
    'shatri': 'ar.shaatree',
    'hudhaify': 'ar.hudhaify'
};

// إضافة خيارات الخط
const FONT_OPTIONS = {
    'uthmani': 'الخط العثماني',
    'naskh': 'الخط النسخ',
    'amiri': 'خط أميري',
    'lateef': 'خط لطيف',
    'scheherazade': 'خط شهرزاد'
};

// تحميل السور عند بدء التطبيق
async function loadSurahs() {
    try {
      // محاولة جلب من الكاش المحلي أولاً
      const cachedSurahs = localStorage.getItem('cachedSurahs');
      if (cachedSurahs) {
        surahs = JSON.parse(cachedSurahs);
        displaySurahs();
      }
  
      // ثم جلبها من الإنترنت وتحديث الكاش
      const response = await fetch('https://api.alquran.cloud/v1/surah');
      const data = await response.json();
      if (data.data) {
        surahs = data.data;
        displaySurahs();
        localStorage.setItem('cachedSurahs', JSON.stringify(surahs));
  
        // تحميل الموقع المحفوظ
        const savedPosition = localStorage.getItem('quranPosition');
        if (savedPosition) {
          const position = JSON.parse(savedPosition);
          currentSurahIndex = position.surahNumber - 1;
          currentVerseIndex = position.verseIndex;
          await loadSurah(position.surahNumber, position.verseIndex);
        } else {
          await loadSurah(1, 0);
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
    stopAllAudio();
    try {
        const reciterId = RECITERS[reciterSelect.value] || 'ar.alafasy';
        console.log('Loading surah with reciter:', reciterId);
        
        // تحقق من صحة رقم السورة
        if (surahNumber < 1 || surahNumber > 114) {
            throw new Error('رقم السورة غير صحيح');
        }
        
        // جلب النص العربي
        const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${reciterId}`);
        const data = await response.json();
        
        if (!data.data) {
            throw new Error('لم يتم العثور على بيانات السورة');
        }
        
        // جلب الترجمة بناءً على اللغة المختارة
        const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationLanguage}`);
        const translationData = await translationResponse.json();

        // جلب التفسير بناءً على اللغة المختارة
        const tafseerResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${tafseerLanguage}`);
        const tafseerData = await tafseerResponse.json();
        
        currentSurah = data.data;
        currentSurahIndex = surahNumber - 1;
        currentVerseIndex = savedVerseIndex;
        
        // التحقق من صحة مؤشر الآية
        if (currentVerseIndex >= currentSurah.ayahs.length) {
            currentVerseIndex = 0;
        }
        
        // إضافة الترجمة والتفسير إلى بيانات السورة
        if (translationData.data && translationData.data.ayahs) {
            currentSurah.ayahs.forEach((ayah, index) => {
                if (translationData.data.ayahs[index]) {
                    ayah.translation = translationData.data.ayahs[index].text;
                }
                if (tafseerData.data && tafseerData.data.ayahs[index]) {
                    ayah.tafseer = tafseerData.data.ayahs[index].text;
                }
            });
        }
        
        displaySurah();
        surahsList.classList.remove('active');
        saveCurrentPosition();
        playCurrentVerse();

        
    } catch (error) {
        console.error('Error loading surah:', error);
        console.log('Current reciter:', reciterId);
        versesContainer.innerHTML = `<div class="error">حدث خطأ في تحميل السورة: ${error.message}</div>`;
    }
}

// تحديث دالة عرض السورة
async function displaySurah() {
    if (!currentSurah) return;
    
    surahName.textContent = currentSurah.name;
    versesContainer.innerHTML = '';
    
    // إنشاء عنصر الآية
    const verseElement = document.createElement('div');
    verseElement.className = 'verse current-verse';
    
    // إضافة زر التفسير
    const tafseerButton = document.createElement('button');
    tafseerButton.className = 'tafseer-icon-btn';
    tafseerButton.innerHTML = '<i class="fas fa-question-circle"></i>';
    tafseerButton.title = 'عرض تفسير الآية';
    tafseerButton.addEventListener('click', () => {
        showTafseer(currentSurah.ayahs[currentVerseIndex].number);
    });
    verseElement.appendChild(tafseerButton);
    
    // إضافة نص الآية
    const verseText = document.createElement('div');
    verseText.className = 'verse-text';
    verseText.innerHTML = currentSurah.ayahs[currentVerseIndex].text;
    
    // إضافة الترجمة الإنجليزية
    const translationElement = document.createElement('div');
    translationElement.className = 'verse-translation';
    translationElement.textContent = currentSurah.ayahs[currentVerseIndex].translation || 'Translation not available';
    translationElement.style.display = showTranslation ? 'block' : 'none';
    
    // إضافة معلومات الآية
    const verseInfo = document.createElement('div');
    verseInfo.className = 'verse-info';
    verseInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">السورة:</span>
            <span class="info-value">${currentSurah.name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">رقم الآية:</span>
            <span class="info-value">${currentSurah.ayahs[currentVerseIndex].numberInSurah}</span>
        </div>
        <div class="info-item">
            <span class="info-label">الجزء:</span>
            <span class="info-value">${Math.ceil(currentSurah.ayahs[currentVerseIndex].number / 20)}</span>
        </div>
    `;
    
    // تجميع العناصر
    verseElement.appendChild(verseText);
    verseElement.appendChild(translationElement);
    verseElement.appendChild(verseInfo);
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

    // تطبيق مستوى الصوت المحفوظ
    const savedVolume = localStorage.getItem('volume') || '100';
    audio.volume = parseInt(savedVolume) / 100;

    try {
        audio.addEventListener('ended', async () => {
            isPlaying = false;
            updatePlayButton();

            if (isAutoSwitch && isAutoPlay) { // Ensure auto-play is respected
                if (currentVerseIndex < currentSurah.ayahs.length - 1) {
                    currentVerseIndex++;
                    await displaySurah();
                    await playCurrentVerse();
                } else if (currentSurahIndex < surahs.length - 1) {
                    currentSurahIndex++;
                    await loadSurah(currentSurah.number + 1, 0);
                }
            }
        });

        await audio.play();
        isPlaying = true;
        updatePlayButton();
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

// إضافة مستمع الحدث للشيك بوكس القراءة التلقائية
let autoPlayCheckbox2 = document.getElementById('autoPlay');
if (autoPlayCheckbox2) {
    autoPlayCheckbox2.addEventListener('change', function() {
        isAutoPlay = this.checked;
        localStorage.setItem('autoPlay', isAutoPlay);
        console.log('AutoPlay changed:', isAutoPlay); // للتأكد من تغيير الحالة
    });
}

// تحديث الإعدادات
function updateSettings() {
    // إيقاف الصوت عند فتح الإعدادات
    stopAllAudio();
    
    // تحديث القارئ
    const reciterId = reciterSelect.value;
    currentReciter = RECITERS[reciterId] || 'ar.alafasy';
    localStorage.setItem('reciter', reciterId);
    
    // تحديث سرعة التشغيل
    const playbackSpeed = playbackSpeedSelect.value;
    localStorage.setItem('playbackSpeed', playbackSpeed);
    
    // تحديث مستوى الصوت
    const volume = volumeSlider.value;
    localStorage.setItem('volume', volume);
    if (audio) {
        audio.volume = volume / 100;
    }
    
    // تحديث القراءة التلقائية
    isAutoPlay = document.getElementById('autoPlay').checked;
    localStorage.setItem('autoPlay', isAutoPlay);

    // إعادة تحميل السورة الحالية مع القارئ الجديد
    if (currentSurah) {
        const wasPlaying = isPlaying;
        loadSurah(currentSurah.number, currentVerseIndex).then(() => {
            if (wasPlaying) {
                playCurrentVerse();
            }
        });
    }
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
        const savedVolume = localStorage.getItem('volume') || '100';
        
        // تطبيق القارئ المحفوظ
        if (savedReciter) {
            reciterSelect.value = savedReciter;
            currentReciter = RECITERS[savedReciter];
        }
        
        // تطبيق سرعة التشغيل المحفوظة
        if (savedSpeed) {
            playbackSpeedSelect.value = savedSpeed;
        }
        
        // تطبيق مستوى الصوت المحفوظ
        if (savedVolume) {
            volumeSlider.value = savedVolume;
            volumeValue.textContent = `${savedVolume}%`;
            if (audio) {
                audio.volume = savedVolume / 100;
            }
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
    // مستمعي الأحداث
    reciterSelect.addEventListener('change', updateSettings);
    playbackSpeedSelect.addEventListener('change', updateSettings);
    
    // تحميل الإعدادات المحفوظة
    loadLastPosition();
    initDarkMode();

    // إضافة مستمع الحدث للشيك بوكس
    const autoSwitchCheckbox = document.getElementById('autoSwitch');
    if (autoSwitchCheckbox) {
        autoSwitchCheckbox.addEventListener('change', function() {
            isAutoSwitch = this.checked;
            localStorage.setItem('autoSwitch', isAutoSwitch);
            console.log('AutoSwitch changed:', isAutoSwitch); // للتأكد من تغيير الحالة
        });
    }

    // إضافة مستمع الحدث لزر إظهار/إخفاء الترجمة
    const showTranslationCheckbox = document.getElementById('showTranslation');
    if (showTranslationCheckbox) {
        showTranslationCheckbox.addEventListener('change', function() {
            showTranslation = this.checked;
            localStorage.setItem('showTranslation', showTranslation);

            // تحديث عرض الترجمة مباشرة
            const translationElements = document.querySelectorAll('.verse-translation');
            translationElements.forEach(element => {
                element.style.display = showTranslation ? 'block' : 'none';
            });
        });
    }

    const savedShowTranslation = localStorage.getItem('showTranslation');
    showTranslation = savedShowTranslation === null ? true : savedShowTranslation === 'true';
    if (showTranslationCheckbox) {
        showTranslationCheckbox.checked = showTranslation;
    }

    const translationElements = document.querySelectorAll('.verse-translation');
    translationElements.forEach(element => {
        element.style.display = showTranslation ? 'block' : 'none';
    });

    if (translationLanguageSelect) {
        translationLanguageSelect.addEventListener('change', function() {
            translationLanguage = this.value;
            localStorage.setItem('translationLanguage', translationLanguage);
            loadSurah(currentSurah.number, currentVerseIndex);
        });
    }

    if (tafseerLanguageSelect) {
        tafseerLanguageSelect.addEventListener('change', function() {
            tafseerLanguage = this.value;
            localStorage.setItem('tafseerLanguage', tafseerLanguage);
            loadSurah(currentSurah.number, currentVerseIndex);
        });
    }

    const savedTafseerLanguage = localStorage.getItem('tafseerLanguage') || 'ar.muyassar';
    tafseerLanguage = savedTafseerLanguage;
    if (tafseerLanguageSelect) {
        tafseerLanguageSelect.value = savedTafseerLanguage;
    }

    requestNotificationPermission();
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

// Swipe Navigation
let touchStartX1 = 0;
let touchEndX1 = 0;

function handleTouchStart(event) {
    touchStartX1 = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
    touchEndX1 = event.changedTouches[0].screenX;
    if (touchEndX1 < touchStartX1 - 50) {
        goToNextVerse();
    } else if (touchEndX1 > touchStartX1 + 50) {
        goToPreviousVerse();
    }
}

document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);

// Daily Reminder
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                scheduleDailyReminder();
            }
        });
    }
}

function scheduleDailyReminder() {
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(8, 0, 0, 0); // Daily reminder at 8 AM

    const timeUntilReminder = reminderTime - now;
    if (timeUntilReminder > 0) {
        setTimeout(() => {
            new Notification('📖 تذكير', {
                body: 'لا تنس قراءة وردك اليومي من القرآن الكريم.',
            });
            scheduleDailyReminder(); // Reschedule for the next day
        }, timeUntilReminder);
    }
}

// Initialize features
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
});

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
            
            // تطبيق مستوى الصوت المحفوظ
            const savedVolume = localStorage.getItem('volume') || '100';
            currentAudio.volume = parseInt(savedVolume) / 100;
            
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
        
        // تطبيق مستوى الصوت المحفوظ
        const savedVolume = localStorage.getItem('volume') || '100';
        currentAudio.volume = parseInt(savedVolume) / 100;
        
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

// إضافة مستمع حدث لتغيير مستوى الصوت
volumeSlider.addEventListener('input', (e) => {
    const volume = e.target.value;
    volumeValue.textContent = `${volume}%`;
    if (audio) {
        audio.volume = volume / 100;
    }
    localStorage.setItem('volume', volume);
});

// إغلاق نافذة التفسير
closeTafseer.addEventListener('click', () => {
    tafseerModal.style.display = 'none';
});

// دالة عرض التفسير
async function showTafseer(verseKey) {
    try {
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${verseKey}/${tafseerLanguage}`);
        const data = await response.json();
        if (data.code === 200 && data.data) {
            const tafseer = data.data.text || 'التفسير غير متوفر';
            tafseerText.innerHTML = tafseer;
            tafseerModal.style.display = 'block';
        } else {
            tafseerText.innerHTML = 'التفسير غير متوفر';
            tafseerModal.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching tafseer:', error);
        tafseerText.innerHTML = 'عذراً، حدث خطأ في تحميل التفسير';
        tafseerModal.style.display = 'block';
    }
}

// إضافة مستمع الحدث لتغيير لغة التفسير
if (tafseerLanguageSelect) {
    tafseerLanguageSelect.addEventListener('change', function () {
        tafseerLanguage = this.value;
        localStorage.setItem('tafseerLanguage', tafseerLanguage);
        console.log('Tafseer language changed:', tafseerLanguage);
    });
}

// تحسين التفاعل باللمس
let touchStartX2 = 0;
let touchEndX2 = 0;

function handleTouchStart(event) {
    touchStartX2 = event.changedTouches[0].screenX;
}

function handleTouchEnd(event) {
    touchEndX2 = event.changedTouches[0].screenX;
    if (touchEndX2 < touchStartX2 - 50) {
        goToPreviousVerse();
    } else if (touchEndX2 > touchStartX2 + 50) {
        goToNextVerse();
    }
}

document.addEventListener('touchstart', handleTouchStart);
document.addEventListener('touchend', handleTouchEnd);

// ورد يومي / تذكير بالقراءة
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                scheduleDailyReminder();
            }
        });
    }
}

function scheduleDailyReminder() {
    const now = new Date();
    const reminderTime = new Date();
    reminderTime.setHours(8, 0, 0, 0); // تذكير يومي الساعة 8 صباحًا

    const timeUntilReminder = reminderTime - now;
    if (timeUntilReminder > 0) {
        setTimeout(() => {
            new Notification('📖 تذكير', {
                body: 'لا تنس قراءة وردك اليومي من القرآن الكريم.',
            });
            scheduleDailyReminder(); // إعادة جدولة التذكير لليوم التالي
        }, timeUntilReminder);
    }
}

// استدعاء التذكير عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    requestNotificationPermission();
});

// تحديث عرض الآيات لإضافة زر المفضلة
function displayVerses(verses) {
    versesContainer.innerHTML = '';
    verses.forEach((verse, index) => {
        const verseElement = document.createElement('div');
        verseElement.className = 'verse';
        verseElement.innerHTML = `
            <div class="verse-text">${verse.text}</div>
            <div class="verse-controls">
                <button class="verse-btn play-verse">
                    <i class="fas fa-play"></i>
                    تشغيل
                </button>
                <button class="verse-btn tafseer">
                    <i class="fas fa-book"></i>
                    تفسير
                </button>
            </div>
        `;

        const playButton = verseElement.querySelector('.play-verse');
        const tafseerButton = verseElement.querySelector('.verse-btn.tafseer');

        playButton.addEventListener('click', () => {
            playVerse(verse.number);
        });

        tafseerButton.addEventListener('click', () => {
            showTafseer(verse.number);
        });

        versesContainer.appendChild(verseElement);
    });
}

// تحديث دالة تحميل الإعدادات
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('quranSettings')) || {};
    
    // تحميل إعداد القارئ
    selectedReciter = settings.reciter || 'ar.alafasy';
    document.getElementById('reciter').value = selectedReciter;
    
    // تحميل إعداد مستوى الصوت
    const volume = settings.volume || 100;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
    if (audio) {
        audio.volume = volume / 100;
    }
    
    // تحميل إعداد التبديل التلقائي - مفعل افتراضياً
    const savedAutoSwitch = localStorage.getItem('autoSwitch');
    isAutoSwitch = savedAutoSwitch === null ? true : savedAutoSwitch === 'true';
    const autoSwitchCheckbox = document.getElementById('autoSwitch');
    if (autoSwitchCheckbox) {
        autoSwitchCheckbox.checked = isAutoSwitch;
    }
    
    // تحميل إعداد القراءة التلقائية - مفعل افتراضياً
    const savedAutoPlay = localStorage.getItem('autoPlay');
    isAutoPlay = savedAutoPlay === null ? true : savedAutoPlay === 'true';
    const autoPlayCheckbox = document.getElementById('autoPlay');
    if (autoPlayCheckbox) {
        autoPlayCheckbox.checked = isAutoPlay;
    }
    
    // تحميل إعداد إظهار الترجمة - مفعل افتراضياً
    const savedShowTranslation = localStorage.getItem('showTranslation');
    showTranslation = savedShowTranslation === null ? true : savedShowTranslation === 'true';
    const showTranslationCheckbox = document.getElementById('showTranslation');
    if (showTranslationCheckbox) {
        showTranslationCheckbox.checked = showTranslation;
    }
    
    // تحميل إعداد اللغة
    translationLanguage = settings.translationLanguage || 'en.sahih';
    document.getElementById('translationLanguage').value = translationLanguage;
    
    // تحميل إعداد الخط
    const savedFont = settings.font || 'uthmani';
    document.body.classList.add(`font-${savedFont}`);
    document.getElementById('fontSelect').value = savedFont;
    
    console.log('Settings loaded, autoSwitch:', isAutoSwitch, 'showTranslation:', showTranslation);
}

// تحديث دالة حفظ الإعدادات
function saveSettings() {
    const settings = {
        reciter: selectedReciter,
        volume: volumeSlider.value,
        translationLanguage: translationLanguage,
        font: document.getElementById('fontSelect').value
    };
    localStorage.setItem('quranSettings', JSON.stringify(settings));
    
    // حفظ إعداد التبديل التلقائي
    isAutoSwitch = document.getElementById('autoSwitch').checked;
    localStorage.setItem('autoSwitch', isAutoSwitch);
    
    // حفظ إعداد القراءة التلقائية
    isAutoPlay = document.getElementById('autoPlay').checked;
    localStorage.setItem('autoPlay', isAutoPlay);
    
    // حفظ إعداد إظهار الترجمة
    showTranslation = document.getElementById('showTranslation').checked;
    localStorage.setItem('showTranslation', showTranslation);
    
    console.log('Settings saved, autoSwitch:', isAutoSwitch, 'showTranslation:', showTranslation);
    
    // تحديث عرض الترجمة
    const translationElements = document.querySelectorAll('.verse-translation');
    translationElements.forEach(element => {
        element.style.display = showTranslation ? 'block' : 'none';
    });
}

// تهيئة الوضع الليلي
function initDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// تبديل الوضع الليلي
darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    darkModeBtn.innerHTML = isDarkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
});

// وظيفة البحث
async function searchQuran(query) {
    if (!query.trim()) {
        searchResults.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(`https://api.alquran.cloud/v1/search/${encodeURIComponent(query)}/all/ar`);
        const data = await response.json();

        if (data.code === 200 && data.data.matches.length > 0) {
            displaySearchResults(data.data.matches);
        } else {
            searchResults.innerHTML = '<div class="search-result-item">لا توجد نتائج</div>';
        }
        searchResults.classList.add('active');
    } catch (error) {
        console.error('خطأ في البحث:', error);
        searchResults.innerHTML = '<div class="search-result-item">حدث خطأ في البحث</div>';
    }
}

// عرض نتائج البحث
function displaySearchResults(matches) {
    searchResults.innerHTML = matches.slice(0, 10).map(match => `
        <div class="search-result-item" data-surah="${match.surah.number}" data-verse="${match.numberInSurah}">
            <div class="surah-name">${match.surah.name} - الآية ${match.numberInSurah}</div>
            <div class="verse-text">${match.text}</div>
        </div>
    `).join('');

    // إضافة مستمع الأحداث لنتائج البحث
    document.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const surahNumber = parseInt(item.dataset.surah);
            const verseNumber = parseInt(item.dataset.verse);
            loadSurah(surahNumber, verseNumber);
            searchResults.classList.remove('active');
            searchInput.value = '';
        });
    });
}

// مستمعات الأحداث للبحث
searchInput.addEventListener('input', (e) => {
    if (e.target.value.length >= 3) {
        searchQuran(e.target.value);
    } else {
        searchResults.classList.remove('active');
    }
});

searchBtn.addEventListener('click', () => {
    if (searchInput.value.length >= 3) {
        searchQuran(searchInput.value);
    }
});

// إخفاء نتائج البحث عند النقر خارجها
document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

async function loadVerse(verseNumber) {
    try {
        // جلب الآية بالعربية
        const arabicResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/ar.alafasy`);
        const arabicData = await arabicResponse.json();
        
        // جلب الترجمة الإنجليزية
        const englishResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${verseNumber}/en.sahih`);
        const englishData = await englishResponse.json();
        
        if (arabicData.code === 200 && englishData.code === 200) {
            const verse = arabicData.data;
            const translation = englishData.data;
            
            document.querySelector('.verse-text').textContent = verse.text;
            document.querySelector('.verse-translation').textContent = translation.text;
            document.querySelector('.verse-number').textContent = verse.numberInSurah;
            document.querySelector('.page-number').textContent = verse.page;
            document.querySelector('.juz-number').textContent = verse.juz;
            
            playCurrentVerse(verse.number);
            saveCurrentPosition();
        }
    } catch (error) {
        console.error('Error loading verse:', error);
    }
}

// تغيير الخط
const changeFont = (fontType) => {
    // إزالة جميع فئات الخط
    document.body.classList.remove('font-uthmani', 'font-naskh', 'font-amiri', 'font-lateef', 'font-scheherazade');
    // إضافة الفئة الجديدة
    document.body.classList.add(`font-${fontType}`);
    // حفظ الإعدادات
    saveSettings();
};

// إضافة مستمع الحدث لتغيير الخط
document.getElementById('fontSelect').addEventListener('change', (e) => {
    changeFont(e.target.value);
});